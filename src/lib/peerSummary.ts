/**
 * peerSummary — vat de beoordelingen van klasgenoten voor één inzending samen
 * (sterren per criterium + hoeveel klasgenoten). Puur, zodat het zonder
 * netwerk te testen is. Gebruikt door "Feedback geven" (feedback Bert 15-10):
 * de docent ziet wat klasgenoten vonden vóór hij zelf reageert.
 */

export interface PeerFeedbackRow {
  id: string;
  submission_id: string;
  from_submission_id: string;
  chips: string[] | null;
  ratings: Record<string, number> | null;
  created_at: string;
}

export interface PeerCriterion {
  name: string;
  /** Gemiddelde 1–3, null voor oude chips-rijen zonder sterren */
  avg: number | null;
  count: number;
}

export interface PeerSummary {
  raters: number;
  criteria: PeerCriterion[];
  /** Wie er reageerden (submission-id's van de gevers) */
  fromIds: string[];
}

export function summarizePeerFeedback(rows: PeerFeedbackRow[]): PeerSummary {
  const map = new Map<string, { total: number; rated: number; count: number }>();
  for (const row of rows) {
    if (row.ratings) {
      for (const [name, stars] of Object.entries(row.ratings)) {
        const c = map.get(name) ?? { total: 0, rated: 0, count: 0 };
        const n = Number(stars) || 0;
        if (n > 0) { c.total += n; c.rated += 1; }
        c.count += 1;
        map.set(name, c);
      }
    } else {
      for (const name of row.chips ?? []) {
        const c = map.get(name) ?? { total: 0, rated: 0, count: 0 };
        c.count += 1;
        map.set(name, c);
      }
    }
  }
  const criteria = [...map.entries()].map(([name, c]) => ({
    name,
    avg: c.rated > 0 ? Math.round((c.total / c.rated) * 10) / 10 : null,
    count: c.count,
  }));
  return { raters: rows.length, criteria, fromIds: rows.map((r) => r.from_submission_id) };
}
