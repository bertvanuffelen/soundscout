/**
 * Toestand van de thema-editor in /beheer: een concept (manifest + nieuwe
 * bestanden + bronvermelding) en één reducer voor elke bewerking. Puur, dus
 * los te testen; de componenten tonen alleen wat hier staat.
 */

import { ThemeManifestSchema, type ManifestSample, type ThemeManifest } from '../themes/manifest';
import { checkManifest } from '../themes/rules';
import { resolveAsset, resolveAssetBase } from '../themes/mapping';
import {
  checkCredit,
  checkImageSize,
  fromRuleIssues,
  isRelativePath,
  manifestAssetRefs,
  type AdminIssue,
  type CreditDraft,
} from './checks';

/** Een bestand dat in dit concept nieuw is (nog niet in Storage van een eerdere versie). */
export interface DraftAsset {
  bytes: Uint8Array;
  contentType: string;
  /** Voor tonen/afspelen in de editor (blob:-URL), optioneel. */
  objectUrl?: string;
  size?: { width: number; height: number } | null;
}

export interface Draft {
  themeId: string;
  manifest: ThemeManifest;
  /** Adres waartegen bestaande relatieve paden worden opgelost (manifest-URL van de bronversie). */
  sourceUrl: string;
  /** Gepubliceerde/opgeslagen versie waarop dit concept voortbouwt (null = nieuw of import). */
  sourceVersion: number | null;
  /** Nieuwe bestanden, op hun relatieve pad. */
  assets: Record<string, DraftAsset>;
  credits: Record<string, CreditDraft>;
  dirty: boolean;
}

export function createDraft(manifest: ThemeManifest, sourceUrl: string, sourceVersion: number | null, extra: Partial<Pick<Draft, 'assets' | 'credits'>> = {}): Draft {
  return { themeId: manifest.id, manifest, sourceUrl, sourceVersion, assets: extra.assets ?? {}, credits: extra.credits ?? {}, dirty: false };
}

// --- Acties ---

type LangText = { lang: string; value: string };

export type EditorAction =
  | { type: 'moveHotspot'; locationId: string; hotspotId: string; x: number; y: number }
  | { type: 'addHotspot'; locationId: string; sampleId: string }
  | { type: 'removeHotspot'; locationId: string; hotspotId: string }
  | { type: 'moveMarker'; locationId: string; x: number; y: number }
  | { type: 'addSample'; locationId: string; sample: Omit<ManifestSample, 'locationId'>; names: Record<string, string>; path: string; asset: DraftAsset; credit?: CreditDraft }
  | { type: 'updateSample'; sampleId: string; patch: Partial<Pick<ManifestSample, 'icon' | 'color' | 'kind'>> }
  | { type: 'removeSample'; sampleId: string }
  | ({ type: 'setSampleName'; sampleId: string } & LangText)
  | ({ type: 'setThemeText'; field: 'name' | 'description' } & LangText)
  | ({ type: 'setLocationText'; locationId: string; field: 'name' | 'description' } & LangText)
  | { type: 'replaceImage'; target: { kind: 'location'; locationId: string } | { kind: 'map'; lang: string }; path: string; asset: DraftAsset; credit?: CreditDraft }
  | { type: 'setCredit'; path: string; credit: CreditDraft }
  | { type: 'setMeta'; patch: Partial<Pick<ThemeManifest, 'isPublic' | 'sort' | 'season'>> }
  | { type: 'markSaved' };

const pct = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Zet (of wis, bij leeg) een tekst in één taal. nl blijft altijd een object. */
function withText(manifest: ThemeManifest, lang: string, edit: (t: Record<string, unknown>) => void): ThemeManifest {
  const texts = { ...manifest.texts } as Record<string, Record<string, unknown>>;
  const current = texts[lang] ?? {};
  const next: Record<string, unknown> = {
    ...current,
    locations: { ...((current.locations as object) ?? {}) },
    samples: { ...((current.samples as object) ?? {}) },
  };
  edit(next);
  texts[lang] = next;
  return { ...manifest, texts: texts as ThemeManifest['texts'] };
}

function setOrDelete(obj: Record<string, unknown>, key: string, value: unknown): void {
  if (value === '' || value === undefined) delete obj[key];
  else obj[key] = value;
}

