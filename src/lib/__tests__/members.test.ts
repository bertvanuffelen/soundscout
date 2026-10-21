/**
 * Leerlingcodes (migratie 038 + 042).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));

import {
  loginWithMemberCode, formatMemberCode, getClassMembers, generateClassMembers,
  openMemberLatestWork, MEMBER_CODE_PATTERN,
} from '../members';

describe('leerlingcodes', () => {
  beforeEach(() => rpc.mockReset());

  it('formaat ABC1234: botst niet met bewaarcodes (6) of klascodes (4)', () => {
    expect(MEMBER_CODE_PATTERN.test('ABC1234')).toBe(true);
    expect(MEMBER_CODE_PATTERN.test('LK4827')).toBe(false);
    expect(MEMBER_CODE_PATTERN.test('K7P4QX')).toBe(false);
    expect(formatMemberCode('ABC1234')).toBe('ABC-1234');
  });

  it('logt in zonder bewaarcode in het antwoord (042)', async () => {
    rpc.mockResolvedValue({ data: [{
      status: 'ok', member_id: 'm1', pseudonym: 'Vrolijke Papegaai', class_id: 'c1',
      class_name: 'Groep 6b', class_code: '4821', expires_at: '2027-07-31', has_work: true,
    }], error: null });
    const r = await loginWithMemberCode('ABC1234');
    expect(r).toMatchObject({ status: 'ok', pseudonym: 'Vrolijke Papegaai', classCode: '4821', hasWork: true });
  });

  it('rem → busy, andere fout → error, onbekend → null, verlopen → expired (M1)', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Rate limit exceeded for member_login' } });
    expect(await loginWithMemberCode('ABC1234')).toEqual({ status: 'busy' });
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    expect(await loginWithMemberCode('ABC1234')).toEqual({ status: 'error' });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await loginWithMemberCode('ABC1234')).toBeNull();
    rpc.mockResolvedValueOnce({ data: [{ status: 'expired' }], error: null });
    expect(await loginWithMemberCode('ABC1234')).toEqual({ status: 'expired' });
  });

  it('verder werken geeft bewaarcode + bestaand geheim', async () => {
    rpc.mockResolvedValue({ data: [{ submission_id: 's1', save_code: 'ABC234', save_secret: 'x'.repeat(32) }], error: null });
    expect(await openMemberLatestWork('ABC1234')).toEqual({ submissionId: 's1', saveCode: 'ABC234', saveSecret: 'x'.repeat(32) });
  });

  it('docent: geen blok zonder migratie 042', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function member_codes_version does not exist' } });
    expect(await getClassMembers('c1')).toBeNull();
  });

  it('docent: lijst met 042', async () => {
    rpc.mockImplementation((name: string) => Promise.resolve(
      name === 'member_codes_version' ? { data: 2, error: null } : { data: [], error: null },
    ));
    expect(await getClassMembers('c1')).toEqual([]);
  });

  it('docent: maakt codes met unieke schuilnamen', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await generateClassMembers('c1', 5);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('generate_class_members');
    expect(new Set(args.p_pseudonyms).size).toBe(5);
  });
});
