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
import { getThemeStoryboards, findStoryboardById } from '../data/themes';
import { getActiveAssignment } from '../lib/assignments';
import { MAX_SECTIONS } from '../constants/config';
import { logger } from './logger';
import { praatplaatToStoryboard } from './praatplaatStoryboard';
import type { Template, CompositionData, ActivePraatplaat, PraatplaatPosition, Storyboard, ComposeMode } from '../types';
import { storageService } from '../services/StorageService';
import i18n from '../i18n';

/**
 * Payload voor `hydrateCompositionContext`: alle velden van een compositie die
 * de appStore nodig heeft om de juiste studio-UI te tonen (storyboard-paneel,
 * praatplaat, compose-mode).
 */
export interface CompositionContextInput {
  storyboardId?: string;
  praatplaat?: ActivePraatplaat;
  praatplaatPosition?: PraatplaatPosition;
}

/**
 * Hydrateert de `appStore` met de compose-context van een compositie.
 *
 * Herstel-volgorde:
 * 1. Reset altijd de bestaande praatplaat/storyboard state (voorkomt lekkage
 *    van een vorige sessie wanneer de nieuwe compositie die context niet heeft).
 * 2. Heeft de compositie een `praatplaat`? → zet praatplaat + positie, bouw
 *    een virtueel storyboard en zet compose-mode `'image'`.
 * 3. Anders: heeft de compositie een `storyboardId`? → zoek op via
 *    `findStoryboardById` (echte + `location-*` virtual IDs) en zet
 *    compose-mode op basis van het aantal images (1 → `'image'`, meer →
 *    `'storyboard'`).
 * 4. Geen context → compose-mode `'free'` en storyboard `null`.
 *
 * Deze helper wordt aangeroepen door alle drie de laad-paden:
 * - `initializeFromSavedComposition` (online bewaarcode)
 * - `initializeFromTemplate` (docent-template)
 * - `CompositionsView.handleOpenComposition` / `handlePlayComposition`
 *   (lokale compositielijst)
 */
export function hydrateCompositionContext(input: CompositionContextInput): void {
  const app = useAppStore.getState();

  // 1. Reset praatplaat-context — we zetten 'm hieronder weer als die er is
  app.clearPraatplaat();

  // 2. Praatplaat-compositie?
  if (input.praatplaat) {
    app.setPraatplaat(input.praatplaat);
    if (input.praatplaatPosition) {
      app.setPraatplaatPosition(input.praatplaatPosition);
    }
    app.setActiveStoryboard(praatplaatToStoryboard(input.praatplaat));
    app.setComposeMode('image');
    logger.info(`[hydrateCompositionContext] Praatplaat "${input.praatplaat.id}" hersteld`);
    return;
  }

  // 3. Reguliere storyboard / location-image
  if (input.storyboardId) {
    // Praatplaat-storyboard-IDs zonder bijbehorende praatplaat-snapshot zijn
    // onherleidbaar (afbeelding zit in Supabase, niet in theme-data). Val
    // terug op reset + waarschuwing.
    if (input.storyboardId.startsWith('praatplaat-')) {
      logger.warn(
        `[hydrateCompositionContext] storyboardId "${input.storyboardId}" ` +
        `verwijst naar een praatplaat maar er is geen praatplaat-snapshot ` +
        `opgeslagen. Compositie wordt geopend zonder praatplaat-context.`
      );
      app.setActiveStoryboard(null);
      app.setComposeMode('free');
      return;
    }

    const found = findStoryboardById(input.storyboardId);
    if (found) {
      app.setActiveStoryboard(found.storyboard);
      const mode = found.storyboard.images.length === 1 ? 'image' : 'storyboard';
      app.setComposeMode(mode);
      logger.info(`[hydrateCompositionContext] Storyboard "${found.storyboard.id}" hersteld (mode: ${mode})`);
      return;
    }

    logger.warn(`[hydrateCompositionContext] storyboardId "${input.storyboardId}" niet gevonden`);
  }

  // 4. Reset
  app.setActiveStoryboard(null);
  app.setComposeMode('free');
}

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

  // Stap 4: Navigeer op basis van de gekozen compose-mode (#78).
  // De mode is gezet door `ComposeModeModal` vóór thema-keuze. Voor 'free' gaan
  // we direct naar de map; voor 'image' / 'storyboard' eerst naar
  // `ComposeModeScreen` zodat de leerling binnen het thema een afbeelding of
  // storyboard kan kiezen.
  const { composeMode, goToComposeMode, goToMap } = useAppStore.getState();

  if (import.meta.env.DEV) {
    const storyboards = getThemeStoryboards(themeId);
    logger.info(`[compositionInit] themeId=${themeId}, composeMode=${composeMode}, storyboards=${storyboards?.length ?? 0}`);
  }

  if (composeMode === 'free') {
    goToMap();
  } else {
    goToComposeMode();
  }

  return audioSuccess;
}

