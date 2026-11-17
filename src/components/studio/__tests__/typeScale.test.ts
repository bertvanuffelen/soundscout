/**
 * Letterschaal studio (designronde nov 2026): in de studio en de sequencer
 * geen losse pixelmaten (text-[Npx]) en alleen de twee afgesproken diktes
 * (600 = font-semibold, 800 = font-extrabold). Stijlen: type-label · type-body
 * · type-head · type-title in src/index.css, plus de Tailwind-maten xs..xl.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOTS = ['src/components/studio', 'src/components/sequencer'];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

const files = ROOTS.flatMap((r) => tsxFiles(join(process.cwd(), r)));

describe('letterschaal studio en sequencer', () => {
  it('vindt de bestanden', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('gebruikt geen losse pixelmaten voor tekst', () => {
    const offenders = files.flatMap((f) => (readFileSync(f, 'utf8').match(/\btext-\[\d+(\.\d+)?px\]/g) ?? []).map((m) => `${f}: ${m}`));
    expect(offenders).toEqual([]);
  });

  it('gebruikt alleen de diktes 600 en 800', () => {
    const offenders = files.flatMap((f) =>
      (readFileSync(f, 'utf8').match(/(?<![-\w])font-(thin|extralight|light|normal|medium|bold|black)\b/g) ?? []).map((m) => `${f}: ${m}`));
    expect(offenders).toEqual([]);
  });
});
