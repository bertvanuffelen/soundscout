/**
 * useLiveAssignment — houdt de klassessie bij met wat de docent nu instelt
 * (fase 4.1). Bij openen en daarna elke minuut, alleen als het tabblad
 * zichtbaar is. Fouten (offline, druk) worden stil genegeerd: de leerling
 * werkt gewoon door met wat er al was.
 *
 * @returns true als de docent intussen een andere opdracht actief zette
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { mergeLiveAssignment } from '../utils/liveAssignment';
import { logger } from '../utils/logger';

const INTERVAL_MS = 60_000;

export function useLiveAssignment(): boolean {
  const classCode = useAppStore((s) => s.classSession?.classCode ?? null);
  const [assignmentChanged, setAssignmentChanged] = useState(false);

  useEffect(() => {
    if (!classCode) return;
    let cancelled = false;

    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const [{ getActiveAssignment }, { classSessionFromAssignment }] = await Promise.all([
          import('../lib/assignments'),
          import('../utils/compositionInit'),
        ]);
        const fresh = await getActiveAssignment(classCode);
        const current = useAppStore.getState().classSession;
        if (cancelled || !current || current.classCode !== classCode) return;
        const freshId = fresh ? classSessionFromAssignment(classCode, fresh)?.assignmentId ?? null : null;
        const result = mergeLiveAssignment(current, fresh, freshId);
        // setState (niet setClassSession): de inzending blijft gekoppeld
        if (result.updated) useAppStore.setState({ classSession: result.session });
        setAssignmentChanged(result.assignmentChanged);
      } catch (err) {
        logger.warn('Opdracht live bijwerken mislukt', err);
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [classCode]);

  return classCode ? assignmentChanged : false;
}
