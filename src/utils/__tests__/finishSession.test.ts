/**
 * Fase 5.5 (E1): gedeeld apparaat.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { finishSession } from '../finishSession';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { storageService } from '../../services/StorageService';
import { snapshotWorkInProgress, readWorkInProgress, WIP_MAX_AGE_MS } from '../../services/workInProgress';
import type { ClassSession } from '../../types';

const SESSION: ClassSession = {
  classCode: '3597', classId: 'c1', className: 'Klas-Test',
  assignmentType: 'free', assignmentId: 'basis', assignmentName: 'Basis',
};

const place = () => useTimelineStore.setState((s) => ({
  tracks: s.tracks.map((tr, i) => (i === 0 ? { ...tr, clips: [{ id: 'k', sampleId: 's', startBeat: 0 }] } : tr)),
}));

describe('gedeeld apparaat (E1)', () => {
  beforeEach(() => {
    localStorage.clear();
    useTimelineStore.getState().resetTimeline();
    useAppStore.getState().resetCompositionContext();
  });

  it('"Klaar, ik stop" haalt klaswerk, geheim, feedbackcode en onthouden werk weg', () => {
    place();
    useAppStore.getState().setClassSession(SESSION);
    const comp = storageService.saveComposition('Geheime Droom', useTimelineStore.getState().getTimelineState(), [], undefined, SESSION, 'sub-a');
    const other = storageService.saveComposition('Van iemand anders', useTimelineStore.getState().getTimelineState(), []);
    useAppStore.setState({ currentCompositionId: comp!.id, submissionId: 'sub-a', submissionSynced: true });
    storageService.setSubmissionSecret('sub-a', 'geheim');
    storageService.setClassFeedbackCode({ saveCode: '369NC8', compositionName: 'Geheime Droom', submissionId: 'sub-a' });
    snapshotWorkInProgress();

    finishSession();

    expect(storageService.getCompositions().map((c) => c.id)).toEqual([other!.id]);
    expect(storageService.getSubmissionSecret('sub-a')).toBeNull();
    expect(storageService.getClassFeedbackCode()).toBeNull();
    expect(readWorkInProgress()).toBeNull();
    const s = useAppStore.getState();
    expect(s.classSession).toBeNull();
    expect(s.submissionId).toBeNull();
    expect(s.currentScreen).toBe('start');
    expect(useTimelineStore.getState().selectHasClips()).toBe(false);
  });

  it('onthouden werk ouder dan 12 uur wordt vergeten', () => {
    place();
    snapshotWorkInProgress();
    const raw = JSON.parse(localStorage.getItem('soundscout:wip')!);
    raw.savedAt = new Date(Date.now() - WIP_MAX_AGE_MS - 60_000).toISOString();
    localStorage.setItem('soundscout:wip', JSON.stringify(raw));
    expect(readWorkInProgress()).toBeNull();
    expect(localStorage.getItem('soundscout:wip')).toBeNull();
  });
});
