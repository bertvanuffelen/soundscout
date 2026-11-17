/**
 * Eén bron voor de `CompositionData` van de compositie die nu open staat
 * (B26). Opslaan, inleveren, Bewaar online, Deel link, Deel met docent,
 * Presenteren en Opslaan als opdracht bouwden die eerder elk zelf op, en een
 * deel vergat de sequencer-patronen en de praatplaat. Gedeelde of bewaarde
 * kopieën speelden dan stil (sequences) of openden zonder beeld (praatplaat).
 */

import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAppStore } from '../stores/appStore';
import type { CompositionData } from '../types';

/**
 * Formaat van de compositie-data (D1, release-veiligheid nov 2026).
 *
 * V2 schrijft dingen die V1 niet kent (melodie, geluidseffecten, tempo,
 * snelheid/echo/filter). V1 leest zo'n soundscape zonder klagen, maar gooit
 * die velden stil weg; slaat V1 daarna op, dan overschrijft de uitgeklede
 * versie de online kopie. Het formaatnummer zit in elke soundscape die V2
 * bewaart, en de database (migratie 046) weigert een update die een
 * formaat-2-soundscape door een lager formaat zou vervangen. V1 kent het
 * veld niet en stuurt het dus nooit mee: precies het herkenningsteken.
 *
 * Verhoog dit getal alleen als een nieuwere versie opnieuw data schrijft die
 * een oudere versie stil zou weggooien.
 */
export const COMPOSITION_FORMAT_VERSION = 2;

export interface BuildCompositionDataOptions {
  /**
   * Praatplaat-snapshot meenemen (standaard ja). Uit voor "Opslaan als
   * opdracht": een praatplaat hoort bij één klas, en een template met die
   * context zou inzendingen van een andere klas op die plaat zetten.
   */
  includePraatplaat?: boolean;
}

export function buildCompositionData(
  { includePraatplaat = true }: BuildCompositionDataOptions = {},
): CompositionData {
  const timeline = useTimelineStore.getState().getTimelineState();
  const { activeStoryboard, activePraatplaat, praatplaatPosition } = useAppStore.getState();
  const isPraatplaatStoryboard = activeStoryboard?.id.startsWith('praatplaat-') ?? false;

  return {
    formatVersion: COMPOSITION_FORMAT_VERSION,
    tracks: timeline.tracks,
    bpm: timeline.bpm,
    totalBeats: timeline.totalBeats,
    isLooping: timeline.isLooping,
    samples: useLibraryStore.getState().librarySamples,
    sections: timeline.sections,
    sequences: timeline.sequences,
    effectSounds: timeline.effectSounds,
    // Zonder praatplaat-snapshot is een praatplaat-storyboard-id onherleidbaar
    storyboardId: !includePraatplaat && isPraatplaatStoryboard ? undefined : activeStoryboard?.id,
    praatplaat: includePraatplaat ? activePraatplaat ?? undefined : undefined,
    praatplaatPosition: includePraatplaat ? praatplaatPosition ?? undefined : undefined,
  };
}
