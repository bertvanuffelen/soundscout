/**
 * Versies van een soundscape (fase 2.8): wat is er het laatst ingeleverd
 * of online bewaard, en is er sindsdien iets veranderd?
 *
 * We bewaren per inzending (of bewaarcode) een vingerafdruk van de inhoud.
 * Wijkt de huidige soundscape af, dan toont het podium "Lever versie N in"
 * of "Bewaar je wijzigingen". De server kent geen versies: elke keer
 * inleveren werkt dezelfde inzending bij.
 */

import type { CompositionData } from '../types';

const KEY = 'soundscout:versions';
const MAX_ENTRIES = 30;

export interface VersionInfo {
  version: number;
  /** ISO-tijdstip van de laatste keer inleveren/bewaren */
  at: string;
  fingerprint: string;
}

type VersionMap = Record<string, VersionInfo>;

/**
 * Vingerafdruk van alles wat de docent hoort en ziet: tijdlijn, secties,
 * patronen, praatplaat-plek en titel. Snelle 32-bit hash (FNV-1a), geen
 * beveiliging: alleen "is dit nog hetzelfde?".
 */
export function compositionFingerprint(data: CompositionData, title: string): string {
  const relevant = JSON.stringify([
    data.tracks,
    data.totalBeats,
    data.sections ?? [],
    data.sequences ?? [],
    data.praatplaatPosition ?? null,
    title.trim(),
  ]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < relevant.length; i++) {
    hash ^= relevant.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function readAll(): VersionMap {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed as VersionMap : {};
  } catch {
    return {};
  }
}

function writeAll(map: VersionMap): void {
  try {
    // Alleen de recentste inzendingen bewaren
    const entries = Object.entries(map)
      .sort(([, a], [, b]) => b.at.localeCompare(a.at))
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Opslag vol of geblokkeerd: versies zijn een hulpmiddel, geen data
  }
}

export function getVersion(key: string | null): VersionInfo | null {
  if (!key) return null;
  return readAll()[key] ?? null;
}

/** Leg een nieuwe versie vast (na geslaagd inleveren of bewaren) */
export function recordVersion(key: string, fingerprint: string): VersionInfo {
  const map = readAll();
  const previous = map[key];
  const info: VersionInfo = {
    // Zelfde inhoud nog eens versturen telt niet als nieuwe versie
    version: previous ? (previous.fingerprint === fingerprint ? previous.version : previous.version + 1) : 1,
    at: new Date().toISOString(),
    fingerprint,
  };
  map[key] = info;
  writeAll(map);
  return info;
}
