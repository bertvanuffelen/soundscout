# V2 Phase 1 — clock and visuals (part 1: the playback clock)

> Status: **Phase 1 implemented** (15-11-2026); sync on real devices still to be tested by Bert.
> Part 1 below is the playback clock; part 2 covers presentation screens, layout and the Luisterspiegel step.

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

## Part 2 — the rest of Phase 1 (15-11-2026)

### Presentation screens and modals
- `useCompositionPlayback` no longer keeps the position in React state; it returns a stable `getBeat()`. Measured in the browser: 0 React commits during one second of playback on the presentation surface (was about 30 per second).
- Trim modal and effects modal: the preview playhead is a line moved per frame; the waveform is no longer redrawn every frame.
- Compose-mode preview: its four animation loops run in the shared frame loop.
- New tests: 9 unit tests for the hook, and `e2e/presentation-clock.spec.ts` (3 browser tests) that mounts the real presentation surface through a test harness.

### Layout
| Item | Result |
|---|---|
| `<Scene>` (`src/components/ui/Scene.tsx`) | One component for "an image with things on it". Used by the map, the location screen and the praatplaat picker. |
| Map overflow | 62 px (Chromebook), 84 px (digibord), 41 px (phone landscape) → **0 on all seven sizes**. |
| Map markers on a phone | 20 px → 44 px. |
| Location header | Back, title and Naar Studio share one row and cannot overlap. |
| Praatplaat picker | Always fits the screen; the frame takes the image's own shape, so a chosen spot means the same in the picker and in the presentation (finding L4). |
| Layer tokens | One z-index scale in `index.css` (`z-sticky` … `z-toast`); the loose `z-[60]` / `z-[100]` values are replaced. |
| Icon buttons | One `icon-btn` definition (and an `IconButton` component) instead of the class string copied 16 times in the timeline. Pixel-identical. |
| Viewport height | `min-h-screen` / `vh` → dynamic units in 29 files. |
| Safe areas | Bottom bars (recorder, transport, praatplaat confirm) respect the home bar. Has no visible effect until the app runs full-screen as an installed app (Phase 2). |

Only the map screenshots changed in the layout suite; every other screen is pixel-identical to the Phase 0 baseline. The screenshot baseline has been re-created.

### Luisterspiegel as a podium step
Step order is now listen → title → **Luisterspiegel** → save → export. The step shows a small form map and one or two questions picked by local rules; it is optional and never blocks saving, handing in or exporting. Nothing is stored or sent.
- Logic: `src/utils/luisterspiegel.ts` (27 unit tests). UI: `src/components/stage/LuisterspiegelStep.tsx`.
- **Switch:** behind the dev flag `luisterspiegel` — on in development, **off in production builds** — because the per-assignment teacher switch needs database work that is not part of Phase 1. The single plug-in point is `src/hooks/useLuisterspiegelEnabled.ts`.
- **Needs Bert's eye:** several questions from the mockup were open questions and did not fit the two answer buttons ("Ja, zo wil ik het" / "Ik pas het aan"). They were rewritten as yes/no questions (see `luisterspiegel.questions.*` in `nl.json` / `en.json`, also in `docs/TEKSTEN.md`).

### Gates
`tsc` clean · 536 unit tests · 16 end-to-end tests (layout at 7 sizes, 4 golden audio renders, perf, studio clock, presentation clock ×3) · lint: 23 errors, all pre-existing (was 24), none in new code.

## Still open after Phase 1

| Item | Note |
|---|---|
| Sync by ear on real devices | Bert's classroom test (laptop, Bluetooth, digibord, iPad). |
| Screens behind a login | Digibord presentation, teacher review, shared player, album and praatplaat viewers were tested through a harness with local data, not with real Supabase data. |
| `<Scene>` in the remaining image views | The studio's storytelling panel and the presentation surface still use their own sizing (`FittedImage`). They fit today; converting them is consistency work. |
| Timeline toolbar on short or narrow screens | The 8–15 overlapping pairs on a phone in landscape are unchanged; the decision was that the studio targets tablets and larger. |
| Small text in the studio | 41–50 text elements under 12 px are unchanged; raising them changes the look of the timeline and was not part of this step. |
| Further `AudioService` split | Transport/scheduling, realtime capture and the limiter are still inside it (1,360 lines). |
| Luisterspiegel switch and question management | Per-assignment teacher switch and admin-managed questions need a migration and the Administrator Dashboard (Phases 3 and 5). |
| Lint | 23 pre-existing errors. |
| School devices | Not measured. |
