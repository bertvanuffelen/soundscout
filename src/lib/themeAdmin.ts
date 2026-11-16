/**
 * Beheer-kant van het themaplatform (migratie 043): lezen en schrijven van
 * thema's, versies, media en bronvermelding. Alleen voor /beheer, dus via de
 * (lazy) Supabase-client met de sessie van de ingelogde beheerder.
 *
 * Beveiliging zit NIET hier maar in de database: RLS laat alleen beheerders
 * schrijven en concepten zien, triggers houden gepubliceerde versies
 * onveranderlijk, en publiceren/terugzetten kan alleen via de RPC's.
 */

import { z } from 'zod';
import { getSupabase } from './supabase';
import { isMissingDatabaseObject, matchesError, ERR_RATE_LIMIT } from './supabaseErrors';
import { THEMES_BUCKET, versionFolderPath, versionFolderUrl } from '../themes/supabaseRepository';
import type { ThemeManifest } from '../themes/manifest';
import type { CreditDraft } from '../admin/checks';
import type { DraftAsset } from '../admin/editorState';

/** Migratie 043 is (nog) niet toegepast: het dashboard werkt dan lokaal. */
export class AdminBackendMissingError extends Error {}

export type AdminErrorCode = 'rateLimit' | 'forbidden' | 'invalid' | 'generic';

export class AdminRequestError extends Error {
  readonly code: AdminErrorCode;
  constructor(message: string, code: AdminErrorCode) {
    super(message);
    this.code = code;
  }
}

type PgError = { code?: string; message: string } | null;

function raise(error: PgError, fallback: string): never {
  if (isMissingDatabaseObject(error)) throw new AdminBackendMissingError(error?.message ?? fallback);
  const message = error?.message ?? fallback;
  if (error && matchesError(error, ERR_RATE_LIMIT)) throw new AdminRequestError(message, 'rateLimit');
  if (error?.code === '42501' || /not_admin|row-level security|permission denied/i.test(message)) throw new AdminRequestError(message, 'forbidden');
  if (/theme_manifest_invalid|theme_version_/.test(message)) throw new AdminRequestError(message, 'invalid');
  throw new AdminRequestError(message, 'generic');
}

// --- Lezen ---

export const ThemeRowSchema = z.object({
  id: z.string(),
  status: z.enum(['draft', 'published', 'hidden']),
  is_public: z.boolean(),
  season_from: z.string().nullable(),
  season_until: z.string().nullable(),
  sort: z.number().int().nullable(),
  published_version: z.number().int().nullable(),
  updated_at: z.string(),
});
export type ThemeRow = z.infer<typeof ThemeRowSchema>;

export const ThemeVersionRowSchema = z.object({
  theme_id: z.string(),
  version: z.number().int(),
  manifest: z.unknown(),
  created_at: z.string(),
  published_at: z.string().nullable(),
});
export type ThemeVersionRow = z.infer<typeof ThemeVersionRowSchema>;

export interface AdminThemeData {
  themes: ThemeRow[];
  versions: ThemeVersionRow[];
}

export async function fetchAdminThemes(): Promise<AdminThemeData> {
  const supabase = await getSupabase();
  const [themes, versions] = await Promise.all([
    supabase.from('themes').select('id,status,is_public,season_from,season_until,sort,published_version,updated_at').order('sort', { ascending: true, nullsFirst: false }),
    supabase.from('theme_versions').select('theme_id,version,manifest,created_at,published_at').order('version', { ascending: true }),
  ]);
  if (themes.error) raise(themes.error, 'themes');
  if (versions.error) raise(versions.error, 'theme_versions');
  const t = z.array(ThemeRowSchema).safeParse(themes.data);
  const v = z.array(ThemeVersionRowSchema).safeParse(versions.data);
  if (!t.success || !v.success) throw new AdminRequestError('onverwacht antwoord', 'generic');
  return { themes: t.data, versions: v.data };
}

// --- Thema-gegevens (zichtbaarheid, volgorde, seizoen, verbergen) ---

