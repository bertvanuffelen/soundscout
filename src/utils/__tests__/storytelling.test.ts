import { describe, it, expect } from 'vitest';
import { getActiveImageIndex } from '../storytelling';

describe('getActiveImageIndex', () => {
  // --- Edge case: 0 or 1 image ---

  it('returns 0 when imageCount is 0', () => {
    expect(getActiveImageIndex(0, 128, 0, [])).toBe(0);
  });

  it('returns 0 when imageCount is 1 (single image)', () => {
    expect(getActiveImageIndex(0, 128, 1, [])).toBe(0);
    expect(getActiveImageIndex(64, 128, 1, [])).toBe(0);
    expect(getActiveImageIndex(127, 128, 1, [])).toBe(0);
  });

  it('returns 0 for single image even with sections present', () => {
    const sections = [{ endBeat: 64 }, { endBeat: 128 }];
    expect(getActiveImageIndex(100, 128, 1, sections)).toBe(0);
  });

  // --- Section-based: sections.length === imageCount ---

  describe('with sections matching imageCount', () => {
    const sections = [
      { endBeat: 43 },
      { endBeat: 86 },
      { endBeat: 128 },
    ];

    it('returns first image when beat is before first section end', () => {
      expect(getActiveImageIndex(0, 128, 3, sections)).toBe(0);
      expect(getActiveImageIndex(42, 128, 3, sections)).toBe(0);
    });

    it('returns second image when beat is between sections', () => {
      expect(getActiveImageIndex(43, 128, 3, sections)).toBe(1);
      expect(getActiveImageIndex(85, 128, 3, sections)).toBe(1);
    });

    it('returns last image when beat is past last section', () => {
      expect(getActiveImageIndex(86, 128, 3, sections)).toBe(2);
      expect(getActiveImageIndex(127, 128, 3, sections)).toBe(2);
    });

    it('returns last image when beat equals totalBeats', () => {
      expect(getActiveImageIndex(128, 128, 3, sections)).toBe(2);
    });
  });

  // --- Section-based: sections.length === imageCount - 1 (legacy) ---

  describe('with sections.length === imageCount - 1 (legacy)', () => {
    // 3 images but only 2 sections (last image implied)
    const sections = [
      { endBeat: 43 },
      { endBeat: 86 },
    ];

    it('returns first image before first section', () => {
      expect(getActiveImageIndex(0, 128, 3, sections)).toBe(0);
    });

    it('returns second image in second section', () => {
      expect(getActiveImageIndex(43, 128, 3, sections)).toBe(1);
    });

    it('returns last image after all sections', () => {
      expect(getActiveImageIndex(86, 128, 3, sections)).toBe(2);
      expect(getActiveImageIndex(127, 128, 3, sections)).toBe(2);
    });
  });

  // --- Even division fallback (section count doesn't match) ---

  describe('fallback: even beat division', () => {
    it('divides 128 beats evenly for 4 images with no sections', () => {
      // 128 / 4 = 32 beats per image
      expect(getActiveImageIndex(0, 128, 4, [])).toBe(0);
      expect(getActiveImageIndex(31, 128, 4, [])).toBe(0);
      expect(getActiveImageIndex(32, 128, 4, [])).toBe(1);
      expect(getActiveImageIndex(63, 128, 4, [])).toBe(1);
      expect(getActiveImageIndex(64, 128, 4, [])).toBe(2);
      expect(getActiveImageIndex(96, 128, 4, [])).toBe(3);
    });

    it('clamps to last image at totalBeats boundary', () => {
      expect(getActiveImageIndex(128, 128, 4, [])).toBe(3);
    });

    it('handles uneven division (5 images, 128 beats)', () => {
      // 128 / 5 = 25.6 beats per image
      expect(getActiveImageIndex(0, 128, 5, [])).toBe(0);
      expect(getActiveImageIndex(25, 128, 5, [])).toBe(0);
      expect(getActiveImageIndex(26, 128, 5, [])).toBe(1);
      expect(getActiveImageIndex(127, 128, 5, [])).toBe(4);
    });

    it('uses fallback when section count mismatches imageCount', () => {
      // 4 images but 2 sections (not 4 or 3) → fallback
      const sections = [{ endBeat: 64 }, { endBeat: 128 }];
      expect(getActiveImageIndex(0, 128, 4, sections)).toBe(0);
      expect(getActiveImageIndex(96, 128, 4, sections)).toBe(3);
    });
  });

  // --- Boundary conditions ---

  describe('boundary conditions', () => {
    it('handles beat at exactly 0', () => {
      expect(getActiveImageIndex(0, 128, 3, [])).toBe(0);
    });

    it('handles very large beat values (beyond totalBeats)', () => {
      expect(getActiveImageIndex(200, 128, 3, [])).toBe(2);
    });

    it('handles 2 images with 2 sections', () => {
      const sections = [{ endBeat: 64 }, { endBeat: 128 }];
      expect(getActiveImageIndex(0, 128, 2, sections)).toBe(0);
      expect(getActiveImageIndex(63, 128, 2, sections)).toBe(0);
      expect(getActiveImageIndex(64, 128, 2, sections)).toBe(1);
      expect(getActiveImageIndex(127, 128, 2, sections)).toBe(1);
    });
  });
});
