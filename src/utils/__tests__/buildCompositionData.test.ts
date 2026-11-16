/**
 * B26: alle deel- en bewaarroutes gebruiken één builder, inclusief
 * sequencer-patronen en (behalve bij templates) de praatplaat-snapshot.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildCompositionData } from '../buildCompositionData';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAppStore } from '../../stores/appStore';
import type { ActivePraatplaat, Storyboard } from '../../types';

const PRAATPLAAT: ActivePraatplaat = {
  id: 'pp1', name: 'Koningsdag', imageUrl: '/img.jpg', classId: 'c1', classCode: '4821', themeId: 'basis', locationId: 'plein',
};

describe('buildCompositionData (B26)', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetTimeline();
    useTimelineStore.getState().setSequences([{ id: 'seq-1' } as never]);
    useAppStore.setState({
      activeStoryboard: { id: 'praatplaat-pp1', images: [] } as unknown as Storyboard,
      activePraatplaat: PRAATPLAAT,
      praatplaatPosition: { x: 0.4, y: 0.6 },
    });
  });

  it('neemt sequences en de praatplaat-snapshot mee', () => {
    const data = buildCompositionData();
    expect(data.sequences).toHaveLength(1);
    expect(data.praatplaat?.id).toBe('pp1');
    expect(data.praatplaatPosition).toEqual({ x: 0.4, y: 0.6 });
    expect(data.storyboardId).toBe('praatplaat-pp1');
  });

  it('neemt het tempo mee, en het tempo overleeft de schema-controle (V2 Fase 4)', async () => {
    useTimelineStore.getState().setBpm(105);
    const data = buildCompositionData();
    expect(data.bpm).toBe(105);
    const { CompositionDataSchema } = await import('../schemas');
    const parsed = CompositionDataSchema.safeParse({ ...data, sequences: undefined });
    expect(parsed.success && parsed.data.bpm).toBe(105);
    // Laden zet het tempo terug in de tijdlijn
    useTimelineStore.getState().resetTimeline();
    useTimelineStore.getState().loadTimeline({ ...data, sequences: undefined });
    expect(useTimelineStore.getState().bpm).toBe(105);
  });

  it('laat de praatplaat (en het onherleidbare storyboard-id) weg voor templates', () => {
    const data = buildCompositionData({ includePraatplaat: false });
    expect(data.sequences).toHaveLength(1);
    expect(data.praatplaat).toBeUndefined();
    expect(data.praatplaatPosition).toBeUndefined();
    expect(data.storyboardId).toBeUndefined();
  });
});
