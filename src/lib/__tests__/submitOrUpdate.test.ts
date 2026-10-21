/**
 * Tests voor het inleveren via klascode na migratie 036: het geheim gaat mee
 * bij een update, komt terug bij een nieuwe inzending, en een weigering van de
 * server wordt een SubmissionForbiddenError.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({
  getSupabase: () => Promise.resolve({ rpc }),
}));

import { submitOrUpdateComposition, SubmissionForbiddenError } from '../submissions';
import { storageService } from '../../services/StorageService';
import type { CompositionData } from '../../types';

const data = { tracks: [], bpm: 120, totalBeats: 128, isLooping: false, samples: [] } as unknown as CompositionData;
const base = { classCode: '4821', compositionName: 'Mijn muziek', compositionData: data };

describe('submitOrUpdateComposition (migratie 036)', () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.clear();
  });

  it('geeft bij een nieuwe inzending id, bewaarcode en geheim terug', async () => {
    rpc.mockResolvedValue({ data: [{ submission_id: 'id-1', save_code: 'ABC234', save_secret: 's3cr3t' }], error: null });
    const res = await submitOrUpdateComposition({ ...base, clientId: 'id-1' });
    expect(res).toEqual({ id: 'id-1', saveCode: 'ABC234', saveSecret: 's3cr3t' });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_save_secret');
  });

  it('stuurt het geheim mee bij een update', async () => {
    rpc.mockResolvedValue({ data: [{ submission_id: 'id-1', save_code: 'ABC234', save_secret: null }], error: null });
    const res = await submitOrUpdateComposition({ ...base, clientId: 'id-1', saveSecret: 's3cr3t' });
    expect(rpc).toHaveBeenCalledWith('submit_or_update_composition_v2', expect.objectContaining({
      p_client_id: 'id-1',
      p_save_secret: 's3cr3t',
    }));
    expect(res.saveSecret).toBeNull();
  });

  it('maakt van een weigering door de server een SubmissionForbiddenError', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'submission_forbidden', code: '42501' } });
    await expect(submitOrUpdateComposition({ ...base, clientId: 'id-1' })).rejects.toBeInstanceOf(SubmissionForbiddenError);
  });

  it('valt niet meer terug op de ingetrokken v1-functie', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Could not find the function', code: 'PGRST202' } });
    await expect(submitOrUpdateComposition({ ...base, clientId: 'id-1' })).rejects.toThrow();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe('storageService: geheim per inzending', () => {
  beforeEach(() => localStorage.clear());

  it('bewaart en vindt het geheim per inzending-id', () => {
    storageService.setSubmissionSecret('a', 'geheim-a');
    storageService.setSubmissionSecret('b', 'geheim-b');
    expect(storageService.getSubmissionSecret('a')).toBe('geheim-a');
    expect(storageService.getSubmissionSecret('b')).toBe('geheim-b');
    expect(storageService.getSubmissionSecret('c')).toBeNull();
  });

  it('houdt alleen de laatste 200 bij (H3: computerlokaal)', () => {
    for (let i = 0; i < 205; i++) storageService.setSubmissionSecret(`id-${i}`, `s-${i}`);
    expect(storageService.getSubmissionSecret('id-4')).toBeNull();
    expect(storageService.getSubmissionSecret('id-5')).toBe('s-5');
    expect(storageService.getSubmissionSecret('id-204')).toBe('s-204');
  });

  it('negeert kapotte opslag', () => {
    localStorage.setItem('soundscout:submission-secrets', '{kapot');
    expect(storageService.getSubmissionSecret('a')).toBeNull();
  });
});