/**
 * Initialiseer een nieuwe compositie vanaf een gekozen storyboard /
 * compositie-afbeelding (#78).
 *
 * Zet thema impliciet op `storyboard.themeId`, koppelt de storyboard aan de
 * appStore en maakt automatisch sections aan voor multi-image storyboards
 * (zelfde gedrag als de oude `ComposeModeScreen`).
 *
 * @returns true als alles (inclusief audio) succesvol was
 */
export async function initializeCompositionFromStoryboard(
  storyboard: Storyboard,
  options: { onAudioInitFailed?: (error: unknown) => void } = {},
): Promise<boolean> {
  const mode: ComposeMode = storyboard.images.length === 1 ? 'image' : 'storyboard';

  // 1. Thema impliciet uit storyboard
  useThemeStore.getState().setTheme(storyboard.themeId);

  // 2. Reset state
  const { totalBeats, clearAllTracks, clearSections, addSection } = useTimelineStore.getState();
  clearAllTracks();
  clearSections();
  useLibraryStore.getState().clearLibrary();

  // 2b. Memory hygiene
  const activeSamples = useThemeStore.getState().getSamples();
  const activeSampleIds = new Set(activeSamples.map((s: { id: string }) => s.id));
  audioService.disposeUnusedPlayers(activeSampleIds);

  // 3. Compose-context
  const app = useAppStore.getState();
  app.setComposeMode(mode);
  app.setActiveStoryboard(storyboard);

  // 3b. Auto-sections voor multi-image
  if (storyboard.images.length > 1) {
    const sectionCount = Math.min(storyboard.images.length, MAX_SECTIONS);
    const beatsPerImage = Math.floor(totalBeats / sectionCount);
    for (let i = 0; i < sectionCount; i++) {
      const endBeat = i < sectionCount - 1 ? beatsPerImage * (i + 1) : totalBeats;
      const label = storyboard.images[i]?.label;
      addSection(endBeat, undefined, label, true);
    }
  }

  // 4. Audio init (niet kritiek)
  let audioSuccess = true;
  try {
    await audioService.initialize();
  } catch (error) {
    audioSuccess = false;
    logger.warn('Audio initialization failed during storyboard composition init:', error);
    options.onAudioInitFailed?.(error);
  }

  // 5. Naar de map zodat leerling samples kan verzamelen
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
    sections: compositionData.sections,
  });

  // Stap 2: Laad samples in library
  // When libraryLocked = true, student only gets template samples
  // When libraryLocked = false, template samples are loaded as starting point
  // (student can collect more from locations later)
  useLibraryStore.getState().loadLibrary(compositionData.samples);

  // Stap 3: Sla template context op
  useAppStore.getState().loadTemplate(template);

  // Stap 3b: Herstel compose-context (storyboard / praatplaat / free)
  hydrateCompositionContext({
    storyboardId: compositionData.storyboardId,
    praatplaat: compositionData.praatplaat,
    praatplaatPosition: compositionData.praatplaatPosition,
  });

  // Stap 4: Audio initialiseren (niet kritiek)
  try {
    await audioService.initialize();
  } catch (error) {
    logger.warn('Audio initialization failed during template init:', error);
  }

  // Stap 5: Navigeer naar studio
  useAppStore.getState().goToStudio();
}

/**
 * Initialiseer een compositie vanuit een online bewaarde versie (#52):
 * 1. Laad timeline data (tracks, bpm, totalBeats, sections)
 * 2. Laad samples in library
 * 3. Sla saveCode + saveSecret op in localStorage
 * 4. Initialiseer audio engine
 * 5. Navigeer naar studio
 */
/**
 * Klascode-flow entry point (#78).
 *
 * Haalt de actieve opdracht op en routeert naar `AssignmentLandingScreen`
 * met de pending assignment (template, praatplaat, of `null` = Route C).
 *
 * Wordt gebruikt door `ShareCodeInput` (handmatige invoer) en `App.tsx`
 * (?pp= URL param). Retourneert `true` als er succesvol naar de landing is
 * genavigeerd (ook bij Route C — de landing toont dan soft-recovery).
 * Retourneert `false` alleen bij technische fouten.
 *
 * Belangrijk: deze functie initialiseert GEEN template en zet geen
 * klascode-sessie. Dat gebeurt pas op de landing bij "Starten", via
 * `activatePendingAssignment`. Zo blijven de stappen reviewbaar voor de
 * leerling voordat ze echt in de studio/praatplaat-select landen.
 */
export async function lookupAndRouteAssignment(classCode: string): Promise<boolean> {
  try {
    const assignment = await getActiveAssignment(classCode);
    useAppStore.getState().goToAssignmentLanding({ classCode, assignment });
    return true;
  } catch (err) {
    logger.error('lookupAndRouteAssignment failed:', err);
    return false;
  }
}

