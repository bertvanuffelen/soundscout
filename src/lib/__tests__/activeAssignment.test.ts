/**
 * Migratie 037: de titelinstelling komt mee in de payload van
 * get_active_assignment. Ontbreekt het veld (oudere database), dan mogen
 * leerlingen gewoon zelf een titel typen.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));

import { getActiveAssignment } from '../assignments';

function row(payloadExtra: Record<string, unknown>) {
  return {
    data: [{
      assignment_type: 'free',
      payload: { free_theme_id: 'basis', duration_label: '2 lessen', ...payloadExtra },
      card: null,
      class_id: 'c1',
      class_name: 'Groep 6b',
      peer_review: null,
    }],
    error: null,
  };
}

describe('getActiveAssignment — titelinstelling (037)', () => {
  beforeEach(() => rpc.mockReset());

  it('leest students_type_title = false', async () => {
    rpc.mockResolvedValue(row({ students_type_title: false }));
    const a = await getActiveAssignment('4821');
    expect(a?.studentsTypeTitle).toBe(false);
    expect(a?.durationLabel).toBe('2 lessen');
  });

  it('valt terug op "aan" als het veld ontbreekt', async () => {
    rpc.mockResolvedValue(row({}));
    const a = await getActiveAssignment('4821');
    expect(a?.studentsTypeTitle).toBe(true);
  });
});
