/**
 * useSubmissions op TanStack Query: laden, fouten, verwijderen, feedback,
 * de optimistische "gezien"-stempel, de polling tijdens presenteren en de
 * afscherming tussen docenten.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { focusManager, type QueryClient } from '@tanstack/react-query';
import { createQueryWrapper, createTestQueryClient, type TestAuth } from '../../query/testUtils';
import { queryKeys } from '../../query/queryKeys';
import type { Submission } from '../useSubmissions';

type Reply = { data: unknown; error: unknown };

const backend = {
  select: vi.fn<(classId: string) => Reply | Promise<Reply>>(),
  remove: vi.fn<(id: string) => Reply>(),
};
const setFeedbackRpc = vi.fn<(id: string, feedback: unknown) => Promise<void>>();
const markSeenRpc = vi.fn<(id: string) => Promise<void>>();

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({
    from: () => {
      let op: 'select' | 'delete' = 'select';
      const eq: Record<string, string> = {};
      const builder = {
        select: () => builder,
        order: () => builder,
        delete: () => { op = 'delete'; return builder; },
        eq: (column: string, value: string) => { eq[column] = value; return builder; },
        then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(op === 'delete' ? backend.remove(eq.id) : backend.select(eq.class_id)).then(resolve, reject),
      };
      return builder;
    },
  }),
}));

vi.mock('../../lib/submissions', () => ({
  setSubmissionFeedback: (id: string, feedback: unknown) => setFeedbackRpc(id, feedback),
  markSubmissionSeen: (id: string) => markSeenRpc(id),
}));

import { useSubmissions } from '../useSubmissions';

function sub(id: string, extra: Partial<Submission> = {}): Submission {
  return {
    id,
    student_name: `Leerling ${id}`,
    composition_name: `Stuk ${id}`,
    composition_data: {} as Submission['composition_data'],
    created_at: '2026-11-16T09:00:00Z',
    ...extra,
  };
}

let client: QueryClient;
let auth: TestAuth;

function render(classId = 'c1', pollIntervalMs: number | false = false) {
  return renderHook(
    (props: { classId: string; pollIntervalMs: number | false }) =>
      useSubmissions(props.classId, { pollIntervalMs: props.pollIntervalMs }),
    { wrapper: createQueryWrapper(client, auth), initialProps: { classId, pollIntervalMs } },
  );
}

beforeEach(() => {
  backend.select.mockReset().mockReturnValue({ data: [sub('s1'), sub('s2')], error: null });
  backend.remove.mockReset().mockReturnValue({ data: null, error: null });
  setFeedbackRpc.mockReset().mockResolvedValue(undefined);
  markSeenRpc.mockReset().mockResolvedValue(undefined);
  client = createTestQueryClient();
  auth = { userId: 'teacher-a' };
});

afterEach(() => {
  client.clear();
  focusManager.setFocused(undefined);
});

describe('useSubmissions — laden', () => {
  it('laadt de inzendingen van de klas', async () => {
    const { result } = render();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submissions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(backend.select).toHaveBeenCalledWith('c1');
    expect(result.current.error).toBeNull();
  });

  it('toont de foutmelding van de server', async () => {
    backend.select.mockReturnValue({ data: null, error: new Error('permission denied') });
    const { result } = render();

    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.loading).toBe(false);
    expect(result.current.submissions).toEqual([]);
    expect(backend.select).toHaveBeenCalledTimes(1);
  });

  it('doet niets zonder klas-id', async () => {
    const { result } = render('');
    expect(result.current.loading).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(backend.select).not.toHaveBeenCalled();
  });

  it('houdt de lijst vast als een latere ververs-poging mislukt', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    backend.select.mockReturnValue({ data: null, error: new Error('permission denied') });
    await act(async () => { await result.current.refetch(); });

    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.submissions).toHaveLength(2);
  });
});

describe('useSubmissions — verwijderen en feedback', () => {
  it('haalt een inzending uit de lijst na een geslaagde verwijdering', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    await act(async () => { await result.current.deleteSubmission('s1'); });

    expect(backend.remove).toHaveBeenCalledWith('s1');
    await waitFor(() => expect(result.current.submissions.map((s) => s.id)).toEqual(['s2']));
  });

  it('laat de inzending staan en meldt de fout als verwijderen mislukt', async () => {
    backend.remove.mockReturnValue({ data: null, error: { message: 'mag niet' } });
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    await act(async () => {
      await expect(result.current.deleteSubmission('s1')).rejects.toThrow('mag niet');
    });
    expect(result.current.submissions).toHaveLength(2);
    expect(result.current.operationError).toContain('mag niet');
  });

  it('zet feedback in de lijst zodra de server hem heeft opgeslagen', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    await act(async () => {
      await result.current.setFeedback('s2', { sticker: 'star', level: 2, text: '  Mooi ritme  ' });
    });

    expect(setFeedbackRpc).toHaveBeenCalledWith('s2', { sticker: 'star', level: 2, text: '  Mooi ritme  ' });
    await waitFor(() => expect(result.current.submissions[1].feedback_at).toBeTruthy());
    expect(result.current.submissions[1]).toMatchObject({
      feedback_sticker: 'star', feedback_level: 2, feedback_text: 'Mooi ritme',
    });
    expect(result.current.submissions[0].feedback_at).toBeUndefined();
  });

  it('wist het feedback-stempel als alle feedback leeg is', async () => {
    backend.select.mockReturnValue({ data: [sub('s1', { feedback_at: '2026-11-15T10:00:00Z', feedback_text: 'Oud' })], error: null });
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => { await result.current.setFeedback('s1', { sticker: null, level: null, text: '  ' }); });

    await waitFor(() => expect(result.current.submissions[0].feedback_at).toBeNull());
    expect(result.current.submissions[0].feedback_text).toBeNull();
  });

  it('laat de lijst ongemoeid en geeft de fout door als feedback opslaan mislukt', async () => {
    setFeedbackRpc.mockRejectedValue(new Error('Kon feedback niet opslaan'));
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    await act(async () => {
      await expect(result.current.setFeedback('s1', { sticker: 'star', level: 1, text: null }))
        .rejects.toThrow('Kon feedback niet opslaan');
    });
    expect(result.current.submissions[0].feedback_at).toBeUndefined();
    // Zoals voorheen: deze fout komt niet in operationError, de aanroeper toont hem
    expect(result.current.operationError).toBeNull();
  });
});

describe('useSubmissions — gezien-stempel (optimistisch)', () => {
  it('stempelt meteen, nog vóór de server antwoordt', async () => {
    let release: () => void = () => {};
    markSeenRpc.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    act(() => result.current.markSeen('s1'));

    await waitFor(() => expect(result.current.submissions[0].teacher_seen_at).toBeTruthy());
    expect(result.current.submissions[1].teacher_seen_at).toBeUndefined();
    expect(markSeenRpc).toHaveBeenCalledWith('s1');
    await act(async () => { release(); });
    expect(result.current.submissions[0].teacher_seen_at).toBeTruthy();
  });

  it('overschrijft een bestaande stempel niet', async () => {
    backend.select.mockReturnValue({ data: [sub('s1', { teacher_seen_at: '2026-11-10T08:00:00Z' })], error: null });
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    act(() => result.current.markSeen('s1'));
    await waitFor(() => expect(markSeenRpc).toHaveBeenCalled());

    expect(result.current.submissions[0].teacher_seen_at).toBe('2026-11-10T08:00:00Z');
  });

  it('draait alleen de eigen stempel terug als de server hem weigert', async () => {
    markSeenRpc.mockRejectedValue(new Error('geweigerd'));
    backend.select.mockReturnValue({
      data: [sub('s1'), sub('s2', { teacher_seen_at: '2026-11-10T08:00:00Z' })], error: null,
    });
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    act(() => result.current.markSeen('s1'));
    await waitFor(() => expect(markSeenRpc).toHaveBeenCalled());

    await waitFor(() => expect(result.current.submissions[0].teacher_seen_at).toBeNull());
    expect(result.current.submissions[1].teacher_seen_at).toBe('2026-11-10T08:00:00Z');
  });

  it('een verzoek dat al onderweg was overschrijft de stempel niet', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    // Ververs-verzoek met de óude serverstand blijft hangen…
    let release: (r: Reply) => void = () => {};
    backend.select.mockReturnValue(new Promise<Reply>((resolve) => { release = resolve; }));
    let refetching: Promise<void> = Promise.resolve();
    act(() => { refetching = result.current.refetch(); });
    await waitFor(() => expect(backend.select).toHaveBeenCalledTimes(2));

    // …terwijl de docent de inzending opent
    act(() => result.current.markSeen('s1'));
    await waitFor(() => expect(result.current.submissions[0].teacher_seen_at).toBeTruthy());

    await act(async () => {
      release({ data: [sub('s1'), sub('s2')], error: null });
      await refetching;
    });
    expect(result.current.submissions[0].teacher_seen_at).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });
});

describe('useSubmissions — polling tijdens presenteren', () => {
  it('pollt niet zonder interval', async () => {
    const { result } = render('c1', false);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await new Promise((r) => setTimeout(r, 120));
    expect(backend.select).toHaveBeenCalledTimes(1);
  });

  it('ververst op het interval, zonder loading aan te zetten, en voegt nieuwe inzendingen toe', async () => {
    const loadingSeen: boolean[] = [];
    const { result } = renderHook(() => {
      const value = useSubmissions('c1', { pollIntervalMs: 30 });
      loadingSeen.push(value.loading);
      return value;
    }, { wrapper: createQueryWrapper(client, auth) });
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));
    const afterFirstLoad = loadingSeen.length;

    backend.select.mockReturnValue({ data: [sub('s1'), sub('s2'), sub('s3')], error: null });
    await waitFor(() => expect(result.current.submissions.map((s) => s.id)).toEqual(['s1', 's2', 's3']));
    await waitFor(() => expect(backend.select.mock.calls.length).toBeGreaterThanOrEqual(4));

    expect(loadingSeen.slice(afterFirstLoad)).not.toContain(true);
  });

  it('begint en stopt met de optie (presentatie open/dicht)', async () => {
    const { result, rerender } = render('c1', false);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(backend.select).toHaveBeenCalledTimes(1);

    rerender({ classId: 'c1', pollIntervalMs: 30 });
    await waitFor(() => expect(backend.select.mock.calls.length).toBeGreaterThanOrEqual(3));

    rerender({ classId: 'c1', pollIntervalMs: false });
    await new Promise((r) => setTimeout(r, 40));
    const callsWhenStopped = backend.select.mock.calls.length;
    await new Promise((r) => setTimeout(r, 120));
    expect(backend.select.mock.calls.length).toBe(callsWhenStopped);
  });

  it('loopt door als het tabblad niet zichtbaar is (zoals de oude setInterval)', async () => {
    focusManager.setFocused(false);
    const { result } = render('c1', 30);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(backend.select.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  it('houdt de lijst vast en blijft pollen als het verversen mislukt', async () => {
    const { result } = render('c1', 30);
    await waitFor(() => expect(result.current.submissions).toHaveLength(2));

    backend.select.mockReturnValue({ data: null, error: new Error('permission denied') });
    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.submissions).toHaveLength(2);
    const callsAtError = backend.select.mock.calls.length;
    await waitFor(() => expect(backend.select.mock.calls.length).toBeGreaterThan(callsAtError + 1));

    backend.select.mockReturnValue({ data: [sub('s1'), sub('s2'), sub('s3')], error: null });
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.submissions).toHaveLength(3);
  });
});

describe('useSubmissions — afscherming', () => {
  it('houdt klassen en docenten uit elkaar', async () => {
    backend.select.mockImplementation((classId) => ({ data: [sub(`${auth.userId}-${classId}`)], error: null }));
    const { result, rerender } = render('c1');
    await waitFor(() => expect(result.current.submissions[0]?.id).toBe('teacher-a-c1'));

    rerender({ classId: 'c2', pollIntervalMs: false });
    expect(result.current.submissions).toEqual([]);
    await waitFor(() => expect(result.current.submissions[0]?.id).toBe('teacher-a-c2'));

    auth.userId = 'teacher-b';
    rerender({ classId: 'c1', pollIntervalMs: false });
    expect(result.current.submissions).toEqual([]);
    await waitFor(() => expect(result.current.submissions[0]?.id).toBe('teacher-b-c1'));
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.teacher.user('teacher-a') })).toHaveLength(0);
  });
});
