/**
 * "Klaar, ik stop" (fase 5.5, eindtest E1): een kind op een gedeelde
 * schoolcomputer ruimt na het inleveren zijn spoor op. Het werk staat veilig
 * bij de docent en is met de bewaarcode overal terug te halen; op dit
 * apparaat blijft er niets van over dat een volgende leerling kan openen of
 * overschrijven.
 */

import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { storageService } from '../services/StorageService';
import { clearWorkInProgress } from '../services/workInProgress';
import { markOwnSitting } from '../services/sitting';
import i18n from '../i18n';

export function finishSession(): void {
  const app = useAppStore.getState();
  const submissionId = app.submissionId;

  // Lokale kopieën van déze inzending (en de open compositie) weg
  for (const c of storageService.getCompositions()) {
    if ((submissionId && c.submissionId === submissionId) || c.id === app.currentCompositionId) {
      storageService.deleteComposition(c.id);
    }
  }
  if (submissionId) storageService.removeSubmissionSecret(submissionId);
  storageService.clearClassFeedbackCode();
  storageService.clearSaveOnlineInfo();

  useTimelineStore.getState().resetTimeline();
  useLibraryStore.getState().clearLibrary();
  app.resetCompositionContext();
  clearWorkInProgress();
  app.goToStart();
}

/**
 * "Ik ben iemand anders" (mockup B3): het werk van het vorige kind gaat van
 * het werkblad af, maar wordt niet weggegooid. Stond er al iets op de
 * tijdlijn, dan komt het bij "Mijn soundscapes" op dit apparaat te staan
 * (met de klas erbij, zodat het vorige kind er later mee verder kan). Alleen
 * verzamelde geluidjes zonder soundscape worden niet bewaard.
 */
export function setWorkAside(): void {
  const app = useAppStore.getState();
  const timelineStore = useTimelineStore.getState();
  const samples = useLibraryStore.getState().librarySamples;

  if (timelineStore.selectHasClips()) {
    const timeline = timelineStore.getTimelineState();
    const existing = app.currentCompositionId ? storageService.getCompositionById(app.currentCompositionId) : null;
    if (existing) {
      storageService.updateComposition(existing.id, { timeline, samples });
    } else {
      storageService.saveComposition(
        app.compositionTitle.trim() || i18n.t('start.ownerCheck.asideName'),
        timeline,
        samples,
        app.activeStoryboard?.id,
        app.classSession ?? undefined,
        app.submissionId ?? undefined,
        app.activePraatplaat ?? undefined,
        app.praatplaatPosition ?? undefined,
      );
    }
  }

  timelineStore.resetTimeline();
  useLibraryStore.getState().clearLibrary();
  app.resetCompositionContext();
  clearWorkInProgress();
  // Vanaf nu is dit de zitting van het nieuwe kind
  markOwnSitting();
}
