import { describe, it, expect } from 'vitest';
import {
  submissionLastActivity,
  submissionDeletionDate,
  getClassDeletionWarning,
  RETENTION_SUBMISSION_DAYS,
  RETENTION_WARN_BEFORE_DAYS,
} from '../retention';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-24T12:00:00Z');

/** Maak een inzending waarvan de laatste activiteit `daysAgo` dagen geleden was */
function sub(daysAgo: number, field: 'last_updated_at' | 'submitted_at' | 'created_at' = 'last_updated_at') {
  const ts = new Date(NOW.getTime() - daysAgo * DAY).toISOString();
  return { created_at: new Date(NOW.getTime() - 400 * DAY).toISOString(), [field]: ts };
}

describe('retention', () => {
  it('kiest last_updated_at > submitted_at > created_at als laatste activiteit', () => {
    const a = { created_at: '2025-01-01T00:00:00Z', submitted_at: '2025-06-01T00:00:00Z', last_updated_at: '2026-01-01T00:00:00Z' };
    expect(submissionLastActivity(a).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    const b = { created_at: '2025-01-01T00:00:00Z', submitted_at: '2025-06-01T00:00:00Z', last_updated_at: null };
    expect(submissionLastActivity(b).toISOString()).toBe('2025-06-01T00:00:00.000Z');
    const c = { created_at: '2025-01-01T00:00:00Z' };
    expect(submissionLastActivity(c).toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('verwijderdatum = laatste activiteit + 1 schooljaar', () => {
    const s = sub(0);
    const expected = new Date(NOW.getTime() + RETENTION_SUBMISSION_DAYS * DAY);
    expect(submissionDeletionDate(s).getTime()).toBe(expected.getTime());
  });

  it('geen waarschuwing als alles ruim binnen de termijn valt', () => {
    const subs = [sub(10), sub(100), sub(200)];
    expect(getClassDeletionWarning(subs, NOW)).toBeNull();
  });

  it('waarschuwt zodra een inzending binnen 30 dagen wordt verwijderd', () => {
    // 340 dagen oud → verwijderd over 25 dagen (binnen het 30-daagse venster)
    const warn = getClassDeletionWarning([sub(340), sub(10)], NOW);
    expect(warn).not.toBeNull();
    expect(warn!.count).toBe(1);
    const daysUntil = Math.round((warn!.date.getTime() - NOW.getTime()) / DAY);
    expect(daysUntil).toBe(RETENTION_SUBMISSION_DAYS - 340); // 25
  });

  it('telt meerdere inzendingen binnen het venster en kiest de vroegste datum', () => {
    const warn = getClassDeletionWarning([sub(360), sub(345), sub(50)], NOW);
    expect(warn).not.toBeNull();
    expect(warn!.count).toBe(2);
    // de oudste (360d) wordt het eerst verwijderd
    const daysUntil = Math.round((warn!.date.getTime() - NOW.getTime()) / DAY);
    expect(daysUntil).toBe(RETENTION_SUBMISSION_DAYS - 360); // 5
  });

  it('waarschuwt ook als de termijn al verstreken is (negatieve dagen)', () => {
    const warn = getClassDeletionWarning([sub(400)], NOW);
    expect(warn).not.toBeNull();
    expect(warn!.date.getTime()).toBeLessThan(NOW.getTime());
  });

  it('venstergrens: 335 dagen oud valt net binnen het venster', () => {
    const boundary = RETENTION_SUBMISSION_DAYS - RETENTION_WARN_BEFORE_DAYS; // 335
    expect(getClassDeletionWarning([sub(boundary)], NOW)).not.toBeNull();
    expect(getClassDeletionWarning([sub(boundary - 1)], NOW)).toBeNull();
  });
});
