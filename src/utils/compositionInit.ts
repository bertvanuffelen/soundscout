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
import { getThemeStoryboards, findStoryboardById, getTheme, DEFAULT_THEME_ID } from '../data/themes';
import { getActiveAssignment, AssignmentLookupError, type ActiveAssignment } from '../lib/assignments';
import { MAX_SECTIONS } from '../constants/config';
import { logger } from './logger';
import { praatplaatToStoryboard } from './praatplaatStoryboard';
import type { Template, CompositionData, ActivePraatplaat, PraatplaatPosition, Storyboard, ComposeMode, ClassSession, SavedComposition } from '../types';
import type { SavedOnlineComposition } from '../lib/submissions';
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

  // Stap 2: Reset state (sync, kan niet falen). Volledige reset (B24): ook
  // secties/sequences/lengte, anders erft een vrije compositie bv. de
  // onverwijderbare storyboard-secties van de vorige.
  useTimelineStore.getState().resetTimeline();
  useLibraryStore.getState().clearLibrary();
  // Bewaarcode-context hoort bij de VORIGE compositie — zonder wissen zou
  // de auto-sync (#52-FASE2) de oude online compositie overschrijven met
  // de nieuwe, en zou het podium de oude naam voorvullen (QA-3)
  storageService.clearSaveOnlineInfo();

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

  // 2. Reset state (volledig, B24): na de reset is totalBeats de standaard
  useTimelineStore.getState().resetTimeline();
  const { totalBeats, addSection } = useTimelineStore.getState();
  useLibraryStore.getState().clearLibrary();
  // Bewaarcode-context hoort bij de VORIGE compositie — anders overschrijft
  // de auto-sync die online compositie met dit nieuwe werk (AUD-09).
  storageService.clearSaveOnlineInfo();

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

  // Bewaarcode-context hoort bij de VORIGE compositie — anders overschrijft
  // de auto-sync die online compositie met dit nieuwe werk (AUD-09).
  storageService.clearSaveOnlineInfo();

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
    sequences: compositionData.sequences,
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
 * (?pp= URL param). Retourneert `'ok'` als er naar de landing is genavigeerd
 * (ook bij Route C — de landing toont dan soft-recovery). Zonder navigatie:
 * `'notFound'` (klascode bestaat niet), `'busy'` (even te druk) of `'error'`
 * (technisch) — zo krijgt een leerling bij een fout nooit ten onrechte
 * "geen opdracht" te zien (AUD-07).
 *
 * Belangrijk: deze functie initialiseert GEEN template en zet geen
 * klascode-sessie. Dat gebeurt pas op de landing bij "Starten", via
 * `activatePendingAssignment`. Zo blijven de stappen reviewbaar voor de
 * leerling voordat ze echt in de studio/praatplaat-select landen.
 */
export type AssignmentLookupResult = 'ok' | 'notFound' | 'busy' | 'error';

export async function lookupAndRouteAssignment(classCode: string): Promise<AssignmentLookupResult> {
  try {
    const assignment = await getActiveAssignment(classCode);
    if (!assignment) {
      // Geen opdracht: bestaat de klas wel? Een typfout is geen "lege klas".
      const { validateClassCode } = await import('../lib/submissions');
      const klass = await validateClassCode(classCode).catch(() => undefined);
      if (klass === null) return 'notFound';
    }
    useAppStore.getState().goToAssignmentLanding({ classCode, assignment });
    return 'ok';
  } catch (err) {
    logger.error('lookupAndRouteAssignment failed:', err);
    return err instanceof AssignmentLookupError && err.kind === 'busy' ? 'busy' : 'error';
  }
}

/**
 * Bouw een ClassSession uit een ActiveAssignment (per opdracht-type de
 * juiste id/naam). Gedeeld door `activatePendingAssignment` en het
 * bewaarcode-sessie-herstel in ShareCodeInput (migratie 028).
 */
