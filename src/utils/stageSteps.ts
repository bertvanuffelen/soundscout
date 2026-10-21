/**
 * Stappen van het podium (fase 2.2, ontwerp v4): welke stappen de leerling
 * ziet en welke klaar zijn. Puur, zodat elke situatie (klas/geen klas,
 * praatplaat, peer-feedback aan/uit, docent-feedback) testbaar is.
 *
 * De volgorde is vrij: de leerling mag elke stap openen. Alleen
 * "Feedback klasgenoten" wacht tot er is ingeleverd (de server eist dat).
 */

export type StageStepId = 'listen' | 'title' | 'spot' | 'hand' | 'save' | 'post' | 'peer' | 'export';

export interface StageStepInput {
  inClass: boolean;
  isPraatplaat: boolean;
  listened: boolean;
  hasTitle: boolean;
  /** Klas: ingeleverd en de laatste versie is bij de docent */
  handedIn: boolean;
  /** Klas: iets veranderd sinds de laatste ingeleverde versie */
  changedSinceHandIn: boolean;
  /** Zonder klas: online bewaard met een bewaarcode */
  saved: boolean;
  changedSinceSave: boolean;
  /** Er is feedback van de docent binnen */
  hasTeacherFeedback: boolean;
  feedbackRead: boolean;
  /** Docent heeft "feedback klasgenoten" aangezet */
  peerEnabled: boolean;
  /** Aantal beoordeelde klasgenoten (max 3) */
  peerDone: number;
  exported: boolean;
}

export interface StageStep {
  id: StageStepId;
  done: boolean;
  /** Nog niet beschikbaar (alleen peer: eerst inleveren) */
  locked: boolean;
  /** Was klaar, maar er is iets veranderd: opnieuw inleveren/bewaren */
  changed: boolean;
}

export const PEER_TARGET = 3;

export function deriveStageSteps(input: StageStepInput): StageStep[] {
  const steps: StageStep[] = [];
  const add = (id: StageStepId, done: boolean, extra: Partial<StageStep> = {}) =>
    steps.push({ id, done, locked: false, changed: false, ...extra });

  add('listen', input.listened);
  add('title', input.hasTitle);
  if (input.isPraatplaat) add('spot', true);

  if (input.inClass) {
    add('hand', input.handedIn && !input.changedSinceHandIn, {
      changed: input.handedIn && input.changedSinceHandIn,
    });
    if (input.hasTeacherFeedback) add('post', input.feedbackRead);
    if (input.peerEnabled) {
      add('peer', input.peerDone >= PEER_TARGET, { locked: !input.handedIn });
    }
  } else {
    add('save', input.saved && !input.changedSinceSave, {
      changed: input.saved && input.changedSinceSave,
    });
  }

  add('export', input.exported);
  return steps;
}

/** De stap die standaard openstaat: de eerste die nog niet klaar is */
export function firstOpenStep(steps: StageStep[]): StageStepId | null {
  return steps.find((s) => !s.done && !s.locked)?.id ?? null;
}

export function allStepsDone(steps: StageStep[]): boolean {
  return steps.every((s) => s.done);
}
