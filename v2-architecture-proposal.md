# SoundScout V2 — Architecture Proposal

> Status: **APPROVED - IN EXECUTION** (approved by Bert, 15-11-2026). This document is the single source of truth for V2.
> **V2 design phase: APPROVED** (Bert, 15-11-2026) on the basis of the `/v2-mockup` journey with the final corrections below.
> **Phase 0 — safety net and baseline: complete** (15-11-2026). Results and commands: `docs/v2/PHASE-0-BASELINE.md`.
> **Phase 2 — shell: implemented** (16-11-2026): router, IndexedDB, TanStack Query, service worker. Report and manual checklist: `docs/v2/PHASE-2-REPORT.md`.
> **Phase 1 — clock and visuals: implemented** (15-11-2026). Report, including what is still open: `docs/v2/PHASE-1-REPORT.md`. Waiting for Bert's sync test on real devices.
> Companion documents: `v2-launch-strategy.md` (go-to-market) and `v2-theme-sinterklaas-pipeline.md` (first new theme).
> Date: 15-11-2026 · Based on a scan of this repository (≈60k lines TS/TSX, 42 migrations) and a check of the current web platform.

## Locked decisions (15-11-2026)

These eleven decisions are final. Where older text in this document differed, it has been changed to match.

| # | Topic | Decision |
|---|---|---|
| 1 | Architecture direction | **Approved.** Keep React 19, Vite 7, TypeScript 5.9, Tailwind 4, Tone 15 and Supabase; replace the five bottlenecks from §0. |
| 2 | Asset storage | **Approved.** Theme assets move to Supabase Storage, versioned and managed in the Administrator Dashboard. The `basis` theme stays bundled as offline fallback, next to a Workbox service worker. |
| 3 | Tempo | **Approved.** Per composition a choice of four fixed tempi: 90, 105, 120, 135 BPM. Loops are stretched with the Signalsmith pre-bake pipeline; sound effects are not stretched. |
| 4 | AI for teachers | **Rejected for V2.** The Listening Mirror is 100 % local and rule-based. No external AI APIs and no Edge Function for teacher feedback. |
| 5 | App languages | **Approved.** V2 launches in Dutch and English. The theme manifest schema carries texts per language, so a language can be added per theme later without code changes. |
| 6 | X-factor features | **Adjusted.** First the **Listening Mirror**: on/off per assignment by the teacher; questions varied by local rules, managed by Bert in the Administrator Dashboard; students can skip. Second the **Collaborative Class Storyboard**: storyboard scenes are assigned automatically to student groups and stitched in order on the teacher's presentation view into one class story. **Parked, not in V2:** Graphic Score and the live Digiboard Orchestra. |
| 7 | Hosting and share previews | The app stays on Strato for now (a move to Vercel may be evaluated just before the global launch). Rich link previews use option 1: share links on a subdomain (e.g. `deel.soundscout.nl`) served by a Supabase Edge Function. |
| 8 | Sound Bag | **Limit stays at 6 sounds**, as a deliberate pedagogical constraint. Students can always go back from the studio to the map and locations to swap or collect sounds. |
| 9 | Devices | Tablets, Chromebooks, laptops and digiboards are the primary student devices for studio and timeline. Portrait phones stay functional with a clean rotate-device prompt in the studio. Landing page, teacher dashboard and shared playback views must work fully on portrait phones. |
| 10 | Names in public showcases | **Off by default**, with an explicit teacher switch to show names. The existing artist-name generator stays. |
| 11 | Landing page and promo kit languages | **Approved.** Dutch and English only at launch. |

## Design corrections after the first mockup (15-11-2026)

Bert reviewed the first mockup and set these corrections. They override §6.2 and §4.1 where those differ.

| # | Correction | Consequence for V2 |
|---|---|---|
| A | **Deep blue (`#0F172A`) with gold accents is the visual baseline** for the whole app. | Landing, location, podium and modals follow it. Map and studio are light in production today; the mockup offers a switch to compare, and the choice between "exactly as now" and "dark" for those two screens is still open. |
| B | **Landing page is an instrument, not a brochure.** No small print under the buttons, no explanatory blocks. | Primary button "Nieuwe soundscape", secondary "Kies een wereld"; "Ik heb een code" and "Voor docenten" top right. |
| C | **The existing choice flow stays.** "Nieuwe soundscape" opens *Hoe wil je componeren?* and then *Kies je wereld*; only a class code skips it. | The "first sound before any choice" idea from §6.2 is limited to the landing hero. The mockup uses the real `NewCompositionWizard` component. |
| D | **Location and Studio keep their current layout and buttons.** No peeking timeline, no sound-bag dock. | `<Scene>` is used under the hood only: scenes always fit, map markers are at least 44 px, and Back / title / Naar Studio share one row so they cannot overlap. The recorder bar stays as it is. The flying chip from hotspot to recorder slot stays as a small touch. |
| E | **Klanklab is not a separate screen.** | The sequencer stays a **fixed panel that replaces the timeline area**, exactly as today (final decision: not a modal — an instrument belongs anchored at the bottom). New in V2: two tabs inside that panel, **Ritme** (existing step sequencer, library sounds only) and **Melodie** (pentatonic synth). The normal transport button plays the open sequence. The clip effects modal becomes **Vervormen**: existing pitch, reverb and fades plus new speed, reverse, echo and filter. It opens only from a clip, so it can only touch sounds the student has collected. "Shape a tone" (draw a wave) is dropped from V2. |
| F | **Luisterspiegel is part of the Podium.** | Final decision: no blocking modal between studio and podium. "Naar Podium" goes straight to the podium; the form map and reflection questions are part of that screen, right before submitting. Submitting is always possible, so the questions can be skipped. A mirror icon in the studio's timeline toolbar still opens the same view voluntarily while composing. | **Refined after Phase 0:** the real podium is a step list (listen → title → save → export); the Luisterspiegel becomes a step in that list (listen → title → reflection → save → export), not a separate card as the mockup shows.
| G | **The Administrator Dashboard contains the editor.** | The current `/editor` (hotspot placement, sounds, map positions, images) becomes a page inside the dashboard, with the safe-zone and spacing checks live. |

