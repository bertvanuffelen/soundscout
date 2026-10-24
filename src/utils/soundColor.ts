/**
 * Tekstkleur op een geluidskleur (clips, sleepweergave).
 *
 * Witte tekst haalde op de meeste geluidskleuren geen AA-contrast
 * (geel 1,4:1, groen 2,8:1). Navy (brand-900) haalt ≥ 4,5:1 op bijna alle
 * themakleuren; alleen op donkere kleuren zoals paars is wit beter.
 * We kiezen per kleur de variant met het hoogste WCAG-contrast.
 */

const NAVY = '#0f172a'; // --color-brand-900
const WHITE = '#ffffff'; // --color-text-inverse

/** Relatieve luminantie volgens WCAG 2.x; ongeldige invoer → null */
function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return null;
  const channels = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-contrastverhouding tussen twee hexkleuren (1–21); ongeldig → 1 */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Tailwind-tekstklasse (token) die het best leesbaar is op deze geluidskleur */
export function getOnSoundTextClass(soundColor: string): 'text-brand-900' | 'text-text-inverse' {
  return contrastRatio(NAVY, soundColor) >= contrastRatio(WHITE, soundColor)
    ? 'text-brand-900'
    : 'text-text-inverse';
}
