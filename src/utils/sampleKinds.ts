/**
 * sampleKinds — is een geluid een muziekloop of een los geluid? (V2 Fase 4)
 *
 * De bron is het thema-manifest (`samples[].kind`). Maar samples reizen ook
 * los van het thema: de bibliotheek in localStorage, de sample-lijst die in
 * een opgeslagen compositie/inzending is meegebakken, oudere data van vóór
 * dit veld. Die kopieën missen `kind`. Daarom houden we een register bij van
 * alle thema-samples die ooit geladen zijn (de registry van de thema's vult
 * het), en lossen we de soort op als: veld op de sample → register → 'sfx'.
 *
 * Het basisthema (met de muziekwinkel-loops) is gebundeld en wordt bij het
 * opstarten geregistreerd, dus de belangrijkste loops zijn altijd bekend.
 */

import type { Sample, SampleKind } from '../types';
import { isSequenceSampleId } from './sequencer';

const knownKinds = new Map<string, SampleKind>();

/** Registreer de soort van thema-samples (aangeroepen door de thema-registry). */
export function registerSampleKinds(samples: ReadonlyArray<Pick<Sample, 'id' | 'kind'>>): void {
  for (const sample of samples) {
    if (sample.kind) knownKinds.set(sample.id, sample.kind);
  }
}

/** Soort van een sample-id volgens het register (undefined = onbekend). */
export function getRegisteredSampleKind(sampleId: string): SampleKind | undefined {
  return knownKinds.get(sampleId);
}

/**
 * De soort van een sample. Sequence-samples (`seq:`) volgen het tempo altijd
 * (1 vakje = 1 tel) en gedragen zich dus als loop.
 */
export function resolveSampleKind(sample: Pick<Sample, 'id' | 'kind'>): SampleKind {
  if (sample.kind) return sample.kind;
  if (isSequenceSampleId(sample.id)) return 'loop';
  return knownKinds.get(sample.id) ?? 'sfx';
}

/** Alleen voor tests. */
export function clearSampleKindRegistry(): void {
  knownKinds.clear();
}
