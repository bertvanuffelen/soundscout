/**
 * Fase 2.2: welke podiumstappen een leerling ziet per situatie.
 */

import { describe, it, expect } from 'vitest';
import { deriveStageSteps, firstOpenStep, allStepsDone, type StageStepInput } from '../stageSteps';

const BASE: StageStepInput = {
  inClass: false, isPraatplaat: false, listened: false, hasTitle: false,
  handedIn: false, changedSinceHandIn: false, saved: false, changedSinceSave: false,
  hasTeacherFeedback: false, feedbackRead: false, peerEnabled: false, peerDone: 0, exported: false,
};

const ids = (input: Partial<StageStepInput>) => deriveStageSteps({ ...BASE, ...input }).map((s) => s.id);

describe('deriveStageSteps', () => {
  it('zonder klas: luisteren, titel, bewaren, exporteren', () => {
    expect(ids({})).toEqual(['listen', 'title', 'save', 'export']);
  });

  it('klas met praatplaat, docent-feedback en peer-feedback', () => {
    expect(ids({ inClass: true, isPraatplaat: true, hasTeacherFeedback: true, peerEnabled: true }))
      .toEqual(['listen', 'title', 'spot', 'hand', 'post', 'peer', 'export']);
  });

  it('peer-feedback wacht op inleveren', () => {
    const peer = (handedIn: boolean) => deriveStageSteps({ ...BASE, inClass: true, peerEnabled: true, handedIn })
      .find((s) => s.id === 'peer');
    expect(peer(false)?.locked).toBe(true);
    expect(peer(true)?.locked).toBe(false);
  });

  it('een wijziging na inleveren maakt de stap weer open (versie 2)', () => {
    const hand = deriveStageSteps({ ...BASE, inClass: true, handedIn: true, changedSinceHandIn: true })
      .find((s) => s.id === 'hand');
    expect(hand).toMatchObject({ done: false, changed: true });
  });

  it('opent de eerste stap die nog niet klaar is, en slaat vergrendelde over', () => {
    const steps = deriveStageSteps({ ...BASE, inClass: true, listened: true, hasTitle: true, handedIn: false, peerEnabled: true });
    expect(firstOpenStep(steps)).toBe('hand');
    expect(allStepsDone(steps)).toBe(false);
  });

  it('alles klaar', () => {
    const steps = deriveStageSteps({ ...BASE, listened: true, hasTitle: true, saved: true, exported: true });
    expect(allStepsDone(steps)).toBe(true);
    expect(firstOpenStep(steps)).toBeNull();
  });
});
