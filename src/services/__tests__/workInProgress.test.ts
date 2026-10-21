/**
 * A1/B32: werk-in-uitvoering overleeft herladen. De snapshot bevat
 * tijdlijn, bibliotheek en klas-context; een lege werkplek wist hem.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  snapshotWorkInProgress,
  restoreWorkInProgress,
  readWorkInProgress,
} from '../workInProgress';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { useLibraryStore } from '../../stores/libraryStore';
import type { ClassSession, Sample } from '../../types';

const SESSION: ClassSession = {
  classCode: '4821', classId: 'c1', className: 'Groep 6b',
  assignmentType: 'free', assignmentId: 'basis', assignmentName: 'Basis',
};

const SAMPLE = {
  id: 'park-birds', name: 'Vogels', locationId: 'park', audioUrl: '/a.mp3',
  duration: 2, icon: 'bird', color: '#fff', extraField: 'blijft',
} as unknown as Sample;

function resetAll() {
  useTimelineStore.getState().resetTimeline();
  useLibraryStore.getState().clearLibrary();
  useAppStore.getState().resetCompositionContext();
}

function placeWork() {
  const tracks = useTimelineStore.getState().tracks.map((tr, i) =>
    i === 0 ? { ...tr, clips: [{ id: 'k1', sampleId: 'park-birds', startBeat: 4 }] } : tr);
  useTimelineStore.setState({ tracks, totalBeats: 192 });
  useLibraryStore.getState().loadLibrary([SAMPLE]);
  useAppStore.getState().setClassSession(SESSION);
  useAppStore.setState({ submissionId: 'sub-1', submissionSynced: true, currentCompositionId: 'comp-1' });
}

describe('workInProgress (A1)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAll();
  });

  it('herstelt tijdlijn, bibliotheek en klas-context na "herladen"', () => {
    placeWork();
    snapshotWorkInProgress();
    resetAll(); // = verse pagina

    expect(restoreWorkInProgress()).toBe(true);
    const timeline = useTimelineStore.getState();
    expect(timeline.tracks[0].clips[0].startBeat).toBe(4);
    expect(timeline.totalBeats).toBe(192);
    const lib = useLibraryStore.getState().librarySamples;
    expect(lib[0].id).toBe('park-birds');
    // Velden buiten het schema gaan niet verloren
    expect((lib[0] as unknown as { extraField: string }).extraField).toBe('blijft');
    const app = useAppStore.getState();
    expect(app.classSession?.className).toBe('Groep 6b');
    expect(app.submissionId).toBe('sub-1');
    expect(app.submissionSynced).toBe(true);
    expect(app.currentCompositionId).toBe('comp-1');
  });

  it('een lege werkplek wist de snapshot', () => {
    placeWork();
    snapshotWorkInProgress();
    resetAll();
    snapshotWorkInProgress();
    expect(readWorkInProgress()).toBeNull();
  });

  it('overschrijft geen werk dat al open staat', () => {
    placeWork();
    snapshotWorkInProgress();
    useTimelineStore.setState({ totalBeats: 256 });
    expect(restoreWorkInProgress()).toBe(false);
    expect(useTimelineStore.getState().totalBeats).toBe(256);
  });

  it('negeert een kapotte snapshot', () => {
    localStorage.setItem('soundscout:wip', '{"version":1,"oops":true}');
    expect(readWorkInProgress()).toBeNull();
    expect(restoreWorkInProgress()).toBe(false);
  });
});
