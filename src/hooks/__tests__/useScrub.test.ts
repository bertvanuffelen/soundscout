import { describe, it, expect } from 'vitest';
import { beatAtClientX } from '../useScrub';

describe('beatAtClientX', () => {
  const rect = { left: 100, width: 640 };

  it('rekent de positie om naar een tel', () => {
    expect(beatAtClientX(100, rect, 64)).toBe(0);
    expect(beatAtClientX(420, rect, 64)).toBe(32);
    expect(beatAtClientX(740, rect, 64)).toBe(64);
  });

  it('klemt buiten het vlak op 0 en totalBeats', () => {
    expect(beatAtClientX(20, rect, 64)).toBe(0);
    expect(beatAtClientX(2000, rect, 64)).toBe(64);
  });

  it('geeft 0 bij een vlak zonder breedte', () => {
    expect(beatAtClientX(300, { left: 0, width: 0 }, 64)).toBe(0);
  });
});
