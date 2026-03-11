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
import type { GameScreen, Template, ComposeMode, Storyboard } from '../types';

interface AppStore {
  // Navigation state
  currentScreen: GameScreen;
  currentLocationId: string | null;
  // Track which composition is being edited (null = new composition)
  currentCompositionId: string | null;
  // Share code for viewing shared compositions (null = not viewing)
  shareCode: string | null;
  // Active template (null = no template loaded)
  activeTemplate: Template | null;
  // Whether template clips are locked (not movable/deletable)
  templateClipsLocked: boolean;

  // Storytelling (#41)
  composeMode: ComposeMode;
  activeStoryboard: Storyboard | null;
  currentImageIndex: number;
  storytellingEnabled: boolean;  // URL flag: ?storytelling=true

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
  // Template actions
  loadTemplate: (template: Template) => void;
  clearTemplate: () => void;
  setTemplateClipsLocked: (locked: boolean) => void;

  // Storytelling actions (#41)
  setComposeMode: (mode: ComposeMode) => void;
  setActiveStoryboard: (sb: Storyboard | null) => void;
  setCurrentImageIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  clearStoryboard: () => void;
  setStorytellingEnabled: (enabled: boolean) => void;
  goToComposeMode: () => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  currentScreen: 'start',
  currentLocationId: null,
  currentCompositionId: null,
  shareCode: null,
  activeTemplate: null,
  templateClipsLocked: false,
  composeMode: 'free',
  activeStoryboard: null,
  currentImageIndex: 0,
  storytellingEnabled: false,

  setScreen: (screen) => set({ currentScreen: screen }),

  setLocation: (locationId) => set({ currentLocationId: locationId }),

  setCurrentCompositionId: (id) => set({ currentCompositionId: id }),

  goToStart: () => set({ currentScreen: 'start', currentLocationId: null, currentCompositionId: null, shareCode: null, activeTemplate: null, templateClipsLocked: false, composeMode: 'free', activeStoryboard: null, currentImageIndex: 0 }),

  goToMap: () => set({ currentScreen: 'map', currentLocationId: null }),

  goToLocation: (locationId) =>
    set({ currentScreen: 'location', currentLocationId: locationId }),

  goToStudio: () => set({ currentScreen: 'studio' }),

  goToStage: () => set({ currentScreen: 'stage' }),

  goToCompositions: () => set({ currentScreen: 'compositions' }),

  goToTeacher: () => set({ currentScreen: 'teacher' }),

  goToShared: (code) => set({ currentScreen: 'shared', shareCode: code }),

  // Template actions
  loadTemplate: (template) => set({ activeTemplate: template, templateClipsLocked: template.clipsLocked }),
  clearTemplate: () => set({ activeTemplate: null, templateClipsLocked: false }),
  setTemplateClipsLocked: (locked) => set({ templateClipsLocked: locked }),

  // Storytelling actions (#41)
  setComposeMode: (mode) => set({ composeMode: mode }),
  setActiveStoryboard: (sb) => set({ activeStoryboard: sb, currentImageIndex: 0 }),
  setCurrentImageIndex: (index) => set({ currentImageIndex: index }),
  nextImage: () => set((state) => {
    if (!state.activeStoryboard) return {};
    const maxIndex = state.activeStoryboard.images.length - 1;
    return { currentImageIndex: Math.min(state.currentImageIndex + 1, maxIndex) };
  }),
  prevImage: () => set((state) => ({
    currentImageIndex: Math.max(state.currentImageIndex - 1, 0),
  })),
  clearStoryboard: () => set({ composeMode: 'free', activeStoryboard: null, currentImageIndex: 0 }),
  setStorytellingEnabled: (enabled) => set({ storytellingEnabled: enabled }),
  goToComposeMode: () => set({ currentScreen: 'compose-mode' }),
}));

// Re-export for backwards compatibility during migration
// TODO: Remove this after all components are migrated to useAppStore
export const useGameStore = useAppStore;
