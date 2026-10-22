/**
 * Hoeveel klasgenoten heeft deze leerling al beoordeeld? (podium v4, stap
 * "Feedback klasgenoten"). Per eigen inzending in localStorage; de server
 * bewaakt het echte maximum (cap 3), dit is alleen de voortgangsweergave.
 */

const KEY = 'soundscout:peer-done';

function readAll(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

export function getPeerDone(submissionId: string | null): number {
  if (!submissionId) return 0;
  const n = readAll()[submissionId];
  return typeof n === 'number' ? n : 0;
}

export function setPeerDone(submissionId: string, count: number): number {
  const all = readAll();
  all[submissionId] = Math.max(0, Math.min(3, count));
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Geen opslag: voortgang geldt dan alleen voor deze sessie
  }
  return all[submissionId];
}