/**
 * Activeer de `pendingAssignment` uit de appStore (#78).
 *
 * Wordt aangeroepen vanuit `AssignmentLandingScreen` op "Starten". Zet de
 * klascode-sessie, roept het juiste init-pad aan en navigeert:
 * - `template` → `initializeFromTemplate` → studio
 * - `praatplaat` → set praatplaat-context → `praatplaat-select`
 * - `null` (Route C) → no-op (landing zelf toont soft-recovery knoppen)
 *
 * De pendingAssignment blijft staan tot navigatie rond is; `goToStart()`
 * ruimt 'm op.
 */
export async function activatePendingAssignment(): Promise<void> {
  const { pendingAssignment } = useAppStore.getState();
  if (!pendingAssignment || !pendingAssignment.assignment) {
    logger.warn('[activatePendingAssignment] Geen pending assignment om te activeren');
    return;
  }

  const { classCode, assignment } = pendingAssignment;

  // Wis bewaarcode-context (exclusief met klascode-flow)
  storageService.clearSaveOnlineInfo();

  if (assignment.type === 'template' && assignment.template) {
    // Klascode-sessie vastleggen
    useAppStore.getState().setClassSession({
      classCode,
      classId: assignment.classId,
      className: assignment.className,
      assignmentType: 'template',
      assignmentId: assignment.template.id,
      assignmentName: assignment.template.name,
    });

    await initializeFromTemplate(assignment.template);
    return;
  }

  if (assignment.type === 'praatplaat' && assignment.praatplaat) {
    useAppStore.getState().setClassSession({
      classCode,
      classId: assignment.classId,
      className: assignment.className,
      assignmentType: 'praatplaat',
      assignmentId: assignment.praatplaat.id,
      assignmentName: assignment.praatplaat.name,
    });

    useAppStore.getState().setPraatplaat({
      id: assignment.praatplaat.id,
      name: assignment.praatplaat.name,
      imageUrl: assignment.praatplaat.imageUrl,
      classId: assignment.classId,
      classCode,
      themeId: assignment.praatplaat.themeId,
      locationId: assignment.praatplaat.locationId,
    });

    useAppStore.getState().goToPraatplaatSelect();
    return;
  }

  if (assignment.type === 'storyboard' && assignment.storyboard) {
    const found = findStoryboardById(assignment.storyboard.ref);
    if (!found) {
      logger.warn('[activatePendingAssignment] Storyboard-ref niet gevonden', {
        ref: assignment.storyboard.ref,
      });
      return;
    }

    // Klascode-sessie vastleggen — assignmentId draagt de registry-ref (geen UUID)
    useAppStore.getState().setClassSession({
      classCode,
      classId: assignment.classId,
      className: assignment.className,
      assignmentType: 'storyboard',
      assignmentId: assignment.storyboard.ref,
      assignmentName: i18n.t(assignment.storyboard.nameKey),
    });

    // Hergebruik de bestaande vrije-modus storyboard-init (thema + scènes → map)
    await initializeCompositionFromStoryboard(found.storyboard);
    return;
  }

  logger.warn('[activatePendingAssignment] Onbekend assignment-type', { type: assignment.type });
}

/**
 * @deprecated Gebruik `lookupAndRouteAssignment` — deze wrapper blijft bestaan
 * voor code die nog direct naar praatplaat-select wilde routeren, maar routeert
 * nu ook via de landing-flow (#78).
 */
export async function navigateToPraatplaat(classCode: string): Promise<boolean> {
  return lookupAndRouteAssignment(classCode);
}

/**
 * Initialiseer een compositie vanuit een online bewaarde versie (#52):
 * 1. Laad timeline data (tracks, bpm, totalBeats, sections)
 * 2. Laad samples in library
 * 3. Sla saveCode + saveSecret op in localStorage
 * 4. Initialiseer audio engine
 * 5. Navigeer naar studio
 */
export async function initializeFromSavedComposition(
  compositionData: CompositionData,
  compositionName: string,
  saveCode: string,
  saveSecret: string,
): Promise<void> {
  // Stap 1: Laad timeline
  useTimelineStore.getState().loadTimeline({
    tracks: compositionData.tracks,
    bpm: compositionData.bpm,
    totalBeats: compositionData.totalBeats,
    isLooping: compositionData.isLooping,
    sections: compositionData.sections,
  });

  // Stap 2: Laad samples in library
  useLibraryStore.getState().loadLibrary(compositionData.samples);

  // Stap 2b: Herstel compose-context (storyboard / praatplaat / free)
  hydrateCompositionContext({
    storyboardId: compositionData.storyboardId,
    praatplaat: compositionData.praatplaat,
    praatplaatPosition: compositionData.praatplaatPosition,
  });

  // Stap 3: Sla online bewaar-info op in localStorage
  storageService.setSaveOnlineInfo(saveCode, saveSecret, compositionName);

  // Stap 4: Audio initialiseren
  try {
    await audioService.initialize();
  } catch (error) {
    logger.warn('Audio initialization failed during saved composition init:', error);
  }

  // Stap 5: Navigeer naar studio
  useAppStore.getState().goToStudio();
}
