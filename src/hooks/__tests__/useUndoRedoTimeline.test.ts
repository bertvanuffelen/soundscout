/**
 * E3 (eindtest): ongedaan maken en opnieuw verliezen geen loop, effecten,
 * label of spoorvolume meer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedoTimeline } from '../useUndoRedoTimeline';
import { useTimelineStore } from '../../stores/timelineStore';
import type { Clip } from '../../types';

const clip = (extra: Partial<Clip> = {}): Clip => ({ id: 'k1', sampleId: 's1', startBeat: 0, ...extra });
const setClip = (c: Clip) => useTimelineStore.setState((s) => ({
  tracks: s.tracks.map((tr, i) => (i === 0 ? { ...tr, clips: [c] } : tr)),
}));
const firstClip = () => useTimelineStore.getState().tracks[0].clips[0];

describe('useUndoRedoTimeline (E3)', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetTimeline();
    setClip(clip());
  });

  it('effecten en loop zijn eigen stappen en komen terug met opnieuw', () => {
    const { result } = renderHook(() => useUndoRedoTimeline());
    const effects = { volume: 0, pitch: 3, reverb: 20, fadeIn: 0, fadeOut: 0 };
    act(() => setClip(clip({ startBeat: 4 })));
    act(() => setClip(clip({ startBeat: 4, effects })));
    act(() => setClip(clip({ startBeat: 4, effects, loop: true, loopDurationBeats: 16 })));

    act(() => result.current.undo());
    expect(firstClip().loop).toBeFalsy();
    expect(firstClip().effects?.pitch).toBe(3);

    act(() => result.current.undo());
    expect(firstClip().effects).toBeUndefined();
    expect(firstClip().startBeat).toBe(4);

    act(() => result.current.redo());
    act(() => result.current.redo());
    expect(firstClip()).toMatchObject({ startBeat: 4, loop: true, loopDurationBeats: 16, effects: { pitch: 3, reverb: 20 } });
    expect(result.current.canRedo).toBe(false);
  });

  it('spoorvolume telt als stap', () => {
    const { result } = renderHook(() => useUndoRedoTimeline());
    act(() => useTimelineStore.setState((s) => ({ tracks: s.tracks.map((tr, i) => (i === 0 ? { ...tr, volume: -6 } : tr)) })));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(useTimelineStore.getState().tracks[0].volume).toBeUndefined();
  });
});

describe('useUndoRedoTimeline — tempo en Vervormen (V2 Fase 4)', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetTimeline();
    setClip(clip());
  });

  it('een tempowissel is één stap: terugzetten herstelt tempo én posities', () => {
    // Twee losse geluiden die na de tempowissel overlappen — posities blijven staan
    useTimelineStore.setState((s) => ({
      tracks: s.tracks.map((tr, i) => (i === 0 ? { ...tr, clips: [clip({ id: 'a' }), clip({ id: 'b', startBeat: 4 })] } : tr)),
    }));
    const { result } = renderHook(() => useUndoRedoTimeline());
    act(() => useTimelineStore.getState().setBpm(135));
    expect(useTimelineStore.getState().bpm).toBe(135);
    expect(useTimelineStore.getState().tracks[0].clips.map((c) => c.startBeat)).toEqual([0, 4]);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(useTimelineStore.getState().bpm).toBe(120);
    expect(useTimelineStore.getState().tracks[0].clips.map((c) => c.startBeat)).toEqual([0, 4]);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(useTimelineStore.getState().bpm).toBe(135);
  });

  it('alleen een nieuw Vervormen-effect (snelheid) is ook een stap', () => {
    const base = { volume: 0, pitch: 0, reverb: 0, fadeIn: 0, fadeOut: 0 };
    setClip(clip({ effects: base }));
    const { result } = renderHook(() => useUndoRedoTimeline());
    act(() => useTimelineStore.getState().updateClipEffects(0, 'k1', { speed: 2 }));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(firstClip().effects?.speed).toBeUndefined();
  });
});
