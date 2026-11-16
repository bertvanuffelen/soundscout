/**
 * Opwarmen van de mediacache voor het actieve thema (V2 Fase 2 — offline).
 *
 * De service worker bewaart thema-geluiden en -beelden pas als ze worden
 * opgehaald. Zonder opwarmen zou een klas alleen offline kunnen werken met de
 * locaties die toevallig al geopend waren. Daarom halen we, zodra de service
 * worker de pagina bestuurt, rustig (twee tegelijk, na een korte pauze) de
 * kaart, de locatiebeelden en de geluiden van het ACTIEVE thema op, plus de
 * media die de pagina al had geladen voordat de service worker er was. Het
 * ophalen loopt via de service worker en belandt zo in de cache.
 *
 * Er wordt niets gedecodeerd: dit kost schijfruimte (basis ≈ 10 MB), geen
 * werkgeheugen. Andere thema's worden niet aangeraakt.
 *
 * Sinds V2 Fase 3 ook de thema-data: /themes/index.json en het manifest van het
 * actieve thema. Bij een eerste bezoek haalt de app die op vóórdat de service
 * worker er is; zonder opwarmen zou de app offline de themalijst missen.
 */
import type { ThemeConfig } from '../data/themes';
import { isThemeBucketMedia } from './swRouting';

const CONCURRENCY = 2;
const START_DELAY_MS = 4000;

/** Thema-index en het manifest van dit thema (V2 Fase 3, network-first in de service worker). */
export function themeDataUrls(themeId: string): string[] {
  return ['/themes/index.json', `/themes/${themeId}/manifest.json`];
}

/** Een adres in de publieke thema-bucket van Supabase (beheerdashboard, migratie 043)? */
function isBucketUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && isThemeBucketMedia({ url, sameOrigin: false });
  } catch {
    return false;
  }
}

/**
 * Alle media-adressen van één thema, zonder dubbelen: van de eigen site, of
 * uit de thema-bucket van Supabase Storage (ook door de service worker bewaard).
 */
export function themeAssetUrls(theme: Pick<ThemeConfig, 'map' | 'locations' | 'samples'>): string[] {
  const urls = [
    theme.map?.backgroundImage,
    ...theme.locations.flatMap((l) => [l.backgroundImage, l.ambientAudio]),
    ...theme.samples.map((s) => s.audioUrl),
  ];
  return [...new Set(urls.filter((u): u is string =>
    typeof u === 'string' && ((u.startsWith('/') && !u.startsWith('//')) || isBucketUrl(u))))];
}

/**
 * Media die deze pagina al heeft opgehaald (bijvoorbeeld vóórdat de service
 * worker bij een eerste bezoek de pagina overnam). Opnieuw ophalen komt uit
 * de browsercache en kost dus geen netwerk, maar zet ze wel in de cache van
 * de service worker.
 */
export function alreadyLoadedMediaUrls(): string[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return [];
  const urls = performance.getEntriesByType('resource')
    .map((entry) => {
      try {
        const url = new URL(entry.name);
        return url.origin === window.location.origin ? url.pathname : null;
      } catch {
        return null;
      }
    })
    .filter((path): path is string => !!path && /^\/(images|audio)\//.test(path));
  return [...new Set(urls)];
}

function shouldWarm(): boolean {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;
  if (!('caches' in window) || !navigator.onLine) return false;
  // Databesparing aan: niets vooruit ophalen
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

async function warm(urls: string[], signal: AbortSignal): Promise<void> {
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (signal.aborted || !navigator.onLine) return;
      try {
        if (await caches.match(url)) continue;
        // Via de service worker: die bewaart het antwoord (cache-first)
        const response = await fetch(url, { signal });
        // Het antwoord helemaal uitlezen (en weggooien): een antwoord dat
        // blijft "openstaan" kan de service worker bezig houden, en een
        // bezige service worker wordt niet door een nieuwe versie vervangen.
        await response.arrayBuffer();
      } catch {
        // Mislukt = niet bewaard. Het bestand wordt later gewoon opgehaald
        // als het nodig is; opwarmen mag nooit een fout veroorzaken.
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

let current: AbortController | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Plan het opwarmen van dit thema; een eerder gepland of lopend thema stopt. */
export function scheduleThemeWarmup(theme: Pick<ThemeConfig, 'id' | 'map' | 'locations' | 'samples'> | null): void {
  if (timer) clearTimeout(timer);
  current?.abort();
  current = null;
  if (!theme) return;
  timer = setTimeout(() => {
    timer = null;
    if (!shouldWarm()) return;
    current = new AbortController();
    void warm([...new Set([...themeDataUrls(theme.id), ...alreadyLoadedMediaUrls(), ...themeAssetUrls(theme)])], current.signal);
  }, START_DELAY_MS);
}
