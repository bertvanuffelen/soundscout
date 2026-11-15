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

  it('Luisterspiegel staat tussen titel en bewaren/inleveren, alleen als hij aan staat', () => {
    expect(ids({ mirrorEnabled: true })).toEqual(['listen', 'title', 'mirror', 'save', 'export']);
    expect(ids({ mirrorEnabled: true, inClass: true, isPraatplaat: true }))
      .toEqual(['listen', 'title', 'spot', 'mirror', 'hand', 'export']);
    expect(ids({ mirrorEnabled: false })).not.toContain('mirror');
  });

  it('een overgeslagen Luisterspiegel houdt niets tegen', () => {
    const steps = deriveStageSteps({ ...BASE, mirrorEnabled: true, listened: true, hasTitle: true, saved: true, exported: true });
    expect(steps.find((s) => s.id === 'mirror')).toMatchObject({ done: false, locked: false, optional: true });
    expect(allStepsDone(steps)).toBe(true);
  });

  it('na de titel opent de Luisterspiegel; daarna bewaren', () => {
    const input = { ...BASE, mirrorEnabled: true, listened: true, hasTitle: true };
    expect(firstOpenStep(deriveStageSteps(input))).toBe('mirror');
    expect(firstOpenStep(deriveStageSteps({ ...input, mirrorDone: true }))).toBe('save');
  });

  it('alles klaar', () => {
    const steps = deriveStageSteps({ ...BASE, listened: true, hasTitle: true, saved: true, exported: true });
    expect(allStepsDone(steps)).toBe(true);
    expect(firstOpenStep(steps)).toBeNull();
  });
});
