import { describe, it, expect, beforeEach } from 'vitest';
import { restoreTimerMinutes, rememberTimer, readRememberedTimer } from '../peerTimer';

const now = Date.parse('2026-10-15T10:00:00Z');
const inMin = (m: number) => new Date(now + m * 60_000).toISOString();

describe('restoreTimerMinutes', () => {
  it('geen sluittijd = geen tijdslot', () => {
    expect(restoreTimerMinutes('15', null, now)).toBe(0);
  });
  it('onthouden duur wint', () => {
    expect(restoreTimerMinutes('30', inMin(4), now)).toBe(30);
  });
  it('anders de kleinste optie die nog past', () => {
    expect(restoreTimerMinutes(null, inMin(4), now)).toBe(10);
    expect(restoreTimerMinutes(null, inMin(12), now)).toBe(15);
    expect(restoreTimerMinutes('rommel', inMin(22), now)).toBe(30);
  });
  it('verlopen ronde houdt een tijdslot (heropenen werkt dan met dezelfde duur)', () => {
    expect(restoreTimerMinutes(null, inMin(-5), now)).toBe(10);
  });
});

describe('rememberTimer', () => {
  beforeEach(() => localStorage.clear());
  it('bewaart en wist per opdracht', () => {
    rememberTimer('a1', 15);
    expect(readRememberedTimer('a1')).toBe('15');
    expect(readRememberedTimer('a2')).toBeNull();
    rememberTimer('a1', null);
    expect(readRememberedTimer('a1')).toBeNull();
  });
});
