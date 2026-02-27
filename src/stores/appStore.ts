/**
 * AppStore - Central store for application state
 *
 * Manages:
 * - Screen navigation
 * - Current location tracking
 *
 * Note: Audio playback state is managed separately in audioStore
 * Note: Timeline and library state are managed in their respective stores
 */

import { create } from 'zustand';
import type { GameScreen } from '../types';

interface AppStore {
  // Navigation state
  currentScreen: GameScreen;
  currentLocationId: string | null;
  // Track which composition is being edited (null = new composition)
  currentCompositionId: string | null;
  // Share code for viewing shared compositions (null = not viewing)
  shareCode: string | null;

  // Navigation actions
  setScreen: (screen: GameScreen) => void;
  setLocation: (locationId: string | null) => void;
  setCurrentCompositionId: (id: string | null) => void;
  goToStart: () => void;
  goToMap: () => void;
  goToLocation: (locationId: string) => void;
  goToStudio: () => void;
  goToStage: () => void;
  goToCompositions: () => void;
  goToTeacher: () => void;
  goToShared: (code: string) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  currentScreen: 'start',
  currentLocationId: null,
  currentCompositionId: null,
  shareCode: null,

  setScreen: (screen) => set({ currentScreen: screen }),

  setLocation: (locationId) => set({ currentLocationId: locationId }),

  setCurrentCompositionId: (id) => set({ currentCompositionId: id }),

  goToStart: () => set({ currentScreen: 'start', currentLocationId: null, currentCompositionId: null, shareCode: null }),

  goToMap: () => set({ currentScreen: 'map', currentLocationId: null }),

  goToLocation: (locationId) =>
    set({ currentScreen: 'location', currentLocationId: locationId }),

  goToStudio: () => set({ currentScreen: 'studio' }),

  goToStage: () => set({ currentScreen: 'stage' }),

  goToCompositions: () => set({ currentScreen: 'compositions' }),

  goToTeacher: () => set({ currentScreen: 'teacher' }),

  goToShared: (code) => set({ currentScreen: 'shared', shareCode: code }),
}));

// Re-export for backwards compatibility during migration
// TODO: Remove this after all components are migrated to useAppStore
export const useGameStore = useAppStore;
