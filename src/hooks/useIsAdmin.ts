/**
 * Is de ingelogde docent beheerder? Vraagt het aan de database (`is_admin()`,
 * migratie 043), één keer per docent in de query-cache.
 *
 * Terugval: bestaat de functie nog niet (migratie 043 niet gedraaid), dan
 * geldt de oude lijst VITE_ADMIN_EMAILS — zodat de knop Statistieken blijft
 * werken. Dat is ALLEEN gemak voor de knoppen in de interface, geen
 * beveiliging: wat een beheerder mag schrijven, bewaakt RLS in de database
 * (zonder admins-rij weigert die elke schrijfactie, wat deze hook ook zegt).
 */

import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { isMissingDatabaseObject } from '../lib/supabaseErrors';
import { isAdminEmail } from '../lib/usageStatsAdmin';
import { useAuth } from '../contexts/useAuth';
import { queryKeys } from '../query/queryKeys';
import { logger } from '../utils/logger';

/** Waar het antwoord vandaan komt. */
export type AdminSource = 'database' | 'email-fallback' | 'none';

export interface AdminStatus {
  isAdmin: boolean;
  source: AdminSource;
  /** True zolang de migratie ontbreekt (dashboard werkt dan alleen lokaal). */
  backendMissing: boolean;
}

/** Puur: het antwoord van `rpc('is_admin')` → status. */
export function resolveAdminStatus(
  response: { data: unknown; error: { code?: string; message: string } | null },
  email: string | null | undefined,
): AdminStatus {
  if (response.error) {
    if (isMissingDatabaseObject(response.error)) {
      return { isAdmin: isAdminEmail(email), source: 'email-fallback', backendMissing: true };
    }
    return { isAdmin: false, source: 'none', backendMissing: false };
  }
  return { isAdmin: response.data === true, source: 'database', backendMissing: false };
}

const NOT_ADMIN: AdminStatus = { isAdmin: false, source: 'none', backendMissing: false };

export function useIsAdmin(): AdminStatus & { loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: queryKeys.teacher.isAdmin(userId ?? 'none'),
    enabled: userId !== null,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        const supabase = await getSupabase();
        const response = await supabase.rpc('is_admin');
        return resolveAdminStatus(response, user?.email);
      } catch (error) {
        logger.warn('[beheer] is_admin niet op te vragen', error);
        return NOT_ADMIN;
      }
    },
  });
  if (!userId) return { ...NOT_ADMIN, loading: authLoading };
  return { ...(query.data ?? NOT_ADMIN), loading: query.isPending };
}
