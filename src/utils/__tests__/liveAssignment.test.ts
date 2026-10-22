/**
 * Fase 4.1: docentwijzigingen live meenemen.
 */

import { describe, it, expect } from 'vitest';
import { mergeLiveAssignment } from '../liveAssignment';
import type { ActiveAssignment } from '../../lib/assignments';
import type { ClassSession } from '../../types';

const SESSION: ClassSession = {
  classCode: '4821', classId: 'c1', className: 'Groep 6b',
  assignmentType: 'free', assignmentId: 'basis', assignmentName: 'Basis',
  card: null, durationLabel: null, peerReview: null, studentsTypeTitle: true,
};

const fresh = (extra: Partial<ActiveAssignment> = {}): ActiveAssignment => ({
  type: 'free', classId: 'c1', className: 'Groep 6b', card: null, peerReview: null,
  durationLabel: null, studentsTypeTitle: true, free: { themeId: 'basis', themeName: 'Basis' }, ...extra,
});

describe('mergeLiveAssignment', () => {
  it('neemt nieuwe instellingen over bij dezelfde opdracht', () => {
    const r = mergeLiveAssignment(SESSION, fresh({
      peerReview: { cardTitle: 'K', chips: ['Ritme'], closesAt: null },
      durationLabel: '2 lessen',
      studentsTypeTitle: false,
    }), 'basis');
    expect(r.updated).toBe(true);
    expect(r.assignmentChanged).toBe(false);
    expect(r.session.peerReview?.chips).toEqual(['Ritme']);
    expect(r.session.durationLabel).toBe('2 lessen');
    expect(r.session.studentsTypeTitle).toBe(false);
    expect(r.session.assignmentId).toBe('basis');
  });

  it('niets veranderd = zelfde sessie-object', () => {
    const r = mergeLiveAssignment(SESSION, fresh(), 'basis');
    expect(r.updated).toBe(false);
    expect(r.session).toBe(SESSION);
  });

  it('andere of geen opdracht: sessie blijft, melding aan', () => {
    expect(mergeLiveAssignment(SESSION, fresh(), 'winter').assignmentChanged).toBe(true);
    expect(mergeLiveAssignment(SESSION, null, null).assignmentChanged).toBe(true);
    expect(mergeLiveAssignment(SESSION, null, null).session).toBe(SESSION);
  });
});
