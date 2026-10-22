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
