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
import type { GameScreen, Template, ComposeMode, Storyboard, TemplateLockOptions, ActivePraatplaat, PraatplaatPosition, ClassSession, ReceivedFeedback } from '../types';
import type { ActiveAssignment } from '../lib/assignments';

/**
 * PendingAssignment - tussenstaat tussen klascode-invoer en opdracht-activatie (#78).
 *
 * Wordt gezet door ShareCodeInput / App.tsx ?pp= deep link nadat `getActiveAssignment`
 * is aangeroepen. `AssignmentLandingScreen` leest deze waarde en toont de juiste
 * preview. Op "Starten" wordt de opdracht geactiveerd (template-init of praatplaat-
 * select). `assignment === null` betekent Route C: klascode gevonden maar geen
 * actieve opdracht → landing toont soft-recovery (vrij componeren / terug).
 */
export interface PendingAssignment {
  classCode: string;
  assignment: ActiveAssignment | null;
}

interface AppStore {
  // Navigation state
  currentScreen: GameScreen;
  currentLocationId: string | null;
  // Track which composition is being edited (null = new composition)
  currentCompositionId: string | null;
  // Share code for viewing shared compositions (null = not viewing)
  shareCode: string | null;
  // Share code for viewing shared praatplaat (#73)
  sharedPraatplaatCode: string | null;
  // Active template (null = no template loaded)
  activeTemplate: Template | null;
  // Granular lock options for active template (#59)
  templateLockOptions: TemplateLockOptions;

  // Storytelling (#41)
  composeMode: ComposeMode;
  activeStoryboard: Storyboard | null;
  currentImageIndex: number;

  // Praatplaat (#72)
  activePraatplaat: ActivePraatplaat | null;
  praatplaatPosition: PraatplaatPosition | null;

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
  goToSharedPraatplaat: (code: string) => void;
  goToTutorial: () => void;
  goToTeacherGuide: (sectionId?: string) => void;
  // Template actions
  loadTemplate: (template: Template) => void;
  clearTemplate: () => void;
  setTemplateLockOptions: (options: Partial<TemplateLockOptions>) => void;

  // Storytelling actions (#41)
  setComposeMode: (mode: ComposeMode) => void;
  setActiveStoryboard: (sb: Storyboard | null) => void;
  setCurrentImageIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  clearStoryboard: () => void;
  goToComposeMode: () => void;

  // Praatplaat actions (#72)
  setPraatplaat: (praatplaat: ActivePraatplaat) => void;
  setPraatplaatPosition: (position: PraatplaatPosition) => void;
  clearPraatplaat: () => void;
  goToPraatplaatSelect: () => void;

