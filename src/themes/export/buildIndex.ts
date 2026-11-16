/**
 * Bouwt public/themes/index.json uit de manifesten (V2 Fase 3). Puur: het
 * script leest/schrijft de bestanden, dit bestand rekent alleen.
 */

import { MANIFEST_SCHEMA_VERSION, ThemeIndexSchema, ThemeManifestSchema, manifestJsonSchema, type ThemeIndex } from '../manifest';
import { compareThemes, manifestToIndexEntry } from '../mapping';
import { checkManifest, integrityErrors, summarizeIssues, type RuleIssue } from '../rules';

export { stableJson } from '../convert';
export { manifestJsonSchema };

export interface ManifestFile {
  /** Pad relatief aan public/themes/ ('basis/manifest.json') */
  path: string;
  json: unknown;
}

export interface IndexBuildResult {
  index: ThemeIndex;
  /** Meldingen per thema-id */
  issues: Record<string, RuleIssue[]>;
  summary: Record<string, Record<string, number>>;
  /** Overgeslagen manifesten (concept of ongeldig), met reden */
  skipped: Array<{ path: string; reason: string }>;
}

export function buildThemeIndex(files: ManifestFile[]): IndexBuildResult {
  const entries = [];
  const issues: Record<string, RuleIssue[]> = {};
  const summary: Record<string, Record<string, number>> = {};
  const skipped: IndexBuildResult['skipped'] = [];
  const ids = new Set<string>();

  for (const file of files) {
    const parsed = ThemeManifestSchema.safeParse(file.json);
    if (!parsed.success) {
      skipped.push({ path: file.path, reason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      continue;
    }
    const manifest = parsed.data;
    const folder = file.path.split('/')[0];
    if (folder !== manifest.id) {
      skipped.push({ path: file.path, reason: `map "${folder}" ≠ id "${manifest.id}"` });
      continue;
    }
    if (ids.has(manifest.id)) {
      skipped.push({ path: file.path, reason: `id "${manifest.id}" bestaat al` });
      continue;
    }
    const found = checkManifest(manifest);
    issues[manifest.id] = found;
    summary[manifest.id] = summarizeIssues(found);
    const broken = integrityErrors(found);
    if (broken.length > 0) {
      skipped.push({ path: file.path, reason: broken.map((i) => i.message).join('; ') });
      continue;
    }
    if (manifest.status !== 'published') {
      skipped.push({ path: file.path, reason: 'status is draft' });
      continue;
    }
    ids.add(manifest.id);
    entries.push(manifestToIndexEntry(manifest, file.path));
  }

  entries.sort(compareThemes);
  const index = ThemeIndexSchema.parse({ schemaVersion: MANIFEST_SCHEMA_VERSION, themes: entries });
  return { index, issues, summary, skipped };
}