Final visual correction: **the SoundScout brand is large and central in the hero** (logo plus wordmark above the headline), as on the current start page.

**Execution order:** mockup on `/v2-mockup` → Bert's design feedback → Phase 0 → Phase 1 → onward per §5.2 and §6.5.

---

## 0. The short version

**My recommendation is not a rewrite.** I looked for reasons to replace the foundation and did not find them: React 19, Vite 7, TypeScript 5.9, Zustand 5, Tailwind 4, Tone 15 and Supabase are all current, and the audio engine was rebuilt in July (Audio Engine v2) and passed your listening test. Rewriting that would cost months and re-open bugs you have already paid for (ten documented Tone.js pitfalls, the export glitch).

What *is* holding the app back are five specific structures. V2 replaces those, each with the best available solution, behind the running app:

| # | What is outdated today | V2 replacement |
|---|---|---|
| 1 | Playhead and beat-synced visuals run through React state at ~20–30 fps | One audio-derived clock, read in a single `requestAnimationFrame` loop, drawing outside React at display refresh rate |
| 2 | No router: `App.tsx` (530 lines) switches on a store field and patches the URL by hand in 9 places | Type-safe router with validated URL parameters and native View Transitions |
| 3 | Themes are compiled TypeScript; every change is a code change, a build and an FTP upload | Themes as published data (manifest + asset storage) managed in an Administrator Dashboard |
| 4 | Fixed 120 BPM; sound creation is limited to pitch/reverb/fade and a step sequencer | Tempo as a per-composition choice; a "Sound Lab" for making and transforming sounds without a microphone |
| 5 | Compositions in `localStorage` (max 10, quota errors); server state hand-rolled in ~10 hooks; no offline | IndexedDB, a query cache, and an installable offline-capable app |

On top of that: three didactic features that no competitor has (§4).

**One finding you should know first:** the brief mentions four new themes (Sinterklaas, Christmas, Creepy, Pirates). Only Pirates exists in the codebase (`src/data/themes/piraten`, hidden via `isPublic: false`). The repository holds three themes in total: `basis`, `winterspelen`, `piraten`. The other three are content still to be produced; V2 makes them a dashboard job rather than a code job.

---

## 1. What I found (current state)

**Strong, keep as is**
- **Audio Engine v2** — `audioEvents.ts` (one pure source of clip events), `audioGraph.ts` (one chain builder), pre-baked pitch (Signalsmith WASM), deterministic reverb IRs, lookahead limiter, export validator with realtime fallback. Live, preview and export are identical by construction. This is the right architecture and better than most web DAWs.
- **On-demand players + track buses** (~9 permanent nodes) — solved the dropout problem.
- **Sequencer as virtual sample** (`seq:<id>`) — an elegant construct that V2 reuses for the Sound Lab.
- **Supabase layer** — RLS everywhere, rate-limited RPCs, Zod on responses, data retention job. 42 migrations of hard-won correctness.
- **Assignment / lesson-card / presentation model** — the didactic core; untouched by V2.

**Weak, replace**
- **Beat → UI path.** `useAudioEngine` writes `currentBeat` into `audioStore`; `Timeline.tsx` and `StageVisual.tsx` subscribe and re-render. The codebase already works around this in places (`StorytellingPanel` reads imperatively in its own rAF loop), so there are now several independent loops (`StorytellingPanel`, `StorytellingFilmstrip`, `TrimModal`, `EffectsModal`, `ComposePreview` ×4), none compensating for output latency. On Bluetooth speakers or a digibord the playhead visibly runs ahead of the sound.
- **Navigation.** No back-button semantics, no deep links to screens, share/album/praatplaat/lesson parameters parsed by hand with `history.replaceState`.
- **Theme pipeline.** `/editor` is dev-only (`EditorHub` → `ThemeWizard` 391 lines + `LocationEditor` 659 lines). The wizard ends in *generated TypeScript plus a Claude Code prompt*; the registry is a hard-coded object in `src/data/themes/index.ts`; visibility is `isPublic` + `activeFrom/activeUntil` in source; names live in the global i18n files. Admin rights are a build-time env var (`VITE_ADMIN_EMAILS`), which is a UI switch, not security.
- **Monolith.** `AudioService.ts` is 1,629 lines mixing loading, transport, seek, capture, ambient and diagnostics.
- **Storage.** `localStorage` holds at most 10 compositions and fails on quota.
- **Deploy.** Manual build and FTP upload to Strato.

**To verify during Phase 0 (not yet measured):** decoded memory per theme. The 94 MP3s are 9.9 MB compressed; decoded to float PCM that is roughly 20× larger. With seven themes this becomes the main memory risk on school iPads, so it must be measured before the theme count grows.

---

## 2. Pillar 1 — Technical & visual architecture

### 2.1 Audio ↔ animation sync: one clock

Best practice today is: **audio is the master clock, visuals are derived from it once per frame, and nothing beat-related goes through framework state.**

```
AudioContext ──getOutputTimestamp()──▶ PlaybackClock ──▶ single rAF loop ──▶ subscribers
              + outputLatency              (pure)        (one per app)      (playhead, filmstrip,
                                                                             stage, sequencer, meters)
```

