/**
 * usageStats - Anonieme, cookieloze gebruiksstatistieken
 *
 * Telt uitsluitend (event, dag) op de server (migration 025). Er wordt niets
 * over de gebruiker verstuurd of opgeslagen: geen id's, geen cookies, geen
 * fingerprinting. Do Not Track wordt gerespecteerd.
 *
 * Bewust een kale fetch naar de PostgREST-RPC i.p.v. de Supabase-client:
 * die is lazy-loaded (~168 kB) en zou anders bij elke app-start alsnog
 * geladen worden.
 */

import { logger } from './logger';

export type UsageEvent =
  | 'app_start'
  | 'composition_started'
  | 'composition_saved'
  | 'composition_submitted'
  | 'stage_reached'
  | 'mp3_export'
  | 'video_export'
  | 'share_link_created'
  | 'save_code_created'
  | 'class_code_entered'
  | 'teacher_dashboard_opened'
  // Migratie 044: fouten en "tijd tot het eerste geluid" (in drie emmers,
  // zodat er nog steeds alleen een teller per dag wordt bewaard)
  | 'client_error'
  | 'first_sound_20s'
  | 'first_sound_60s'
  | 'first_sound_slow';

// Per sessie elk event maar één keer tellen — we willen gebruik meten,
// geen gedrag volgen.
const sentThisSession = new Set<UsageEvent>();

export function logUsageEvent(event: UsageEvent): void {
  if (sentThisSession.has(event)) return;

  if (navigator.doNotTrack === '1') return;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;

  sentThisSession.add(event);

  fetch(`${url}/rest/v1/rpc/log_usage_event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ p_event: event }),
    // Laat de request afmaken ook als de pagina sluit
    keepalive: true,
  }).catch((err) => {
    // Statistiek mag nooit een gebruikersflow breken of ruis geven
    logger.debug('usageStats:', err);
  });
}

// --- Tijd tot het eerste geluid ---------------------------------------------

let compositionStartedAt: number | null = null;

/** Een leerling begint een nieuwe soundscape: telt de start en zet de klok. */
export function logCompositionStarted(): void {
  compositionStartedAt = performance.now();
  logUsageEvent('composition_started');
}

/**
 * Het eerste geluid dat klinkt na de start van een soundscape. Verstuurd
 * wordt alleen in welke emmer het viel (≤ 20 s, ≤ 60 s, langer), nooit de
 * tijd zelf. Zonder gestarte soundscape (docent, presentatie) telt het niet.
 */
export function logFirstSound(): void {
  if (compositionStartedAt === null) return;
  const seconds = (performance.now() - compositionStartedAt) / 1000;
  compositionStartedAt = null;
  logUsageEvent(seconds <= 20 ? 'first_sound_20s' : seconds <= 60 ? 'first_sound_60s' : 'first_sound_slow');
}

// --- Foutenteller -----------------------------------------------------------

let errorCounterInstalled = false;

/**
 * Telt sessies waarin een onverwachte fout optrad (hooguit één per sessie).
 * Er gaat niets over de fout zelf naar de server: geen melding, geen stack,
 * geen pagina. De details staan alleen in de console van dat apparaat.
 */
export function installErrorCounter(): void {
  if (errorCounterInstalled || typeof window === 'undefined') return;
  errorCounterInstalled = true;
  window.addEventListener('error', (e) => {
    // Mislukte afbeelding/geluid (resource-fout) is geen crash
    if (!(e instanceof ErrorEvent)) return;
    logUsageEvent('client_error');
  });
  window.addEventListener('unhandledrejection', () => logUsageEvent('client_error'));
}

/** Alleen voor tests. */
export function resetUsageStatsForTests(): void {
  sentThisSession.clear();
  compositionStartedAt = null;
}