function apply(draft: Draft, action: EditorAction): Draft {
  const m = draft.manifest;
  const mapLocations = (fn: (l: ThemeManifest['locations'][number]) => ThemeManifest['locations'][number]) =>
    ({ ...draft, manifest: { ...m, locations: m.locations.map(fn) } });

  switch (action.type) {
    case 'moveHotspot':
      return mapLocations((l) => (l.id !== action.locationId ? l : {
        ...l,
        hotspots: l.hotspots.map((h) => (h.id === action.hotspotId ? { ...h, x: pct(action.x), y: pct(action.y) } : h)),
      }));
    case 'addHotspot': {
      const taken = new Set(m.locations.flatMap((l) => l.hotspots.map((h) => h.id)));
      const id = uniqueId(action.sampleId, taken);
      return mapLocations((l) => (l.id !== action.locationId ? l : {
        ...l, hotspots: [...l.hotspots, { id, x: 50, y: 50, sampleId: action.sampleId, visualHint: 'pulse' }],
      }));
    }
    case 'removeHotspot':
      return mapLocations((l) => (l.id !== action.locationId ? l : { ...l, hotspots: l.hotspots.filter((h) => h.id !== action.hotspotId) }));
    case 'moveMarker': {
      const exists = m.map.positions.some((p) => p.locationId === action.locationId);
      const positions = exists
        ? m.map.positions.map((p) => (p.locationId === action.locationId ? { ...p, x: pct(action.x), y: pct(action.y) } : p))
        : [...m.map.positions, { locationId: action.locationId, x: pct(action.x), y: pct(action.y) }];
      return { ...draft, manifest: { ...m, map: { ...m.map, positions } } };
    }
    case 'addSample': {
      const taken = new Set(m.samples.map((s) => s.id));
      const id = uniqueId(action.sample.id, taken);
      const sample: ManifestSample = { ...action.sample, id, locationId: action.locationId, file: action.path };
      let manifest: ThemeManifest = { ...m, samples: [...m.samples, sample] };
      for (const [lang, name] of Object.entries(action.names)) {
        if (!name.trim()) continue;
        manifest = withText(manifest, lang, (t) => { (t.samples as Record<string, string>)[id] = name.trim(); });
      }
      const hotspotIds = new Set(m.locations.flatMap((l) => l.hotspots.map((h) => h.id)));
      const hotspotId = uniqueId(id, hotspotIds);
      manifest = {
        ...manifest,
        locations: manifest.locations.map((l) => (l.id !== action.locationId ? l : {
          ...l, hotspots: [...l.hotspots, { id: hotspotId, x: 50, y: 50, sampleId: id, visualHint: 'pulse' }],
        })),
      };
      return {
        ...draft,
        manifest,
        assets: { ...draft.assets, [action.path]: action.asset },
        credits: action.credit ? { ...draft.credits, [action.path]: action.credit } : draft.credits,
      };
    }
    case 'updateSample':
      return { ...draft, manifest: { ...m, samples: m.samples.map((s) => (s.id === action.sampleId ? { ...s, ...action.patch } : s)) } };
    case 'removeSample': {
      const sample = m.samples.find((s) => s.id === action.sampleId);
      const texts = Object.fromEntries(Object.entries(m.texts).map(([lang, t]) => {
        const samples = { ...(t.samples ?? {}) };
        delete samples[action.sampleId];
        return [lang, { ...t, samples }];
      })) as ThemeManifest['texts'];
      const stillUsed = sample && m.samples.some((s) => s.id !== sample.id && s.file === sample.file);
      const assets = { ...draft.assets };
      if (sample && !stillUsed) delete assets[sample.file];
      return {
        ...draft,
        assets,
        manifest: {
          ...m,
          texts,
          samples: m.samples.filter((s) => s.id !== action.sampleId),
          locations: m.locations.map((l) => ({ ...l, hotspots: l.hotspots.filter((h) => h.sampleId !== action.sampleId) })),
        },
      };
    }
    case 'setSampleName':
      return { ...draft, manifest: withText(m, action.lang, (t) => setOrDelete(t.samples as Record<string, unknown>, action.sampleId, action.value.trim())) };
    case 'setThemeText':
      return {
        ...draft,
        manifest: withText(m, action.lang, (t) => {
          if (action.field === 'description' && action.lang === 'nl') t.description = action.value;
          else setOrDelete(t, action.field, action.field === 'name' ? action.value.trim() : action.value);
        }),
      };
    case 'setLocationText':
      return {
        ...draft,
        manifest: withText(m, action.lang, (t) => {
          const locations = t.locations as Record<string, Record<string, unknown>>;
          const entry = { ...(locations[action.locationId] ?? {}) };
          setOrDelete(entry, action.field, action.field === 'name' ? action.value.trim() : action.value);
          if (Object.keys(entry).length === 0) delete locations[action.locationId];
          else locations[action.locationId] = entry;
        }),
      };
    case 'replaceImage': {
      const manifest = action.target.kind === 'location'
        ? { ...m, locations: m.locations.map((l) => (l.id === (action.target as { locationId: string }).locationId ? { ...l, image: action.path } : l)) }
        : { ...m, map: { ...m.map, image: { ...m.map.image, [(action.target as { lang: string }).lang]: action.path } } };
      return {
        ...draft,
        manifest: manifest as ThemeManifest,
        assets: { ...draft.assets, [action.path]: action.asset },
        credits: action.credit ? { ...draft.credits, [action.path]: action.credit } : draft.credits,
      };
    }
    case 'setCredit':
      return { ...draft, credits: { ...draft.credits, [action.path]: { ...draft.credits[action.path], ...action.credit } } };
    case 'setMeta': {
      const next = { ...m, ...action.patch };
      if ('season' in action.patch && !action.patch.season) delete next.season;
      return { ...draft, manifest: next };
    }
    case 'markSaved':
      return { ...draft, dirty: false };
  }
}

