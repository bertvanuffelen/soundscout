import { describe, it, expect, vi } from 'vitest';
import { activateFromWizard, choiceType, type ActivationDeps, type WizardSettings } from '../wizardActivation';
import type { ClassAssignmentRow } from '../assignments';

const row = (over: Partial<ClassAssignmentRow> = {}): ClassAssignmentRow => ({
  id: 'a1', classId: 'c1', teacherId: 't1', type: 'praatplaat', templateId: null, praatplaatId: 'pp1',
  storyboardRef: null, freeThemeId: null, isActive: true, activatedAt: '2026-10-14T08:00:00Z',
  durationLabel: null, cardId: null, praatplaatThemeId: 'basis', assignmentName: 'Robotfabriek', imageUrl: null,
  ...over,
} as ClassAssignmentRow);

function deps(over: Partial<ActivationDeps> = {}): ActivationDeps {
  return {
    activateAssignment: vi.fn().mockResolvedValue('a1'),
    activatePraatplaatFromCatalog: vi.fn().mockResolvedValue('a1'),
    activateLessonCard: vi.fn().mockResolvedValue('a1'),
    fetchClassAssignment: vi.fn().mockResolvedValue(row()),
    updateAssignmentDuration: vi.fn().mockResolvedValue(undefined),
    updateAssignmentCard: vi.fn().mockResolvedValue(undefined),
    updatePraatplaatTheme: vi.fn().mockResolvedValue(undefined),
    setAssignmentPeerReview: vi.fn().mockResolvedValue(undefined),
    fetchShowSpots: vi.fn().mockResolvedValue(true),
    updateShowSpots: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

const base: WizardSettings = { cardId: null, cardTouched: false, durationLabel: '', peerEnabled: false, praatplaatThemeId: null, showSpots: null };

describe('activateFromWizard', () => {
  it('activeert een praatplaat met het gekozen thema en de kaart, zonder extra stappen', async () => {
    const d = deps();
    const entry = { name: 'Robotfabriek', themeId: 'basis', locationId: 'pp-robotfabriek', imageUrl: '/x.jpg' };
    const res = await activateFromWizard('c1', { kind: 'praatplaat', entry }, { ...base, cardId: 'k1', praatplaatThemeId: 'winterspelen' }, d);
    expect(d.activatePraatplaatFromCatalog).toHaveBeenCalledWith('c1', { ...entry, themeId: 'winterspelen' }, 'k1');
    expect(d.updateAssignmentDuration).not.toHaveBeenCalled();
    expect(d.setAssignmentPeerReview).not.toHaveBeenCalled();
    expect(res.assignment.id).toBe('a1');
    expect(res.failedSettings).toEqual([]);
  });

  it('zet duur en klasgenoten door na het activeren', async () => {
    const d = deps();
    await activateFromWizard('c1', { kind: 'storyboard', storyboardRef: 'verspringen' }, { ...base, durationLabel: ' 2 lessen ', peerEnabled: true }, d);
    expect(d.activateAssignment).toHaveBeenCalledWith('c1', { storyboardRef: 'verspringen', cardId: null });
    expect(d.updateAssignmentDuration).toHaveBeenCalledWith('a1', '2 lessen');
    expect(d.setAssignmentPeerReview).toHaveBeenCalledWith('a1', true, null);
    expect(d.fetchClassAssignment).toHaveBeenCalledTimes(2);
  });

  it('leskaart: kaart alleen overschrijven als de docent hem aanpaste; thema bijwerken als het afwijkt', async () => {
    const d = deps();
    await activateFromWizard('c1', { kind: 'lesson', lessonCardId: 'l1', type: 'praatplaat' }, { ...base, praatplaatThemeId: 'winterspelen' }, d);
    expect(d.activateLessonCard).toHaveBeenCalledWith('l1', 'c1');
    expect(d.updateAssignmentCard).not.toHaveBeenCalled();
    expect(d.updatePraatplaatTheme).toHaveBeenCalledWith('pp1', 'winterspelen');

    const d2 = deps();
    await activateFromWizard('c1', { kind: 'lesson', lessonCardId: 'l1', type: 'praatplaat' }, { ...base, cardTouched: true, cardId: 'k2', praatplaatThemeId: 'basis' }, d2);
    expect(d2.updateAssignmentCard).toHaveBeenCalledWith('a1', 'k2');
    expect(d2.updatePraatplaatTheme).not.toHaveBeenCalled();
  });

  it('een mislukte instelling blokkeert de opdracht niet maar wordt gemeld', async () => {
    const d = deps({ updateAssignmentDuration: vi.fn().mockRejectedValue(new Error('netwerk')) });
    const res = await activateFromWizard('c1', { kind: 'free', themeId: 'basis' }, { ...base, durationLabel: '1 les', peerEnabled: true }, d);
    expect(res.failedSettings).toEqual(['duration']);
    expect(d.setAssignmentPeerReview).toHaveBeenCalled();
  });

  it('een mislukte activatie is een echte fout', async () => {
    const d = deps({ activateAssignment: vi.fn().mockRejectedValue(new Error('rls')) });
    await expect(activateFromWizard('c1', { kind: 'template', templateId: 'tp1' }, base, d)).rejects.toThrow('rls');
    expect(d.fetchClassAssignment).not.toHaveBeenCalled();
  });

  describe('plekken tonen (047)', () => {
    const entry = { name: 'Robotfabriek', themeId: 'basis', locationId: 'pp-robotfabriek', imageUrl: '/x.jpg' };
    const lesson = { kind: 'lesson', lessonCardId: 'l1', type: 'praatplaat' } as const;

    it('eigen praatplaat, niets gekozen, opdracht staat al op tonen: niets zetten', async () => {
      const d = deps();
      const res = await activateFromWizard('c1', { kind: 'praatplaat', entry }, base, d);
      expect(d.updateShowSpots).not.toHaveBeenCalled();
      expect(res.failedSettings).toEqual([]);
    });

    it('eigen praatplaat met plekken uit: na het activeren op verborgen zetten', async () => {
      const d = deps();
      await activateFromWizard('c1', { kind: 'praatplaat', entry }, { ...base, showSpots: false }, d);
      expect(d.updateShowSpots).toHaveBeenCalledWith('a1', false);
    });

    it('heractiveerde opdracht stond nog op verborgen: terug naar tonen', async () => {
      const d = deps({ fetchShowSpots: vi.fn().mockResolvedValue(false) });
      await activateFromWizard('c1', { kind: 'praatplaat', entry }, base, d);
      expect(d.updateShowSpots).toHaveBeenCalledWith('a1', true);
    });

    it('kant-en-klare les: de stand van de les blijft staan tenzij de docent hem omzet', async () => {
      const d = deps({ fetchShowSpots: vi.fn().mockResolvedValue(false) });
      await activateFromWizard('c1', lesson, { ...base, praatplaatThemeId: 'basis' }, d);
      expect(d.fetchShowSpots).not.toHaveBeenCalled();
      expect(d.updateShowSpots).not.toHaveBeenCalled();

      const d2 = deps({ fetchShowSpots: vi.fn().mockResolvedValue(false) });
      await activateFromWizard('c1', lesson, { ...base, praatplaatThemeId: 'basis', showSpots: true }, d2);
      expect(d2.updateShowSpots).toHaveBeenCalledWith('a1', true);
    });

    it('kolom bestaat nog niet: tonen is stil goed, verbergen wordt gemeld', async () => {
      const d = deps({ fetchShowSpots: vi.fn().mockResolvedValue(null) });
      const shown = await activateFromWizard('c1', { kind: 'praatplaat', entry }, base, d);
      expect(shown.failedSettings).toEqual([]);
      const hiddenRes = await activateFromWizard('c1', { kind: 'praatplaat', entry }, { ...base, showSpots: false }, d);
      expect(hiddenRes.failedSettings).toEqual(['spots']);
      expect(d.updateShowSpots).not.toHaveBeenCalled();
    });

    it('andere vormen raken de instelling niet aan', async () => {
      const d = deps({ fetchClassAssignment: vi.fn().mockResolvedValue(row({ type: 'free', praatplaatId: null })) });
      await activateFromWizard('c1', { kind: 'free', themeId: 'basis' }, { ...base, showSpots: false }, d);
      expect(d.fetchShowSpots).not.toHaveBeenCalled();
    });
  });

  it('choiceType geeft de vorm van elke keuze', () => {
    expect(choiceType({ kind: 'lesson', lessonCardId: 'x', type: 'storyboard' })).toBe('storyboard');
    expect(choiceType({ kind: 'free', themeId: 'basis' })).toBe('free');
  });
});
