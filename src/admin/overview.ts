/**
 * Het thema-overzicht van /beheer: database-thema's (met concepten) en de
 * statische thema's uit de app, samengevoegd tot één lijst met per thema de
 * nieuwste versie en het aantal fouten/waarschuwingen uit rules.ts.
 */

import { ThemeManifestSchema, type ThemeManifest } from '../themes/manifest';
import { compareThemes } from '../themes/mapping';
import type { LoadedManifest } from '../themes/repository';
import type { ThemeRow, ThemeVersionRow } from '../lib/themeAdmin';
import { validateDraft, createDraft } from './editorState';
import { countErrors, countWarnings, type AdminIssue } from './checks';

export type AdminThemeStatus = 'draft' | 'published' | 'hidden' | 'static';

export interface AdminVersion {
  version: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface AdminThemeRow {
  id: string;
  /** 'database' = in /beheer beheerd; 'static' = alleen ingebouwd in de app (public/themes). */
  source: 'database' | 'static';
  status: AdminThemeStatus;
  isPublic: boolean;
  season?: { from: string; until: string };
  sort?: number;
  publishedVersion: number | null;
  versions: AdminVersion[];
  /** Nieuwste versie (concept of live) — wat de editor opent. */
  latest: LoadedManifest & { version: number; published: boolean };
  issues: AdminIssue[];
  errors: number;
  warnings: number;
  /** Is er een ongepubliceerd concept nieuwer dan de live versie? */
  hasDraft: boolean;
}

export function buildAdminRows(
  db: { themes: ThemeRow[]; versions: ThemeVersionRow[] } | null,
  statics: LoadedManifest[],
  manifestUrl: (themeId: string, version: number) => string,
): AdminThemeRow[] {
  const rows = new Map<string, AdminThemeRow>();

  const withChecks = (row: Omit<AdminThemeRow, 'issues' | 'errors' | 'warnings'>): AdminThemeRow => {
    const issues = validateDraft(createDraft(row.latest.manifest, row.latest.url, row.latest.version));
    return { ...row, issues, errors: countErrors(issues), warnings: countWarnings(issues) };
  };

  for (const s of statics) {
    rows.set(s.manifest.id, withChecks({
      id: s.manifest.id,
      source: 'static',
      status: 'static',
      isPublic: s.manifest.isPublic,
      ...(s.manifest.season ? { season: s.manifest.season } : {}),
      ...(s.manifest.sort !== undefined ? { sort: s.manifest.sort } : {}),
      publishedVersion: null,
      versions: [],
      latest: { ...s, version: s.manifest.version, published: true },
      hasDraft: false,
    }));
  }

  for (const theme of db?.themes ?? []) {
    const versions = (db?.versions ?? []).filter((v) => v.theme_id === theme.id).sort((a, b) => a.version - b.version);
    const newest = versions[versions.length - 1];
    const parsed = newest ? ThemeManifestSchema.safeParse(newest.manifest) : null;
    if (!newest || !parsed?.success) continue;
    const manifest: ThemeManifest = parsed.data;
    rows.set(theme.id, withChecks({
      id: theme.id,
      source: 'database',
      status: theme.status,
      isPublic: theme.is_public,
      ...(theme.season_from && theme.season_until ? { season: { from: theme.season_from, until: theme.season_until } } : {}),
      ...(theme.sort !== null ? { sort: theme.sort } : {}),
      publishedVersion: theme.published_version,
      versions: versions.map((v) => ({ version: v.version, createdAt: v.created_at, publishedAt: v.published_at })),
      latest: { manifest, url: manifestUrl(theme.id, newest.version), version: newest.version, published: newest.published_at !== null },
      hasDraft: newest.published_at === null,
    }));
  }

  return [...rows.values()].sort(compareThemes);
}

/** Eerder gepubliceerde versies waarnaar je terug kunt (niet de live versie zelf). */
export function rollbackTargets(row: AdminThemeRow): number[] {
  return row.versions.filter((v) => v.publishedAt && v.version !== row.publishedVersion).map((v) => v.version).sort((a, b) => b - a);
}

/** Nieuwe volgorde na omhoog/omlaag: sort-waarden 10, 20, 30… voor de database-thema's. */
export function reorder(rows: AdminThemeRow[], index: number, direction: -1 | 1): Array<{ id: string; sort: number }> {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return [];
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((r, i) => ({ id: r.id, sort: (i + 1) * 10 })).filter((r, i) => next[i].source === 'database' && next[i].sort !== r.sort);
}

export function themeName(row: AdminThemeRow): string {
  return row.latest.manifest.texts.nl.name;
}
