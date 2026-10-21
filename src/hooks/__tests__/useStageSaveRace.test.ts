/**
 * E2 (eindtest): tijdens het inleveren begint de leerling een nieuwe
 * soundscape. Het antwoord van de server mag de nieuwe sessie niet aan de
 * vorige inzending koppelen.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let resolveSubmit: (v: { id: string; saveCode: string | null; saveSecret: string | null }) => void = () => {};
vi.mock('../../lib/submissions', async (orig) => ({
  ...(await orig<typeof import('../../lib/submissions')>()),
  submitOrUpdateComposition: vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; })),
}));

import { useStageSave } from '../useStageSave';
import { useAppStore } from '../../stores/appStore';
import { storageService } from '../../services/StorageService';
import type { ClassSession } from '../../types';

const SESSION: ClassSession = {
  classCode: '3597', classId: 'c1', className: 'Klas-Test',
  assignmentType: 'storyboard', assignmentId: 'schattenjacht', assignmentName: 'De schattenjacht',
};

describe('inleveren tijdens wisselen van soundscape (E2)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().resetCompositionContext();
    useAppStore.getState().setClassSession(SESSION);
    useAppStore.setState({ isSubmitting: false });
  });

  it('koppelt de nieuwe soundscape niet aan de vorige inzending', async () => {
    const { result } = renderHook(() => useStageSave());
    act(() => result.current.setCompositionName('Verre Droom'));
    act(() => result.current.handIn());
    const firstId = useAppStore.getState().currentCompositionId;
    expect(useAppStore.getState().isSubmitting).toBe(true);

    // Leerling begint intussen een nieuwe soundscape bij dezelfde opdracht
    useAppStore.getState().resetCompositionContext();
    useAppStore.getState().setClassSession(SESSION);

    await act(async () => {
      resolveSubmit({ id: 'sub-verre-droom', saveCode: 'ABC234', saveSecret: 'geheim' });
      await new Promise((r) => setTimeout(r, 0));
    });

    const s = useAppStore.getState();
    expect(s.submissionId).toBeNull();
    expect(s.submissionSynced).toBe(false);
    expect(s.isSubmitting).toBe(false);
    // De oude compositie en het geheim krijgen de inzending wél
    expect(storageService.getCompositionById(firstId!)?.submissionId).toBe('sub-verre-droom');
    expect(storageService.getSubmissionSecret('sub-verre-droom')).toBe('geheim');
  });

  it('zonder wissel: sessie krijgt de inzending', async () => {
    const { result } = renderHook(() => useStageSave());
    act(() => result.current.setCompositionName('Storm'));
    act(() => result.current.handIn());
    await act(async () => {
      resolveSubmit({ id: 'sub-storm', saveCode: 'XYZ789', saveSecret: 's' });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(useAppStore.getState().submissionId).toBe('sub-storm');
    expect(useAppStore.getState().submissionSynced).toBe(true);
  });
});