- `PlaybackClock.beatAt(performanceNow)` maps the audio clock onto the frame clock using `AudioContext.getOutputTimestamp()` and subtracts `outputLatency`, so the playhead shows what the child *hears*, not what was scheduled. Both APIs are now available in all current browsers (Safari since 18.4). Old iOS versions returned wrong units for `getOutputTimestamp`, so the clock gets a sanity check with a fallback to `currentTime − baseLatency`.
- One `FrameLoop` replaces the eight separate rAF loops. Subscribers write straight to the DOM (`transform: translate3d`) or to a canvas. React is not involved per frame. `audioStore.currentBeat` stays only as a low-rate value (pause position, accessibility text).
- Result: playhead at 60/120 Hz with zero React renders during playback, and automatically correct on Bluetooth and HDMI digiboards.

### 2.2 Rendering layers: DOM, Canvas, WebGL — each where it wins

| Layer | Technology | Why |
|---|---|---|
| Timeline clips, tracks, drag-and-drop | **DOM** (as now) | ≤12 tracks and a few hundred clips is far below DOM limits; keeps accessibility, i18n, touch targets and dnd-kit. A WebGL timeline would cost all of that for no visible gain. |
| Playhead, grid, waveforms, level meters | **Canvas 2D**, waveforms drawn in a worker via `OffscreenCanvas` | Cheap, crisp at any zoom, no layout work |
| Stage/podium performance visual, Sound Lab visualisers | **WebGL** via a thin layer (OGL or raw shaders), fed by an `AnalyserNode` | This is where "spectacular" pays off: the composition visibly *performs* on the digibord |
| Screen changes, modals, clip → podium moments | **View Transitions API** + CSS | Same-document transitions are Baseline in Chrome, Safari 18 and Firefox 144; runs on the compositor; degrades to an instant switch |
| Micro-interactions | CSS / Web Animations API (as now) | Already in place, respects `prefers-reduced-motion` |

**On GSAP:** I do not recommend making it an architectural pillar. Its strength is authored timelines; your timelines are *musical* and must follow the audio clock, which GSAP's own ticker does not. It remains a good tool for the standalone explainer animations if you ever outgrow the single-rAF pattern in `public/animaties/`.

### 2.3 The 120 BPM question

The engine is not the limit: `bpm` is already a field in `timelineStore` and in saved compositions. The limit is the **content**: music loops are produced at exactly 8.0 s @ 120 BPM. Proposal:

- Tempo becomes a per-composition choice from a small set (e.g. 90 / 105 / 120 / 135), not a free slider. Tempo is a core musical parameter and currently impossible to teach with the app.
- Loops are time-stretched with the **same Signalsmith pre-bake pipeline** that already does pitch (`PitchBufferService`), cached per sample + tempo. Sound effects are not stretched. Live, preview and export stay identical because the bake happens before `generateClipEvents`.
- 120 stays the default; existing compositions are untouched.

### 2.4 Engine internals

- Split `AudioService` into `SampleStore` (loading, LRU, memory budget), `Transport`, `Capture`, `Ambient` behind one `Engine` interface. No behaviour change; it makes everything after it safer.
- **Optional, last phase:** replace Tone's `Transport`/`Part` with a ~300-line lookahead scheduler on raw Web Audio. Events are already pure data, so this is feasible, and it would remove pitfalls 1, 2 and 10 from `CLAUDE.md` at the root. I would only do it after measuring, because the current engine works.

### 2.5 Routing

**TanStack Router** (SPA mode). Reasons specific to this app:
- Search parameters are first-class and validated with Zod, which you already use: `?theme=`, `?album=`, `?pp-share=`, `?screen=teacher&lesson=` become typed route inputs instead of nine hand-written parsers.
- Route loaders preload a theme manifest and its first audio before the screen appears; per-route code splitting replaces the manual `lazy()` list.
- Built-in View Transition support on navigation.
- Works on static hosting with the existing `.htaccess` rewrite; the generated `/les/<key>` SEO pages stay as they are.

React Router 7 is the larger ecosystem, but its type safety is strongest in framework/SSR mode, which this app does not need. No Next.js, no SSR: the app is a client-side instrument, and SSR adds hosting complexity without benefit.

### 2.6 State and memory

| Kind of state | Today | V2 |
|---|---|---|
| Composition, selection, UI | Zustand (9 stores) | **Zustand, unchanged** |
| Per-frame values (beat, levels) | Zustand → React | `PlaybackClock` / `FrameLoop`, outside React |
| Server state (classes, submissions, lesson cards) | hand-written hooks with manual optimistic updates | **TanStack Query** — caching, retries, optimistic updates, the 20 s polling in `ClassDetail` |
| Local compositions | `localStorage`, max 10 | **IndexedDB** (Dexie), no practical limit, one-time migration with the old data kept as backup |
| Decoded audio | all buffers kept | `SampleStore` with a per-device memory budget, theme-scoped loading, LRU eviction of themes not in the open composition |
| Offline | none | **Service worker** (Workbox): app shell + the themes a class is using are cached, so a lesson survives bad school Wi-Fi |

---

## 3. Pillar 2 — Administrator Dashboard

### 3.1 Principle: a theme is data, not code

A theme becomes a **versioned manifest** — the same shape as today's `ThemeConfig` (locations, hotspots, samples, map positions, colours, season window) plus its own NL/EN texts, validated by one Zod schema shared by app and dashboard.

