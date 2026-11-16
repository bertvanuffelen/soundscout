/**
 * Controles van het beheerdashboard bovenop src/themes/rules.ts: bestanden,
 * beeldmaten, licenties. Puur (geen browser-API's) en gedeeld door de editor
 * en de pakket-import. Meldingen dragen een `rule`; de UI vertaalt die via
 * i18n (`admin.issues.<rule>`), `detail` is de technische uitleg.
 */

import { z } from 'zod';
import type { ThemeManifest } from '../themes/manifest';
import type { RuleIssue, RuleSeverity } from '../themes/rules';
import { REQUIRED_IMAGE } from './media';

export interface AdminIssue {
  rule: string;
  severity: RuleSeverity;
  /** Technische uitleg (bestandsnaam, gemeten waarde, regeltekst). */
  detail?: string;
  path?: string;
  locationId?: string;
  sampleId?: string;
  hotspotId?: string;
}

export function fromRuleIssues(issues: RuleIssue[]): AdminIssue[] {
  return issues.map((i) => ({
    rule: i.rule,
    severity: i.severity,
    detail: i.message,
    ...(i.locationId ? { locationId: i.locationId } : {}),
    ...(i.sampleId ? { sampleId: i.sampleId } : {}),
    ...(i.hotspotId ? { hotspotId: i.hotspotId } : {}),
  }));
}

export const countErrors = (issues: AdminIssue[]) => issues.filter((i) => i.severity === 'error').length;
export const countWarnings = (issues: AdminIssue[]) => issues.filter((i) => i.severity === 'warning').length;

// --- Mediaverwijzingen in een manifest ---

export type AssetRole = 'location-image' | 'map-image' | 'marker-icon' | 'ambient' | 'sample';

export interface AssetRef {
  path: string;
  kind: 'image' | 'audio';
  role: AssetRole;
  /** Locatie-, sample-id of taalcode (kaart). */
  ref: string;
}

/** Elk mediabestand waar het manifest naar verwijst, in documentvolgorde. */
export function manifestAssetRefs(manifest: ThemeManifest): AssetRef[] {
  const refs: AssetRef[] = [];
  for (const [lang, path] of Object.entries(manifest.map.image)) refs.push({ path, kind: 'image', role: 'map-image', ref: lang });
  for (const p of manifest.map.positions) if (p.icon) refs.push({ path: p.icon, kind: 'image', role: 'marker-icon', ref: p.locationId });
  for (const l of manifest.locations) {
    refs.push({ path: l.image, kind: 'image', role: 'location-image', ref: l.id });
    if (l.ambient) refs.push({ path: l.ambient, kind: 'audio', role: 'ambient', ref: l.id });
  }
  for (const s of manifest.samples) refs.push({ path: s.file, kind: 'audio', role: 'sample', ref: s.id });
  return refs;
}

/** Relatief pad binnen het pakket/de versie (niet '/…', geen URL). */
export function isRelativePath(path: string): boolean {
  return !path.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(path);
}

// --- Beeldmaat ---

export function checkImageSize(path: string, size: { width: number; height: number } | null, role: AssetRole): AdminIssue[] {
  if (role === 'marker-icon') return [];
  if (!size) return [{ rule: 'image-size-unknown', severity: 'warning', path, detail: path }];
  if (size.width !== REQUIRED_IMAGE.width || size.height !== REQUIRED_IMAGE.height) {
    return [{ rule: 'image-size', severity: 'error', path, detail: `${path}: ${size.width}×${size.height}, moet ${REQUIRED_IMAGE.width}×${REQUIRED_IMAGE.height} zijn` }];
  }
  return [];
}

// --- Bronvermelding en licenties ---

export const CreditSchema = z.object({
  source: z.string().trim().min(1),
  author: z.string().trim().optional(),
  licence: z.string().trim().min(1),
  licenceUrl: z.string().trim().optional(),
  generationPrompt: z.string().optional(),
});
export type Credit = z.infer<typeof CreditSchema>;

/** Een (gedeeltelijke) bronvermelding zoals de editor die bijhoudt. */
export type CreditDraft = Partial<Credit>;

const NON_FREE = /(^|[^a-z])(nc|nd)([^a-z]|$)|noncommercial|non-commercial|noderiv/i;
const NEEDS_ATTRIBUTION = /cc[- ]?by/i;

/** Eisen per bestand: bron + licentie; geen NC/ND; CC-BY met maker en URL. */
export function checkCredit(path: string, credit: CreditDraft | undefined): AdminIssue[] {
  if (!credit?.source?.trim() || !credit.licence?.trim()) {
    return [{ rule: 'credit-missing', severity: 'error', path, detail: path }];
  }
  if (NON_FREE.test(credit.licence)) return [{ rule: 'credit-licence', severity: 'error', path, detail: `${path}: ${credit.licence}` }];
  if (NEEDS_ATTRIBUTION.test(credit.licence) && (!credit.author?.trim() || !credit.licenceUrl?.trim())) {
    return [{ rule: 'credit-attribution', severity: 'error', path, detail: path }];
  }
  return [];
}

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/**
 * credits.json van een pakket → bronvermelding per manifestpad. Sleutels mogen
 * het volle pad of alleen de bestandsnaam zijn (zo schrijft de pijplijn ze).
 * Velden van de pijplijn (`url`, `prompt`) worden meegenomen.
 */
export function normalizeCredits(json: unknown, paths: string[]): Record<string, CreditDraft> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  const raw = json as Record<string, unknown>;
  const out: Record<string, CreditDraft> = {};
  for (const path of paths) {
    const entry = raw[path] ?? raw[basename(path)];
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    out[path] = {
      source: str(e.source),
      author: str(e.author),
      licence: str(e.licence) ?? str(e.license),
      licenceUrl: str(e.licenceUrl) ?? str(e.licence_url) ?? str(e.url),
      generationPrompt: str(e.generationPrompt) ?? str(e.prompt) ?? str(e.jobId),
    };
  }
  return out;
}
