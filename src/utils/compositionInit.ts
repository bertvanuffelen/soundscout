/**
 * Orchestratie-functies voor compositie-initialisatie.
 *
 * Centraliseert de flow: thema selecteren → state resetten → audio init → navigeren.
 * Wordt gebruikt door StartScreen (nieuwe compositie) en Templates (#21).
 *
 * Bij falen van audio-init: state wordt gereset maar navigatie gaat gewoon door
 * (audio init is niet kritiek — het kan later alsnog lukken).
 */

import { useThemeStore } from '../stores/themeStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useAppStore } from '../stores/appStore';
import { audioService } from '../services/AudioService';
import { logger } from './logger';
import type { Template } from '../types';

export interface InitCompositionOptions {
  /** Theme ID to load */
  themeId: string;
  /** Optional callback when audio init fails (non-critical) */
  onAudioInitFailed?: (error: unknown) => void;
}

/**
 * Initialiseer een nieuwe compositie:
 * 1. Stel thema in
 * 2. Reset timeline + library
 * 3. Initialiseer audio engine
 * 4. Navigeer naar map
 *
 * @returns true als alles (inclusief audio) succesvol was, false als audio faalde maar navigatie doorging
 */
export async function initializeNewComposition(
  options: InitCompositionOptions
): Promise<boolean> {
  const { themeId, onAudioInitFailed } = options;

  // Stap 1: Stel thema in
  useThemeStore.getState().setTheme(themeId);

  // Stap 2: Reset state (sync, kan niet falen)
  useTimelineStore.getState().clearAllTracks();
  useLibraryStore.getState().clearLibrary();

  // Stap 2b: Schoon ongebruikte audio players op (voorkom memory leak bij theme-wissel)
  const activeSamples = useThemeStore.getState().getSamples();
  const activeSampleIds = new Set(activeSamples.map((s: { id: string }) => s.id));
  audioService.disposeUnusedPlayers(activeSampleIds);

  // Stap 3: Audio initialiseren (async, niet kritiek)
  let audioSuccess = true;
  try {
    await audioService.initialize();
  } catch (error) {
    audioSuccess = false;
    logger.warn('Audio initialization failed during composition init:', error);
    onAudioInitFailed?.(error);
  }

  // Stap 4: Navigeer naar map (altijd, ook als audio faalt)
  useAppStore.getState().goToMap();

  return audioSuccess;
}

/**
 * Initialiseer een compositie vanuit een docent-template:
 * 1. Laad timeline data (tracks, bpm, totalBeats, sections)
 * 2. Laad samples in library
 * 3. Sla template op in appStore (voor clip lock + instructies)
 * 4. Initialiseer audio engine
 * 5. Navigeer naar studio (leerling hoeft niet te verzamelen)
 */
export async function initializeFromTemplate(template: Template): Promise<void> {
  const { compositionData } = template;

  // Stap 1: Laad timeline met de pre-filled data uit het template
  // Markeer alle bestaande clips als fromTemplate zodat alleen deze vergrendeld worden
  const tracksWithTemplateFlag = compositionData.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => ({ ...clip, fromTemplate: true })),
  }));

  useTimelineStore.getState().loadTimeline({
    tracks: tracksWithTemplateFlag,
    bpm: compositionData.bpm,
    totalBeats: compositionData.totalBeats,
    isLooping: compositionData.isLooping,
    isPlaying: false,
    currentBeat: 0,
    sections: compositionData.sections,
  });

  // Stap 2: Laad samples in library (leerling krijgt alleen deze samples)
  useLibraryStore.getState().loadLibrary(compositionData.samples);

  // Stap 3: Sla template context op
  useAppStore.getState().loadTemplate(template);

  // Stap 4: Audio initialiseren (niet kritiek)
  try {
    await audioService.initialize();
  } catch (error) {
    logger.warn('Audio initialization failed during template init:', error);
  }

  // Stap 5: Navigeer naar studio
  useAppStore.getState().goToStudio();
}