```
Supabase Postgres                       Supabase Storage (public, immutable paths)
  themes            id, status, sort, season, audience      themes/<id>/v<n>/manifest.json
  theme_versions    theme_id, n, manifest JSONB, published  themes/<id>/v<n>/audio/…mp3
  theme_assets      credits, licence, source, checks        themes/<id>/v<n>/images/…webp
  admins            user_id   (RLS: only admins write)
```

- The app loads a small **theme index** at start, then one manifest on demand. `basis` stays bundled as the offline fallback, in the same format.
- **Versions are immutable.** A composition stores the theme version it was made with, so publishing a new version or switching a theme off can never break a running assignment — the existing rule ("running assignments never break") becomes structural.
- Admin rights move from `VITE_ADMIN_EMAILS` to an `admins` table enforced by RLS.

### 3.2 What you can do without touching code

- **Overview:** all themes with status (draft / published / hidden), season window, order and audience (student pickers, teacher pickers, link-only). Toggle and reorder directly.
- **Theme editor:** the existing `LocationEditor` hotspot placement and `ThemeWizard` steps, promoted from dev tool to product, saving to a draft instead of exporting TypeScript.
- **Asset intake with automatic checks:** upload audio and images; the dashboard verifies what is now manual — loop length exactly 8.0 s, effect length 2–8 s, loudness, format, image size — and **requires licence and credit fields** before publishing (this feeds the colofon automatically).
- **Preview as student** on a draft, **Publish**, **Roll back** to any earlier version.
- **Other registries on the same pattern:** storyboards, praatplaat images, built-in lesson cards.
- **Import theme pack:** the three existing Claude skills (`soundscout-thema-studio`, `-afbeeldingen-generator`, `-geluiden-verzamelen`) keep producing a theme; they output a pack the dashboard imports, instead of TypeScript files.
- Existing `UsageStatsPanel` moves in as the Statistics tab.

Migration is mechanical: a script converts the three existing themes to manifests; the four seasonal themes are then created entirely in the dashboard.

---

## 4. Pillar 3 — Uniqueness and new creative tools

The no-microphone rule is treated as a design principle, not a restriction: every sound a child makes comes from *shaping*, which is the composing skill the app teaches.

### 4.1 Sound Lab ("Klanklab") — make and transform sounds

**Architectural key: a made sound is stored as a recipe, not as audio.** Exactly like the sequencer's `seq:<id>` virtual sample, a lab sound is `lab:<id>` = a small JSON of parameters that is rendered deterministically to a buffer on each device. Consequences: it flows through `generateClipEvents` unchanged (live = export), it costs a few hundred bytes in a bewaarcode or submission, and no child-made audio is ever uploaded — no moderation and no privacy question.

Three tools, in build order:

1. **Transform** (lowest effort, reuses the pre-bake pipeline): reverse, speed (tape-style, pitch and length together), stretch (length without pitch), chop into slices, echo, filter sweep. "Take the seagull, slow it down four times: now it is a monster."
2. **Melody rows in the sequencer:** rows get pitch (pentatonic by default, so it always sounds good), played by a library sound or a synth voice; plus swing and per-step loudness. Turns the existing rhythm grid into a melody maker without a new screen.
3. **Shape a tone:** a Chrome-Music-Lab-style instrument — draw the wave shape and the loudness curve with a finger, hear it instantly, with a live WebGL scope. Teaches timbre and envelope by doing.

All three end the same way: "Add to my sounds" → a chip in the library, draggable to the timeline.

### 4.2 X-factor features (as decided)

**First — the Listening Mirror ("Luisterspiegel"): a reflection loop.**
After finishing, the child sees their own composition as a *form map*: where it is busy or quiet, where things repeat, how sound lines up with the storyboard scenes. Next to it, one or two questions chosen from the analysis ("Part 3 is your busiest moment. Is that the most exciting part of the story?").
- **100 % local and rule-based.** The analysis runs on the composition data in the browser: explainable, free, offline. No child data leaves the device and no AI service is involved, for students or teachers.
- **Teacher switch per assignment** in the dashboard: Listening Mirror on or off.
- **Questions are data, not code.** Each question has a rule that decides when it fits (busiest part, silence, repetition, few sounds, always) and a text with placeholders. Several questions per rule give variation. Bert manages the question bank in the Administrator Dashboard.
- **Students can skip** every question.
- The teacher gets the class view: which pieces use contrast, repetition and silence, tied to the criteria on the feedback card.

**Second — the Collaborative Class Storyboard ("Klassikaal Storyboard").**
The teacher picks a storyboard for the class. Its scenes are assigned automatically to student groups; each group composes the music for its own scene; the teacher's presentation view stitches all scenes together in order into one full-class musical story. Technically this is the praatplaat model applied to storyboard frames (see `docs/ONTWERP-SAMEN-EEN-VERHAAL.md`): a submission carries a scene number instead of a position. It needs no realtime layer.

**Parked, not in V2:** the Graphic Score (both directions) and the live Digiboard Orchestra.

---

## 5. Pillar 4 — Stack and roadmap

### 5.1 V2 stack

| Area | Keep | Add | Remove |
|---|---|---|---|
| Core | React 19, TypeScript, Vite 7, Tailwind 4 | — | — |
| Routing | — | TanStack Router, View Transitions | screen switch in `App.tsx` |
| State | Zustand, Zod | TanStack Query, Dexie (IndexedDB), `PlaybackClock`/`FrameLoop` | beat-through-React, `localStorage` for compositions |
| Audio | Tone 15, Signalsmith, own worklets, lamejs, Mediabunny | tempo bake, recipe renderers (`lab:`) | (later, optional) Tone Transport/Part |
| Graphics | DOM, CSS | Canvas 2D + OffscreenCanvas, thin WebGL layer | — |
| Backend | Supabase (Postgres, Auth, RLS, RPC) | Storage (themes), one Edge Function (share-link previews on `deel.soundscout.nl`) | `VITE_ADMIN_EMAILS` |
| Delivery | Vitest | Playwright end-to-end tests, service worker (Workbox), automated deploy | manual FTP |

