/**
 * usageStatsAdmin - Leeskant van de anonieme gebruiksstatistieken (migration 025)
 *
 * De schrijfkant (logUsageEvent) staat bewust los in src/utils/usageStats.ts
 * (kale fetch, geen Supabase-client). Deze leeskant is alleen voor het
 * beheerders-dashboardje en gebruikt wél de (lazy) Supabase-client, want
 * lezen vereist een ingelogde sessie (RLS: authenticated SELECT).
 */

import { getSupabase } from './supabase';
import { logger } from '../utils/logger';

export interface UsageStatRow {
  event: string;
  day: string; // ISO-datum (YYYY-MM-DD)
  count: number;
}

/**
 * Alleen accounts in VITE_ADMIN_EMAILS (kommagescheiden) zien het
 * statistieken-dashboardje. Puur cosmetische gating: de data zelf is een
 * anoniem aggregaat en via RLS al leesbaar voor elke ingelogde docent.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/** Haalt de tellingen van de afgelopen `days` dagen op (default 90). */
export async function fetchUsageStats(days = 90): Promise<UsageStatRow[]> {
  const supabase = await getSupabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from('usage_stats')
    .select('event, day, count')
    .gte('day', since)
    .order('day', { ascending: true });

  if (error) {
    logger.error('usage_stats ophalen mislukt:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as UsageStatRow[];
}
