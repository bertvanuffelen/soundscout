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
  | 'teacher_dashboard_opened';

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
