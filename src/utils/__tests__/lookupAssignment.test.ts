/**
 * Klascode-invoer (AUD-07): een mislukte opvraging mag nooit als "geen
 * opdracht" (Route C) eindigen, en een niet-bestaande klascode ook niet.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));

import { lookupAndRouteAssignment } from '../compositionInit';
import { useAppStore } from '../../stores/appStore';

const ASSIGNMENT_ROW = {
  assignment_type: 'free',
  payload: { free_theme_id: 'basis' },
  card: null,
  class_id: 'c1',
  class_name: 'AUDIT-klas',
  peer_review: null,
};

function mockRpc(handlers: Record<string, () => { data: unknown; error: unknown }>) {
  rpc.mockImplementation((name: string) => Promise.resolve(handlers[name]()));
}

describe('lookupAndRouteAssignment', () => {
  beforeEach(() => {
    rpc.mockReset();
    useAppStore.setState({ currentScreen: 'start', pendingAssignment: null });
  });

  it('opent de landing met de opdracht als die er is', async () => {
    mockRpc({ get_active_assignment: () => ({ data: [ASSIGNMENT_ROW], error: null }) });
    expect(await lookupAndRouteAssignment('4821')).toBe('ok');
    expect(useAppStore.getState().currentScreen).toBe('assignment-landing');
  });

  it('opent de landing zonder opdracht (Route C) als de klas bestaat', async () => {
    mockRpc({
      get_active_assignment: () => ({ data: [], error: null }),
      get_class_by_code: () => ({ data: [{ id: 'c1', name: 'AUDIT-klas', teacher_name: 'x' }], error: null }),
    });
    expect(await lookupAndRouteAssignment('4821')).toBe('ok');
    expect(useAppStore.getState().currentScreen).toBe('assignment-landing');
  });

  it('meldt een niet-bestaande klascode in plaats van Route C', async () => {
    mockRpc({
      get_active_assignment: () => ({ data: [], error: null }),
      get_class_by_code: () => ({ data: [], error: null }),
    });
    expect(await lookupAndRouteAssignment('9999')).toBe('notFound');
    expect(useAppStore.getState().currentScreen).toBe('start');
  });

  it('meldt "even druk" bij een rate limit in plaats van Route C', async () => {
    mockRpc({ get_active_assignment: () => ({ data: null, error: { message: 'Rate limit exceeded for get_assignment' } }) });
    expect(await lookupAndRouteAssignment('4821')).toBe('busy');
    expect(useAppStore.getState().currentScreen).toBe('start');
  });

  it('meldt een technische fout bij een netwerkfout in plaats van Route C', async () => {
    mockRpc({ get_active_assignment: () => ({ data: null, error: { message: 'TypeError: Failed to fetch' } }) });
    expect(await lookupAndRouteAssignment('4821')).toBe('error');
    expect(useAppStore.getState().currentScreen).toBe('start');
  });
});
