/**
 * Onbewaard werk (fase 5.4, eindtest E5/H4).
 *
 * Openen uit Mijn soundscapes, met een klascode of met een bewaarcode zet
 * een andere soundscape in de studio. Sinds het onthouden werk (A1) is het
 * vorige werk dan echt weg. Voordat dat gebeurt, vragen we het de leerling.
 */

import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { storageService } from '../services/StorageService';
import { randomTitle } from './randomTitles';
import i18n from '../i18n';

function timelineKey(t: { tracks: unknown; sections?: unknown; sequences?: unknown }): string {
  return JSON.stringify([t.tracks, t.sections ?? [], t.sequences ?? []]);
}

/** Staat er werk open dat nog niet (zo) in Mijn soundscapes staat? */
export function hasUnsavedWork(): boolean {
  const timeline = useTimelineStore.getState();
  if (!timeline.selectHasClips()) return false;
  const id = useAppStore.getState().currentCompositionId;
  const stored = id ? storageService.getCompositionById(id) : null;
  if (!stored) return true;
  return timelineKey(stored.timeline) !== timelineKey(timeline.getTimelineState());
}

/** Bewaar het open werk in Mijn soundscapes (titel automatisch als die ontbreekt) */
export function saveWorkLocally(): boolean {
  const app = useAppStore.getState();
  const name = app.compositionTitle.trim() || randomTitle(i18n.language);
  const timeline = useTimelineStore.getState().getTimelineState();
  const samples = useLibraryStore.getState().librarySamples;
  const context = {
    classSession: app.classSession ?? undefined,
    submissionId: app.submissionId ?? undefined,
    storyboardId: app.activeStoryboard?.id,
    praatplaat: app.activePraatplaat ?? undefined,
    praatplaatPosition: app.praatplaatPosition ?? undefined,
  };
  if (app.currentCompositionId && storageService.getCompositionById(app.currentCompositionId)) {
    return !!storageService.updateComposition(app.currentCompositionId, { name, timeline, samples, ...context });
  }
  const saved = storageService.saveComposition(
    name, timeline, samples, context.storyboardId, context.classSession,
    context.submissionId, context.praatplaat, context.praatplaatPosition,
  );
  if (saved) app.setCurrentCompositionId(saved.id);
  return !!saved;
}
