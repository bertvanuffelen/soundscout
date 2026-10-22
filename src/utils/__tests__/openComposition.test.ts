/**
 * B21: een compositie openen begint met een schone lei. Context van een
 * eerder geopende compositie (compositie-id, klas-sessie, feedback,
 * template) mag niet doorlekken.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { openLocalComposition } from '../compositionInit';
import { useAppStore } from '../../stores/appStore';
import type { SavedComposition, ClassSession, Template } from '../../types';

const OLD_SESSION: ClassSession = {
  classCode: '1111', classId: 'old', className: 'Oude klas',
  assignmentType: 'free', assignmentId: 'basis', assignmentName: 'Basis',
};

function composition(overrides: Partial<SavedComposition> = {}): SavedComposition {
  return {
    id: 'new-comp',
    name: 'Nieuw',
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z',
    timeline: { tracks: [], bpm: 120, totalBeats: 128, isLooping: false },
    samples: [],
    metadata: { trackCount: 0, clipCount: 0, durationBeats: 0, durationSeconds: 0, sampleIds: [] } as unknown as SavedComposition['metadata'],
    ...overrides,
  };
}

describe('openLocalComposition (B21)', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentScreen: 'start',
      currentCompositionId: 'old-comp',
      classSession: OLD_SESSION,
      submissionId: 'old-sub',
      submissionSynced: true,
      receivedFeedback: { sticker: 'star', level: 2, text: 'oud', at: '2026-10-01' },
      activeTemplate: { id: 't1' } as unknown as Template,
    });
  });

  it('wist oude klas-sessie, feedback en template bij een compositie zonder klas', () => {
    openLocalComposition(composition(), 'stage');
    const s = useAppStore.getState();
    expect(s.currentCompositionId).toBe('new-comp');
    expect(s.classSession).toBeNull();
    expect(s.submissionId).toBeNull();
    expect(s.receivedFeedback).toBeNull();
    expect(s.activeTemplate).toBeNull();
    expect(s.currentScreen).toBe('stage');
  });

  it('herstelt alleen de klas-sessie van déze compositie', () => {
    const own: ClassSession = { ...OLD_SESSION, classCode: '4821', classId: 'mine', className: 'Groep 6b' };
    openLocalComposition(composition({ classSession: own, submissionId: 'my-sub' }), 'studio');
    const s = useAppStore.getState();
    expect(s.classSession?.className).toBe('Groep 6b');
    expect(s.submissionId).toBe('my-sub');
    expect(s.submissionSynced).toBe(true);
    expect(s.receivedFeedback).toBeNull();
    expect(s.currentScreen).toBe('studio');
  });
});
