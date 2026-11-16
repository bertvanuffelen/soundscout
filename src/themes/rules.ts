/**
 * Inhoudsregels voor een thema-manifest (V2 Fase 3). Het Zod-schema bewaakt de
 * VORM; deze regels bewaken wat het dashboard bij het maken en importeren van
 * een thema moet afdwingen (v2-architecture-proposal §6.1 en §6.3).
 *
 * Elke regel geeft meldingen met een ernst:
 *  - `error`   — het dashboard weigert publiceren (of de loader weigert het
 *                manifest, bij `integrity`-regels: dan zou de app breken);
 *  - `warning` — tonen, niet blokkeren.
 *
 * Bestaande thema's zijn gemaakt vóór deze regels; ze worden NIET afgekeurd
 * door de loader op grond van de nieuwe ontwerpregels (veilige zone, afstand,
 * duur). Alleen `integrity` is voor de loader een harde eis.
 */

import type { ThemeManifest } from './manifest';

export type RuleSeverity = 'error' | 'warning';

export type RuleId =
  | 'duplicate-id'
  | 'hotspot-unknown-sample'
  | 'hotspot-location-mismatch'
  | 'map-unknown-location'
  | 'location-without-position'
  | 'missing-nl-text'
  | 'missing-translation'
  | 'hotspot-safe-zone'
  | 'hotspot-spacing'
  | 'marker-spacing'
  | 'sample-duration'
  | 'sample-without-hotspot'
  | 'sample-multiple-hotspots';

export interface RuleIssue {
  rule: RuleId;
  severity: RuleSeverity;
  message: string;
  locationId?: string;
  sampleId?: string;
  hotspotId?: string;
}

/** Regels waar de app op vertrouwt: bij een fout weigert de loader het manifest. */
export const INTEGRITY_RULES: ReadonlySet<RuleId> = new Set<RuleId>([
  'duplicate-id',
  'hotspot-unknown-sample',
  'map-unknown-location',
  'missing-nl-text',
]);

// --- Ontwerpmaten (§6.1) ---

/** Veilige zone voor hotspots, verticaal in procenten: niets onder knoppen/titel. */
export const HOTSPOT_SAFE_ZONE = { minY: 12, maxY: 88 } as const;

/**
 * Kleinste ondersteunde scène: telefoon liggend (844×390) → een 16:9-scène
 * van ±210 px hoog. Hotspots zijn daar 44 px (de aanraakminimum), markers ook.
 */
export const SMALLEST_SCENE = { width: 373, height: 210 } as const;
export const HOTSPOT_MIN_PX = 44;
export const MARKER_MIN_PX = 44;

/** Duur van geluiden (seconden). */
export const SFX_DURATION = { min: 2, max: 8 } as const;
export const LOOP_DURATION = 8.0;
const DURATION_TOLERANCE = 0.001;

function distancePx(a: { x: number; y: number }, b: { x: number; y: number }, scene: { width: number; height: number }): number {
  const dx = ((a.x - b.x) / 100) * scene.width;
  const dy = ((a.y - b.y) / 100) * scene.height;
  return Math.hypot(dx, dy);
}

export interface CheckOptions {
  /** Kleinste scène voor de afstandsregels (standaard SMALLEST_SCENE). */
  scene?: { width: number; height: number };
}

