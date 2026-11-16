/**
 * classOverview — samenvatting per klas voor het dashboard "Vandaag"
 * (ontwerp ronde 3b): actieve opdracht, aantal ingeleverd, aantal nieuw en
 * de "klas van nu" (laatst geopend, anders de meeste recente activiteit).
 * Puur, zodat het zonder netwerk te testen is.
 */

import type { ClassAssignmentRow } from './assignments';
import { submissionMatchesAssignment } from './assignments';
import { submissionSortTime } from './submissionDisplay';

export interface OverviewSubmission {
  id: string;
  class_id: string;
  created_at: string;
  submitted_at?: string | null;
  last_updated_at?: string | null;
  save_code?: string | null;
  teacher_seen_at?: string | null;
  feedback_at?: string | null;
  assignment_id?: string | null;
  assignment_ref?: string | null;
  praatplaat_id?: string | null;
}

export interface ClassSummary {
  classId: string;
  active: ClassAssignmentRow | null;
  /** Ingeleverd bij de actieve opdracht (of alles als er geen opdracht is) */
  submittedCount: number;
  /** Ingeleverd en nog niet beluisterd */
  newCount: number;
  /** Meest recente activiteit (ms): opdracht klaargezet of werk binnengekomen */
  lastActivity: number;
}

interface ClassLike {
  id: string;
  created_at: string;
}

const isSubmitted = (s: OverviewSubmission) => !!s.submitted_at || !s.save_code;

export function summarizeClasses(
  classes: ClassLike[],
  activeByClass: Map<string, ClassAssignmentRow>,
  submissions: OverviewSubmission[],
): Map<string, ClassSummary> {
  const byClass = new Map<string, OverviewSubmission[]>();
  for (const s of submissions) {
    const list = byClass.get(s.class_id) ?? [];
    list.push(s);
    byClass.set(s.class_id, list);
  }

  const out = new Map<string, ClassSummary>();
  for (const c of classes) {
    const active = activeByClass.get(c.id) ?? null;
    const subs = byClass.get(c.id) ?? [];
    const relevant = subs.filter((s) => isSubmitted(s) && (!active || submissionMatchesAssignment(s, active)));
    let last = Date.parse(c.created_at) || 0;
    if (active) last = Math.max(last, Date.parse(active.activatedAt) || 0);
    for (const s of subs) last = Math.max(last, submissionSortTime(s));
    out.set(c.id, {
      classId: c.id,
      active,
      submittedCount: relevant.length,
      newCount: relevant.filter((s) => !s.teacher_seen_at && !s.feedback_at).length,
      lastActivity: last,
    });
  }
  return out;
}

/** De klas van nu: laatst geopend (als die nog bestaat), anders de meeste recente activiteit. */
export function pickCurrentClassId(
  summaries: Map<string, ClassSummary>,
  lastOpenedId: string | null,
): string | null {
  if (lastOpenedId && summaries.has(lastOpenedId)) return lastOpenedId;
  let best: ClassSummary | null = null;
  for (const s of summaries.values()) {
    if (!best || s.lastActivity > best.lastActivity) best = s;
  }
  return best?.classId ?? null;
}
