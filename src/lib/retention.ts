/**
 * retention — AVG-bewaartermijnen (client-kant).
 *
 * Eén bron voor de termijnen die de app belooft, zodat de privacy-tekst, de
 * dashboard-waarschuwing en de server-cleanup (migratie 035) niet uit elkaar
 * lopen. De daadwerkelijke verwijdering gebeurt server-side via
 * `cleanup_expired_data()` (pg_cron, dagelijks). Deze module berekent alleen
 * wanneer iets verloopt, voor de docent-waarschuwing.
 *
 * Beleid (24-7, besluit Bert):
 * - Online bewaarcode (leerling, geen klas): 60 dagen inactiviteit.
 * - Deellinks & klasalbums: 30 dagen.
 * - Docent-inzendingen (leerlingwerk mét voornaam): 1 schooljaar (365 dagen)
 *   na laatste activiteit. Alleen de inzending wordt verwijderd — de klas,
 *   opdracht en code blijven bestaan.
 */

export const RETENTION_BEWAARCODE_DAYS = 60;
export const RETENTION_SUBMISSION_DAYS = 365;
export const RETENTION_SHARE_DAYS = 30;
/** Hoeveel dagen vooraf de docent gewaarschuwd wordt in het dashboard */
export const RETENTION_WARN_BEFORE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetainableSubmission {
  created_at: string;
  last_updated_at?: string | null;
  submitted_at?: string | null;
}

/** Laatste-activiteitsmoment: opslag-update > inlevermoment > aangemaakt. */
export function submissionLastActivity(s: RetainableSubmission): Date {
  return new Date(s.last_updated_at ?? s.submitted_at ?? s.created_at);
}

/** Datum waarop een docent-inzending automatisch wordt verwijderd. */
export function submissionDeletionDate(s: RetainableSubmission): Date {
  return new Date(
    submissionLastActivity(s).getTime() + RETENTION_SUBMISSION_DAYS * DAY_MS
  );
}

export interface DeletionWarning {
  /** Vroegste verwijderdatum onder de inzendingen binnen het waarschuwingsvenster */
  date: Date;
  /** Aantal inzendingen dat op of vóór het einde van het venster verwijderd wordt */
  count: number;
}

/**
 * Waarschuwing voor een klas: is er inzendingswerk dat binnen
 * RETENTION_WARN_BEFORE_DAYS dagen (of al) verwijderd wordt? Zo ja, geef de
 * vroegste verwijderdatum + hoeveel inzendingen daarbinnen vallen.
 * Geeft null als er niets binnen het venster valt.
 */
export function getClassDeletionWarning(
  submissions: RetainableSubmission[],
  now: Date = new Date()
): DeletionWarning | null {
  const threshold = now.getTime() + RETENTION_WARN_BEFORE_DAYS * DAY_MS;
  let earliest: number | null = null;
  let count = 0;
  for (const s of submissions) {
    const deletionMs = submissionDeletionDate(s).getTime();
    if (deletionMs <= threshold) {
      count++;
      if (earliest === null || deletionMs < earliest) earliest = deletionMs;
    }
  }
  if (earliest === null) return null;
  return { date: new Date(earliest), count };
}
