/**
 * useLiveAssignment — houdt de klassessie bij met wat de docent nu instelt
 * (fase 4.1). Bij openen en daarna elke minuut, alleen als het tabblad
 * zichtbaar is, en meteen zodra het tabblad weer zichtbaar wordt. Fouten
 * (offline, druk) worden stil genegeerd: de leerling werkt gewoon door met
 * wat er al was.
 *
 * Sinds V2 Fase 2 regelt TanStack Query de timer (`refetchInterval`, pauzeert
 * vanzelf bij een verborgen tabblad) en het verversen bij terugkomst. Er
 * wordt niets bewaard: de sleutel is de klascode (klas-brede informatie,
 * geen leerlingwerk) en de cache-inhoud is alleen "is de opdracht gewisseld".
 *
 * @returns true als de docent intussen een andere opdracht actief zette
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../stores/appStore';
import { mergeLiveAssignment } from '../utils/liveAssignment';
import { logger } from '../utils/logger';
import { queryKeys } from '../query/queryKeys';

export const LIVE_ASSIGNMENT_INTERVAL_MS = 60_000;

export function useLiveAssignment(): boolean {
  const client = useQueryClient();
  const classCode = useAppStore((s) => s.classSession?.classCode ?? null);
  const key = queryKeys.student.liveAssignment(classCode ?? '');

  const query = useQuery({
    queryKey: key,
    enabled: classCode !== null,
    // Altijd vers: elke tik en elke terugkeer naar het tabblad vraagt opnieuw
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: LIVE_ASSIGNMENT_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    queryFn: async ({ signal }): Promise<boolean> => {
      // "Niets veranderd": de vorige uitkomst blijft staan
      const unchanged = () => client.getQueryData<boolean>(key) ?? false;
      if (!classCode || document.visibilityState === 'hidden') return unchanged();
      try {
        const [{ getActiveAssignment }, { classSessionFromAssignment }] = await Promise.all([
          import('../lib/assignments'),
          import('../utils/compositionInit'),
        ]);
        const fresh = await getActiveAssignment(classCode);
        const current = useAppStore.getState().classSession;
        // signal.aborted: het scherm is intussen dicht of de klascode gewisseld
        if (signal.aborted || !current || current.classCode !== classCode) return unchanged();
        const freshId = fresh ? classSessionFromAssignment(classCode, fresh)?.assignmentId ?? null : null;
        const result = mergeLiveAssignment(current, fresh, freshId);
        // setState (niet setClassSession): de inzending blijft gekoppeld
        if (result.updated) useAppStore.setState({ classSession: result.session });
        return result.assignmentChanged;
      } catch (err) {
        logger.warn('Opdracht live bijwerken mislukt', err);
        return unchanged();
      }
    },
  });

  return classCode ? query.data ?? false : false;
}
