/**
 * Concept → themapakket (.sspack, zip) om te downloaden: werkt ook zonder
 * beheer-database. Bestaande media worden opgehaald en in het pakket gezet;
 * alle paden worden relatief aan het pakket (geen assetBase), zodat het
 * pakket weer te importeren is.
 */

import type { ThemeManifest } from '../themes/manifest';
import { manifestAssetRefs, type CreditDraft } from './checks';
import { assetUrl, type Draft } from './editorState';
import { writeZip } from './zip';

export type FetchBytes = (url: string) => Promise<Uint8Array>;

const defaultFetchBytes: FetchBytes = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

function packPath(path: string, kind: 'image' | 'audio', taken: Set<string>): string {
  const clean = path.replace(/^(\.\.\/)+v\d+\//, '').replace(/^\/+/, '').replace(/^(images|audio)\/themes\/[^/]+\//, '');
  const base = clean.includes('/') ? clean : `${kind === 'image' ? 'images' : 'audio'}/${clean}`;
  let candidate = base;
  for (let i = 2; taken.has(candidate); i++) candidate = base.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${i}${ext}`);
  taken.add(candidate);
  return candidate;
}

export async function buildPackZip(draft: Draft, fetchBytes: FetchBytes = defaultFetchBytes): Promise<Uint8Array> {
  const refs = manifestAssetRefs(draft.manifest);
  const mapping = new Map<string, string>();
  const files = new Map<string, Uint8Array>();
  const credits: Record<string, CreditDraft> = {};
  const taken = new Set<string>();

  for (const ref of refs) {
    if (mapping.has(ref.path)) continue;
    const target = packPath(ref.path, ref.kind, taken);
    mapping.set(ref.path, target);
    const local = draft.assets[ref.path];
    files.set(target, local ? local.bytes : await fetchBytes(assetUrl(draft, ref.path)));
    if (draft.credits[ref.path]) credits[target] = draft.credits[ref.path];
  }

  const m = draft.manifest;
  const map = (p: string) => mapping.get(p) ?? p;
  const manifest: ThemeManifest = {
    ...m,
    status: 'draft',
    map: {
      ...m.map,
      image: Object.fromEntries(Object.entries(m.map.image).map(([k, p]) => [k, map(p)])) as ThemeManifest['map']['image'],
      positions: m.map.positions.map((p) => (p.icon ? { ...p, icon: map(p.icon) } : p)),
    },
    locations: m.locations.map((l) => ({ ...l, image: map(l.image), ...(l.ambient ? { ambient: map(l.ambient) } : {}) })),
    samples: m.samples.map((s) => ({ ...s, file: map(s.file) })),
  };
  delete manifest.assetBase;

  const encode = (v: unknown) => new TextEncoder().encode(`${JSON.stringify(v, null, 2)}\n`);
  return writeZip([
    ['manifest.json', encode(manifest)],
    ['credits.json', encode(credits)],
    ...files,
  ]);
}
