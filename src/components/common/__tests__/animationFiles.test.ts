/**
 * Uitleg-animaties in public/animaties/ (docs/ANIMATIE-RICHTLIJNEN.md):
 * CSP-schoon (geen inline script, geen externe hosts), tweetalig via TEXTS,
 * één rAF-klok en een stilstaand beeld bij prefers-reduced-motion.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const dir = join(process.cwd(), 'public', 'animaties');
const names = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));

describe('uitleg-animaties', () => {
  it('vindt de animaties, waaronder "Eén geluid op reis"', () => {
    expect(names).toContain('reis-van-een-geluid');
    expect(names).toContain('onboarding-4-stappen');
  });

  describe.each(names)('%s', (name) => {
    const html = readFileSync(join(dir, `${name}.html`), 'utf8');
    const js = readFileSync(join(dir, `${name}.js`), 'utf8');

    it('heeft geen inline script en laadt niets van een andere host', () => {
      expect(html).toMatch(new RegExp(`<script[^>]*\\bsrc="[^"]*${name}\\.js"`));
      expect(html.match(/<script(?![^>]*\bsrc=)/g)).toBeNull();
      expect(html + js).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(html).toContain('/fonts/nunito.css');
    });

    it('is tweetalig, loopt op één rAF-klok en respecteert reduced motion', () => {
      expect(js).toMatch(/const TEXTS\s*=\s*\{[\s\S]*\bnl:\s*\{[\s\S]*\ben:\s*\{/);
      expect(js).toContain('requestAnimationFrame');
      expect(js).not.toMatch(/setInterval\(/);
      expect(js).toContain('prefers-reduced-motion');
    });
  });

  it('"Eén geluid op reis" is stil (besluit 17-11-2026)', () => {
    const js = readFileSync(join(dir, 'reis-van-een-geluid.js'), 'utf8');
    expect(js).not.toMatch(/AudioContext|new Audio\(|\.play\(\)/);
  });
});