### 5.2 Roadmap — replace behind a running app

Every phase ships on its own, sits behind a flag (`devFlagsStore` already exists), and has a gate that must pass before the old path is deleted. Estimates assume the current way of working.

| Phase | What | Gate before removing the old | Size |
|---|---|---|---|
| **0. Safety net** | Playwright tests for the Tier 1 launch flows; golden audio renders (same composition must render identically before/after); memory and frame-rate baseline on a school iPad and Chromebook; automated deploy | Baseline numbers recorded | 1–2 wk |
| **1. Clock and visuals** | `PlaybackClock`, `FrameLoop`, canvas playhead; migrate the eight rAF loops; split `AudioService` | Zero React renders during playback; sync verified on Bluetooth + digibord | 2 wk |
| **2. Shell** | TanStack Router with all existing URLs kept working; View Transitions; TanStack Query; IndexedDB migration; service worker | Every old link, share code and QR still opens; local compositions migrated with backup | 3 wk |
| **3. Theme platform** | Manifest schema, storage, `SampleStore` budget, Administrator Dashboard, convert 3 themes | The 3 converted themes are byte-equivalent in the app; then delete `src/data/themes/*` except `basis` | 4–5 wk |
| **3b. Content** | Sinterklaas, Christmas, Creepy made in the dashboard; Pirates unhidden | Your own review | content time |
| **4. Sound Lab + tempo** | Transform → melody rows → shape a tone; tempo choice (90/105/120/135) | Export validator passes on lab sounds; class trial | 4–5 wk |
| **5. X-factor** | Listening Mirror → Collaborative Class Storyboard | Class trial per feature | 3 / 3 wk |
| **6. Engine (optional)** | Own scheduler instead of Tone Transport | Golden renders identical; decide on measured benefit only | 2 wk |

Phases 1–3 change nothing a teacher or child has to relearn. Phases 4–5 are the visible V2.

### 5.3 What I advise against

- A ground-up rewrite or a framework switch (Next.js, Svelte, etc.).
- A WebGL/canvas timeline.
- GSAP or any animation library as the sync mechanism.
- Generative AI anywhere in V2, for students or teachers (decision 4).

### 5.4 Decisions

All six questions that stood here are answered; see **Locked decisions** at the top (1–6).

---

## 6. Second audit — layout, flow, content pipeline, landing page and growth

> Added 15-11-2026 after a second pass over the code. Method: static reading of the layout code plus measurements of the assets in `public/`. **Nothing here was verified on a physical device**; every layout finding below is a code-level prediction that Phase 0 confirms with screenshots at the listed viewport sizes before it is fixed.

### 6.1 Visual layout and CSS audit

**The numbers**

| Measure | Count | What it means |
|---|---|---|
| `sm:` (640 px) / `md:` (768 px) / `lg:` / `xl:` | 625 / 170 / 25 / 1 | The layout knows two widths. Nothing is designed for ≥1024 px, so a 1920 px digibord gets the 768 px layout, enlarged. |
| Height- or orientation-aware rules | 4 (`landscape:`), 0 (`portrait:`) | A Chromebook (1366×768, ≈650 px usable) and a phone in landscape (844×390) get the full desktop layout with a third of the height. |
| Container queries | 1 (in `LocationScene`) | Components size themselves on the *window*, not on the space they actually get. |
| `vh` instead of `dvh` | 8 places | On iPad Safari `100vh` is taller than the visible area; content slides under the toolbar. |
| Safe-area insets | 0 | Fine in a browser tab; breaks under a notch or home bar once V2 is an installed app. |
| Text of 8–11 px | 53 places (`text-[10px]` ×41) | Below a readable size for children and invisible from the back of a classroom. |
| `truncate` | 71 places | Dutch strings fit; German or French ones are 30 % longer and will be cut off. |
| z-index values | 8 different, incl. `z-[60]`, `z-[100]` | No layering system; modals over popovers over drag overlays is luck. |

**Concrete findings**

