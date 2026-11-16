/**
 * useClassAssignment op TanStack Query: actieve + eerdere opdrachten laden,
 * elke activatie (server → herladen, met loading aan zoals voorheen),
 * deactiveren, uit de historie halen, de opdrachtkaart wisselen en de
 * afscherming per klas en per docent.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryWrapper, createTestQueryClient, type TestAuth } from '../../query/testUtils';
import type { ClassAssignmentRow } from '../../lib/assignments';

const lib = vi.hoisted(() => ({
  fetchClassAssignment: vi.fn(), fetchPastAssignments: vi.fn(), activateAssignment: vi.fn(),
  deactivateAssignment: vi.fn(), deleteAssignmentFromHistory: vi.fn(), updateAssignmentCard: vi.fn(),
  activatePraatplaatFromCatalog: vi.fn(),
}));

vi.mock('../../lib/assignments', () => ({
  fetchClassAssignment: lib.fetchClassAssignment, fetchPastAssignments: lib.fetchPastAssignments,
  activateAssignment: lib.activateAssignment, deactivateAssignment: lib.deactivateAssignment,
  deleteAssignmentFromHistory: lib.deleteAssignmentFromHistory, updateAssignmentCard: lib.updateAssignmentCard,
}));
vi.mock('../../lib/praatplaat', () => ({ activatePraatplaatFromCatalog: lib.activatePraatplaatFromCatalog }));

import { useClassAssignment } from '../useClassAssignment';

const row = (id: string, extra: Partial<ClassAssignmentRow> = {}): ClassAssignmentRow => ({
  id, classId: 'c1', teacherId: 't', type: 'free', templateId: null, praatplaatId: null,
  storyboardRef: null, freeThemeId: 'basis', isActive: true, activatedAt: '2026-11-16',
  durationLabel: null, cardId: null, praatplaatThemeId: null, assignmentName: `Opdracht ${id}`, imageUrl: null,
  ...extra,
});

let client: QueryClient;
let auth: TestAuth;

function render(classId = 'c1') {
  return renderHook((props: { classId: string }) => useClassAssignment(props.classId), {
    wrapper: createQueryWrapper(client, auth), initialProps: { classId },
  });
}

async function renderLoaded() {
  const hook = render();
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  Object.values(lib).forEach((fn) => fn.mockReset());
  lib.fetchClassAssignment.mockResolvedValue(row('a1'));
  lib.fetchPastAssignments.mockResolvedValue([row('p1', { isActive: false }), row('p2', { isActive: false })]);
  client = createTestQueryClient();
  auth = { userId: 'teacher-a' };
});
afterEach(() => client.clear());

describe('useClassAssignment — laden', () => {
  it('laadt de actieve en de eerdere opdrachten', async () => {
    const { result } = render();
    expect(result.current.loading).toBe(true);
    expect(result.current.activeAssignment).toBeNull();
    expect(result.current.pastAssignments).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeAssignment?.id).toBe('a1');
    expect(result.current.pastAssignments.map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(lib.fetchClassAssignment).toHaveBeenCalledWith('c1');
    expect(lib.fetchPastAssignments).toHaveBeenCalledWith('c1');
  });

  it('geen actieve opdracht is geen fout', async () => {
    lib.fetchClassAssignment.mockResolvedValue(null);
    const { result } = await renderLoaded();
    expect(result.current.activeAssignment).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('toont altijd de vaste laadmelding, wat de onderliggende fout ook is', async () => {
    lib.fetchPastAssignments.mockRejectedValue(new Error('interne details'));
    const { result } = await renderLoaded();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).not.toContain('interne details');
    expect(lib.fetchPastAssignments).toHaveBeenCalledTimes(1);
  });

  it('houdt klassen en docenten uit elkaar', async () => {
    lib.fetchClassAssignment.mockImplementation(async (classId: string) => row(`${auth.userId}-${classId}`));
    const { result, rerender } = render('c1');
    await waitFor(() => expect(result.current.activeAssignment?.id).toBe('teacher-a-c1'));

    rerender({ classId: 'c2' });
    expect(result.current.activeAssignment).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.activeAssignment?.id).toBe('teacher-a-c2'));

    auth.userId = 'teacher-b';
    rerender({ classId: 'c1' });
    expect(result.current.activeAssignment).toBeNull();
    await waitFor(() => expect(result.current.activeAssignment?.id).toBe('teacher-b-c1'));
  });
});

describe('useClassAssignment — activeren', () => {
  const cases = [
    ['activateTemplate', (h: ReturnType<typeof useClassAssignment>) => h.activateTemplate('tpl', 'card'), { templateId: 'tpl', cardId: 'card' }],
    ['activatePraatplaat', (h: ReturnType<typeof useClassAssignment>) => h.activatePraatplaat('pp', null), { praatplaatId: 'pp', cardId: null }],
    ['activateStoryboard', (h: ReturnType<typeof useClassAssignment>) => h.activateStoryboard('sb'), { storyboardRef: 'sb', cardId: undefined }],
    ['activateFree', (h: ReturnType<typeof useClassAssignment>) => h.activateFree('stad', 'card'), { freeThemeId: 'stad', cardId: 'card' }],
  ] as const;

  it.each(cases)('%s: server eerst, daarna herladen', async (_name, run, params) => {
    const { result } = await renderLoaded();
    lib.activateAssignment.mockResolvedValue('new');
    lib.fetchClassAssignment.mockResolvedValue(row('new'));

    await act(async () => { await run(result.current); });

    expect(lib.activateAssignment).toHaveBeenCalledWith('c1', params);
    await waitFor(() => expect(result.current.activeAssignment?.id).toBe('new'));
    expect(lib.fetchClassAssignment).toHaveBeenCalledTimes(2);
    expect(result.current.operationError).toBeNull();
  });

  it.each(cases)('%s mislukt: melding, fout doorgegeven, niets herladen', async (_name, run) => {
    const { result } = await renderLoaded();
    lib.activateAssignment.mockRejectedValue(new Error('Kon opdracht niet activeren'));

    await act(async () => { await expect(run(result.current)).rejects.toThrow('Kon opdracht niet activeren'); });

    expect(result.current.operationError).toBe('Kon opdracht niet activeren');
    expect(result.current.activeAssignment?.id).toBe('a1');
    expect(lib.fetchClassAssignment).toHaveBeenCalledTimes(1);
  });

  it('activatePraatplaatFromCatalog: find-or-create op de server, daarna herladen', async () => {
    const { result } = await renderLoaded();
    const entry = { name: 'Haven', themeId: 'stad', locationId: 'haven', imageUrl: '/h.webp' };
    lib.activatePraatplaatFromCatalog.mockResolvedValue('x');
    lib.fetchClassAssignment.mockResolvedValue(row('pp', { type: 'praatplaat' }));

    await act(async () => { await result.current.activatePraatplaatFromCatalog(entry, 'card'); });

    expect(lib.activatePraatplaatFromCatalog).toHaveBeenCalledWith('c1', entry, 'card');
    await waitFor(() => expect(result.current.activeAssignment?.id).toBe('pp'));

    lib.activatePraatplaatFromCatalog.mockRejectedValue(new Error('mislukt'));
    await act(async () => { await expect(result.current.activatePraatplaatFromCatalog(entry)).rejects.toThrow(); });
    expect(result.current.operationError).toBe('mislukt');
  });

  it('zet loading aan tijdens het herladen na een activatie (zoals voorheen)', async () => {
    const { result } = await renderLoaded();
    lib.activateAssignment.mockResolvedValue('new');
    let release: (r: ClassAssignmentRow) => void = () => {};
    lib.fetchClassAssignment.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    let done: Promise<void> = Promise.resolve();
    act(() => { done = result.current.activateFree('stad'); });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => { release(row('new')); await done; });
    expect(result.current.loading).toBe(false);
    expect(result.current.activeAssignment?.id).toBe('new');
  });
});

describe('useClassAssignment — deactiveren, historie en opdrachtkaart', () => {
  it('deactivate haalt de actieve opdracht weg zonder te herladen', async () => {
    const { result } = await renderLoaded();
    lib.deactivateAssignment.mockResolvedValue(undefined);

    await act(async () => { await result.current.deactivate(); });

    expect(lib.deactivateAssignment).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(result.current.activeAssignment).toBeNull());
    expect(result.current.pastAssignments.map((r) => r.id)).toEqual(['p1', 'p2']);
    expect(lib.fetchClassAssignment).toHaveBeenCalledTimes(1);
  });

  it('deactivate mislukt: opdracht blijft actief, melding', async () => {
    const { result } = await renderLoaded();
    lib.deactivateAssignment.mockRejectedValue(new Error('Kon opdracht niet deactiveren'));

    await act(async () => { await expect(result.current.deactivate()).rejects.toThrow(); });

    expect(result.current.activeAssignment?.id).toBe('a1');
    expect(result.current.operationError).toBe('Kon opdracht niet deactiveren');
  });

  it('removeFromHistory haalt de rij uit de historie; bij een fout blijft hij staan', async () => {
    const { result } = await renderLoaded();
    lib.deleteAssignmentFromHistory.mockResolvedValue(undefined);

    await act(async () => { await result.current.removeFromHistory('p1'); });
    await waitFor(() => expect(result.current.pastAssignments.map((r) => r.id)).toEqual(['p2']));
    expect(result.current.activeAssignment?.id).toBe('a1');

    lib.deleteAssignmentFromHistory.mockRejectedValue(new Error('mislukt'));
    await act(async () => { await expect(result.current.removeFromHistory('p2')).rejects.toThrow(); });
    expect(result.current.pastAssignments.map((r) => r.id)).toEqual(['p2']);
    expect(result.current.operationError).toBe('mislukt');
  });

  it('updateCard: server eerst, daarna herladen; bij een fout niets herladen', async () => {
    const { result } = await renderLoaded();
    lib.updateAssignmentCard.mockResolvedValue(undefined);
    lib.fetchClassAssignment.mockResolvedValue(row('a1', { cardId: 'k1' }));

    await act(async () => { await result.current.updateCard('a1', 'k1'); });
    expect(lib.updateAssignmentCard).toHaveBeenCalledWith('a1', 'k1');
    await waitFor(() => expect(result.current.activeAssignment?.cardId).toBe('k1'));

    lib.updateAssignmentCard.mockRejectedValue(new Error('Kon de opdrachtkaart niet bijwerken'));
    const fetches = lib.fetchClassAssignment.mock.calls.length;
    await act(async () => { await expect(result.current.updateCard('a1', null)).rejects.toThrow(); });
    expect(result.current.operationError).toBe('Kon de opdrachtkaart niet bijwerken');
    expect(lib.fetchClassAssignment).toHaveBeenCalledTimes(fetches);
  });
});