  // Klascode-sessie (universele flow)
  classSession: ClassSession | null;
  submissionId: string | null;
  submissionSynced: boolean;
  isSubmitting: boolean;
  setClassSession: (session: ClassSession) => void;
  setSubmissionId: (id: string | null) => void;
  setSubmissionSynced: (synced: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  clearClassSession: () => void;

  // Docent-feedback op de geladen compositie (via bewaarcode, migratie 026)
  receivedFeedback: ReceivedFeedback | null;
  setReceivedFeedback: (feedback: ReceivedFeedback | null) => void;

  // Assignment landing (#78) — tussenscherm na klascode-invoer
  pendingAssignment: PendingAssignment | null;
  setPendingAssignment: (pending: PendingAssignment) => void;
  clearPendingAssignment: () => void;
  goToAssignmentLanding: (pending: PendingAssignment) => void;

  // Leskaart activeren vanaf de landingspagina: builtin_key overleeft de
  // login-hop; het dashboard opent dan de Leskaarten-tab op deze kaart.
  pendingLessonCardKey: string | null;
  setPendingLessonCardKey: (key: string | null) => void;

  // Dashboard-tab die na de login-hop geopend moet worden (bv. 'lessons' via de
  // "Bekijk alle leskaarten"-knop op de landingspagina).
  pendingTeacherTab: string | null;
  setPendingTeacherTab: (tab: string | null) => void;

  // Handleiding-sectie waarop de guide moet openen (contextuele "?"-deeplinks).
  // Eenmalig gelezen bij mount van TeacherGuideScreen, daarna gewist.
  pendingGuideSection: string | null;
  setPendingGuideSection: (id: string | null) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  currentScreen: 'start',
  currentLocationId: null,
  currentCompositionId: null,
  shareCode: null,
  sharedPraatplaatCode: null,
  activeTemplate: null,
  templateLockOptions: { clipsLocked: false, sectionsLocked: false, libraryLocked: false, allowNewClips: true },
  composeMode: 'free',
  activeStoryboard: null,
  currentImageIndex: 0,
  activePraatplaat: null,
  praatplaatPosition: null,
  classSession: null,
  submissionId: null,
  receivedFeedback: null,
  submissionSynced: false,
  isSubmitting: false,
  pendingAssignment: null,
  pendingLessonCardKey: null,
  pendingTeacherTab: null,
  pendingGuideSection: null,

  setScreen: (screen) => set({ currentScreen: screen }),

  setLocation: (locationId) => set({ currentLocationId: locationId }),

  setCurrentCompositionId: (id) => set({ currentCompositionId: id }),

  goToStart: () => set({ currentScreen: 'start', currentLocationId: null, currentCompositionId: null, shareCode: null, sharedPraatplaatCode: null, activeTemplate: null, templateLockOptions: { clipsLocked: false, sectionsLocked: false, libraryLocked: false, allowNewClips: true }, composeMode: 'free', activeStoryboard: null, currentImageIndex: 0, activePraatplaat: null, praatplaatPosition: null, classSession: null, submissionId: null, submissionSynced: false, isSubmitting: false, pendingAssignment: null, pendingLessonCardKey: null, pendingTeacherTab: null, pendingGuideSection: null, receivedFeedback: null }),

  goToMap: () => set({ currentScreen: 'map', currentLocationId: null }),

  goToLocation: (locationId) =>
    set({ currentScreen: 'location', currentLocationId: locationId }),

  goToStudio: () => set({ currentScreen: 'studio' }),

  goToStage: () => set({ currentScreen: 'stage' }),

  goToCompositions: () => set({ currentScreen: 'compositions' }),

  goToTeacher: () => set({ currentScreen: 'teacher' }),

  goToShared: (code) => set({ currentScreen: 'shared', shareCode: code }),

  goToSharedPraatplaat: (code) => set({ currentScreen: 'shared-praatplaat', sharedPraatplaatCode: code }),

  goToTutorial: () => set({ currentScreen: 'tutorial' }),

  goToTeacherGuide: (sectionId) => set({ currentScreen: 'teacher-guide', pendingGuideSection: sectionId ?? null }),

  // Template actions
  loadTemplate: (template) => set({ activeTemplate: template, templateLockOptions: template.lockOptions }),
  clearTemplate: () => set({ activeTemplate: null, templateLockOptions: { clipsLocked: false, sectionsLocked: false, libraryLocked: false, allowNewClips: true } }),
  setTemplateLockOptions: (options) => set((state) => ({ templateLockOptions: { ...state.templateLockOptions, ...options } })),

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
  goToComposeMode: () => set({ currentScreen: 'compose-mode' }),

  // Praatplaat actions (#72)
  setPraatplaat: (praatplaat) => set({ activePraatplaat: praatplaat }),
  setPraatplaatPosition: (position) => set({ praatplaatPosition: position }),
  clearPraatplaat: () => set({ activePraatplaat: null, praatplaatPosition: null }),
  goToPraatplaatSelect: () => set({ currentScreen: 'praatplaat-select' }),

  // Klascode-sessie actions (universele flow)
  setReceivedFeedback: (feedback) => set({ receivedFeedback: feedback }),
  setClassSession: (session) => set({ classSession: session, submissionId: null, submissionSynced: false }),
  setSubmissionId: (id) => set({ submissionId: id }),
  setSubmissionSynced: (synced) => set({ submissionSynced: synced }),
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  clearClassSession: () => set({ classSession: null, submissionId: null, submissionSynced: false, isSubmitting: false }),

  // Assignment landing actions (#78)
  setPendingAssignment: (pending) => set({ pendingAssignment: pending }),
  clearPendingAssignment: () => set({ pendingAssignment: null }),

  setPendingLessonCardKey: (key) => set({ pendingLessonCardKey: key }),

  setPendingTeacherTab: (tab) => set({ pendingTeacherTab: tab }),

  setPendingGuideSection: (id) => set({ pendingGuideSection: id }),
  goToAssignmentLanding: (pending) => set({ currentScreen: 'assignment-landing', pendingAssignment: pending }),
}));