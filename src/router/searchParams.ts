/**
 * Zoekparameters van de app-routes (V2 Fase 2).
 *
 * - `parseSearch` / `stringifySearch` vervangen de standaard van TanStack
 *   Router. Die leest waarden als JSON, en dan wordt de deelcode `12345E67`
 *   het getal 1.2345e71 en verliest klascode `0042` zijn nullen. Codes zijn
 *   tekst: elke waarde blijft hier letterlijk een string.
 * - `appSearchSchema` (Zod) is het contract voor alles wat de app uit de
 *   adresbalk leest. Onbekende parameters (utm_*, ?location= van de editor)
 *   blijven ongemoeid staan.
 *
 * Zie docs/v2/URL-CONTRACT.md.
 */
import { z } from 'zod';

export type RawSearch = Record<string, string | string[]>;

export function parseSearch(searchStr: string): RawSearch {
  const result: RawSearch = {};
  for (const [key, value] of new URLSearchParams(searchStr)) {
    const existing = result[key];
    if (existing === undefined) result[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else result[key] = [existing, value];
  }
  return result;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
    else params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** Eén tekstwaarde; iets anders (leeg, herhaald) telt als "niet meegegeven". */
const text = z.string().min(1).optional().catch(undefined);

export const appSearchSchema = z.looseObject({
  /** Thema van de sessie — blijft in de adresbalk staan */
  theme: text,
  /** `true` zet de ontwikkelvlaggen aan */
  dev: text,
  /** Deelcode van een soundscape (8 tekens) */
  share: text,
  /** Klascode (4 cijfers) — link/QR van de docent */
  pp: text,
  /** Deelcode van een praatplaat (8 tekens) */
  'pp-share': text,
  /** Deelcode van een klas-album (8 tekens) */
  album: text,
  /** Brug vanaf de losse pagina's: teacher | teacher-guide | reset-password */
  screen: text,
  /** Bij screen=teacher: ingebouwde leskaart om te openen */
  lesson: text,
  /** Bij screen=teacher: dashboard-tab om te openen */
  tab: text,
  /** Bij screen=teacher-guide: sectie van de handleiding */
  section: text,
});

export type AppSearch = z.infer<typeof appSearchSchema>;

export function validateAppSearch(search: Record<string, unknown>): AppSearch {
  return appSearchSchema.parse(search);
}