| # | Where | What goes wrong | On which screens |
|---|---|---|---|
| L1 | `MapView.tsx:95` | Map width is `calc((100vh − 80px) × 16/9)` with a hard-coded header height, inside `min-h-screen`. The hint bar below the map is not in the sum. The map's lower edge and the markers on it fall off-screen. | iPad Safari, short Chromebook windows |
| L2 | `LocationMarker.tsx:38` | Map markers are **20 px** below 640 px wide and jump to 56–80 px above it. 20 px is less than half the 44 px touch minimum the rest of the app holds. | Phones, narrow split-screen windows |
| L3 | `PraatplaatSelectScreen.tsx:151` | The image is `w-full max-w-6xl aspect-video` with no height limit: at 1366 px wide it becomes 648 px tall plus a header, in a ≈650 px viewport. The bottom strip of the picture, a place a child may want to choose, is below the fold. | Chromebooks, landscape tablets |
| L4 | Praatplaat position round-trip | The student picks a spot on an `object-cover` image (cropped to the box); the presentation shows it via `FittedImage` (contain, never cropped). These agree only while every image is exactly 16:9. Measured: the current images are a mix of 1.78 and 1.79, so drift today is under 1 %. One 4:3 upload through the new dashboard would put every marker visibly in the wrong place. | All |
| L5 | `LocationScene.tsx:188–215` | This screen sizes correctly (container units). But back button, title pill, studio button and the lock hint are drawn *on top of* the picture. Below ≈480 px width the centred title collides with the two buttons, and any hotspot in the top ≈15 % or bottom ≈12 % sits under a control. | Phones; hotspots near edges on all screens |
| L6 | `Hotspot.tsx:48` | Hotspots are a percentage of the scene with a 44 px minimum. On a 210 px-high scene (phone landscape) each one covers a fifth of the height, so neighbouring hotspots overlap. Nothing checks spacing when hotspots are placed. | Phones |
| L7 | `Timeline.tsx:331–620` | The toolbar holds about twenty icon buttons in one row, each with the same 300-character class string copied 18 times. With a clip selected on a 768 px iPad the row has no room and no defined overflow behaviour. Timeline height is a fixed `40dvh`/`50dvh` regardless of how many tracks exist. | iPad portrait, Chromebook |
| L8 | `StudioView.tsx:413–524` | Below 640 px the studio becomes a different, tabbed layout; `LandscapeHint` asks the user to rotate. Portrait is thus tolerated, not designed. iPad mini (744 px) sits between `sm` and `md` and gets desktop structure with mobile colours. **Decided (9):** the studio targets tablets, Chromebooks, laptops and digiboards; a portrait phone gets a clean rotate prompt instead of a second layout. | Phones, iPad mini |
| L9 | Images | 34 JPEGs, 33 of them over 400 KB, largest 1.1 MB, one size for every screen, no modern format. 25 MB in total. | Slow school Wi-Fi |

**V2 layout rules (strict)**

1. **One scene primitive.** A single `<Scene ratio>` component (the container-unit technique `LocationScene` already uses) is the *only* way an image with things on it is shown: map, location, praatplaat picker, storytelling panel, presentation. Positions are always fractions of the image box. This removes L1, L3 and L4 by construction and retires the separate sizing logic in five places.
2. **Chrome never covers content.** Controls live in bars outside the scene. Where an overlay is unavoidable, the manifest schema enforces a hotspot safe zone (e.g. 12–88 % vertically) and the dashboard refuses a hotspot outside it (L5).
3. **Spacing is validated at authoring time.** The dashboard simulates the smallest supported scene and rejects hotspots or markers that would overlap there (L2, L6).
4. **Supported viewport matrix, tested automatically.** Playwright screenshots of every screen at: 1366×768 (Chromebook), 1024×768 and 768×1024 (iPad), 744×1133 (iPad mini), 1920×1080 (digibord), 844×390 and 390×844 (phone), each in NL and the longest supported language. A screen ships only if nothing overlaps, clips or scrolls unexpectedly in all of them.
5. **Components respond to their container** (container queries), plus one height tier for short screens. `sm:`/`md:` remain only for page-level structure.
6. **A real large-screen tier** for digibords: larger type and targets at ≥1440 px instead of an enlarged tablet layout.
7. **Type floor:** 12 px minimum in the student app, 14 px for anything a child must read; no fixed-width text containers; wrapping instead of truncation for labels.
8. **Tokens for layers and sizes:** one z-index scale (base, sticky, popover, drag, modal, toast) and one `IconButton` component replacing the copied class strings (L7).
9. **`dvh` everywhere, safe-area insets on all edge-anchored bars.**
10. **Images always exactly 16:9, delivered as AVIF/WebP in three widths** (see 6.3).

### 6.2 User flow and onboarding audit

**First-time student today**

Start screen (about ten possible actions) → "New composition" → compose-mode modal → theme or storyboard picker → intro animation → map → location → tap hotspots into a 6-slot recorder → transfer to the library → studio → drag to timeline.

Friction, in order of cost:
1. **Four decisions before the first sound.** A child chooses a mode and a theme before having heard anything.
2. **The recorder is a concept of its own.** Six slots, a "recorder full" modal, and a transfer step stand between hearing a sound and using it.
3. **Hard cuts between worlds.** Map, location and studio are separate screens with no visual link. The sound a child just found disappears and reappears elsewhere as a differently shaped chip.
4. **Five separate first-run hints** (`onboarding-intro`, `map-hint`, `clip-tools-hint`, `landscape-hint`, `sequencer-hint`), each its own modal or banner, stored per browser, so a child on a different Chromebook next week gets them all again.
5. **The studio opens with everything visible.** About twenty toolbar buttons before the first clip is placed.

**V2 student flow: "first sound in ten seconds, first clip in sixty"**

- **Start by doing.** The home screen is itself a playable scene (6.4). The first tap makes sound. Mode and theme choices move behind it and get sensible defaults; in a class-code flow the teacher has already chosen.
- **The sound is one object that travels.** A found sound is the same coloured chip with the same icon on the hotspot, in the bag, in the library and on the timeline. With View Transitions the chip visibly flies from the hotspot into the bag, and from the bag onto the track. This single animation teaches the whole model without a word.
- **One sound bag, always visible** on map, location and studio. It replaces recorder plus transfer. **The bag holds at most six sounds** (decision 8): choosing is part of composing. A full bag says so plainly, and the child swaps a sound or goes back to the map from the studio to collect others.
- **The timeline peeks into the location.** A small strip at the bottom of the location screen accepts a dropped sound directly. The child learns "sounds go here" before ever seeing the full studio; pulling the strip up *is* the transition to the studio.
- **Continuous space instead of screens.** Map → location is a zoom into the picture; location → studio is the scene sliding up to become the image panel above the timeline.
- **The studio grows with the child.** It opens with play, the bag and the tracks. Tools appear when they become relevant (clip tools on first selection, sections after the first few clips, the sequencer chip after the first loop).
- **One coach system** replaces the five hints: small pointers attached to the real element, shown once, remembered with the bewaarcode or class membership where one exists.
- **Reward:** the first time play is pressed, the scene image reacts to the sound.

