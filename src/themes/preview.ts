/**
 * "Bekijk als leerling" (beheerdashboard): een concept-manifest dat ALLEEN in
 * dit tabblad de gepubliceerde versie vervangt. Bewaard in sessionStorage
 * (per tabblad; weg zodra het tabblad sluit), nooit op de server.
 *
 * De repository (supabaseRepository.ts) kijkt hier eerst; het manifest gaat
 * door dezelfde Zod- en integriteitscontrole als elk ander manifest.
 */

import { parseManifest, type LoadedManifest } from './repository';

const KEY = 'soundscout:theme-preview';

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Zet een concept klaar voor dit tabblad. `url` = basis voor relatieve mediapaden. */
export function setThemePreview(preview: LoadedManifest): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(preview));
  } catch {
    // Opslag vol of geblokkeerd: dan geen voorbeeld (de knop meldt dat niet apart)
  }
}

export function clearThemePreview(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* niets te wissen */
  }
}

/** Het concept voor dit tabblad, of null (ook bij een kapotte of ongeldige waarde). */
export function getThemePreview(): LoadedManifest | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { manifest?: unknown; url?: unknown };
    if (typeof value.url !== 'string') return null;
    return { manifest: parseManifest(value.manifest, 'voorbeeld'), url: value.url };
  } catch {
    return null;
  }
}