export interface ThemeMetaPatch {
  is_public?: boolean;
  sort?: number | null;
  season_from?: string | null;
  season_until?: string | null;
  status?: 'published' | 'hidden';
}

export async function updateThemeMeta(id: string, patch: ThemeMetaPatch): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('themes').update(patch).eq('id', id);
  if (error) raise(error, 'themes update');
}

// --- Concept opslaan als nieuwe versie ---

async function sha256(bytes: Uint8Array): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export interface SaveDraftInput {
  themeId: string;
  /** Bouw het manifest voor het toegekende versienummer (zie prepareVersionManifest). */
  build: (version: number) => { manifest: ThemeManifest; uploads: Array<[string, DraftAsset]> };
  credits: Record<string, CreditDraft>;
  /** Startwaarden voor een thema dat nog niet in de database staat. */
  initialMeta?: { is_public: boolean; sort: number | null; season_from: string | null; season_until: string | null };
}

/**
 * Sla een concept op als NIEUWE, ongepubliceerde versie: themarij (indien
 * nieuw) → bestanden naar `<id>/v<n>/` → versierij → bronvermelding.
 * @returns het versienummer
 */
export async function saveDraftVersion({ themeId, build, credits, initialMeta }: SaveDraftInput): Promise<number> {
  const supabase = await getSupabase();

  const existing = await supabase.from('themes').select('id').eq('id', themeId).maybeSingle();
  if (existing.error) raise(existing.error, 'themes');
  if (!existing.data) {
    const { error } = await supabase.from('themes').insert({ id: themeId, ...(initialMeta ?? {}) });
    if (error) raise(error, 'themes insert');
  }

  const last = await supabase.from('theme_versions').select('version').eq('theme_id', themeId).order('version', { ascending: false }).limit(1);
  if (last.error) raise(last.error, 'theme_versions');
  const version = ((last.data?.[0] as { version?: number } | undefined)?.version ?? 0) + 1;
  const { manifest, uploads } = build(version);

  const folder = versionFolderPath(themeId, version);
  const bucket = supabase.storage.from(THEMES_BUCKET);
  for (const [path, asset] of uploads) {
    const { error } = await bucket.upload(folder + path, new Blob([asset.bytes as BlobPart], { type: asset.contentType }), {
      contentType: asset.contentType,
      upsert: false,
      cacheControl: '31536000',
    });
    if (error) throw new AdminRequestError(`${path}: ${error.message}`, 'generic');
  }

  const inserted = await supabase.from('theme_versions').insert({ theme_id: themeId, version, manifest });
  if (inserted.error) raise(inserted.error, 'theme_versions insert');

  const assetRows = await Promise.all(uploads.map(async ([path, asset]) => {
    const credit = credits[path] ?? {};
    return {
      theme_id: themeId,
      path: `v${version}/${path}`,
      sha256: await sha256(asset.bytes),
      bytes: asset.bytes.length,
      content_type: asset.contentType,
      source: credit.source ?? null,
      author: credit.author ?? null,
      licence: credit.licence ?? null,
      licence_url: credit.licenceUrl ?? null,
      generation_prompt: credit.generationPrompt ?? null,
    };
  }));
  if (assetRows.length > 0) {
    const { error } = await supabase.from('theme_assets').upsert(assetRows, { onConflict: 'theme_id,path' });
    if (error) raise(error, 'theme_assets');
  }
  return version;
}

/** Waar de media van een opgeslagen versie staan (manifest-URL voor de editor en het voorbeeld). */
export function versionManifestUrl(themeId: string, version: number): string {
  return `${versionFolderUrl(import.meta.env.VITE_SUPABASE_URL ?? '', themeId, version)}manifest.json`;
}

// --- Publiceren en terugzetten ---

export async function publishThemeVersion(themeId: string, version: number): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('publish_theme_version', { p_theme_id: themeId, p_version: version });
  if (error) raise(error, 'publish_theme_version');
}

export async function rollbackTheme(themeId: string, version: number): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('rollback_theme', { p_theme_id: themeId, p_version: version });
  if (error) raise(error, 'rollback_theme');
}
