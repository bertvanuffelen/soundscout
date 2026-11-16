/**
 * Themapakket importeren (.sspack = zip, of een map). V2-voorstel §6.3 en
 * v2-theme-sinterklaas-pipeline.md §4.2: het dashboard draait ELKE controle
 * zelf opnieuw en vertrouwt het meegeleverde report.json nooit (dat wordt
 * alleen getoond).
 *
 * Verwacht: `manifest.json` in het formaat van src/themes/manifest.ts, met
 * paden relatief aan de pakketmap (geen `assetBase`), plus optioneel
 * `credits.json`, `hotspots.json`, `report.json` en master-bestanden.
 */

import { ThemeManifestSchema, type ThemeManifest } from '../themes/manifest';
import { checkManifest } from '../themes/rules';
import {
  checkCredit,
  checkImageSize,
  countErrors,
  fromRuleIssues,
  isRelativePath,
  manifestAssetRefs,
  normalizeCredits,
  type AdminIssue,
  type CreditDraft,
} from './checks';
import { detectFormat, extensionMatches, readImageSize, SIZE_LIMITS } from './media';
import { readZip } from './zip';

export interface PackFile {
  bytes: Uint8Array;
  contentType: string;
  /** Gemeten maat (beelden). */
  size?: { width: number; height: number } | null;
}

export interface PackResult {
  /** Geldig manifest (met GEMETEN geluidsduren), of null als het niet te lezen was. */
  manifest: ThemeManifest | null;
  /** Alleen de bestanden waar het manifest naar verwijst. */
  files: Map<string, PackFile>;
  credits: Record<string, CreditDraft>;
  issues: AdminIssue[];
  /** report.json van het pakket, alleen om te tonen. */
  packReport: unknown;
  ok: boolean;
}

/** Duur van een geluidsbestand in seconden, of null als het niet te decoderen is. */
export type DecodeDuration = (bytes: Uint8Array, path: string) => Promise<number | null>;

const DURATION_TOLERANCE = 0.05;
const META_FILES = new Set(['manifest.json', 'credits.json', 'hotspots.json', 'report.json']);

/** Gemeenschappelijke bovenmap weghalen ('sinterklaas/manifest.json' → 'manifest.json'). */
export function stripCommonRoot(files: Map<string, Uint8Array>): Map<string, Uint8Array> {
  const names = [...files.keys()].filter((n) => !n.startsWith('__MACOSX/') && !/(^|\/)\.DS_Store$/.test(n));
  const manifestPath = names.find((n) => n === 'manifest.json') ?? names.filter((n) => n.endsWith('/manifest.json')).sort((a, b) => a.length - b.length)[0];
  const prefix = manifestPath ? manifestPath.slice(0, -'manifest.json'.length) : '';
  const out = new Map<string, Uint8Array>();
  for (const name of names) {
    if (prefix && !name.startsWith(prefix)) continue;
    out.set(name.slice(prefix.length), files.get(name)!);
  }
  return out;
}

function readJson(bytes: Uint8Array | undefined): { value: unknown; error: string | null } {
  if (!bytes) return { value: null, error: null };
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function unpackZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  return stripCommonRoot(await readZip(bytes));
}

