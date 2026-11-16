import { describe, it, expect } from 'vitest';
import { summarizePeerFeedback, type PeerFeedbackRow } from '../peerSummary';

const row = (id: string, over: Partial<PeerFeedbackRow> = {}): PeerFeedbackRow => ({
  id, submission_id: 's1', from_submission_id: 'f' + id, chips: null, ratings: null, created_at: '2026-10-14T10:00:00Z', ...over,
});

describe('summarizePeerFeedback', () => {
  it('middelt de sterren per criterium en telt de klasgenoten', () => {
    const s = summarizePeerFeedback([
      row('1', { ratings: { Ritme: 3, Opbouw: 2 } }),
      row('2', { ratings: { Ritme: 2, Opbouw: 2 } }),
    ]);
    expect(s.raters).toBe(2);
    expect(s.criteria).toEqual([
      { name: 'Ritme', avg: 2.5, count: 2 },
      { name: 'Opbouw', avg: 2, count: 2 },
    ]);
    expect(s.fromIds).toEqual(['f1', 'f2']);
  });

  it('oude chips-rijen tellen mee zonder sterren', () => {
    const s = summarizePeerFeedback([row('1', { chips: ['Ritme'] }), row('2', { ratings: { Ritme: 3 } })]);
    expect(s.criteria).toEqual([{ name: 'Ritme', avg: 3, count: 2 }]);
    expect(summarizePeerFeedback([row('1', { chips: ['Sfeer'] })]).criteria).toEqual([{ name: 'Sfeer', avg: null, count: 1 }]);
  });

  it('leeg = geen klasgenoten', () => {
    expect(summarizePeerFeedback([])).toEqual({ raters: 0, criteria: [], fromIds: [] });
  });
});
