/**
 * A2: "Nog één voor deze opdracht" houdt de klas vast. Bij een praatplaat
 * gaat de leerling naar de plekkiezer met een lege tijdlijn, terwijl
 * klas-sessie en praatplaat blijven staan.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { startAnotherForCurrentAssignment } from '../compositionInit';
import { useAppStore } from '../../stores/appStore';
import { useTimelineStore } from '../../stores/timelineStore';
import type { ClassSession, ActivePraatplaat } from '../../types';

const SESSION: ClassSession = {
  classCode: '4821', classId: 'c1', className: 'Groep 6b',
  assignmentType: 'praatplaat', assignmentId: 'pp1', assignmentName: 'Haven',
};

const PRAATPLAAT = {
  id: 'pp1', title: 'Haven', imageUrl: '/x.jpg', themeId: 'basis', locationId: null,
} as unknown as ActivePraatplaat;

describe('startAnotherForCurrentAssignment (A2)', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentScreen: 'stage',
      classSession: SESSION,
      activePraatplaat: PRAATPLAAT,
      praatplaatPosition: { x: 0.4, y: 0.6 },
      submissionId: 'sub-1',
      submissionSynced: true,
      currentCompositionId: 'comp-1',
    });
    useTimelineStore.setState({ totalBeats: 192 });
  });

  it('praatplaat: naar de plekkiezer, klas blijft, nieuw werk', async () => {
    const result = await startAnotherForCurrentAssignment();
    const s = useAppStore.getState();
    expect(result).toBe('ok');
    expect(s.currentScreen).toBe('praatplaat-select');
    expect(s.classSession?.className).toBe('Groep 6b');
    expect(s.activePraatplaat?.id).toBe('pp1');
    expect(s.praatplaatPosition).toBeNull();
    expect(s.submissionId).toBeNull();
    expect(s.currentCompositionId).toBeNull();
    expect(useTimelineStore.getState().totalBeats).toBe(128);
  });

  it('zonder klas: geeft een fout terug en doet niets', async () => {
    useAppStore.setState({ classSession: null });
    const result = await startAnotherForCurrentAssignment();
    expect(result).toBe('error');
    expect(useAppStore.getState().currentScreen).toBe('stage');
  });
});
