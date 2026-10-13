import { describe, it, expect } from 'vitest';
import { summarizeClasses, pickCurrentClassId, type OverviewSubmission } from '../classOverview';
import type { ClassAssignmentRow } from '../assignments';

const active = (classId: string, over: Partial<ClassAssignmentRow> = {}): ClassAssignmentRow => ({
  id: 'a-' + classId, classId, teacherId: 't', type: 'praatplaat', templateId: null, praatplaatId: 'pp1',
  storyboardRef: null, freeThemeId: null, isActive: true, activatedAt: '2026-10-06T08:00:00Z',
  durationLabel: null, cardId: null, praatplaatThemeId: 'basis', assignmentName: 'Robotfabriek', imageUrl: null,
  ...over,
} as ClassAssignmentRow);

const sub = (id: string, class_id: string, over: Partial<OverviewSubmission> = {}): OverviewSubmission => ({
  id, class_id, created_at: '2026-10-13T10:00:00Z', save_code: 'X', submitted_at: '2026-10-13T11:00:00Z', ...over,
});

describe('summarizeClasses', () => {
  const classes = [
    { id: 'c1', created_at: '2026-09-01T00:00:00Z' },
    { id: 'c2', created_at: '2026-09-02T00:00:00Z' },
  ];

  it('telt alleen ingeleverd werk bij de actieve opdracht, en nieuw = nog niet beluisterd', () => {
    const subs = [
      sub('s1', 'c1', { praatplaat_id: 'pp1' }),
      sub('s2', 'c1', { praatplaat_id: 'pp1', teacher_seen_at: '2026-10-13T12:00:00Z' }),
      sub('s3', 'c1', { praatplaat_id: 'pp1', submitted_at: null }), // nog bezig
      sub('s4', 'c1', { assignment_ref: 'verspringen' }), // andere opdracht
    ];
    const m = summarizeClasses(classes, new Map([['c1', active('c1')]]), subs);
    expect(m.get('c1')).toMatchObject({ submittedCount: 2, newCount: 1 });
    expect(m.get('c2')).toMatchObject({ active: null, submittedCount: 0, newCount: 0 });
  });

  it('zonder actieve opdracht telt al het ingeleverde werk', () => {
    const m = summarizeClasses(classes, new Map(), [sub('s1', 'c2'), sub('s2', 'c2', { feedback_at: '2026-10-13T12:00:00Z' })]);
    expect(m.get('c2')).toMatchObject({ submittedCount: 2, newCount: 1 });
  });

  it('laatste activiteit = recentste van aanmaken, klaarzetten en werk', () => {
    const m = summarizeClasses(classes, new Map([['c1', active('c1')]]), [sub('s1', 'c2', { submitted_at: '2026-10-14T09:00:00Z' })]);
    expect(m.get('c1')!.lastActivity).toBe(Date.parse('2026-10-06T08:00:00Z'));
    expect(m.get('c2')!.lastActivity).toBe(Date.parse('2026-10-14T09:00:00Z'));
  });
});

describe('pickCurrentClassId', () => {
  const classes = [{ id: 'c1', created_at: '2026-09-01T00:00:00Z' }, { id: 'c2', created_at: '2026-09-02T00:00:00Z' }];
  const m = summarizeClasses(classes, new Map(), [sub('s1', 'c1', { submitted_at: '2026-10-14T09:00:00Z' })]);

  it('laatst geopende klas wint', () => {
    expect(pickCurrentClassId(m, 'c2')).toBe('c2');
  });
  it('anders de meeste recente activiteit; onbekende laatst-geopend telt niet', () => {
    expect(pickCurrentClassId(m, null)).toBe('c1');
    expect(pickCurrentClassId(m, 'weg')).toBe('c1');
  });
  it('lege lijst = null', () => {
    expect(pickCurrentClassId(new Map(), null)).toBeNull();
  });
});
