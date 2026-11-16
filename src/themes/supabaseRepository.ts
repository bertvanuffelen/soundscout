/**
 * Thema's uit Supabase (V2 Fase 3, migratie 043) — samengevoegd met de
 * statische thema's. Uitleg: docs/v2/ADMIN-DASHBOARD.md §4.
 *
 * Bron van waarheid voor een gepubliceerd manifest is `theme_versions.manifest`
 * (gelezen via de view `published_themes`), NIET een bestand in Storage:
 *  - de database dwingt af dat een gepubliceerde versie nooit verandert
 *    (trigger) en publiceren is één transactie met vormcontrole (RPC);
 *  - een Storage-object kan een beheerder op hetzelfde pad overschrijven en
 *    hangt niet transactioneel aan `published_version`.
 * De MEDIA staan in Storage, per versie: `themes/<id>/v<n>/…`. Het manifest
 * krijgt als adres die versiemap, zodat relatieve paden daar uitkomen.
 *
 * Samenvoegregels:
 *  1. `basis` komt altijd uit de bundel (offline-vangnet), wat Supabase ook zegt.
 *  2. Een in Supabase gepubliceerd thema vervangt de statische kopie met dat id.
 *  3. Statische thema's die Supabase niet kent, blijven gewoon werken.
 *  4. Een concept dat in DIT tabblad als voorbeeld openstaat (preview.ts) gaat voor alles behalve basis-uit-bundel.
 *  5. Supabase niet ingesteld, onbereikbaar, traag (> 4 s) of migratie 043
 *     nog niet gedraaid → alleen de statische thema's (plus de laatst geziene
 *     Supabase-lijst uit localStorage, voor offline). De leerling-app breekt
 *     nooit door de beheer-backend.
 *
 * Geen Supabase-client: een kale fetch naar PostgREST met de anon-sleutel
 * (zoals usageStats.ts), zodat leerlingen de ~168 kB-client niet laden.
 */

import { z } from 'zod';
import { compareThemes, manifestToSummary, manifestToThemeConfig, type ThemeSummary } from './mapping';
import { parseManifest, type LoadedManifest, type ThemeRepository } from './repository';
import { isMissingDatabaseObject } from '../lib/supabaseErrors';
import { logger } from '../utils/logger';

export const THEMES_BUCKET = 'themes';
export const BUNDLED_ID = 'basis';
const TIMEOUT_MS = 4000;
const CACHE_KEY = 'soundscout:themes:published-v1';

// --- Adressen in Storage ---

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Publieke basis van de bucket: `<supabase>/storage/v1/object/public/themes/`. */
export function bucketPublicUrl(supabaseUrl: string): string {
  return `${trimSlash(supabaseUrl)}/storage/v1/object/public/${THEMES_BUCKET}/`;
}

/** Objectpad van een versiemap in de bucket: `<id>/v<n>/`. */
export function versionFolderPath(themeId: string, version: number): string {
  return `${themeId}/v${version}/`;
}

/** Publieke URL van een versiemap. Relatieve mediapaden in het manifest komen hier uit. */
export function versionFolderUrl(supabaseUrl: string, themeId: string, version: number): string {
  return bucketPublicUrl(supabaseUrl) + versionFolderPath(themeId, version);
}

// --- Wat de view published_themes teruggeeft ---

const MonthDay = z.string().regex(/^\d{2}-\d{2}$/);

export const PublishedThemeRowSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'hidden']),
  is_public: z.boolean(),
  season_from: MonthDay.nullable(),
  season_until: MonthDay.nullable(),
  sort: z.number().int().nullable(),
  version: z.number().int().positive(),
  manifest: z.unknown(),
});
export type PublishedThemeRow = z.infer<typeof PublishedThemeRowSchema>;

/**
 * Rij → geladen manifest. De veranderlijke gegevens (zichtbaarheid, seizoen,
 * volgorde) komen uit `themes`, niet uit het (onveranderlijke) manifest.
 * Een ongeldig manifest wordt overgeslagen (null), nooit de hele lijst.
 */
export function rowToLoadedManifest(row: PublishedThemeRow, supabaseUrl: string): LoadedManifest | null {
  try {
    const manifest = parseManifest(row.manifest, `supabase:${row.id}@v${row.version}`);
    if (manifest.id !== row.id) throw new Error(`id "${manifest.id}" ≠ "${row.id}"`);
    const { season: _season, sort: _sort, ...rest } = manifest;
    void _season;
    void _sort;
    return {
      manifest: {
        ...rest,
        version: row.version,
        status: 'published',
        isPublic: row.is_public && row.status !== 'hidden',
        ...(row.season_from && row.season_until ? { season: { from: row.season_from, until: row.season_until } } : {}),
        ...(row.sort !== null ? { sort: row.sort } : {}),
      },
      url: `${versionFolderUrl(supabaseUrl, row.id, row.version)}manifest.json`,
    };
  } catch (error) {
    logger.warn('[themes] gepubliceerd thema overgeslagen', error);
    return null;
  }
}

// --- Bron: PostgREST ---