export function classSessionFromAssignment(
  classCode: string,
  assignment: ActiveAssignment,
): ClassSession | null {
  const base = {
    classCode,
    classId: assignment.classId,
    className: assignment.className,
    peerReview: assignment.peerReview,
  };
  if (assignment.type === 'template' && assignment.template) {
    return { ...base, assignmentType: 'template', assignmentId: assignment.template.id, assignmentName: assignment.template.name };
  }
  if (assignment.type === 'praatplaat' && assignment.praatplaat) {
    return { ...base, assignmentType: 'praatplaat', assignmentId: assignment.praatplaat.id, assignmentName: assignment.praatplaat.name };
  }
  if (assignment.type === 'storyboard' && assignment.storyboard) {
    return { ...base, assignmentType: 'storyboard', assignmentId: assignment.storyboard.ref, assignmentName: i18n.t(assignment.storyboard.nameKey) };
  }
  if (assignment.type === 'free' && assignment.free) {
    return { ...base, assignmentType: 'free', assignmentId: assignment.free.themeId, assignmentName: assignment.free.themeName };
  }
  return null;
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
  // Wis ook de feedback-terugweg-code van een eerdere inzending: wie bewust
  // een nieuwe klas-sessie start (gedeeld apparaat, volgende leerling) mag
  // nooit de code of reactie-melding van de vorige leerling zien (bug 5b)
  storageService.clearClassFeedbackCode();
  // Schone lei vóór het zetten van de nieuwe klas-sessie (testronde 3):
  // oude storyboard/praatplaat/template/feedback-context weg
  useAppStore.getState().resetCompositionContext();

  if (assignment.type === 'template' && assignment.template) {
    // Klascode-sessie vastleggen
    useAppStore.getState().setClassSession({
      classCode,
      classId: assignment.classId,
      className: assignment.className,
      peerReview: assignment.peerReview,
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
      peerReview: assignment.peerReview,
      assignmentType: 'praatplaat',
      assignmentId: assignment.praatplaat.id,
      assignmentName: assignment.praatplaat.name,
    });

    // Nieuwe praatplaat-sessie = nieuwe compositie: lege tijdlijn en
    // bibliotheek (B24; voorheen bleef het werk van daarvoor staan)
    useTimelineStore.getState().resetTimeline();
    useLibraryStore.getState().clearLibrary();

    useAppStore.getState().setPraatplaat({
      id: assignment.praatplaat.id,
      name: assignment.praatplaat.name,
      imageUrl: assignment.praatplaat.imageUrl,
      classId: assignment.classId,
      classCode,
      themeId: assignment.praatplaat.themeId,
      locationId: assignment.praatplaat.locationId,
    });

    // Zet het thema-geluidenpalet dat de docent aan deze praatplaat koppelde
    // (voorheen ontbrak dit → de leerling zat altijd in 'stad', ook bij een
    // piraten-praatplaat — bevinding testronde 5 / D2). Onbekend of ontbrekend
    // thema valt terug op de standaard.
    const ppThemeId = assignment.praatplaat.themeId;
    useThemeStore.getState().setTheme(
      ppThemeId && getTheme(ppThemeId) ? ppThemeId : DEFAULT_THEME_ID,
    );

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
      peerReview: assignment.peerReview,
      assignmentType: 'storyboard',
      assignmentId: assignment.storyboard.ref,
      assignmentName: i18n.t(assignment.storyboard.nameKey),
    });

    // Hergebruik de bestaande vrije-modus storyboard-init (thema + scènes → map)
    await initializeCompositionFromStoryboard(found.storyboard);
    return;
  }

  if (assignment.type === 'free' && assignment.free) {
    // Klascode-sessie vastleggen — assignmentId draagt de thema-id (geen UUID)
    useAppStore.getState().setClassSession({
      classCode,
      classId: assignment.classId,
      className: assignment.className,
      peerReview: assignment.peerReview,
      assignmentType: 'free',
      assignmentId: assignment.free.themeId,
      assignmentName: assignment.free.themeName,
    });

    // Vrije compositie binnen het gekozen thema: geen praatplaat/storyboard-
    // context. Zet compose-mode 'free' → initializeNewComposition navigeert
    // direct naar de map zodat de leerling geluiden kan verzamelen.
    useAppStore.getState().setComposeMode('free');
    await initializeNewComposition({ themeId: assignment.free.themeId });
    return;
  }

  logger.warn('[activatePendingAssignment] Onbekend assignment-type', { type: assignment.type });
}