/** Alle regels op één manifest. Volgorde: per regel, in documentvolgorde. */
export function checkManifest(manifest: ThemeManifest, options: CheckOptions = {}): RuleIssue[] {
  const scene: { width: number; height: number } = options.scene ?? SMALLEST_SCENE;
  const issues: RuleIssue[] = [];
  const add = (issue: RuleIssue) => issues.push(issue);

  // --- Unieke ids ---
  const seen = (kind: string, ids: string[]) => {
    const set = new Set<string>();
    for (const id of ids) {
      if (set.has(id)) add({ rule: 'duplicate-id', severity: 'error', message: `${kind} "${id}" komt dubbel voor` });
      set.add(id);
    }
  };
  seen('locatie', manifest.locations.map((l) => l.id));
  seen('sample', manifest.samples.map((s) => s.id));
  seen('hotspot', manifest.locations.flatMap((l) => l.hotspots.map((h) => h.id)));

  const samples = new Map(manifest.samples.map((s) => [s.id, s]));
  const locationIds = new Set(manifest.locations.map((l) => l.id));

  // --- Verwijzingen ---
  const hotspotsPerSample = new Map<string, number>();
  for (const loc of manifest.locations) {
    for (const h of loc.hotspots) {
      const sample = samples.get(h.sampleId);
      hotspotsPerSample.set(h.sampleId, (hotspotsPerSample.get(h.sampleId) ?? 0) + 1);
      if (!sample) {
        add({ rule: 'hotspot-unknown-sample', severity: 'error', message: `hotspot "${h.id}" verwijst naar onbekende sample "${h.sampleId}"`, locationId: loc.id, hotspotId: h.id });
      } else if (sample.locationId !== loc.id) {
        add({ rule: 'hotspot-location-mismatch', severity: 'warning', message: `hotspot "${h.id}" staat in "${loc.id}", sample hoort bij "${sample.locationId}"`, locationId: loc.id, hotspotId: h.id, sampleId: sample.id });
      }
    }
  }
  const positioned = new Set<string>();
  for (const p of manifest.map.positions) {
    positioned.add(p.locationId);
    if (!locationIds.has(p.locationId)) {
      add({ rule: 'map-unknown-location', severity: 'error', message: `kaartpositie voor onbekende locatie "${p.locationId}"`, locationId: p.locationId });
    }
  }
  for (const loc of manifest.locations) {
    if (!positioned.has(loc.id)) {
      add({ rule: 'location-without-position', severity: 'error', message: `locatie "${loc.id}" staat niet op de kaart`, locationId: loc.id });
    }
  }

  // --- Teksten ---
  const nl = manifest.texts.nl;
  for (const loc of manifest.locations) {
    if (!nl.locations[loc.id]?.name) add({ rule: 'missing-nl-text', severity: 'error', message: `locatie "${loc.id}" heeft geen Nederlandse naam`, locationId: loc.id });
  }
  for (const s of manifest.samples) {
    if (!nl.samples[s.id]) add({ rule: 'missing-nl-text', severity: 'error', message: `sample "${s.id}" heeft geen Nederlandse naam`, sampleId: s.id });
  }
  for (const [lang, t] of Object.entries(manifest.texts)) {
    if (lang === 'nl') continue;
    const missing: string[] = [];
    if (!t.name) missing.push('themanaam');
    for (const loc of manifest.locations) if (!t.locations?.[loc.id]?.name) missing.push(`locatie ${loc.id}`);
    for (const s of manifest.samples) if (!t.samples?.[s.id]) missing.push(`sample ${s.id}`);
    for (const m of missing) add({ rule: 'missing-translation', severity: 'warning', message: `[${lang}] ${m} ontbreekt (valt terug op nl)` });
  }

  // --- Veilige zone en afstand van hotspots ---
  for (const loc of manifest.locations) {
    for (const h of loc.hotspots) {
      if (h.y < HOTSPOT_SAFE_ZONE.minY || h.y > HOTSPOT_SAFE_ZONE.maxY) {
        add({ rule: 'hotspot-safe-zone', severity: 'error', message: `hotspot "${h.id}" op y=${h.y}% valt buiten ${HOTSPOT_SAFE_ZONE.minY}–${HOTSPOT_SAFE_ZONE.maxY}%`, locationId: loc.id, hotspotId: h.id, sampleId: h.sampleId });
      }
    }
    for (let i = 0; i < loc.hotspots.length; i++) {
      for (let j = i + 1; j < loc.hotspots.length; j++) {
        const a = loc.hotspots[i];
        const b = loc.hotspots[j];
        const d = distancePx(a, b, scene);
        if (d < HOTSPOT_MIN_PX) {
          add({ rule: 'hotspot-spacing', severity: 'error', message: `hotspots "${a.id}" en "${b.id}" overlappen op de kleinste scène (${d.toFixed(0)} px < ${HOTSPOT_MIN_PX} px)`, locationId: loc.id, hotspotId: b.id });
        }
      }
    }
  }

  // --- Afstand van kaartmarkers ---
  const pos = manifest.map.positions;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const d = distancePx(pos[i], pos[j], scene);
      if (d < MARKER_MIN_PX) {
        add({ rule: 'marker-spacing', severity: 'warning', message: `kaartmarkers "${pos[i].locationId}" en "${pos[j].locationId}" overlappen op de kleinste scène (${d.toFixed(0)} px)`, locationId: pos[j].locationId });
      }
    }
  }

  // --- Duur van geluiden ---
  for (const s of manifest.samples) {
    if (s.kind === 'loop') {
      if (Math.abs(s.duration - LOOP_DURATION) > DURATION_TOLERANCE) {
        add({ rule: 'sample-duration', severity: 'error', message: `loop "${s.id}" duurt ${s.duration} s, moet exact ${LOOP_DURATION.toFixed(1)} s zijn`, sampleId: s.id });
      }
    } else if (s.duration < SFX_DURATION.min - DURATION_TOLERANCE || s.duration > SFX_DURATION.max + DURATION_TOLERANCE) {
      // Type bekend (sfx) = fout; type onbekend (oude thema's) = waarschuwing
      add({ rule: 'sample-duration', severity: s.kind === 'sfx' ? 'error' : 'warning', message: `geluid "${s.id}" duurt ${s.duration} s, buiten ${SFX_DURATION.min}–${SFX_DURATION.max} s`, sampleId: s.id });
    }
  }

  // --- Elke sample precies één hotspot ---
  for (const s of manifest.samples) {
    const n = hotspotsPerSample.get(s.id) ?? 0;
    if (n === 0) add({ rule: 'sample-without-hotspot', severity: 'warning', message: `sample "${s.id}" heeft geen hotspot`, sampleId: s.id });
    if (n > 1) add({ rule: 'sample-multiple-hotspots', severity: 'warning', message: `sample "${s.id}" heeft ${n} hotspots`, sampleId: s.id });
  }

  return issues;
}

/** Fouten die de loader niet accepteert (de app zou anders breken). */
export function integrityErrors(issues: RuleIssue[]): RuleIssue[] {
  return issues.filter((i) => i.severity === 'error' && INTEGRITY_RULES.has(i.rule));
}

/** Aantal meldingen per regel en ernst, bv. voor een rapport. */
export function summarizeIssues(issues: RuleIssue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of issues) {
    const key = `${i.rule} (${i.severity})`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
