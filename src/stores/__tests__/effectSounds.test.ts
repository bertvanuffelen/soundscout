/**
 * Geluidseffecten (designronde nov 2026): een chip "brongeluid + Vervormen".
 * Plaatsen = een gewone clip met die effecten en een koppeling; het effect
 * aanpassen werkt ook alle gekoppelde clips bij, zoals bij een sequence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore, NEUTRAL_CLIP_EFFECTS } from '../timelineStore';
import { CompositionDataSchema } from '../../utils/schemas';
import type { Sample } from '../../types';

const dog: Sample = {
  id: 'dog', name: 'Hond', locationId: 'boerderij', audioUrl: '/audio/dog.mp3',
  duration: 2, icon: 'Dog', color: '#F59E0B',
};

function placeFromEffect(effectSoundId: string, startBeat: number) {
  const es = useTimelineStore.getState().effectSounds.find((e) => e.id === effectSoundId)!;
  useTimelineStore.getState().addClip(0, {
    id: `c-${startBeat}`, sampleId: dog.id, startBeat,
    effects: { ...NEUTRAL_CLIP_EFFECTS, ...es.effects }, effectSoundId,
  }, [dog]);
}

const clips = () => useTimelineStore.getState().tracks.flatMap((t) => t.clips);

describe('geluidseffecten', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetTimeline();
    useTimelineStore.getState().addEffectSound({ id: 'fx1', name: 'Hond effect', sourceSampleId: 'dog', effects: { speed: 2, reverse: true } });
  });

  it('plaatsen geeft een gewone clip van het brongeluid met de effecten', () => {
    placeFromEffect('fx1', 0);
    expect(clips()).toHaveLength(1);
    expect(clips()[0]).toMatchObject({ sampleId: 'dog', effectSoundId: 'fx1', effects: { speed: 2, reverse: true } });
  });

  it('aanpassen werkt alle gekoppelde clips bij, maar laat hun volume staan', () => {
    placeFromEffect('fx1', 0);
    placeFromEffect('fx1', 16);
    const first = clips()[0];
    useTimelineStore.getState().updateClipEffects(0, first.id, { volume: -6 }, dog); // volume houdt de koppeling
    const before = useTimelineStore.getState().audioVersion;

    useTimelineStore.getState().updateEffectSound('fx1', { effects: { echo: 50, reverse: false } });

    const all = clips();
    expect(all.every((c) => c.effectSoundId === 'fx1')).toBe(true);
    expect(all.every((c) => c.effects?.echo === 50 && c.effects?.reverse === false && c.effects?.speed === 2)).toBe(true);
    expect(all.find((c) => c.id === first.id)?.effects?.volume).toBe(-6);
    expect(useTimelineStore.getState().audioVersion).toBeGreaterThan(before);
    expect(useTimelineStore.getState().effectSounds[0].effects).toMatchObject({ speed: 2, reverse: false, echo: 50 });
  });

  it('Vervormen op de clip zelf maakt hem los van het geluidseffect', () => {
    placeFromEffect('fx1', 0);
    const clip = clips()[0];
    useTimelineStore.getState().updateClipEffects(0, clip.id, { filter: 40 }, dog);
    expect(clips()[0].effectSoundId).toBeUndefined();

    useTimelineStore.getState().updateEffectSound('fx1', { effects: { echo: 80 } });
    expect(clips()[0].effects?.echo ?? 0).toBe(0);
  });

  it('verwijderen haalt de chip weg; geplaatste clips blijven staan, ontkoppeld', () => {
    placeFromEffect('fx1', 0);
    useTimelineStore.getState().removeEffectSound('fx1');
    expect(useTimelineStore.getState().effectSounds).toEqual([]);
    expect(clips()).toHaveLength(1);
    expect(clips()[0].effectSoundId).toBeUndefined();
    expect(clips()[0].effects).toMatchObject({ speed: 2, reverse: true });
  });

  it('gaat mee in de opgeslagen tijdlijn en blijft geldig voor het schema', () => {
    placeFromEffect('fx1', 0);
    const state = useTimelineStore.getState().getTimelineState();
    expect(state.effectSounds).toHaveLength(1);
    const parsed = CompositionDataSchema.safeParse({ ...state, samples: [dog] });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.tracks[0].clips[0].effectSoundId).toBe('fx1');

    useTimelineStore.getState().resetTimeline();
    useTimelineStore.getState().loadTimeline(state);
    expect(useTimelineStore.getState().effectSounds[0].name).toBe('Hond effect');
  });
});
