import { describe, it, expect } from 'vitest';
import { contrastRatio, getOnSoundTextClass } from '../soundColor';
import { getTheme } from '../../data/themes';
import { SEQUENCE_COLORS } from '../../types/sequencer';

const NAVY = '#0f172a';
const WHITE = '#ffffff';
const textHex = (cls: string) => (cls === 'text-brand-900' ? NAVY : WHITE);

describe('contrastRatio', () => {
  it('geeft 21 voor zwart op wit en 1 voor gelijke kleuren', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#F7DC6F', '#F7DC6F')).toBeCloseTo(1, 5);
  });

  it('geeft 1 bij ongeldige invoer', () => {
    expect(contrastRatio('rood', '#ffffff')).toBe(1);
  });
});

describe('getOnSoundTextClass', () => {
  it('kiest navy op lichte geluidskleuren (waar wit onleesbaar was)', () => {
    expect(getOnSoundTextClass('#F7DC6F')).toBe('text-brand-900'); // skateboard, wit = 1,4:1
    expect(getOnSoundTextClass('#4CAF50')).toBe('text-brand-900'); // voetbal, wit = 2,8:1
    expect(getOnSoundTextClass('#3498DB')).toBe('text-brand-900'); // drone, wit = 3,2:1
    expect(getOnSoundTextClass('#F59E0B')).toBe('text-brand-900'); // sequence (accent-500)
  });

  it('kiest wit op paars, waar navy slechter is', () => {
    expect(getOnSoundTextClass('#9B59B6')).toBe('text-text-inverse');
  });

  it('haalt op elke kleur uit thema’s en sequences minstens 4,3:1 en meestal AA', () => {
    const themeColors = ['basis', 'winterspelen', 'piraten'].flatMap(
      (id) => getTheme(id)?.samples.map((s) => s.color) ?? [],
    );
    const colors = [...new Set([...themeColors, ...SEQUENCE_COLORS])];
    expect(colors.length).toBeGreaterThan(10);

    const belowAA: string[] = [];
    for (const color of colors) {
      const ratio = contrastRatio(textHex(getOnSoundTextClass(color)), color);
      // Ondergrens: geen enkele kleur mag terugvallen naar het oude niveau
      expect(ratio).toBeGreaterThanOrEqual(4.3);
      if (ratio < 4.5) belowAA.push(color.toUpperCase());
    }
    // Bekend net onder AA: teal (4,38) en indigo (4,47). Komt er een kleur
    // bij, dan faalt deze test; donker die kleur dan iets af.
    expect(belowAA.every((c) => ['#0E8C8C', '#6366F1'].includes(c))).toBe(true);
  });
});
