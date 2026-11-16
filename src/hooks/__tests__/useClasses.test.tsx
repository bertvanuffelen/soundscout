/**
 * useClasses op TanStack Query: laden, fouten, aanmaken/verwijderen (de lijst
 * volgt pas ná een geslaagde schrijfactie; bij een fout blijft hij staan en
 * komt de melding in operationError), herhalen bij netwerkfouten en de
 * afscherming tussen docenten op één computer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryWrapper, createTestQueryClient, type TestAuth } from '../../query/testUtils';
import { queryKeys } from '../../query/queryKeys';

// --- Nep-Supabase: per tabel en bewerking één antwoord ---

type Reply = { data: unknown; error: unknown };
interface Backend {
  userId: string | null;
  teachers: () => Reply;
  classesSelect: () => Reply | Promise<Reply>;
  classesInsert: (row: Record<string, unknown>) => Reply | Promise<Reply>;
  classesDelete: (id: string) => Reply;
  code: () => Reply;
}

const backend: Backend = {
  userId: 'teacher-a',
  teachers: () => ({ data: { max_classes: 8 }, error: null }),
  classesSelect: () => ({ data: [], error: null }),
  classesInsert: (row) => ({ data: { id: 'new', created_at: '2026-11-16', is_active: true, ...row }, error: null }),
  classesDelete: () => ({ data: null, error: null }),
  code: () => ({ data: '4821', error: null }),
};
const initialBackend = { ...backend };

function tableBuilder(table: string) {
  let op: 'select' | 'insert' | 'delete' = 'select';
  let payload: Record<string, unknown> = {};
  let id = '';
  const builder = {
    select: () => builder,
    order: () => builder,
    single: () => builder,
    insert: (row: Record<string, unknown>) => { op = 'insert'; payload = row; return builder; },
    delete: () => { op = 'delete'; return builder; },
    eq: (column: string, value: string) => { if (column === 'id') id = value; return builder; },
    then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) => {
      const run = async (): Promise<Reply> => {
        if (table === 'teachers') return backend.teachers();
        if (op === 'insert') return backend.classesInsert(payload);
        if (op === 'delete') return backend.classesDelete(id);
        return backend.classesSelect();
      };
      return run().then(resolve, reject);
    },
  };
  return builder;
}

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({
    auth: { getUser: async () => ({ data: { user: backend.userId ? { id: backend.userId } : null } }) },
    rpc: async () => backend.code(),
    from: (table: string) => tableBuilder(table),
  }),
}));

import { useClasses } from '../useClasses';

function classRow(id: string, name: string, count = 0) {
  return { id, name, code: '1234', created_at: '2026-11-01', is_active: true, submissions: [{ count }] };
}

let client: QueryClient;
let auth: TestAuth;

function render() {
  return renderHook(() => useClasses(), { wrapper: createQueryWrapper(client, auth) });
}

beforeEach(() => {
  Object.assign(backend, initialBackend);
  client = createTestQueryClient();
  auth = { userId: 'teacher-a' };
});

afterEach(() => client.clear());

describe('useClasses — laden', () => {
  it('begint met laden en toont daarna de klassen met het aantal inzendingen', async () => {
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5', 3), classRow('c2', 'Groep 6')], error: null });
    const { result } = render();

    expect(result.current.loading).toBe(true);
    expect(result.current.classes).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.classes.map((c) => [c.name, c.submission_count])).toEqual([['Groep 5', 3], ['Groep 6', 0]]);
    expect(result.current.error).toBeNull();
    expect(result.current.maxClasses).toBe(8);
    expect(result.current.canCreateClass).toBe(true);
  });

  it('neemt de limiet van de docent over en blokkeert aanmaken als hij vol is', async () => {
    backend.teachers = () => ({ data: { max_classes: 1 }, error: null });
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5')], error: null });
    const { result } = render();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.maxClasses).toBe(1);
    expect(result.current.canCreateClass).toBe(false);

    await act(async () => {
      await expect(result.current.createClass('Groep 6')).rejects.toThrow();
    });
    expect(result.current.operationError).toBeTruthy();
    expect(result.current.classes).toHaveLength(1);
  });

  it('toont de foutmelding en probeert een rechtenfout niet opnieuw', async () => {
    const select = vi.fn(() => ({ data: null, error: new Error('permission denied for table classes') }));
    backend.classesSelect = select;
    const { result } = render();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('permission denied for table classes');
    expect(result.current.classes).toEqual([]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('probeert een netwerkfout nog twee keer en slaagt dan alsnog', async () => {
    let attempt = 0;
    backend.classesSelect = () => {
      attempt += 1;
      return attempt < 3
        ? { data: null, error: new TypeError('Failed to fetch') }
        : { data: [classRow('c1', 'Groep 5')], error: null };
    };
    const { result } = render();

    await waitFor(() => expect(result.current.classes).toHaveLength(1));
    expect(attempt).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('refetch zet loading aan, wist de fout en haalt opnieuw op', async () => {
    backend.classesSelect = () => ({ data: null, error: new Error('permission denied') });
    const { result } = render();
    await waitFor(() => expect(result.current.error).toBe('permission denied'));

    let release: (r: Reply) => void = () => {};
    backend.classesSelect = () => new Promise<Reply>((resolve) => { release = resolve; });
    let done: Promise<void> = Promise.resolve();
    act(() => { done = result.current.refetch(); });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.error).toBeNull();

    await act(async () => {
      release({ data: [classRow('c1', 'Groep 5')], error: null });
      await done;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.classes).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('haalt niets op zolang er niemand is ingelogd', async () => {
    const select = vi.fn(() => ({ data: [classRow('c1', 'Groep 5')], error: null }));
    backend.classesSelect = select;
    auth.userId = null;
    const { result } = render();

    expect(result.current.loading).toBe(false);
    expect(result.current.classes).toEqual([]);
    await new Promise((r) => setTimeout(r, 20));
    expect(select).not.toHaveBeenCalled();
  });
});

describe('useClasses — aanmaken en verwijderen', () => {
  it('zet een nieuwe klas bovenaan zodra de server hem heeft aangemaakt', async () => {
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5')], error: null });
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let release: (r: Reply) => void = () => {};
    backend.classesInsert = () => new Promise<Reply>((resolve) => { release = resolve; });
    let created: Promise<unknown> = Promise.resolve();
    act(() => { created = result.current.createClass('  Groep 6  '); });

    // Niet vooruitlopend: tot de server antwoordt staat alleen de oude klas er
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.classes.map((c) => c.name)).toEqual(['Groep 5']);

    await act(async () => {
      release({ data: { id: 'c2', name: 'Groep 6', code: '4821', created_at: '2026-11-16', is_active: true }, error: null });
      await created;
    });
    await waitFor(() => expect(result.current.classes.map((c) => c.name)).toEqual(['Groep 6', 'Groep 5']));
    expect(result.current.classes[0].submission_count).toBe(0);
    expect(result.current.operationError).toBeNull();
  });

  it('laat de lijst staan en meldt de fout als aanmaken mislukt', async () => {
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5')], error: null });
    backend.classesInsert = () => ({ data: null, error: { message: 'duplicate key' } });
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      await result.current.createClass('Groep 6').catch((err: unknown) => { thrown = err; });
    });

    expect((thrown as Error).message).toContain('duplicate key');
    expect(result.current.operationError).toBe((thrown as Error).message);
    expect(result.current.classes.map((c) => c.name)).toEqual(['Groep 5']);
  });

  it('wist de vorige foutmelding bij een nieuwe poging', async () => {
    backend.classesInsert = () => ({ data: null, error: { message: 'kapot' } });
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.createClass('A').catch(() => {}); });
    expect(result.current.operationError).toBeTruthy();

    backend.classesInsert = initialBackend.classesInsert;
    await act(async () => { await result.current.createClass('B'); });
    expect(result.current.operationError).toBeNull();
    await waitFor(() => expect(result.current.classes).toHaveLength(1));
  });

  it('haalt een klas uit de lijst na verwijderen, en gooit ook zijn klasdata weg', async () => {
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5'), classRow('c2', 'Groep 6')], error: null });
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));
    client.setQueryData(queryKeys.teacher.submissions('teacher-a', 'c1'), [{ id: 's1' }]);

    await act(async () => { await result.current.deleteClass('c1'); });

    await waitFor(() => expect(result.current.classes.map((c) => c.id)).toEqual(['c2']));
    expect(client.getQueryData(queryKeys.teacher.submissions('teacher-a', 'c1'))).toBeUndefined();
  });

  it('laat de klas staan en meldt de fout als verwijderen mislukt', async () => {
    backend.classesSelect = () => ({ data: [classRow('c1', 'Groep 5')], error: null });
    backend.classesDelete = () => ({ data: null, error: { message: 'mag niet' } });
    const { result } = render();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.deleteClass('c1')).rejects.toThrow('mag niet');
    });
    expect(result.current.classes).toHaveLength(1);
    expect(result.current.operationError).toContain('mag niet');
  });
});

describe('useClasses — twee docenten op één computer', () => {
  it('toont na wisselen nooit de klassen van de vorige docent', async () => {
    const byTeacher: Record<string, ReturnType<typeof classRow>[]> = {
      'teacher-a': [classRow('a1', 'Klas van A')],
      'teacher-b': [classRow('b1', 'Klas van B')],
    };
    backend.classesSelect = () => ({ data: byTeacher[backend.userId ?? ''] ?? [], error: null });
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.classes.map((c) => c.name)).toEqual(['Klas van A']));

    // Uitloggen: meteen leeg, en de data van A is uit het geheugen
    auth.userId = null;
    backend.userId = null;
    rerender();
    expect(result.current.classes).toEqual([]);
    await waitFor(() => expect(client.getQueryData(queryKeys.teacher.classes('teacher-a'))).toBeUndefined());
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.teacher.user('teacher-a') })).toHaveLength(0);

    // B logt in: eerst laden (géén klassen van A), daarna die van B
    const seen: string[][] = [];
    auth.userId = 'teacher-b';
    backend.userId = 'teacher-b';
    rerender();
    seen.push(result.current.classes.map((c) => c.name));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.classes.map((c) => c.name)).toEqual(['Klas van B']));
    expect(seen.flat()).not.toContain('Klas van A');
  });

  it('wisselt direct van A naar B zonder tussenstand met de data van A', async () => {
    const byTeacher: Record<string, ReturnType<typeof classRow>[]> = {
      'teacher-a': [classRow('a1', 'Klas van A')],
      'teacher-b': [classRow('b1', 'Klas van B')],
    };
    backend.classesSelect = () => ({ data: byTeacher[backend.userId ?? ''] ?? [], error: null });
    const names: string[] = [];
    const { result, rerender } = renderHook(() => {
      const value = useClasses();
      if (auth.userId === 'teacher-b') names.push(...value.classes.map((c) => c.name));
      return value;
    }, { wrapper: createQueryWrapper(client, auth) });
    await waitFor(() => expect(result.current.classes).toHaveLength(1));

    auth.userId = 'teacher-b';
    backend.userId = 'teacher-b';
    rerender();
    await waitFor(() => expect(result.current.classes.map((c) => c.name)).toEqual(['Klas van B']));

    expect(names).not.toContain('Klas van A');
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.teacher.user('teacher-a') })).toHaveLength(0);
  });
});