/** Controleer een uitgepakt pakket. */
export async function validatePack(input: Map<string, Uint8Array>, options: { decodeDuration?: DecodeDuration } = {}): Promise<PackResult> {
  const all = stripCommonRoot(input);
  const issues: AdminIssue[] = [];
  const files = new Map<string, PackFile>();
  const report = readJson(all.get('report.json'));
  const result = (manifest: ThemeManifest | null, credits: Record<string, CreditDraft> = {}): PackResult => ({
    manifest, files, credits, issues, packReport: report.value, ok: manifest !== null && countErrors(issues) === 0,
  });

  // --- Manifest ---
  const manifestFile = all.get('manifest.json');
  if (!manifestFile) {
    issues.push({ rule: 'pack-no-manifest', severity: 'error' });
    return result(null);
  }
  const json = readJson(manifestFile);
  if (json.error) {
    issues.push({ rule: 'pack-bad-json', severity: 'error', path: 'manifest.json', detail: json.error });
    return result(null);
  }
  const parsed = ThemeManifestSchema.safeParse(json.value);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 20)) {
      issues.push({ rule: 'pack-schema', severity: 'error', path: 'manifest.json', detail: `${issue.path.join('.') || '(manifest)'}: ${issue.message}` });
    }
    return result(null);
  }
  let manifest: ThemeManifest = { ...parsed.data, status: 'draft' };
  if (manifest.assetBase) {
    issues.push({ rule: 'pack-asset-base', severity: 'error', path: 'manifest.json', detail: manifest.assetBase });
  }

  // --- Bestanden waar het manifest naar verwijst ---
  const refs = manifestAssetRefs(manifest);
  const measured = new Map<string, number>();
  for (const ref of refs) {
    if (!isRelativePath(ref.path)) {
      issues.push({ rule: 'pack-external-file', severity: 'warning', path: ref.path, detail: ref.path });
      continue;
    }
    if (files.has(ref.path)) continue;
    const bytes = all.get(ref.path);
    if (!bytes) {
      issues.push({ rule: 'pack-missing-file', severity: 'error', path: ref.path, detail: ref.path });
      continue;
    }
    const format = detectFormat(bytes);
    if (!format || format.kind !== ref.kind) {
      issues.push({ rule: 'pack-format', severity: 'error', path: ref.path, detail: `${ref.path}: ${format?.format ?? '?'}` });
      continue;
    }
    if (!extensionMatches(ref.path, format.format)) {
      issues.push({ rule: 'pack-extension', severity: 'warning', path: ref.path, detail: `${ref.path}: ${format.format}` });
    }
    if (bytes.length > SIZE_LIMITS.hardMax) {
      issues.push({ rule: 'file-too-large', severity: 'error', path: ref.path, detail: `${ref.path}: ${(bytes.length / 1048576).toFixed(1)} MB` });
    } else if (bytes.length > (format.kind === 'image' ? SIZE_LIMITS.imageWarn : SIZE_LIMITS.audioWarn)) {
      issues.push({ rule: 'file-large', severity: 'warning', path: ref.path, detail: `${ref.path}: ${(bytes.length / 1048576).toFixed(1)} MB` });
    }
    const file: PackFile = { bytes, contentType: format.contentType };
    if (format.kind === 'image') {
      file.size = readImageSize(bytes);
      issues.push(...checkImageSize(ref.path, file.size, ref.role));
    } else if (options.decodeDuration) {
      const duration = await options.decodeDuration(bytes, ref.path);
      if (duration === null) issues.push({ rule: 'audio-undecodable', severity: 'error', path: ref.path, detail: ref.path });
      else measured.set(ref.path, duration);
    }
    files.set(ref.path, file);
  }

  // Ongebruikte geluiden (masters tellen niet: die horen er bewust bij)
  const used = new Set(refs.map((r) => r.path));
  for (const name of all.keys()) {
    if (META_FILES.has(name) || used.has(name) || /(^|\/)masters\//.test(name)) continue;
    if (detectFormat(all.get(name)!)?.kind === 'audio') issues.push({ rule: 'pack-unused-file', severity: 'warning', path: name, detail: name });
  }

  // --- Gemeten duur gaat voor de opgegeven duur ---
  manifest = {
    ...manifest,
    samples: manifest.samples.map((s) => {
      const real = measured.get(s.file);
      if (real === undefined) return s;
      if (Math.abs(real - s.duration) > DURATION_TOLERANCE) {
        issues.push({ rule: 'audio-duration-mismatch', severity: 'warning', sampleId: s.id, path: s.file, detail: `${s.id}: ${s.duration} s opgegeven, ${real.toFixed(3)} s gemeten` });
      }
      return { ...s, duration: Math.round(real * 1000) / 1000 };
    }),
  };

  // --- Alle inhoudsregels (veilige zone, afstand, duur, teksten, integriteit) ---
  issues.push(...fromRuleIssues(checkManifest(manifest)));

  // --- Bronvermelding ---
  const credits = readJson(all.get('credits.json'));
  if (credits.error) issues.push({ rule: 'pack-bad-json', severity: 'error', path: 'credits.json', detail: credits.error });
  const relative = [...new Set(refs.map((r) => r.path).filter(isRelativePath))];
  const normalized = normalizeCredits(credits.value, relative);
  for (const path of relative) if (files.has(path)) issues.push(...checkCredit(path, normalized[path]));

  return result(manifest, normalized);
}
