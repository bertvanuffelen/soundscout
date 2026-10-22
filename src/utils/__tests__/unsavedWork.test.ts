/**
 * Fase 5.4 (E5): onbewaard werk herkennen en lokaal bewaren.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasUnsavedWork, saveWorkLocally } from '../unsavedWork';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { storageService } from '../../services/StorageService';

const place = (beat: number) => useTimelineStore.setState((s) => ({
  tracks: s.tracks.map((tr, i) => (i === 0 ? { ...tr, clips: [{ id: 'k', sampleId: 's', startBeat: beat }] } : tr)),
}));

describe('unsavedWork', () => {
  beforeEach(() => {
    localStorage.clear();
    useTimelineStore.getState().resetTimeline();
    useAppStore.getState().resetCompositionContext();
  });

  it('lege tijdlijn is nooit onbewaard', () => {
    expect(hasUnsavedWork()).toBe(false);
  });

  it('nieuw werk is onbewaard tot het bewaard is; een wijziging maakt het weer onbewaard', () => {
    place(0);
    expect(hasUnsavedWork()).toBe(true);
    expect(saveWorkLocally()).toBe(true);
    expect(hasUnsavedWork()).toBe(false);
    expect(storageService.getCompositions()).toHaveLength(1);
    place(4);
    expect(hasUnsavedWork()).toBe(true);
    saveWorkLocally();
    expect(storageService.getCompositions()).toHaveLength(1); // bijgewerkt, geen kopie
  });
});
