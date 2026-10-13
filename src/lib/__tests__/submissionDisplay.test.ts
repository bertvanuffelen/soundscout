import { describe, it, expect } from 'vitest';
import { submissionSortTime, sortSubmissionsNewestFirst, getSubmissionShape } from '../submissionDisplay';

describe('submissionDisplay — volgorde', () => {
  it('gebruikt inleveren > laatst bewerkt > eerste keer opslaan', () => {
    expect(submissionSortTime({ created_at: '2026-10-01T10:00:00Z', submitted_at: '2026-10-01T12:00:00Z', last_updated_at: '2026-10-01T11:00:00Z' }))
      .toBe(Date.parse('2026-10-01T12:00:00Z'));
    expect(submissionSortTime({ created_at: '2026-10-01T10:00:00Z', last_updated_at: '2026-10-01T11:00:00Z' }))
      .toBe(Date.parse('2026-10-01T11:00:00Z'));
    expect(submissionSortTime({ created_at: '2026-10-01T10:00:00Z' })).toBe(Date.parse('2026-10-01T10:00:00Z'));
  });

  it('zet een laat ingeleverde inzending bovenaan, ook als die vroeg begon', () => {
    const vroegBegonnenLaatIngeleverd = { id: 'a', created_at: '2026-10-13T13:20:00Z', submitted_at: '2026-10-13T14:05:00Z' };
    const laatBegonnenVroegIngeleverd = { id: 'b', created_at: '2026-10-13T13:40:00Z', submitted_at: '2026-10-13T13:50:00Z' };
    const sorted = sortSubmissionsNewestFirst([laatBegonnenVroegIngeleverd, vroegBegonnenLaatIngeleverd]);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('laat het origineel ongemoeid', () => {
    const list = [{ id: 'x', created_at: '2026-01-01T00:00:00Z' }, { id: 'y', created_at: '2026-02-01T00:00:00Z' }];
    sortSubmissionsNewestFirst(list);
    expect(list[0].id).toBe('x');
  });
});

describe('submissionDisplay — vorm', () => {
  it('praatplaat wint van het virtuele pp-storyboard-id', () => {
    expect(getSubmissionShape({ assignment_type: 'praatplaat', composition_data: { storyboardId: 'pp-robotfabriek' } })).toBe('praatplaat');
    expect(getSubmissionShape({ composition_data: { storyboardId: 'pp-robotfabriek', praatplaatPosition: { x: 0.2, y: 0.4 } } })).toBe('praatplaat');
  });

  it('pp- of location- zonder praatplaat = losse afbeelding', () => {
    expect(getSubmissionShape({ composition_data: { storyboardId: 'pp-sportveld' } })).toBe('image');
    expect(getSubmissionShape({ composition_data: { storyboardId: 'location-boerderij' } })).toBe('image');
  });

  it('echt storyboard, template en vrij', () => {
    expect(getSubmissionShape({ composition_data: { storyboardId: 'verspringen' } })).toBe('storyboard');
    expect(getSubmissionShape({ assignment_type: 'template', composition_data: {} })).toBe('template');
    expect(getSubmissionShape({ assignment_type: 'free', composition_data: null })).toBe('free');
    expect(getSubmissionShape({})).toBe('free');
  });
});
