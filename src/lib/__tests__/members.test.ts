/**
 * Fase 4.2: leerlingcodes (migratie 038).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));

import { loginWithMemberCode, formatMemberCode, getClassMembers, generateClassMembers, MEMBER_CODE_PATTERN } from '../members';

describe('leerlingcodes', () => {
  beforeEach(() => rpc.mockReset());

  it('herkent en toont het codeformaat', () => {
    expect(MEMBER_CODE_PATTERN.test('LK4827')).toBe(true);
    expect(MEMBER_CODE_PATTERN.test('K7P4QX')).toBe(false);
    expect(formatMemberCode('LK4827')).toBe('LK-4827');
  });

  it('logt in en geeft klas, schuilnaam en laatste werk', async () => {
    rpc.mockResolvedValue({ data: [{
      status: 'ok', member_id: 'm1', pseudonym: 'Vrolijke Papegaai', class_id: 'c1',
      class_name: 'Groep 6b', class_code: '4821', expires_at: '2027-07-31', latest_save_code: 'ABC234',
    }], error: null });
    const r = await loginWithMemberCode('LK4827');
    expect(r).toMatchObject({ status: 'ok', pseudonym: 'Vrolijke Papegaai', classCode: '4821', latestSaveCode: 'ABC234' });
  });

  it('verlopen code → expired; onbekend of geen migratie → null (val terug op bewaarcode)', async () => {
    rpc.mockResolvedValueOnce({ data: [{ status: 'expired' }], error: null });
    expect(await loginWithMemberCode('LK4827')).toEqual({ status: 'expired' });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await loginWithMemberCode('LK4827')).toBeNull();
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'function does not exist', code: '42883' } });
    expect(await loginWithMemberCode('LK4827')).toBeNull();
  });

  it('docent: lijst is null zonder migratie', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    expect(await getClassMembers('c1')).toBeNull();
  });

  it('docent: maakt codes met unieke schuilnamen', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await generateClassMembers('c1', 5);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('generate_class_members');
    expect(args.p_class_id).toBe('c1');
    expect(new Set(args.p_pseudonyms).size).toBe(5);
  });
});