/**
 * "Nog één voor deze opdracht" (A2): een nieuwe soundscape binnen dezelfde
 * klas-opdracht, zonder de klas te verlaten.
 * - Praatplaat: lege tijdlijn + nieuwe plek kiezen; de vorige inzending
 *   blijft op de plaat staan.
 * - Overige types: de opdracht opnieuw ophalen en naar het opdrachtscherm.
 *   "Starten" daar initialiseert alles schoon, en eventuele wijzigingen van
 *   de docent komen zo ook mee.
 * Navigeert zelf; geeft 'error' terug als dat niet lukte.
 */
export async function startAnotherForCurrentAssignment(): Promise<'ok' | 'error'> {
  const { classSession, activePraatplaat } = useAppStore.getState();
  if (!classSession) return 'error';

  if (classSession.assignmentType === 'praatplaat' && activePraatplaat) {
    useTimelineStore.getState().resetTimeline();
    useLibraryStore.getState().clearLibrary();
    useAppStore.setState({
      praatplaatPosition: null,
      submissionId: null,
      submissionSynced: false,
      currentCompositionId: null,
    });
    useAppStore.getState().goToPraatplaatSelect();
    return 'ok';
  }

  const result = await lookupAndRouteAssignment(classSession.classCode);
  return result === 'ok' ? 'ok' : 'error';
}

/**
 * @deprecated Gebruik `lookupAndRouteAssignment` — deze wrapper blijft bestaan
 * voor code die nog direct naar praatplaat-select wilde routeren, maar routeert
 * nu ook via de landing-flow (#78).
 */
