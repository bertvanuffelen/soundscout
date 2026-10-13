/**
 * submissionDisplay — pure hulpjes voor hoe een inzending in het
 * docentenportaal getoond wordt (volgorde + vorm-label).
 *
 * - Volgorde: sinds migratie 026 krijgt elke klas-inzending al bij het eerste
 *   opslaan een rij (created_at = eerste keer opslaan). "Nieuwste bovenaan"
 *   moet daarom op het moment van inleveren sorteren, niet op created_at.
 * - Vorm: een praatplaat-compositie draagt een virtueel storyboard-id
 *   ("pp-…"), dus `storyboardId` alleen is geen bewijs van een storyboard.
 */

import type { CompositionData } from '../types';

export type SubmissionShape = 'praatplaat' | 'storyboard' | 'image' | 'template' | 'free';

interface TimedSubmission {
  created_at: string;
  submitted_at?: string | null;
  last_updated_at?: string | null;
}

interface ShapedSubmission {
  assignment_type?: 'template' | 'praatplaat' | 'storyboard' | 'free' | null;
  composition_data?: Pick<CompositionData, 'storyboardId' | 'praatplaat' | 'praatplaatPosition'> | null;
}

/** Moment waarop een inzending "binnenkwam": inleveren > laatst bewerkt > eerste keer opslaan. */
export function submissionSortTime(s: TimedSubmission): number {
  const iso = s.submitted_at ?? s.last_updated_at ?? s.created_at;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Nieuwste bovenaan, op het moment van inleveren (nieuwe kopie, origineel blijft gelijk). */
export function sortSubmissionsNewestFirst<T extends TimedSubmission>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => submissionSortTime(b) - submissionSortTime(a));
}

/** Welke vorm heeft deze inzending — voor label, icoon en visual. */
export function getSubmissionShape(s: ShapedSubmission): SubmissionShape {
  const data = s.composition_data ?? null;
  if (s.assignment_type === 'praatplaat' || data?.praatplaat || data?.praatplaatPosition) return 'praatplaat';
  const sbId = data?.storyboardId;
  if (sbId) {
    // pp-* = losse afbeelding (compose-modus "bij een afbeelding"), location-* = locatieplaat
    if (sbId.startsWith('pp-') || sbId.startsWith('location-')) return 'image';
    return 'storyboard';
  }
  if (s.assignment_type === 'storyboard') return 'storyboard';
  if (s.assignment_type === 'template') return 'template';
  return 'free';
}
