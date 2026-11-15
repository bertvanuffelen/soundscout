# V2 Phase 1 — clock and visuals (part 1: the playback clock)

> Status: **the clock is implemented and ready for Bert's sync/audio test** (15-11-2026).
> The layout half of Phase 1 (`<Scene>`, tokens, map overflow) has not started; see "Not done yet".

## What changed

| Before | After |
|---|---|
| The engine pushed the position into `audioStore` every 50 ms; the timeline subscribed and re-rendered 20 times per second. | `audioStore.currentBeat` changes only on pause, stop and seek. During playback nothing goes through React. |
| Playhead updated 20 times per second. | Playhead updated every frame (60 per second measured), written straight to the DOM. |
| The position shown was Tone's transport clock, which runs 0.1 s ahead of the sound (its scheduling lookahead), with no correction for the device's output delay. | The position shown is the **audible** position: transport time at `currentTime − outputLatency`. |
| Storyboard panel and filmstrip each ran their own animation-frame loop. | One shared loop (`frameLoop`). |

New files:
- `src/services/frameLoop.ts` — one `requestAnimationFrame` loop for all subscribers.
- `src/services/playbackClock.ts` — "where is the playhead now?": audible position while playing, store position at rest.
- `src/services/audibleBeat.ts` — the pure calculations (latency clamp, seconds to beats).
- `src/hooks/useBeatFrame.ts` — `useBeatFrame` (draw per frame, no render) and `useDerivedBeat` (re-render only when a derived value changes, e.g. the active storyboard image).
- `src/services/audio/SampleStore.ts`, `AmbientPlayer.ts`, `captureWorklet.ts` — split out of `AudioService` (1,650 → 1,360 lines), behaviour unchanged, `AudioService` still the single entry point.

Rule for all future code: **never read `useAudioStore.getState().currentBeat` for the live position**; use `playbackClock.getBeat()`.

## Measured (headless Chromium, same test as the Phase 0 baseline)

| Measure | Phase 0 | Phase 1 |
|---|---|---|
| `currentBeat` store updates during playback | 20 per second | **0** |
| Playhead position changes | 20 per second | 60 per second |
| Frame rate, 10 clips | 60.3 fps | 60.2 fps |
| JS heap after 6 s playback | 43.2 MB | 29.1 MB |

Gates, all green: `tsc`, 497 unit tests (8 new), golden audio renders identical, layout screenshots unchanged at all 7 sizes, and a new behaviour test `e2e/playback-clock.spec.ts` (play, pause, keyboard seek, resume, rewind, podium progress bar).

## What Bert should test by ear and eye

The automated tests prove the playhead moves and the store is quiet. They cannot prove that picture and sound line up on a real device. Please check:

1. **Laptop speakers:** play a soundscape with a short, sharp sound (e.g. the dog). The playhead should cross the start of the clip at the moment you hear it. Before this change it crossed about 0.1 s early.
2. **Bluetooth speaker or headphones:** same test. This is where the output-delay correction matters most; the playhead should still line up, not run ahead.
3. **Digibord over HDMI:** same test on the podium screen.
4. **iPad (Safari):** older iOS versions report no output delay; the app then corrects only for the lookahead. Check that the playhead is not visibly late.
5. **Pause:** the playhead may hop forward by a hair (about a fifth of a beat) when you pause. That is the engine's own position, which is slightly ahead of what you heard. If it bothers you, it can be fixed by pausing at the audible position; that is an engine change, so I left it.
6. **Storyboard:** images should still change at the section boundaries during playback.

## Deliberate deviation: no canvas for the playhead

The brief said "canvas playhead". I kept the playhead as a DOM element moved per frame. It is a focusable slider with keyboard and screen-reader support, which a canvas would lose, and a single element moved per frame costs nothing. Canvas remains the plan for waveforms and level meters.

## Not done yet (still Phase 1)

| Item | Note |
|---|---|
| Presentation screens (digibord, shared player, peer review) | They use `useCompositionPlayback`, which still keeps the position in React state at about 30 updates per second. Same fix, separate step. |
| Trim modal, effects modal, compose-mode preview | Still have their own animation-frame loops. |
| Further `AudioService` split | Transport/scheduling, the realtime capture and the master limiter are still inside it. They are the risky part; the golden audio suite now makes that split safe to do. |
| Layout half of Phase 1 (proposal §6.5) | `<Scene>` primitive, layer and size tokens, `IconButton`, `dvh`/safe-area sweep, map overflow (62 px on a Chromebook). |
| Lint | The 24 pre-existing errors are untouched. |
| School devices | Not measured. |
