#!/usr/bin/env node
/**
 * Thema-manifesten (V2 Fase 3). Zie docs/v2/THEMES.md.
 *
 *   node scripts/export-theme-manifests.mjs            index.json + manifest.schema.json (+ bundel-kopieën) opnieuw maken
 *   node scripts/export-theme-manifests.mjs --from-ts  eerst de TS-thema's (src/data/themes) omzetten naar
 *                                                      public/themes/<id>/manifest.json (eenmalige migratie)
 *   node scripts/export-theme-manifests.mjs --check    niets schrijven; faalt als index/schema verouderd zijn
 *
 * Leest elke public/themes/<id>/manifest.json, valideert die met het Zod-schema
 * van de app en de inhoudsregels, en schrijft public/themes/index.json (wat de
 * kiezers nodig hebben) en public/themes/manifest.schema.json (voor check-pakket.py).
 * Uitvoer is deterministisch (gesorteerde sleutels), dus rustig te committen.
 *
 * Draait de TypeScript-modules via Vite (runnerImport): geen extra tools nodig.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = join(ROOT, 'public', 'themes');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');

const load = async (path) => (await runnerImport(join(ROOT, path), { configFile: false, logLevel: 'error' })).module;

const { buildThemeIndex, stableJson, manifestJsonSchema } = await load('src/themes/export/buildIndex.ts');

const stale = [];
function write(path, content) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) return;
  if (CHECK) {
    stale.push(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`  geschreven: ${path.slice(ROOT.length + 1)}`);
}

// --- 1. (optioneel) TS-thema's → manifesten ---
if (args.has('--from-ts')) {
  const { convertLegacyThemes } = await load('src/themes/export/legacyThemes.ts');
  for (const manifest of convertLegacyThemes()) {
    write(join(THEMES_DIR, manifest.id, 'manifest.json'), stableJson(manifest));
  }
}

// --- 2. Manifesten lezen → index ---
const files = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(THEMES_DIR, d.name, 'manifest.json')))
  .map((d) => d.name)
  .sort()
  .map((name) => ({ path: `${name}/manifest.json`, json: JSON.parse(readFileSync(join(THEMES_DIR, name, 'manifest.json'), 'utf8')) }));

const { index, summary, skipped } = buildThemeIndex(files);
write(join(THEMES_DIR, 'index.json'), stableJson(index));

// Bundel-kopieën (src/themes/bundled/): basis werkt offline en bij het eerste
// bezoek zonder verzoek, en de kiezers hebben meteen een lijst. Vite kan niet
// uit public/ importeren, vandaar een kopie.
const BUNDLED_DIR = join(ROOT, 'src', 'themes', 'bundled');
write(join(BUNDLED_DIR, 'index.json'), stableJson(index));
write(join(BUNDLED_DIR, 'basis.manifest.json'), readFileSync(join(THEMES_DIR, 'basis', 'manifest.json'), 'utf8'));
write(join(THEMES_DIR, 'manifest.schema.json'), stableJson(manifestJsonSchema()));

// --- 3. Rapport ---
console.log(`Thema's in index: ${index.themes.map((t) => `${t.id} v${t.version}`).join(', ') || '(geen)'}`);
for (const [id, counts] of Object.entries(summary)) {
  const lines = Object.entries(counts).map(([rule, n]) => `${rule}: ${n}`);
  console.log(`  ${id}: ${lines.length ? lines.join(', ') : 'geen meldingen'}`);
}
for (const s of skipped) console.warn(`  OVERGESLAGEN ${s.path}: ${s.reason}`);

if (CHECK && stale.length > 0) {
  console.error(`Verouderd (draai node scripts/export-theme-manifests.mjs): ${stale.map((p) => p.slice(ROOT.length + 1)).join(', ')}`);
  process.exit(1);
}
