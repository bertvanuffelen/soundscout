/**
 * sequencerStorage — zelfstandige localStorage-opslag voor het Sequencer Lab.
 *
 * Bewust volledig los van StorageService en utils/schemas.ts: eigen sleutel,
 * eigen Zod-schema's. Het prototype kan hierdoor met `git rm` verdwijnen
 * zonder één bestaand bestand te raken.
 *
 * Patroon volgt StorageService: per-item safeParse, ongeldige entries
 * worden gedropt met een logger.warn, quota-fouten worden geslikt.
 */

import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  SEQ_MAX_STEPS,
  SEQ_MAX_TRACKS,
  SEQ_MIN_STEPS,
  type SequencerSequence,
} from '../types/sequencer';

// Lokale literal — bewust NIET in de StorageKey-union van types/index.ts
const STORAGE_KEY = 'soundscout:sequencer-lab';

// --- Schema's ---

const SequencerTrackSchema = z.object({
  id: z.string(),
  sampleId: z.string().nullable(),
  steps: z.array(z.boolean()).min(SEQ_MIN_STEPS).max(SEQ_MAX_STEPS),
  mode: z.enum(['ring', 'cut']),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
  volume: z.number().min(0).max(1).optional(),
  mute: z.boolean().optional(),
});

const SequencerSequenceSchema = z.object({
  id: z.string(),
  name: z.string().max(60),
  lengthSteps: z.number().int().min(SEQ_MIN_STEPS).max(SEQ_MAX_STEPS),
  bpm: z.number().positive(),
  tracks: z.array(SequencerTrackSchema).min(1).max(SEQ_MAX_TRACKS),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Envelop losjes parsen zodat één kapotte sequence niet de hele opslag sloopt
const StorageEnvelopeSchema = z.object({
  version: z.number(),
  sequences: z.array(z.unknown()),
});

// --- API ---

/** Laad alle sequences; ongeldige entries worden gedropt (met warn) */
export function loadSequences(): SequencerSequence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const envelope = StorageEnvelopeSchema.safeParse(JSON.parse(raw));
    if (!envelope.success) {
      logger.warn('[sequencerStorage] Ongeldige opslag-envelop, start leeg');
      return [];
    }

    const valid: SequencerSequence[] = [];
    let dropped = 0;
    for (const item of envelope.data.sequences) {
      const parsed = SequencerSequenceSchema.safeParse(item);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        dropped++;
      }
    }
    if (dropped > 0) {
      logger.warn(`[sequencerStorage] ${dropped} ongeldige sequence(s) gedropt`);
    }
    return valid;
  } catch (err) {
    logger.warn('[sequencerStorage] Laden mislukt:', err);
    return [];
  }
}

/** Bewaar alle sequences; quota-fouten worden gelogd, niet gegooid */
export function saveSequences(sequences: SequencerSequence[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, sequences })
    );
  } catch (err) {
    logger.error('[sequencerStorage] Opslaan mislukt (quota?):', err);
  }
}