export async function navigateToPraatplaat(classCode: string): Promise<boolean> {
  return (await lookupAndRouteAssignment(classCode)) === 'ok';
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
  /** Bestemming na het laden — 'stage' voor "presentatie en feedback" (testronde 2) */
  destination: 'studio' | 'stage' = 'studio',
): Promise<void> {
  // Stap 1: Laad timeline
  useTimelineStore.getState().loadTimeline({
    tracks: compositionData.tracks,
    bpm: compositionData.bpm,
    totalBeats: compositionData.totalBeats,
    isLooping: compositionData.isLooping,
    sections: compositionData.sections,
    sequences: compositionData.sequences,
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

  // Stap 5: Navigeer naar de gekozen bestemming
  if (destination === 'stage') {
    useAppStore.getState().goToStage();
  } else {
    useAppStore.getState().goToStudio();
  }
}

/**
 * Open een lokaal opgeslagen compositie ("Mijn composities") in de studio of
 * op het podium. Begint met een schone lei (B21) zodat er geen template,
 * feedback of klas-sessie van een eerder geopende compositie blijft hangen,
 * en herstelt daarna alleen wat bij déze compositie hoort.
 */
export function openLocalComposition(
  composition: SavedComposition,
  destination: 'studio' | 'stage',
): void {
  const app = useAppStore.getState();
  app.resetCompositionContext();
  app.setCurrentCompositionId(composition.id);
  // Een lokale compositie is niet de bewaarcode-compositie van daarnet:
  // ontkoppelen, anders overschrijft de auto-sync die (AUD-09).
  storageService.clearSaveOnlineInfo();

  if (composition.classSession) {
    // Volgorde: setClassSession reset submissionId/synced, dus die erná.
    app.setClassSession(composition.classSession);
    if (composition.submissionId) {
      app.setSubmissionId(composition.submissionId);
      // Een bewaarde submissionId = eerder succesvol ingeleverd: zonder deze
      // herstelstap verdween de peer-feedback-knop na heropenen.
      app.setSubmissionSynced(true);
    }
  }

  useTimelineStore.getState().loadTimeline(composition.timeline);
  useLibraryStore.getState().loadLibrary(composition.samples);
  hydrateCompositionContext({
    storyboardId: composition.storyboardId,
    praatplaat: composition.praatplaat,
    praatplaatPosition: composition.praatplaatPosition,
  });

  if (destination === 'stage') app.goToStage();
  else app.goToStudio();
}

/**
 * Open een al-geladen bewaarde compositie volledig (testronde 2): claim,
 * initialiseer, herstel de klas-sessie en zet ontvangen feedback klaar.
 * Gedeeld door het keuzescherm (ShareCodeInput) en de "Je hebt een
 * reactie!"-melding op het startscherm. Gooit bij claim/init-fouten;
 * sessie-herstel en feedback zijn nice-to-have en falen stil.
 */
export async function openSavedComposition(
  saved: SavedOnlineComposition,
  saveCode: string,
  destination: 'studio' | 'stage',
): Promise<void> {
  const { claimSavedComposition } = await import('../lib/submissions');

  // Claim eerst (genereert nieuwe secret voor dit apparaat)
  const newSecret = await claimSavedComposition(saveCode, saved.student_name);
  // Hetzelfde geheim geeft dit apparaat het recht de klas-inzending bij te
  // werken (migratie 036): de server vergelijkt met save_secret van de rij.
  storageService.setSubmissionSecret(saved.id, newSecret);

  // Schone lei (B21): context van een eerder geopende compositie mag niet
  // doorlekken. Anders overschrijft "Opslaan" die andere lokale compositie
  // (currentCompositionId), gaat inleveren naar een oude klas, of blijven
  // oude feedback en template-vergrendelingen staan.
  useAppStore.getState().resetCompositionContext();

  // Klas-sessie herstellen (migratie 028) — VÓÓR de navigatie, zodat het
  // podium bij mount meteen de sessie, code-badge en feedback kan tonen.
  if (saved.class_code) {
    try {
      const assignment = await getActiveAssignment(saved.class_code);
      const session = assignment ? classSessionFromAssignment(saved.class_code, assignment) : null;
      if (session) {
        // Volgorde: setClassSession reset submissionId/synced, dus die erná.
        useAppStore.getState().setClassSession(session);
        useAppStore.getState().setSubmissionId(saved.id);
        useAppStore.getState().setSubmissionSynced(true);
      }
      // Bind de bewaarcode aan deze inzending: zo toont het podium de
      // code-badge (useStageSave matcht op submissionId) en blijft de
      // "je hebt een reactie"-check op dit apparaat werken.
      const existing = storageService.getClassFeedbackCode();
      storageService.setClassFeedbackCode({
        saveCode,
        compositionName: saved.composition_name,
        lastSeenFeedbackAt: existing?.saveCode === saveCode ? existing.lastSeenFeedbackAt : null,
        submissionId: saved.id,
      });
    } catch (err) {
      logger.warn('Klas-sessie herstellen via bewaarcode mislukt', err);
    }
  }

  // Docent-feedback + klasgenoot-beoordelingen klaarzetten voor het
  // feedbackblok op het podium — ook vóór de navigatie.
  try {
    const { getPeerCompliments } = await import('../lib/peerFeedback');
    const compliments = await getPeerCompliments(saveCode);
    if (saved.feedback_at || compliments.length > 0) {
      useAppStore.getState().setReceivedFeedback({
        sticker: saved.feedback_sticker ?? null,
        level: saved.feedback_level ?? null,
        text: saved.feedback_text ?? null,
        at: saved.feedback_at ?? null,
        compliments,
      });
      // Dedup voor de "je hebt een reactie"-melding op het startscherm
      const info = storageService.getClassFeedbackCode();
      if (info?.saveCode === saveCode && saved.feedback_at) {
        storageService.setClassFeedbackCode({
          ...info,
          lastSeenFeedbackAt: saved.feedback_at,
        });
      }
    }
  } catch (err) {
    logger.warn('Feedback/complimenten laden via bewaarcode mislukt', err);
  }

  // Laden + navigeren als laatste stap
  await initializeFromSavedComposition(
    saved.composition_data,
    saved.composition_name,
    saveCode,
    newSecret,
    destination,
  );
}
