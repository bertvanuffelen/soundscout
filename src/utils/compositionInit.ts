/**
 * Orchestratie-functie voor compositie-initialisatie.
 *
 * Centraliseert de flow: thema selecteren → state resetten → audio init → navigeren.
 * Wordt gebruikt door StartScreen (nieuwe compositie) en later Templates (#21).
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
