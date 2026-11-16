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
/** Thema-index en -manifesten (V2 Fase 3), network-first: zie isThemeData. */
export const THEME_DATA_CACHE = 'soundscout-themes-v1';
/** Media van thema's uit het beheerdashboard (Supabase Storage, bucket 'themes'), cache-first. */
export const THEME_MEDIA_CACHE = 'soundscout-theme-media-v1';

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
  /^\/(les|privacy|animaties|assets|audio|images|fonts|themes)(\/|\?|$)/,
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

/**
 * Thema-data (V2 Fase 3): /themes/index.json en /themes/<id>/manifest.json.
 * Network-first: online altijd de gepubliceerde versie (een nieuwe publicatie
 * is meteen zichtbaar, nooit "voor altijd" oud), offline de laatst geziene.
 */
export function isThemeData({ url, sameOrigin }: MatchInput): boolean {
  return sameOrigin && url.pathname.startsWith('/themes/') && url.pathname.endsWith('.json');
}

/**
 * Media van thema's die in het beheerdashboard zijn gepubliceerd (migratie 043):
 * de PUBLIEKE bucket 'themes' van Supabase Storage, paden
 * `/storage/v1/object/public/themes/<id>/v<n>/…`. Elke versie heeft een eigen,
 * nooit veranderend pad, dus cache-first is veilig.
 *
 * Bewust ALLEEN dit pad: REST, RPC, Auth en elke andere bucket van Supabase
 * blijven ongemoeid (e2e/sw: "Supabase wordt nooit bewaard"). De origin staat
 * niet in de regel omdat Workbox deze functie als tekst in sw.js zet (geen
 * toegang tot VITE_SUPABASE_URL); het pad is specifiek genoeg.
 */
export function isThemeBucketMedia({ url, request }: MatchInput): boolean {
  if (request?.method && request.method !== 'GET') return false;
  return url.pathname.includes('/storage/v1/object/public/themes/')
    && /\.(mp3|m4a|aac|ogg|wav|jpe?g|png|webp|avif|svg)$/i.test(url.pathname);
}
