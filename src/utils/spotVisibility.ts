/**
 * Plekken tonen of verbergen op een praatplaat (raad-de-plek, migratie 047).
 *
 * Pure logica, gedeeld door het presentatiescherm en de schillen eromheen:
 * - welke inzendingen hebben een verborgen plek (`hiddenSpotIdsFor`);
 * - welke plekken staan er nú op de plaat (`isSpotVisible`), gegeven wat de
 *   docent tijdens het presenteren al onthuld heeft.
 *
 * Eén regel voor alle schermen: staat "Plekken tonen" uit, dan is een plek
 * nergens te zien tot de docent hem onthult. Alleen docent-modi kunnen
 * onthullen; de leerling (klasgenoten luisteren) en publieke links niet.
 */

/** Wat de docent tijdens deze presentatie heeft onthuld (sessie, niet opgeslagen). */
export interface SpotRevealState {
  /** "Alle plekken" staat aan */
  revealAll: boolean;
  /** Los onthulde inzendingen */
  revealedIds: ReadonlySet<string>;
}

export const NO_REVEAL: SpotRevealState = { revealAll: false, revealedIds: new Set() };

/** Staat de plek van deze inzending nu op de plaat? */
export function isSpotVisible(
  submissionId: string,
  hiddenSpotIds: ReadonlySet<string> | null | undefined,
  reveal: SpotRevealState = NO_REVEAL,
): boolean {
  if (!hiddenSpotIds || !hiddenSpotIds.has(submissionId)) return true;
  return reveal.revealAll || reveal.revealedIds.has(submissionId);
}

/** Onthul of verberg één plek; geeft een nieuwe set terug. */
export function toggleRevealed(revealedIds: ReadonlySet<string>, submissionId: string): Set<string> {
  const next = new Set(revealedIds);
  if (next.has(submissionId)) next.delete(submissionId);
  else next.add(submissionId);
  return next;
}

/** Minimale vorm van een inzending om hem aan een praatplaat te koppelen. */
interface SpotSubmissionRef {
  id: string;
  assignment_id?: string | null;
  praatplaat_id?: string | null;
}

/**
 * Ids van de inzendingen waarvan de plek verborgen is: alle inzendingen bij
 * een praatplaat waarvoor "Plekken tonen" uit staat. Zelfde koppeling als
 * `submissionMatchesAssignment` (praatplaat_id, of assignment_id in de nieuwe
 * flow). `settings` null (kolom bestaat nog niet) = niets verborgen.
 */
export function hiddenSpotIdsFor(
  submissions: readonly SpotSubmissionRef[],
  settings: ReadonlyArray<{ praatplaatId: string; showSpots: boolean }> | null | undefined,
): Set<string> {
  const hiddenPraatplaten = new Set(
    (settings ?? []).filter((s) => !s.showSpots).map((s) => s.praatplaatId),
  );
  const hidden = new Set<string>();
  if (hiddenPraatplaten.size === 0) return hidden;
  for (const sub of submissions) {
    if (
      (sub.praatplaat_id && hiddenPraatplaten.has(sub.praatplaat_id))
      || (sub.assignment_id && hiddenPraatplaten.has(sub.assignment_id))
    ) {
      hidden.add(sub.id);
    }
  }
  return hidden;
}

/** Is "Plekken tonen" uit voor deze praatplaat? (onbekend = tonen) */
export function spotsHiddenForPraatplaat(
  praatplaatId: string | null | undefined,
  settings: ReadonlyArray<{ praatplaatId: string; showSpots: boolean }> | null | undefined,
): boolean {
  if (!praatplaatId) return false;
  return (settings ?? []).some((s) => s.praatplaatId === praatplaatId && !s.showSpots);
}
