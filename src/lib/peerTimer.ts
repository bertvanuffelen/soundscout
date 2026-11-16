/**
 * peerTimer — het tijdslot voor "Klasgenoten laten luisteren".
 *
 * De database kent alleen de sluittijd (peer_review_closes_at), niet de
 * gekozen duur. Die onthouden we per opdracht op dit apparaat, zodat de
 * keuze na herladen terugkomt. Op een ander apparaat leiden we hem af uit
 * de resterende tijd: de kleinste optie die nog past.
 */

export const TIMER_OPTIONS = [10, 15, 30] as const;

const timerKey = (assignmentId: string) => `ss-peer-timer-${assignmentId}`;

export function rememberTimer(assignmentId: string, minutes: number | null): void {
  try {
    if (minutes) localStorage.setItem(timerKey(assignmentId), String(minutes));
    else localStorage.removeItem(timerKey(assignmentId));
  } catch { /* opslag niet beschikbaar */ }
}

export function readRememberedTimer(assignmentId: string): string | null {
  try { return localStorage.getItem(timerKey(assignmentId)); } catch { return null; }
}

/** 0 = geen tijdslot. */
export function restoreTimerMinutes(stored: string | null, closesAt: string | null, now = Date.now()): number {
  if (!closesAt) return 0;
  const n = Number(stored);
  if ((TIMER_OPTIONS as readonly number[]).includes(n)) return n;
  const left = Math.max(0, Math.ceil((new Date(closesAt).getTime() - now) / 60_000));
  return TIMER_OPTIONS.find((m) => m >= left) ?? TIMER_OPTIONS[TIMER_OPTIONS.length - 1];
}
