/**
 * useClassOverview — gegevens voor het dashboard "Vandaag": per klas de
 * actieve opdracht en de tellingen (twee queries voor alle klassen samen,
 * geen migratie) plus de "klas van nu".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TeacherClass } from './useClasses';
import { getSupabase } from '../lib/supabase';
import { fetchActiveAssignmentsForClasses, type ClassAssignmentRow } from '../lib/assignments';
import { summarizeClasses, pickCurrentClassId, type ClassSummary, type OverviewSubmission } from '../lib/classOverview';
import { logger } from '../utils/logger';

const LAST_CLASS_KEY = 'ss-teacher-last-class';

/** Onthoud welke klas de docent het laatst opende (voor de kaart "Nu"). */
export function rememberLastClass(classId: string): void {
  try { localStorage.setItem(LAST_CLASS_KEY, classId); } catch { /* opslag niet beschikbaar */ }
}

function readLastClass(): string | null {
  try { return localStorage.getItem(LAST_CLASS_KEY); } catch { return null; }
}

export function useClassOverview(classes: TeacherClass[]) {
  const [activeByClass, setActiveByClass] = useState<Map<string, ClassAssignmentRow>>(new Map());
  const [submissions, setSubmissions] = useState<OverviewSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const idsKey = classes.map((c) => c.id).join(',');

  const load = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setActiveByClass(new Map());
      setSubmissions([]);
      setLoading(false);
      return;
    }
    try {
      const supabase = await getSupabase();
      const [active, { data, error }] = await Promise.all([
        fetchActiveAssignmentsForClasses(ids),
        supabase
          .from('submissions')
          .select('id, class_id, created_at, submitted_at, last_updated_at, save_code, teacher_seen_at, feedback_at, assignment_id, assignment_ref, praatplaat_id')
          .in('class_id', ids),
      ]);
      if (error) logger.warn('useClassOverview: inzendingen laden mislukt', error);
      setActiveByClass(active);
      setSubmissions((data ?? []) as OverviewSubmission[]);
    } catch (err) {
      logger.warn('useClassOverview: laden mislukt', err);
    } finally {
      setLoading(false);
    }
  }, [idsKey]);

  useEffect(() => { void load(); }, [load]);

  const summaries: Map<string, ClassSummary> = useMemo(
    () => summarizeClasses(classes, activeByClass, submissions),
    [classes, activeByClass, submissions],
  );
  const currentId = useMemo(() => pickCurrentClassId(summaries, readLastClass()), [summaries]);

  return { summaries, currentId, loading, refetch: load };
}
