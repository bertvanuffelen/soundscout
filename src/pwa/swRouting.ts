/**
 * Regels voor de service worker (V2 Fase 2 — offline). Eén plek, gebruikt door
 * `vite.config.ts` (Workbox-configuratie) en getest in `__tests__/swRouting.test.ts`.
 *
 * Dit bestand draait ook in Node (de build): geen imports, geen browser-API's.
 * De matcher-functies worden door Workbox als tekst in `sw.js` gezet en mogen
 * daarom NIETS van buiten hun eigen functie gebruiken (ook geen constanten
 * uit dit bestand).
 *
 * Uitleg en beheer: docs/v2/OFFLINE.md.
 */

/**
 * Naam van de precache (de app zelf). Normaal NIET aanraken: elke build krijgt
 * vanzelf een nieuwe sw.js zodra er een bestand verandert. Alleen ophogen om
 * alle apparaten te dwingen de app opnieuw op te halen terwijl de bestanden
 * gelijk zijn gebleven (zie docs/v2/OFFLINE.md §5, "verkeerde uploadvolgorde").
 */
export const PRECACHE_ID = 'soundscout-1';

/** Versie in de cachenamen. Ophogen = alle apparaten beginnen met lege mediacaches. */
export const AUDIO_CACHE = 'soundscout-audio-v1';
export const IMAGE_CACHE = 'soundscout-images-v1';

/**
 * Navigaties die NIET naar de app (index.html) mogen terugvallen: eigen
 * HTML-pagina's en bestanden. Workbox test deze tegen `pad + ?query`.
 * Zie docs/v2/URL-CONTRACT.md §2, vormen 17-22.
 */
export const NAVIGATE_FALLBACK_DENYLIST: RegExp[] = [
  // Publieke docentenpagina en Over-pagina: eigen HTML met eigen SEO-meta
  /^\/teacher(\.html)?\/?(\?|$)/,
  /^\/over(\.html)?\/?(\?|$)/,
  // Statische mappen
  /^\/(les|privacy|animaties|assets|audio|images|fonts)(\/|\?|$)/,
  // Elk pad dat op een bestandsnaam met extensie eindigt (sitemap.xml,
  // robots.txt, manifest.json, sw.js, ...). Alleen het pad telt, niet de query.
  /^[^?]*\/[^/?]+\.[^/?]+(\?|$)/,
  // Test-/hulppaden met dubbele underscore (nooit een scherm)
  /^\/__/,
];

/** Query-parameters die bij het zoeken in de precache genegeerd worden. */
export const PRECACHE_IGNORE_PARAMS: RegExp[] = [/^utm_/, /^fbclid$/, /^lang$/];

interface MatchInput {
  url: URL;
  sameOrigin: boolean;
  request?: { method?: string; destination?: string };
}

/** Geluiden van thema's: alleen eigen origin, alleen .mp3 onder /audio/. */
export function isThemeAudio({ url, sameOrigin }: MatchInput): boolean {
  return sameOrigin && url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3');
}

/** Beelden (kaarten, locaties, praatplaten, storyboards): alleen eigen origin onder /images/. */
export function isAppImage({ url, sameOrigin }: MatchInput): boolean {
  return sameOrigin && url.pathname.startsWith('/images/') && /\.(jpe?g|png|webp|svg)$/.test(url.pathname);
}
