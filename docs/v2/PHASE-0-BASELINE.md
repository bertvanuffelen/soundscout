# V2 Phase 0 — safety net and baseline

> Status: **complete** (15-11-2026). Measured on headless Chromium 159 on the development Mac.
> These numbers are a before/after reference for the refactor. They are **not** measurements of a school iPad or Chromebook; that device run is still open (see "Not covered").

## 1. What now exists

| Suite | File | What it guards | Fails when |
|---|---|---|---|
| Layout | `e2e/layout.spec.ts` | Walks the student journey (start → choice flow → map → location → studio → podium) and the teacher page at 7 viewport sizes: 77 screens. Takes a screenshot of each and measures the layout. | A screen looks different from its baseline screenshot (more than 2 % of pixels), or a screen cannot be reached on a tablet, Chromebook, laptop or digibord size. |
| Golden audio | `e2e/audio-golden.spec.ts` | Renders 4 fixed compositions through the real export chain (`preloadBuffers` → `ensurePitchBuffers` → `renderOffline`) in a real browser and compares with stored values in `e2e/golden/audio/`. | Render length changes, the loudness envelope (RMS per 100 ms) moves by more than 0.002, the peak moves by more than 0.01, a sound fails to load, or two renders in a row differ audibly. |
| Performance | `e2e/perf-baseline.spec.ts` | Records decoded memory per theme and frame/store behaviour during playback. | Never on the numbers; it only records them. |

Commands:

```bash
npm run e2e            # run all three suites (starts its own dev server on port 5180)
npm run e2e:baseline   # re-create the screenshot baselines (do this BEFORE a refactor step)
npm run e2e:golden     # re-create the golden audio values (only when a sound change is intended)
```

Recorded results live in `docs/v2/baseline/`:
- `layout/<viewport>.json` — per screen: page overflow, off-screen controls, small targets, overlaps, small text;
- `perf-baseline.json` — memory per theme and playback numbers.

**Screenshot baselines are not in git.** They are 27 MB and depend on the machine's font rendering, so they are generated locally (`e2e/__screenshots__/`, git-ignored). The working method for Phase 1 is: `npm run e2e:baseline` on the untouched code, make the change, `npm run e2e`.

## 2. Findings

### Layout (confirms and corrects the audit in the proposal, §6.1)

| Finding | Measured | Proposal ref |
|---|---|---|
| The map does not fit the screen | Page is taller than the window by 62 px on a Chromebook, 84 px on a digibord, 41 px on a phone in landscape. No overflow on the iPad sizes. | L1 confirmed |
| Map markers are too small on a phone | Smallest target 27 px on a 390 px wide screen (7 controls under 44 px). | L2 confirmed |
| Studio controls are small | 24–33 controls have a visible size under 44 px, 9 under 24 px, smallest 15–16 px. Many of these have an enlarged invisible hit area, which this measurement does not see; Phase 1 must measure the hit area separately. | L7 |
| Studio text is small | 41–50 text elements under 12 px in the studio on every size. | type floor, rule 7 |
| Overlapping controls in the studio on a short screen | 8 overlapping pairs on a phone in landscape, 15 with a clip selected; 3 on a phone in portrait with a clip selected. | L7, L8 |
| Start page scrolls slightly | 35 px taller than the window at 768 px height (Chromebook, iPad landscape); 381 px on a phone in landscape. | new |
| Location screen | No overflow on any size. The overlay-collision risk (L5) did not show up as overlapping controls at these sizes, except one pair on a phone in portrait. | L5 partly |

**Journey length today:** 5 clicks to the first sound, 9 to the first clip on the timeline.

**Correction to the mockup:** the real podium is a step list (listen → title → save → export). The Luisterspiegel should become a step in that list, not the side card the mockup shows. Captured in `e2e/__screenshots__/*-10-podium.png`.

### Audio

- All four golden fixtures render and are stored: plain clips, effects (pitch, reverb, fades, clip volume), loop + trim + mute, and solo.
- **Renders are not always bit-identical.** Two renders in a row of the same composition differ in 2 of 4 fixtures. The largest difference is 1.8 × 10⁻⁷ (about −135 dBFS), which is float rounding and far below audibility. The two fixtures without overlapping sources were bit-identical. This matters for Phase 6: a golden test on an exact hash would give false alarms, so the suite compares the loudness envelope and treats the hash as information.
- Peak level of the plain renders is 0.891 (−1.0 dBFS), which matches the master limiter ceiling.

### Memory

| Theme | Sounds | Audio | MP3 | Decoded in memory | Ratio |
|---|---|---|---|---|---|
| basis | 31 | 171 s | 4.0 MB | 57.5 MB | 14× |
| winterspelen | 27 | 131 s | 3.1 MB | 44.1 MB | 14× |
| piraten | 36 | 169 s | 2.6 MB | 43.4 MB | 17× |

Decoded audio is about 15 times the download size (the proposal guessed 20). A full theme is 43–58 MB if every sound is loaded. Three themes fully loaded is about 145 MB; seven would be roughly 350 MB, which is too much for an older iPad. The app does not load everything today (it loads what a location and the library need), but V2 must keep it that way with an explicit budget (`SampleStore`, proposal §2.6).

### Playback

| Measure | Value | Phase 1 target |
|---|---|---|
| `audioStore.currentBeat` updates during playback | 20 per second, each one a React render of the timeline | 0 |
| Frame rate (10 clips, 6 s) | 60.3 fps, 95th percentile 16.7 ms, no frames over 33 ms, no long tasks | unchanged or better |
| JS heap in the studio | 25.6 MB idle, 43.2 MB after playback | watch for growth |
| DOM nodes in the studio | 574 | — |

On this machine the 20 renders per second cost no frames. The risk is on slow school devices, which is exactly what this baseline cannot show.

### Code health

- `npx tsc -b`: clean. `npm run test:run`: 489 tests in 44 files pass.
- `npm run lint`: **24 errors and 5 warnings, all in existing production files** (`Timeline.tsx`, `Track.tsx`, `EffectsModal.tsx`, `TrimModal.tsx`, `LocationEditor.tsx` and nine others). None are in the new Phase 0 or mockup files. Most are the newer React-hooks rules (refs written during render). Phase 1 touches several of these files and should clear them there.

## 3. Not covered

| Gap | Why | What is needed |
|---|---|---|
| Real school devices | Headless desktop Chromium only | Run the performance suite by hand on one school iPad and one Chromebook, and note the numbers here |
| iPad Safari rendering | The suite uses Chromium at iPad sizes, not WebKit | Add a WebKit project once Phase 1 starts on `dvh` and safe-area work |
| Praatplaat picker (L3, L4) | Needs a class code, so a Supabase connection | A test Supabase project or a mocked RPC layer |
| Teacher dashboard and presentation screen | Needs a teacher login | Same |
| Sequencer in the golden audio set | Fixture not written yet | Add a fifth fixture with a sequence |
| Video export | Not rendered in the suite | Later, with the export work |
| Automated deploy | Listed under Phase 0 in the proposal, not part of this step | Separate decision (Strato upload is manual today) |

## 4. Ready for Phase 1

Phase 1 (clock and visuals) can start. Its gates, from the proposal, are now measurable:
- `currentBeatUpdatesPerSecond` goes from 20 to 0;
- the golden audio suite stays green;
- the layout suite is re-baselined once per intended visual change, and green otherwise;
- map overflow goes to 0 on all seven sizes, and no control is smaller than 44 px on the map.