**Busy music teacher today**

Landing page → create account and confirm e-mail → dashboard with three tabs → create a class → choose a lesson card or build an assignment → hand out the code. The value (children composing) comes after an account, an inbox visit and a handful of new nouns: leskaart, opdrachtkaart, template, praatplaat, feedbackkaart.

**V2 teacher flow: "from landing page to class code in two minutes"**

- **Value before account.** The landing page lets the teacher play, and shows a real digibord presentation with example class work, with no login.
- **Lesson first, account second.** "Use this lesson in my class" is the main action on every lesson. The sign-up happens inside that action, the first class is created automatically, and the next thing the teacher sees is the class code, large, with a QR code.
- **A "start the lesson" screen** for the digibord: code, QR, the assignment card and a timer on one page. This is the page teachers actually need at 8:30.
- **One word per concept in the interface.** The teacher chooses a *lesson*; assignment cards, templates and feedback cards become parts of it that appear when wanted.
- **A three-step checklist** on an empty dashboard (pick a lesson, share the code, watch the work come in) instead of three equal tabs.

I have not measured the current click counts or sign-up drop-off; Phase 0 records both as the baseline to beat.

### 6.3 Theme production pipeline

**Today:** the three skills end in four hand-written TypeScript files, i18n fragments, `BRONNEN.md` and `INTEGRATIE.md`, checked by `check-pakket.py`; hotspots are placed afterwards in `/editor` and merged back by regex. Images are scaled and cropped with `sips` to JPEG. Audio is trimmed and checked for length (`verwerk-geluid.py`, `check-audio.py`); I found no loudness normalisation step.

**V2: the skills produce one importable theme pack.** The creative work and your approval gates stay exactly as they are; only the last phase changes.

```
<themeId>.sspack  (zip)
├── manifest.json     theme, locations, samples, map, storyboards, praatplaten,
│                     texts per language, season window — the dashboard's own schema
├── credits.json      per asset: source, author, licence, URL, generation prompt/job id
├── hotspots.json     x/y estimates from image generation, marked "draft"
├── images/masters/   lossless originals, exactly 1920×1080
├── images/derived/   AVIF + WebP + JPEG fallback × 640 / 1280 / 1920, plus a blur placeholder
├── audio/masters/    WAV
├── audio/derived/    normalised, encoded
└── report.json       every automatic check with its measured value
```

| Step | Owner | Change |
|---|---|---|
| Plan, images, sounds, your approval gates | the three skills | unchanged |
| **Image processing** | `soundscout-afbeeldingen-generator` | `verwerk-afbeelding.py` additionally writes AVIF and WebP in three widths and a placeholder; exact 16:9 becomes a hard failure, not a crop. Expected saving is large (33 of 34 current images exceed 400 KB) but must be measured on the real images. |
| **Audio processing** | `soundscout-geluiden-verzamelen` | `verwerk-geluid.py` adds: two-pass loudness normalisation to one target with a true-peak ceiling, silence trim, short de-click fades, and sample-exact loop length (8.000 s). `check-audio.py` records loudness, peak and length in `report.json`. The loudness target is chosen once by ear against the existing themes, then applied to them too. |
| **Assembly** | `soundscout-thema-studio` | Phase E writes `manifest.json` instead of TypeScript; `check-pakket.py` validates it against a JSON Schema exported from the app's Zod schema, so skill and dashboard can never disagree about the format. `INTEGRATIE.md` and the regex merge disappear. |
| **Import** | Administrator Dashboard | Drop the pack (or the skill uploads it with an admin key) → it becomes a **draft**. The dashboard re-runs every check itself and never trusts `report.json`. |
| **Hotspots** | Dashboard | Draft positions are already there; you drag them, with the safe-zone and spacing rules from 6.1 enforced live. |
| **Publish** | Dashboard | Preview as student → publish → colofon updates from `credits.json`. |

Manual uploads in the dashboard (one new sound, one replaced image) get the same processing in the browser, reusing code the app already has: decoding and loudness measurement with an offline audio context, encoding with the existing MP3 worker, image resizing on a canvas.

### 6.4 International landing page and promo engine

**Constraints that shape the design**
- Your own decision of 14-7 stands: soundscout.nl *is* the app, no blog. The plan keeps that: the landing experience is the app's front door made playable, not a marketing site in front of it.
- A child with a class code must still be inside within one tap. The code field stays at the top of the page.
- The content security policy allows only own scripts, and no visitor data goes to third parties. Everything below is self-hosted.
- **The site is static files on Strato.** That limits one thing: a link preview (image and title) per shared composition needs a server that answers at the shared address. See "Hosting decision" below.

**A. Interactive hero**

- **The page is an instrument.** The hero is a real location scene with six glowing hotspots and a four-track mini timeline holding a short, pre-made soundscape. Tap a hotspot to hear it; drag it down and it joins the loop. Within one tap the visitor has heard SoundScout; within three they have changed the music.
- **A "lite player" makes this fast.** A small playback module on plain Web Audio (no Tone.js, no effects engine) that reads the same composition data. It is the same module used by the embeddable player and showcase pages below, so it is built once. Budget: hero interactive on a Chromebook in under two seconds, under 60 KB of script before the first tap; the full studio loads in the background afterwards.
- **Audio-reactive background.** A WebGL layer behind the scene, driven by the audio analyser, starts after the first tap (browsers require a tap before sound anyway). With reduced-motion or without WebGL it is a still image.
- **Tactile details:** hotspots that swell with their own sound, chips that fly along a path into the timeline, a playhead with a light trail.
- **Two clear exits:** "I have a code" (students) and "Use this in my class" (teachers), plus "Keep building" which opens the studio with the hero soundscape already loaded.
- **Languages:** `/` (Dutch) and `/en/` at launch (decision 11); the structure allows more later. Each is generated as real HTML at build time (extending the existing `generate-les-pages.mjs`), with `hreflang` links and a translated link preview.

