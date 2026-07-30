/**
 * sequencerEvents — de éne bron van waarheid voor patroon-events.
 *
 * Zelfde principe als audioEvents.ts in Audio Engine v2: deze module is
 * bewust PUUR (geen Tone-import) zodat de event-generatie in jsdom/vitest
 * getest kan worden én zodat live afspelen (SequencerEngine) en toekomstige
 * tijdlijn-integratie/offline export (fase 2) uit exact dezelfde events
 * putten. Live en export kunnen daardoor niet uit elkaar groeien.
 */

import type { Sample } from '../types';
import {
  SEQ_DECLICK_IN_SECONDS,
  type SequencerSequence,
} from '../types/sequencer';
import { effectiveDuration } from '../utils/sequencer';

// --- Types ---

export interface PatternEvent {
  /** Vakje waarin dit event start (0-gebaseerd) */
  stepIndex: number;
  /** Starttijd in seconden t.o.v. het patroonbegin (stepIndex * 60/bpm) */
  timeOffset: number;
  trackId: string;
  trackIndex: number;
  sampleId: string;
  /** Offset in de bron-buffer (trim) in seconden */
  trimStart: number;
  /** Speelduur van dit event in seconden (effectieve, getrimde duur) */
  duration: number;
  /** Lineaire gain 0..1 (spoorvolume) */
  gain: number;
  /** True bij mode 'cut': een nieuwe stap op dit spoor stopt de vorige */
  choke: boolean;
  /** Micro-fade-in (s) tegen klikken; alleen > 0 bij een getrimde start */
  declickIn: number;
}

export interface GeneratePatternOptions {
  /**
   * Filter: alleen events voor samples waarvan de buffer geladen is.
   * Live gebruikt de engine dit; puur/testen laat het weg.
   */
  hasBuffer?: (sampleId: string) => boolean;
}

// --- Generatie ---

/**
 * Genereer alle afspeel-events van één sequence-patroon, gesorteerd op tijd.
 * Sporen zonder sample, gemute sporen en niet-geladen buffers leveren geen
 * events; een event-duur van 0 (kapotte trim) wordt overgeslagen.
 */
export function generatePatternEvents(
  sequence: SequencerSequence,
  samples: Sample[],
  options: GeneratePatternOptions = {}
): PatternEvent[] {
  const { hasBuffer } = options;
  const stepSeconds = 60 / sequence.bpm;
  const sampleById = new Map(samples.map((s) => [s.id, s]));
  const events: PatternEvent[] = [];

  sequence.tracks.forEach((track, trackIndex) => {
    if (!track.sampleId || track.mute) return;
    if (hasBuffer && !hasBuffer(track.sampleId)) return;

    const sample = sampleById.get(track.sampleId);
    if (!sample) return;

    const trimStart = Math.max(0, track.trimStart ?? 0);
    const duration = effectiveDuration(sample, track.trimStart, track.trimEnd);
    if (duration <= 0) return;

    const gain = track.volume ?? 1;
    const choke = track.mode === 'cut';
    const declickIn = trimStart > 0 ? SEQ_DECLICK_IN_SECONDS : 0;

    for (let step = 0; step < sequence.lengthSteps; step++) {
      if (!track.steps[step]) continue;
      events.push({
        stepIndex: step,
        timeOffset: step * stepSeconds,
        trackId: track.id,
        trackIndex,
        sampleId: track.sampleId,
        trimStart,
        duration,
        gain,
        choke,
        declickIn,
      });
    }
  });

  events.sort((a, b) => a.timeOffset - b.timeOffset || a.trackIndex - b.trackIndex);
  return events;
}

/** Alle events die in één bepaald vakje starten (voor de live tick) */
export function eventsAtStep(
  events: PatternEvent[],
  stepIndex: number
): PatternEvent[] {
  return events.filter((e) => e.stepIndex === stepIndex);
}

/** Totale patroonduur in seconden (exclusief uitklinkende staarten) */
export function patternDurationSeconds(sequence: SequencerSequence): number {
  return sequence.lengthSteps * (60 / sequence.bpm);
}
