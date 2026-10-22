/**
 * Live meenemen van docentwijzigingen (fase 4.1).
 *
 * Een leerling zit een les lang op dezelfde klassessie. Zet de docent intussen
 * peer-feedback aan, koppelt hij een opdrachtkaart of zet hij de titel-
 * instelling om, dan moet het podium dat zien zonder opnieuw de klascode te
 * typen. We halen de actieve opdracht opnieuw op en nemen alleen de
 * instellingen over; de inzending zelf blijft ongemoeid.
 */

import type { ActiveAssignment } from '../lib/assignments';
import type { ClassSession } from '../types';

export interface LiveMergeResult {
  session: ClassSession;
  /** Instellingen zijn bijgewerkt (zelfde opdracht) */
  updated: boolean;
  /** De docent heeft intussen een andere opdracht actief gezet (of geen) */
  assignmentChanged: boolean;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Voeg een vers opgehaalde opdracht samen met de huidige sessie.
 * `freshAssignmentId` is het id dat `classSessionFromAssignment` voor de
 * verse opdracht zou geven (template-/praatplaat-id, storyboard-ref, thema).
 */
export function mergeLiveAssignment(
  current: ClassSession,
  fresh: ActiveAssignment | null,
  freshAssignmentId: string | null,
): LiveMergeResult {
  if (!fresh || !freshAssignmentId || fresh.type !== current.assignmentType || freshAssignmentId !== current.assignmentId) {
    return { session: current, updated: false, assignmentChanged: true };
  }
  const next: ClassSession = {
    ...current,
    className: fresh.className,
    card: fresh.card,
    durationLabel: fresh.durationLabel,
    peerReview: fresh.peerReview,
    studentsTypeTitle: fresh.studentsTypeTitle,
  };
  const updated = !sameJson(
    [current.className, current.card, current.durationLabel, current.peerReview, current.studentsTypeTitle],
    [next.className, next.card, next.durationLabel, next.peerReview, next.studentsTypeTitle],
  );
  return { session: updated ? next : current, updated, assignmentChanged: false };
}
