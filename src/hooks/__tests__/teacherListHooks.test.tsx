/**
 * De vier lijst-hooks van de docent op TanStack Query — useTemplates,
 * useAssignmentCards, useLessonCards, usePraatplaten. Per hook: laden, fout
 * bij laden, elke schrijfactie (de lijst volgt ná succes; bij een fout blijft
 * hij staan en komt de melding in operationError) en de afscherming tussen
 * docenten. Gemockt op de grens van src/lib.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryWrapper, createTestQueryClient, type TestAuth } from '../../query/testUtils';
import { queryKeys } from '../../query/queryKeys';
import type { TeacherTemplate, CreateTemplateParams } from '../../lib/templates';
import type { CreateCardParams } from '../../lib/assignmentCards';
import type { LessonCard, LessonCardInput } from '../../lib/lessonCards';
import type { PraatplaatRow } from '../../lib/praatplaat';
import type { Opdrachtkaart } from '../../types';

const lib = vi.hoisted(() => ({
  fetchTeacherTemplates: vi.fn(), createTemplate: vi.fn(), deleteTemplate: vi.fn(), toggleTemplate: vi.fn(),
  fetchTeacherCards: vi.fn(), createCard: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn(),
  fetchLessonCards: vi.fn(), createLessonCard: vi.fn(), updateLessonCard: vi.fn(), deleteLessonCard: vi.fn(),
  fetchPraatplaten: vi.fn(), createPraatplaat: vi.fn(), activatePraatplaat: vi.fn(),
  deactivatePraatplaat: vi.fn(), deletePraatplaat: vi.fn(),
}));

vi.mock('../../lib/templates', () => ({
  fetchTeacherTemplates: lib.fetchTeacherTemplates, createTemplate: lib.createTemplate,
  deleteTemplate: lib.deleteTemplate, toggleTemplate: lib.toggleTemplate,
}));
vi.mock('../../lib/assignmentCards', () => ({
  fetchTeacherCards: lib.fetchTeacherCards, createCard: lib.createCard,
  updateCard: lib.updateCard, deleteCard: lib.deleteCard,
}));
vi.mock('../../lib/lessonCards', () => ({
  fetchLessonCards: lib.fetchLessonCards, createLessonCard: lib.createLessonCard,
  updateLessonCard: lib.updateLessonCard, deleteLessonCard: lib.deleteLessonCard,
}));
vi.mock('../../lib/praatplaat', () => ({
  fetchPraatplaten: lib.fetchPraatplaten, createPraatplaat: lib.createPraatplaat,
  activatePraatplaat: lib.activatePraatplaat, deactivatePraatplaat: lib.deactivatePraatplaat,
  deletePraatplaat: lib.deletePraatplaat,
}));

import { useTemplates } from '../useTemplates';
import { useAssignmentCards } from '../useAssignmentCards';
import { useLessonCards } from '../useLessonCards';
import { usePraatplaten } from '../usePraatplaten';

// --- Fixtures ---

const template = (id: string, extra: Partial<TeacherTemplate> = {}): TeacherTemplate => ({
  id, name: `Template ${id}`, code: 'ABCD2345', isActive: true, createdAt: '2026-11-01',
  lockOptions: { clipsLocked: false, sectionsLocked: false, libraryLocked: true, allowNewClips: true },
  ...extra,
});
const card = (id: string, title = `Kaart ${id}`): Opdrachtkaart =>
  ({ id, title, bullets: ['Luister goed'], isActive: true, createdAt: '2026-11-01' }) as Opdrachtkaart;
const lesson = (id: string, isBuiltin = false, title = `Les ${id}`): LessonCard => ({
  id, isBuiltin, builtinKey: isBuiltin ? id : null, assignmentType: 'free',
  templateId: null, praatplaatRef: null, ppThemeId: null, ppLocationId: null, ppImageUrl: null,
  storyboardRef: null, freeThemeId: 'basis', cardId: null, cardInline: null,
  title, level: null, lessonGoal: null, phases: [], coverImage: null, pdfUrl: null, createdAt: '2026-11-01',
});
const plaat = (id: string, is_active = false): PraatplaatRow => ({
  id, class_id: 'c1', teacher_id: 't', name: `Plaat ${id}`, theme_id: 'basis',
  location_id: 'park', image_url: '/x.webp', is_active, created_at: '2026-11-01',
});
const templateParams = { name: 'Nieuw' } as CreateTemplateParams;
const cardParams = { title: 'Nieuw', bullets: [] } as unknown as CreateCardParams;
const lessonInput = { title: 'Nieuw' } as unknown as LessonCardInput;

let client: QueryClient;
let auth: TestAuth;
const wrapper = () => createQueryWrapper(client, auth);

beforeEach(() => {
  Object.values(lib).forEach((fn) => fn.mockReset());
  client = createTestQueryClient();
  auth = { userId: 'teacher-a' };
});
afterEach(() => client.clear());

// --- Wat voor alle vier hetzelfde is ---

interface ListHookResult {
  loading: boolean;
  error: string | null;
  operationError: string | null;
  refetch: () => Promise<void>;
}

const hooks = [
  { name: 'useTemplates', use: () => useTemplates(), fetch: lib.fetchTeacherTemplates,
    items: (r: unknown) => (r as ReturnType<typeof useTemplates>).templates, rows: [template('t1'), template('t2')],
    key: (uid: string) => queryKeys.teacher.templates(uid) },
  { name: 'useAssignmentCards', use: () => useAssignmentCards(), fetch: lib.fetchTeacherCards,
    items: (r: unknown) => (r as ReturnType<typeof useAssignmentCards>).cards, rows: [card('k1'), card('k2')],
    key: (uid: string) => queryKeys.teacher.assignmentCards(uid) },
  { name: 'useLessonCards', use: () => useLessonCards(), fetch: lib.fetchLessonCards,
    items: (r: unknown) => (r as ReturnType<typeof useLessonCards>).cards, rows: [lesson('b1', true), lesson('l1')],
    key: (uid: string) => queryKeys.teacher.lessonCards(uid) },
  { name: 'usePraatplaten', use: () => usePraatplaten(), fetch: lib.fetchPraatplaten,
    items: (r: unknown) => (r as ReturnType<typeof usePraatplaten>).praatplaten, rows: [plaat('p1'), plaat('p2')],
    key: (uid: string) => queryKeys.teacher.praatplaten(uid) },
] as const;

describe.each(hooks)('$name — laden', ({ use, fetch, items, rows, key }) => {
  const render = () => renderHook(() => use() as ListHookResult, { wrapper: wrapper() });

  it('begint met laden en toont daarna de lijst', async () => {
    fetch.mockResolvedValue(rows);
    const { result } = render();
    expect(result.current.loading).toBe(true);
    expect(items(result.current)).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(items(result.current)).toEqual(rows);
    expect(result.current.error).toBeNull();
  });

  it('toont de melding als laden mislukt, zonder het opnieuw te proberen', async () => {
    fetch.mockRejectedValue(new Error('Kon niet laden'));
    const { result } = render();

    await waitFor(() => expect(result.current.error).toBe('Kon niet laden'));
    expect(result.current.loading).toBe(false);
    expect(items(result.current)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refetch na een fout: loading aan, fout weg, daarna de lijst', async () => {
    fetch.mockRejectedValue(new Error('Kon niet laden'));
    const { result } = render();
    await waitFor(() => expect(result.current.error).toBeTruthy());

    let release: (rows: unknown) => void = () => {};
    fetch.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    let done: Promise<void> = Promise.resolve();
    act(() => { done = result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.error).toBeNull();

    await act(async () => { release(rows); await done; });
    expect(result.current.loading).toBe(false);
    expect(items(result.current)).toEqual(rows);
  });

  it('twee schermen die dezelfde lijst vragen delen één verzoek', async () => {
    fetch.mockResolvedValue(rows);
    const shared = wrapper();
    const first = renderHook(() => use() as ListHookResult, { wrapper: shared });
    const second = renderHook(() => use() as ListHookResult, { wrapper: shared });

    await waitFor(() => expect(items(second.result.current)).toEqual(rows));
    expect(items(first.result.current)).toEqual(rows);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('toont na wisselen van docent nooit de lijst van de vorige', async () => {
    fetch.mockResolvedValue(rows);
    const { result, rerender } = render();
    await waitFor(() => expect(items(result.current)).toEqual(rows));

    auth.userId = null;
    rerender();
    expect(items(result.current)).toEqual([]);
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(client.getQueryData(key('teacher-a'))).toBeUndefined());

    fetch.mockResolvedValue([rows[1]]);
    auth.userId = 'teacher-b';
    rerender();
    expect(items(result.current)).toEqual([]);
    await waitFor(() => expect(items(result.current)).toEqual([rows[1]]));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// --- Schrijfacties per hook ---

describe('useTemplates — schrijfacties', () => {
  const render = async () => {
    lib.fetchTeacherTemplates.mockResolvedValue([template('t1'), template('t2')]);
    const hook = renderHook(() => useTemplates(), { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.templates).toHaveLength(2));
    return hook;
  };

  it('create: nieuw template bovenaan, pas na succes', async () => {
    const { result } = await render();
    let release: (t: TeacherTemplate) => void = () => {};
    lib.createTemplate.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    let created: Promise<TeacherTemplate> = Promise.resolve(template('x'));
    act(() => { created = result.current.create(templateParams); });
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.templates).toHaveLength(2);

    await act(async () => { release(template('t3')); await created; });
    await waitFor(() => expect(result.current.templates.map((t) => t.id)).toEqual(['t3', 't1', 't2']));
    await expect(created).resolves.toMatchObject({ id: 't3' });
  });

  it('create mislukt: lijst ongewijzigd, melding in operationError, fout doorgegeven', async () => {
    const { result } = await render();
    lib.createTemplate.mockRejectedValue(new Error('Kon template niet aanmaken'));
    await act(async () => {
      await expect(result.current.create(templateParams)).rejects.toThrow('Kon template niet aanmaken');
    });
    expect(result.current.operationError).toBe('Kon template niet aanmaken');
    expect(result.current.templates).toHaveLength(2);
  });

  it('remove en toggle volgen de server', async () => {
    const { result } = await render();
    lib.deleteTemplate.mockResolvedValue(undefined);
    lib.toggleTemplate.mockResolvedValue(undefined);

    await act(async () => { await result.current.toggle('t2', false); });
    await waitFor(() => expect(result.current.templates[1].isActive).toBe(false));
    expect(lib.toggleTemplate).toHaveBeenCalledWith('t2', false);

    await act(async () => { await result.current.remove('t1'); });
    await waitFor(() => expect(result.current.templates.map((t) => t.id)).toEqual(['t2']));
  });

  it('remove/toggle mislukt: lijst ongewijzigd en melding', async () => {
    const { result } = await render();
    lib.deleteTemplate.mockRejectedValue(new Error('Kon template niet verwijderen'));
    lib.toggleTemplate.mockRejectedValue('geen Error-object');

    await act(async () => { await expect(result.current.remove('t1')).rejects.toThrow(); });
    expect(result.current.operationError).toBe('Kon template niet verwijderen');
    expect(result.current.templates).toHaveLength(2);

    await act(async () => { await result.current.toggle('t1', false).catch(() => {}); });
    // Geen Error-object: de vaste terugvaltekst
    expect(result.current.operationError).toBeTruthy();
    expect(result.current.operationError).not.toBe('Kon template niet verwijderen');
    expect(result.current.templates[0].isActive).toBe(true);
  });

  it('een geslaagde actie wist de vorige foutmelding', async () => {
    const { result } = await render();
    lib.deleteTemplate.mockRejectedValueOnce(new Error('mislukt')).mockResolvedValue(undefined);
    await act(async () => { await result.current.remove('t1').catch(() => {}); });
    expect(result.current.operationError).toBe('mislukt');
    await act(async () => { await result.current.remove('t1'); });
    expect(result.current.operationError).toBeNull();
  });
});

describe('useAssignmentCards — schrijfacties', () => {
  const render = async () => {
    lib.fetchTeacherCards.mockResolvedValue([card('k1'), card('k2')]);
    const hook = renderHook(() => useAssignmentCards(), { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.cards).toHaveLength(2));
    return hook;
  };

  it('create, update en remove volgen de server', async () => {
    const { result } = await render();
    lib.createCard.mockResolvedValue(card('k3'));
    lib.updateCard.mockResolvedValue(card('k2', 'Aangepast'));
    lib.deleteCard.mockResolvedValue(undefined);

    await act(async () => { await result.current.create(cardParams); });
    await waitFor(() => expect(result.current.cards.map((c) => c.id)).toEqual(['k3', 'k1', 'k2']));

    await act(async () => {
      await expect(result.current.update('k2', cardParams)).resolves.toMatchObject({ title: 'Aangepast' });
    });
    await waitFor(() => expect(result.current.cards[2].title).toBe('Aangepast'));
    expect(lib.updateCard).toHaveBeenCalledWith('k2', cardParams);

    await act(async () => { await result.current.remove('k1'); });
    await waitFor(() => expect(result.current.cards.map((c) => c.id)).toEqual(['k3', 'k2']));
  });

  it('elke mislukte actie laat de lijst staan en meldt de fout', async () => {
    const { result } = await render();
    lib.createCard.mockRejectedValue(new Error('aanmaken mislukt'));
    lib.updateCard.mockRejectedValue(new Error('bijwerken mislukt'));
    lib.deleteCard.mockRejectedValue(new Error('verwijderen mislukt'));

    await act(async () => { await expect(result.current.create(cardParams)).rejects.toThrow('aanmaken mislukt'); });
    expect(result.current.operationError).toBe('aanmaken mislukt');
    await act(async () => { await expect(result.current.update('k1', cardParams)).rejects.toThrow('bijwerken mislukt'); });
    expect(result.current.operationError).toBe('bijwerken mislukt');
    await act(async () => { await expect(result.current.remove('k1')).rejects.toThrow('verwijderen mislukt'); });
    expect(result.current.operationError).toBe('verwijderen mislukt');

    expect(result.current.cards).toEqual([card('k1'), card('k2')]);
  });

  it('een kaart die in het ene scherm wordt gemaakt staat meteen in het andere', async () => {
    lib.fetchTeacherCards.mockResolvedValue([card('k1')]);
    const shared = wrapper();
    const editor = renderHook(() => useAssignmentCards(), { wrapper: shared });
    const dashboard = renderHook(() => useAssignmentCards(), { wrapper: shared });
    await waitFor(() => expect(dashboard.result.current.cards).toHaveLength(1));

    lib.createCard.mockResolvedValue(card('k2'));
    await act(async () => { await editor.result.current.create(cardParams); });

    await waitFor(() => expect(dashboard.result.current.cards.map((c) => c.id)).toEqual(['k2', 'k1']));
    // De foutmelding blijft wél per scherm
    expect(dashboard.result.current.operationError).toBeNull();
  });
});

describe('useLessonCards — schrijfacties', () => {
  const render = async () => {
    lib.fetchLessonCards.mockResolvedValue([lesson('b1', true), lesson('b2', true), lesson('l1')]);
    const hook = renderHook(() => useLessonCards(), { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.cards).toHaveLength(3));
    return hook;
  };

  it('create zet de eigen kaart ná de ingebouwde en vóór de andere eigen kaarten', async () => {
    const { result } = await render();
    lib.createLessonCard.mockResolvedValue(lesson('l2'));
    await act(async () => { await result.current.create(lessonInput); });
    await waitFor(() => expect(result.current.cards.map((c) => c.id)).toEqual(['b1', 'b2', 'l2', 'l1']));
  });

  it('update en remove volgen de server', async () => {
    const { result } = await render();
    lib.updateLessonCard.mockResolvedValue(lesson('l1', false, 'Aangepast'));
    lib.deleteLessonCard.mockResolvedValue(undefined);

    await act(async () => { await result.current.update('l1', lessonInput); });
    await waitFor(() => expect(result.current.cards[2].title).toBe('Aangepast'));

    await act(async () => { await result.current.remove('l1'); });
    await waitFor(() => expect(result.current.cards.map((c) => c.id)).toEqual(['b1', 'b2']));
  });

  it('elke mislukte actie laat de lijst staan en meldt de fout', async () => {
    const { result } = await render();
    lib.createLessonCard.mockRejectedValue(new Error('aanmaken mislukt'));
    lib.updateLessonCard.mockRejectedValue(new Error('bijwerken mislukt'));
    lib.deleteLessonCard.mockRejectedValue(new Error('verwijderen mislukt'));

    await act(async () => { await expect(result.current.create(lessonInput)).rejects.toThrow(); });
    expect(result.current.operationError).toBe('aanmaken mislukt');
    await act(async () => { await expect(result.current.update('l1', lessonInput)).rejects.toThrow(); });
    expect(result.current.operationError).toBe('bijwerken mislukt');
    await act(async () => { await expect(result.current.remove('l1')).rejects.toThrow(); });
    expect(result.current.operationError).toBe('verwijderen mislukt');
    expect(result.current.cards.map((c) => c.id)).toEqual(['b1', 'b2', 'l1']);
  });
});

describe('usePraatplaten — schrijfacties', () => {
  const render = async (classId?: string) => {
    lib.fetchPraatplaten.mockResolvedValue([plaat('p1', true), plaat('p2')]);
    const hook = renderHook(() => usePraatplaten(classId), { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.praatplaten).toHaveLength(2));
    return hook;
  };

  it('geeft de klas door en houdt klassen in de cache uit elkaar', async () => {
    await render('c1');
    expect(lib.fetchPraatplaten).toHaveBeenCalledWith('c1');
    expect(client.getQueryData(queryKeys.teacher.praatplaten('teacher-a', 'c1'))).toBeDefined();
    expect(client.getQueryData(queryKeys.teacher.praatplaten('teacher-a'))).toBeUndefined();
  });

  it('create zet de nieuwe praatplaat (niet actief) bovenaan', async () => {
    const { result } = await render();
    lib.createPraatplaat.mockResolvedValue('p3');
    await act(async () => {
      await result.current.create({ classId: 'c1', name: 'Haven', themeId: 'stad', locationId: 'haven', imageUrl: '/h.webp' });
    });
    await waitFor(() => expect(result.current.praatplaten).toHaveLength(3));
    expect(result.current.praatplaten[0]).toMatchObject({
      id: 'p3', name: 'Haven', theme_id: 'stad', location_id: 'haven', image_url: '/h.webp', class_id: 'c1', is_active: false,
    });
  });

  it('activate maakt precies één praatplaat actief; deactivate en remove volgen de server', async () => {
    const { result } = await render();
    lib.activatePraatplaat.mockResolvedValue(true);
    lib.deactivatePraatplaat.mockResolvedValue(true);
    lib.deletePraatplaat.mockResolvedValue(true);

    await act(async () => { await result.current.activate('p2'); });
    await waitFor(() => expect(result.current.praatplaten.map((p) => p.is_active)).toEqual([false, true]));

    await act(async () => { await result.current.deactivate('p2'); });
    await waitFor(() => expect(result.current.praatplaten.map((p) => p.is_active)).toEqual([false, false]));

    await act(async () => { await result.current.remove('p1'); });
    await waitFor(() => expect(result.current.praatplaten.map((p) => p.id)).toEqual(['p2']));
  });

  it('elke mislukte actie laat de lijst staan en meldt de fout', async () => {
    const { result } = await render();
    const before = result.current.praatplaten;
    lib.createPraatplaat.mockRejectedValue(new Error('aanmaken mislukt'));
    lib.activatePraatplaat.mockRejectedValue(new Error('activeren mislukt'));
    lib.deactivatePraatplaat.mockRejectedValue(new Error('deactiveren mislukt'));
    lib.deletePraatplaat.mockRejectedValue(new Error('verwijderen mislukt'));

    await act(async () => {
      await expect(result.current.create({ name: 'x', themeId: 'a', locationId: 'b', imageUrl: 'c' })).rejects.toThrow();
    });
    expect(result.current.operationError).toBe('aanmaken mislukt');
    await act(async () => { await expect(result.current.activate('p2')).rejects.toThrow(); });
    expect(result.current.operationError).toBe('activeren mislukt');
    await act(async () => { await expect(result.current.deactivate('p1')).rejects.toThrow(); });
    expect(result.current.operationError).toBe('deactiveren mislukt');
    await act(async () => { await expect(result.current.remove('p1')).rejects.toThrow(); });
    expect(result.current.operationError).toBe('verwijderen mislukt');

    expect(result.current.praatplaten).toEqual(before);
  });
});