/** De migratie (of de hele backend) ontbreekt: niet opnieuw proberen deze sessie. */
export class ThemeBackendMissingError extends Error {}

export interface PublishedThemesSource {
  list(): Promise<PublishedThemeRow[]>;
}

export interface RestSourceOptions {
  supabaseUrl: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createRestPublishedSource({ supabaseUrl, anonKey, fetchImpl, timeoutMs = TIMEOUT_MS }: RestSourceOptions): PublishedThemesSource {
  return {
    async list() {
      const doFetch = fetchImpl ?? fetch;
      const controller = typeof AbortController === 'undefined' ? null : new AbortController();
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const response = await doFetch(
          `${trimSlash(supabaseUrl)}/rest/v1/published_themes?select=id,status,is_public,season_from,season_until,sort,version,manifest`,
          {
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
            signal: controller?.signal,
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
          if (response.status === 404 || isMissingDatabaseObject(body)) {
            throw new ThemeBackendMissingError(`published_themes: ${body?.code ?? response.status}`);
          }
          throw new Error(`published_themes: HTTP ${response.status}`);
        }
        const parsed = z.array(PublishedThemeRowSchema).safeParse(await response.json());
        if (!parsed.success) throw new Error('published_themes: onverwacht antwoord');
        return parsed.data;
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

// --- Laatst geziene lijst (offline) ---

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export const browserLocalStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // vol of geblokkeerd: dan alleen geen offline-kopie
    }
  },
};

// --- Samengevoegde repository ---

export interface MergedRepositoryOptions {
  /** De statische thema's (index + manifesten onder /themes/, basis uit de bundel). */
  staticRepository: ThemeRepository;
  /** null = Supabase niet ingesteld. */
  published: PublishedThemesSource | null;
  supabaseUrl: string;
  cache?: KeyValueStore | null;
  /** Concept dat in dit tabblad als voorbeeld openstaat. */
  preview?: () => LoadedManifest | null;
}

export function createMergedThemeRepository(options: MergedRepositoryOptions): ThemeRepository {
  const { staticRepository, published, supabaseUrl, cache = null, preview = () => null } = options;
  let missing = false;
  let latest: Promise<Map<string, LoadedManifest>> | null = null;

  const fromRows = (rows: PublishedThemeRow[]) => {
    const map = new Map<string, LoadedManifest>();
    for (const row of rows) {
      if (row.id === BUNDLED_ID) continue; // regel 1
      const loaded = rowToLoadedManifest(row, supabaseUrl);
      if (loaded) map.set(row.id, loaded);
    }
    return map;
  };

  const cachedRows = (): PublishedThemeRow[] => {
    const raw = cache?.get(CACHE_KEY);
    if (!raw) return [];
    try {
      const parsed = z.array(PublishedThemeRowSchema).safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  };

  const fetchPublished = (): Promise<Map<string, LoadedManifest>> => {
    if (!published || missing) return Promise.resolve(new Map());
    latest = published.list().then(
      (rows) => {
        cache?.set(CACHE_KEY, JSON.stringify(rows));
        return fromRows(rows);
      },
      (error: unknown) => {
        if (error instanceof ThemeBackendMissingError) {
          missing = true;
          return new Map<string, LoadedManifest>();
        }
        logger.warn('[themes] Supabase-thema\'s niet opgehaald, laatst geziene lijst gebruikt', error);
        return fromRows(cachedRows());
      },
    );
    return latest;
  };

  const currentPublished = () => latest ?? fetchPublished();

  const activePreview = (): LoadedManifest | null => {
    const p = preview();
    return p && p.manifest.id !== BUNDLED_ID ? p : null;
  };

  const getManifest = async (id: string): Promise<LoadedManifest | null> => {
    if (id === BUNDLED_ID) return staticRepository.getManifest(id);
    const p = activePreview();
    if (p && p.manifest.id === id) return p;
    const fromSupabase = (await currentPublished()).get(id);
    if (fromSupabase) return fromSupabase;
    return staticRepository.getManifest(id);
  };

  return {
    async listThemes() {
      const [staticList, supabase] = await Promise.all([
        staticRepository.listThemes().catch((error: unknown) => {
          logger.warn('[themes] statische index niet geladen', error);
          return null;
        }),
        fetchPublished(),
      ]);
      // Niets gelukt: laat de aanroeper de vorige lijst houden
      if (!staticList && supabase.size === 0 && !activePreview()) throw new Error('geen enkele themabron bereikbaar');

      const byId = new Map<string, ThemeSummary>((staticList ?? []).map((s) => [s.id, s]));
      for (const [id, loaded] of supabase) byId.set(id, manifestToSummary(loaded.manifest, loaded.url));
      const p = activePreview();
      if (p) byId.set(p.manifest.id, manifestToSummary(p.manifest, p.url));
      return [...byId.values()].sort(compareThemes);
    },
    getManifest,
    async getTheme(id) {
      const loaded = await getManifest(id);
      return loaded ? manifestToThemeConfig(loaded.manifest, loaded.url) : null;
    },
  };
}