**B. Teacher growth loops**

| Loop | What exists | What V2 adds |
|---|---|---|
| **Class showcase** | Class albums with a share code (`?album=`), public viewer | A proper showcase page: cover, class title chosen by the teacher, play-all, and on every page "Made with the lesson *X* — use it in your class". Each shared album becomes an invitation to the next teacher. |
| **Try this lesson** | `/les/<key>` pages and the `?lesson=` deep link for built-in lessons | The same one-click link for a teacher's *own* lesson cards: a shared lesson is copied into the receiving teacher's account. Teachers pass lessons to colleagues; the lesson, not the app, is what spreads. |
| **Embeddable player** | — | `/embed/<code>`: a small player (lite player again) for school websites and newsletters, with a copy-paste snippet in the share dialog and a "Made with SoundScout" link. Needs a framing rule for this one route only. |
| **Presentation footer** | — | An optional, unobtrusive address line on the digibord presentation — parents' evenings are where other teachers see it. |

Privacy rules for everything public (decision 10): **names are off by default** on showcase, embed and preview images, with an explicit teacher switch to show them; the existing artist-name generator stays; pages with children's work are marked not-to-be-indexed by search engines (search traffic comes from lessons and themes, never from children's work); existing expiry and retention rules apply unchanged.

**C. Promo kit and automated SEO**

- **Automatic preview images.** When a composition, album or praatplaat is shared, a 1200×630 image is generated from the data itself: the theme or storyboard picture, the composition drawn as its coloured clip blocks, the title, the logo. Generated once by a Supabase Edge Function and cached in storage.
- **Automatic pages.** Per language: one page per lesson (exists for NL), one per theme (new, generated from the published manifests), with structured data for learning resources and a sitemap that includes all languages. Publishing a theme in the dashboard creates its page at the next build; no articles to write.
- **Self-updating promo kit** at `/press`: logos, cast portraits, screenshots of every key screen in every language (taken by the same Playwright run that guards the layout, so they are never out of date), short clips rendered with the existing video export, a one-page PDF per language, and ready-made texts for newsletters and social posts.
- **Launch assets per language** from the existing `soundscout-animatie` skill and video script, with translated captions.

**Hosting (decided: option 1)**

Social networks read the title and image from the page at the shared address, without running scripts. A static host cannot give a different answer per share code. Options:

| Option | Effect | Cost |
|---|---|---|
| **1. Share links on a subdomain served by a Supabase Edge Function** (e.g. `deel.soundscout.nl`) — **chosen** | Rich previews per composition; the app itself stays on Strato | One DNS record; one small function |
| 2. Move the site to a host with built-in functions — *may be evaluated (Vercel) just before the global launch* | Previews, automatic deploys and previews per branch in one place | A hosting move, and a new data processor to add to the privacy statement |
| 3. Stay fully static | Every share shows the same generic SoundScout image | Nothing; the growth loop is weaker |

### 6.5 Effect on the roadmap

| Phase | Added by this audit |
|---|---|
| **0. Safety net** | The viewport screenshot matrix (6.1 rule 4); baseline click counts and timings for both journeys |
| **1. Clock and visuals** | `<Scene>` primitive, layer and size tokens, `IconButton`, `dvh`/safe-area sweep — fixes L1–L8 |
| **2. Shell** | The travelling sound chip, sound bag, timeline peek, coach system (6.2) — these need the router and View Transitions |
| **3. Theme platform** | Theme pack format, skill changes, dashboard validation, image and audio processing (6.3); fixes L9 |
| **3c. Front door** (new, 3–4 wk) | Lite player, playable hero, language pages, teacher fast path |
| **Mockup** (now) | Clickable prototype on `/v2-mockup` (dev-only): playable hero, student flow with `<Scene>`, Listening Mirror, Sound Lab, Administrator Dashboard. Design feedback from Bert gates Phase 0. |
| **5b. Growth** (new, 3 wk) | Showcase pages, lesson sharing between teachers, embed player, preview images, press kit |

All five additional questions (hosting, bag limit, portrait phones, names, landing languages) are answered; see **Locked decisions** 7–11 at the top.

---

## Sources checked

- [Synchronize audio and video playback on the web — web.dev](https://web.dev/articles/audio-output-latency)
- [AudioContext.getOutputTimestamp() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp)
- [AudioContext.outputLatency — MDN](https://developer.mozilla.org/docs/Web/API/AudioContext/outputLatency)
- [getOutputTimestamp on iOS — Apple Developer Forums](https://developer.apple.com/forums/thread/696356)
- [What's new in view transitions (2025 update) — Chrome for Developers](https://developer.chrome.com/blog/view-transitions-in-2025)
- [New to the web platform in October 2025 — web.dev](https://web.dev/blog/web-platform-10-2025)
- [View Transitions API — caniuse](https://caniuse.com/view-transitions)
- [TanStack Router vs React Router v7 — PkgPulse](https://www.pkgpulse.com/guides/tanstack-router-vs-react-router-v7-2026)
- [TanStack Router vs React Router — Better Stack](https://betterstack.com/community/comparisons/tanstack-router-vs-react-router/)