export function editorReducer(draft: Draft, action: EditorAction): Draft {
  const next = apply(draft, action);
  return action.type === 'markSaved' ? next : { ...next, dirty: true };
}

// --- Controles op het concept (live) ---

/** Alle meldingen voor dit concept: schema, inhoudsregels, beeldmaten en licenties van nieuwe bestanden. */
export function validateDraft(draft: Draft): AdminIssue[] {
  const issues: AdminIssue[] = [];
  const parsed = ThemeManifestSchema.safeParse(draft.manifest);
  if (!parsed.success) {
    for (const i of parsed.error.issues.slice(0, 20)) issues.push({ rule: 'pack-schema', severity: 'error', detail: `${i.path.join('.')}: ${i.message}` });
  }
  issues.push(...fromRuleIssues(checkManifest(draft.manifest)));
  const seen = new Set<string>();
  for (const ref of manifestAssetRefs(draft.manifest)) {
    const asset = draft.assets[ref.path];
    if (!asset || seen.has(ref.path)) continue;
    seen.add(ref.path);
    if (ref.kind === 'image' && asset.size !== undefined) issues.push(...checkImageSize(ref.path, asset.size, ref.role));
    issues.push(...checkCredit(ref.path, draft.credits[ref.path]));
  }
  return issues;
}

// --- Adressen ---

/** Waar de editor een pad toont/afspeelt: een nieuw bestand lokaal, anders op de plek van de bronversie. */
export function assetUrl(draft: Draft, path: string): string {
  const local = draft.assets[path]?.objectUrl;
  if (local) return local;
  return resolveAsset(resolveAssetBase(draft.sourceUrl, draft.manifest.assetBase), path);
}

/**
 * Het manifest zoals het als versie `version` in de database komt, met de
 * bestanden die naar `<id>/v<version>/` moeten. Paden worden zo herschreven
 * dat ze vanuit de nieuwe versiemap kloppen:
 *  - nieuw bestand → relatief (wordt in deze versiemap geüpload);
 *  - bronversie in Storage (geen assetBase) → '../v<oud>/<pad>' (hergebruik,
 *    oude versies veranderen nooit);
 *  - statisch thema (assetBase, bv. '/') → absoluut pad op de eigen site.
 */
export function prepareVersionManifest(draft: Draft, version: number): { manifest: ThemeManifest; uploads: Array<[string, DraftAsset]> } {
  const m = draft.manifest;
  const staticBase = m.assetBase ? resolveAssetBase(draft.sourceUrl, m.assetBase) : null;
  const rewrite = (path: string): string => {
    if (draft.assets[path] || !isRelativePath(path)) return path;
    if (staticBase) return resolveAsset(staticBase, path);
    if (draft.sourceVersion !== null && draft.sourceVersion !== version) {
      return path.startsWith('../') ? path : `../v${draft.sourceVersion}/${path}`;
    }
    return path;
  };
  const manifest: ThemeManifest = {
    ...m,
    version,
    status: 'draft',
    map: {
      ...m.map,
      image: Object.fromEntries(Object.entries(m.map.image).map(([k, p]) => [k, rewrite(p)])) as ThemeManifest['map']['image'],
      positions: m.map.positions.map((p) => (p.icon ? { ...p, icon: rewrite(p.icon) } : p)),
    },
    locations: m.locations.map((l) => ({ ...l, image: rewrite(l.image), ...(l.ambient ? { ambient: rewrite(l.ambient) } : {}) })),
    samples: m.samples.map((s) => ({ ...s, file: rewrite(s.file) })),
  };
  delete manifest.assetBase;
  const referenced = new Set(manifestAssetRefs(manifest).map((r) => r.path));
  const uploads = Object.entries(draft.assets).filter(([path]) => referenced.has(path));
  return { manifest, uploads };
}

/** Bestandsnaam-veilig maken ('Hond blaft!.MP3' → 'hond-blaft'). */
export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'geluid';
}

/** Een nieuw bestandspad dat nog niet in het concept voorkomt ('images/plein-2.jpg'). */
export function uniqueAssetPath(draft: Draft, folder: 'images' | 'audio', base: string, ext: string): string {
  const taken = new Set([...Object.keys(draft.assets), ...manifestAssetRefs(draft.manifest).map((r) => r.path)]);
  for (let i = 1; ; i++) {
    const path = `${folder}/${base}${i === 1 ? '' : `-${i}`}.${ext}`;
    if (!taken.has(path)) return path;
  }
}
