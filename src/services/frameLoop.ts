/**
 * frameLoop — één gedeelde requestAnimationFrame-lus voor de hele app
 * (V2 Fase 1, v2-architecture-proposal.md §2.1).
 *
 * Alles wat per frame iets moet tekenen (afspeellijn, voortgangsbalk, beeld bij
 * de muziek) abonneert zich hier, in plaats van elk een eigen rAF-lus te
 * draaien. De lus stopt vanzelf als niemand meer luistert.
 *
 * Abonnees schrijven direct naar de DOM (of een canvas). Geen React-state per
 * frame: dát was de bottleneck (20 store-updates per seconde).
 */

export type FrameCallback = (now: number) => void;

const subscribers = new Set<FrameCallback>();
let rafId: number | null = null;

function run(now: number): void {
  // Kopie: een abonnee mag zich tijdens het frame uitschrijven.
  for (const cb of [...subscribers]) {
    try {
      cb(now);
    } catch (err) {
      // Eén kapotte abonnee mag de lus niet stilleggen voor de rest.
      console.error('[frameLoop] abonnee gooide een fout', err);
    }
  }
  rafId = subscribers.size > 0 ? requestAnimationFrame(run) : null;
}

/** Abonneer op elk frame. Geeft een uitschrijf-functie terug. */
export function subscribeFrame(cb: FrameCallback): () => void {
  subscribers.add(cb);
  if (rafId === null) rafId = requestAnimationFrame(run);
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

/** Alleen voor tests. */
export function frameSubscriberCount(): number {
  return subscribers.size;
}
