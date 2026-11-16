/**
 * useLiveAssignment op TanStack Query: bij openen, daarna elke minuut zolang
 * het tabblad zichtbaar is, en meteen bij terugkomst. Fouten zijn stil.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { focusManager, type QueryClient } from '@tanstack/react-query';
import { createQueryWrapper, createTestQueryClient } from '../../query/testUtils';
import { useAppStore } from '../../stores/appStore';
import type { ClassSession } from '../../types';
import type { ActiveAssignment } from '../../lib/assignments';

const getActiveAssignment = vi.hoisted(() => vi.fn());
vi.mock('../../lib/assignments', () => ({ getActiveAssignment }));
vi.mock('../../utils/compositionInit', () => ({
  classSessionFromAssignment: (_code: string, a: { freeThemeId: string }) => ({ assignmentId: a.freeThemeId }),
}));

import { useLiveAssignment, LIVE_ASSIGNMENT_INTERVAL_MS } from '../useLiveAssignment';

const session: ClassSession = {
  classCode: '4821', classId: 'c1', className: 'Groep 5',
  assignmentType: 'free', assignmentId: 'basis', assignmentName: 'Vrij',
};

function assignment(extra: Record<string, unknown> = {}): ActiveAssignment {
  return {
    type: 'free', freeThemeId: 'basis', className: 'Groep 5', card: null,
    durationLabel: null, peerReview: null, studentsTypeTitle: true, ...extra,
  } as unknown as ActiveAssignment;
}

let client: QueryClient;
let visibility: DocumentVisibilityState;

function setVisible(visible: boolean) {
  visibility = visible ? 'visible' : 'hidden';
  focusManager.setFocused(visible);
}

/** Zet de nep-klok vooruit en laat lopende verzoeken en renders uitwerken. */
async function settle(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  for (let i = 0; i < 4; i += 1) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  }
}

function render() {
  return renderHook(() => useLiveAssignment(), { wrapper: createQueryWrapper(client, { userId: null }) });
}

// De hook laadt deze modules pas bij gebruik (dynamic import). Vooraf laden
// met echte timers, zodat ze onder nep-timers direct uit de module-cache komen.
beforeAll(async () => {
  await import('../../lib/assignments');
  await import('../../utils/compositionInit');
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  focusManager.setFocused(true);
  getActiveAssignment.mockReset().mockResolvedValue(assignment());
  useAppStore.setState({ classSession: { ...session } });
  client = createTestQueryClient();
});

afterEach(() => {
  client.clear();
  focusManager.setFocused(undefined);
  vi.useRealTimers();
  act(() => useAppStore.setState({ classSession: null }));
});

describe('useLiveAssignment', () => {
  it('doet niets zonder klassessie', async () => {
    useAppStore.setState({ classSession: null });
    const { result } = render();
    await settle(LIVE_ASSIGNMENT_INTERVAL_MS * 2);
    expect(getActiveAssignment).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('vraagt bij openen en daarna elke minuut', async () => {
    const { result } = render();
    await settle();
    expect(getActiveAssignment).toHaveBeenCalledTimes(1);
    expect(getActiveAssignment).toHaveBeenCalledWith('4821');
    expect(result.current).toBe(false);

    await settle(LIVE_ASSIGNMENT_INTERVAL_MS - 1_000);
    expect(getActiveAssignment).toHaveBeenCalledTimes(1);
    await settle(1_000);
    expect(getActiveAssignment).toHaveBeenCalledTimes(2);
    await settle(LIVE_ASSIGNMENT_INTERVAL_MS);
    expect(getActiveAssignment).toHaveBeenCalledTimes(3);
  });

  it('neemt gewijzigde instellingen over in de klassessie', async () => {
    getActiveAssignment.mockResolvedValue(assignment({ durationLabel: '2 lessen' }));
    const { result } = render();
    await settle();
    expect(useAppStore.getState().classSession?.durationLabel).toBe('2 lessen');
    expect(result.current).toBe(false);
  });

  it('meldt dat de docent een andere opdracht actief zette', async () => {
    const { result } = render();
    await settle();
    expect(result.current).toBe(false);

    getActiveAssignment.mockResolvedValue(assignment({ freeThemeId: 'stad' }));
    await settle(LIVE_ASSIGNMENT_INTERVAL_MS);
    expect(result.current).toBe(true);
    // De sessie zelf blijft ongemoeid: de inzending blijft gekoppeld
    expect(useAppStore.getState().classSession?.assignmentId).toBe('basis');
  });

  it('pauzeert bij een verborgen tabblad en vraagt meteen bij terugkomst', async () => {
    render();
    await settle();
    expect(getActiveAssignment).toHaveBeenCalledTimes(1);

    act(() => setVisible(false));
    await settle(LIVE_ASSIGNMENT_INTERVAL_MS * 3);
    expect(getActiveAssignment).toHaveBeenCalledTimes(1);

    act(() => setVisible(true));
    await settle();
    expect(getActiveAssignment).toHaveBeenCalledTimes(2);
  });

  it('slaat de eerste vraag over als het tabblad bij openen verborgen is', async () => {
    setVisible(false);
    const { result } = render();
    await settle();
    expect(getActiveAssignment).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('negeert fouten stil: de vorige uitkomst blijft staan en hij probeert het de volgende minuut weer', async () => {
    getActiveAssignment.mockResolvedValue(assignment({ freeThemeId: 'stad' }));
    const { result } = render();
    await settle();
    expect(result.current).toBe(true);

    getActiveAssignment.mockRejectedValue(new Error('offline'));
    await settle(LIVE_ASSIGNMENT_INTERVAL_MS);
    expect(result.current).toBe(true);
    expect(getActiveAssignment).toHaveBeenCalledTimes(2);

    await settle(LIVE_ASSIGNMENT_INTERVAL_MS);
    expect(getActiveAssignment).toHaveBeenCalledTimes(3);
  });

  it('past niets toe als het scherm intussen is gesloten', async () => {
    let release: (a: ActiveAssignment) => void = () => {};
    getActiveAssignment.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { unmount } = render();
    await settle();
    unmount();

    release(assignment({ durationLabel: 'te laat' }));
    await settle();
    expect(useAppStore.getState().classSession?.durationLabel).toBeUndefined();

    await settle(LIVE_ASSIGNMENT_INTERVAL_MS * 2);
    expect(getActiveAssignment).toHaveBeenCalledTimes(1);
  });

  it('bewaart niets na sluiten: opnieuw openen begint schoon', async () => {
    getActiveAssignment.mockResolvedValue(assignment({ freeThemeId: 'stad' }));
    const first = render();
    await settle();
    expect(first.result.current).toBe(true);
    first.unmount();
    await settle();
    expect(client.getQueryCache().getAll()).toHaveLength(0);

    getActiveAssignment.mockResolvedValue(assignment());
    const second = render();
    expect(second.result.current).toBe(false);
    await settle();
    expect(second.result.current).toBe(false);
  });
});
