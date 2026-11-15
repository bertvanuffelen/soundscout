/**
 * playbackClock — dé bron voor "waar staat de afspeellijn nu?"
 * (V2 Fase 1, v2-architecture-proposal.md §2.1).
 *
 * Twee toestanden, één antwoord:
 *  - tijdens afspelen: de HOORBARE positie, afgeleid van de audioklok
 *    (`audioService.getAudibleBeat()`: zonder Tone's lookahead en gecorrigeerd
 *    voor de uitvoervertraging van het apparaat);
 *  - in rust (gepauzeerd/gestopt/gesleept): de positie uit `audioStore`.
 *
 * `audioStore.currentBeat` wijzigt daardoor alleen nog bij losse gebeurtenissen
 * (pauze, stop, seek) — niet meer 20× per seconde. Wie de positie per frame
 * nodig heeft, leest deze klok in de gedeelde frame-lus (`frameLoop.ts`).
 *
 * Lees NOOIT `useAudioStore.getState().currentBeat` voor de actuele positie:
 * tijdens afspelen is die waarde verouderd. Gebruik `playbackClock.getBeat()`.
 */

import { useAudioStore } from '../stores/audioStore';
import { audioService } from './AudioService';

export { sanitizeLatency, secondsToAudibleBeat } from './audibleBeat';

export interface BeatSource {
  isPlaying: () => boolean;
  /** Hoorbare positie tijdens afspelen. */
  playingBeat: () => number;
  /** Positie in rust. */
  restingBeat: () => number;
}

export function createPlaybackClock(source: BeatSource) {
  return {
    isPlaying: (): boolean => source.isPlaying(),
    getBeat: (): number => (source.isPlaying() ? source.playingBeat() : source.restingBeat()),
  };
}

export const playbackClock = createPlaybackClock({
  isPlaying: () => useAudioStore.getState().isPlaying,
  playingBeat: () => audioService.getAudibleBeat(),
  restingBeat: () => useAudioStore.getState().currentBeat,
});
