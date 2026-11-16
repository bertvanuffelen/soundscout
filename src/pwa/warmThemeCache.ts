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
 */
import type { ThemeConfig } from '../data/themes';

const CONCURRENCY = 2;
const START_DELAY_MS = 4000;

/** Alle media-adressen van één thema (eigen site), zonder dubbelen. */
export function themeAssetUrls(theme: Pick<ThemeConfig, 'map' | 'locations' | 'samples'>): string[] {
  const urls = [
    theme.map?.backgroundImage,
    ...theme.locations.flatMap((l) => [l.backgroundImage, l.ambientAudio]),
    ...theme.samples.map((s) => s.audioUrl),
  ];
  return [...new Set(urls.filter((u): u is string => typeof u === 'string' && u.startsWith('/') && !u.startsWith('//')))];
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
export function scheduleThemeWarmup(theme: Pick<ThemeConfig, 'map' | 'locations' | 'samples'> | null): void {
  if (timer) clearTimeout(timer);
  current?.abort();
  current = null;
  if (!theme) return;
  timer = setTimeout(() => {
    timer = null;
    if (!shouldWarm()) return;
    current = new AbortController();
    void warm([...new Set([...alreadyLoadedMediaUrls(), ...themeAssetUrls(theme)])], current.signal);
  }, START_DELAY_MS);
}
