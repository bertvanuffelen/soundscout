# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundScout is a React web app for teaching kids music composition. Players explore locations to collect audio samples, arrange them on a beat-based timeline in a studio, and perform compositions on a stage. Teachers can create classes, receive student submissions via class codes, and review compositions through a dedicated dashboard.

## Commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (flat config, TS + React rules)
npm run preview      # Preview production build locally
npm test             # Vitest watch mode
npm run test:run     # Vitest single run (CI)
npm run test:coverage # Vitest with v8 coverage
```

Run a single test file:
```bash
npx vitest run src/utils/__tests__/audio.test.ts
```

Tests use jsdom environment with jest-style globals (`describe`, `it`, `expect`). Test files live next to source in `__tests__/` directories.

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode, `noUnusedLocals`/`noUnusedParameters`) + **Vite 7**
- **Zustand 5** for state management (independent stores, no middleware)
- **Tone.js 15** for Web Audio (sample playback, transport scheduling)
- **@dnd-kit** for drag-and-drop (clips on timeline)
- **Tailwind CSS 4** (via `@tailwindcss/vite` plugin, utility classes only)
- **i18next** for i18n (Dutch default, English fallback)
- **Supabase** for teacher auth + student submissions
- **Zod** for runtime schema validation (compositions, timeline state)
- **Mediabunny** for video export (MP4 muxing via WebCodecs)

## Architecture

### Screen Navigation

No router — `App.tsx` switches on `appStore.currentScreen`:
`'start'` → `'map'` → `'location'` → `'studio'` → `'stage'`

Other screens: `'tutorial'` (video tutorials), `'compose-mode'` (storytelling mode selection), `'compositions'` (saved compositions), `'shared'` (shared composition player), `'shared-praatplaat'` (public praatplaat viewer #73), `'shared-album'` (public class album viewer, R4), `'praatplaat-select'` (student position picker for praatplaat #72), `'assignment-landing'` (class code assignment preview before starting)

Teacher screens: `'teacher-login'` → `'teacher-dashboard'` → `'compositions'`

Each screen maps to a component in `src/components/` (e.g., `StudioView`, `MapView`, `TutorialScreen`).

### Start Screen & Assignment Flow (#78)

StartScreen has two primary CTAs: "Nieuwe compositie" (opens `ComposeModeModal` → `ThemeSelectionModal` or `StoryboardPickerModal`) and "Ik heb een code" (opens `ShareCodeModal` with `ShareCodeInput`). Both are modal-driven — no page navigation for initial choices.

**Class code flow (4 digits)**: `ShareCodeInput` → `lookupAndRouteAssignment()` → `goToAssignmentLanding({ classCode, assignment })` → `AssignmentLandingScreen`. The `pendingAssignment` is stored in appStore but NOT initialized yet. Only when the student clicks "Starten" does `activatePendingAssignment()` run, branching on the four assignment types: template → `initializeFromTemplate()` → studio; praatplaat → `goToPraatplaatSelect()`; storyboard → `initializeCompositionFromStoryboard()` → map; free → `setComposeMode('free')` + `initializeNewComposition({themeId})` → map. Route C (no active assignment) shows recovery options ("Vrij componeren" / "Andere code"). See **Assignments & Leskaarten** below.

**New composition flow**: "Nieuwe compositie" → `ComposeModeModal` (choose free/image/storyboard) → theme or storyboard picker → `initializeNewComposition()` → map.

### State Management (Zustand Stores)

Seven independent stores in `src/stores/`:

| Store | Responsibility |
|---|---|
| `appStore` | Current screen, active location ID, current composition ID, praatplaat context (#72) |
| `audioStore` | Playback state (isPlaying, currentBeat) |
| `timelineStore` | Tracks (8 default, uitbreidbaar tot 12 via `addTrack`), clips, BPM (120 fixed), 128 beats default (16–64 maten via `extendTimeline(±32, contentEndBeat?)` — "+8"/"−8"-knoppen in de tijdlijn-werkbalk; inkorten klemt op het einde van de inhoud), looping + sectie-loop (`loopRegion`, sessie-state; de loop-knop opent een keuze **"Hele compositie" / "Deze sectie"** — sectie = het bereik onder de afspeellijn via `sectionAt(beat, sections, totalBeats)` in `src/utils/audio.ts`; `useStudioPlayback` levert `loopMode`/`handleLoopWhole`/`handleLoopSection`/`handleLoopOff` — TR6. `parkLoopRegion`/`restoreLoopRegion`/`savedLoopRegion` bestaan nog maar worden niet meer door de knop gebruikt), solo (`soloTrackIndex`, sessie-state), smart snap, clip trim, volume/mute, sections, clearAllTracks, clip loop, clip effects (pitch/reverb). Clip actions (`addClip`, `moveClip`, `duplicateClip`) accept `samples: Sample[]` as parameter — no direct dependency on libraryStore |
| `libraryStore` | Recorder slots (max 6), collected samples, transfer to library |
| `userStore` | User session, role (guest/student/teacher), class code |
| `themeStore` | Active theme, locations, samples, map config (loaded from `?theme=` URL param) |
| `selectionStore` | Selected clip ID + track index for inline clip edit |

**Pattern**: Direct selectors `useStore((s) => s.field)`. For non-reactive reads in callbacks, use `useStore.getState().field` to avoid unnecessary re-renders (see Tone.js Pitfalls below).

### Services (Singletons)

| Service | Responsibility |
|---|---|
| `AudioService.ts` | Tone.js audio engine — sample loading (parallel with retry), playback scheduling, seek, ambient audio, waveform cache |
| `StorageService.ts` | localStorage wrapper for compositions (max 10), library, preferences. Detects `QuotaExceededError` via `isQuotaExceeded()` helper; exposes `lastSaveError` for UI feedback |

### Audio Engine — Key Architecture

`AudioService` is a singleton wrapping Tone.js. `useAudioEngine` hook provides the React interface.

```
AudioService (singleton)
├── buffers: Map<sampleId, ToneAudioBuffer>  — primary storage, zero graph footprint
├── players: Map<sampleId, Tone.Player>      — preview players only (from buffer)
├── trackBuses: Tone.Gain[] (dynamisch ≥8)   — submix per track (mute + solo)
├── masterBus: Tone.Volume                   — master output
├── activeSources: Set<{player, nodes}>      — lifecycle-tracked on-demand players
├── timelinePart: Tone.Part | null           — scheduled clip events
├── scheduledTracks: Track[]                 — current timeline state for seek
├── scheduledSamples: Sample[]               — sample metadata for seek
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

**On-demand fire-and-forget architecture (PERF-1, 2026-04-22)**: Replaced 170+ permanent `Tone.Player` nodes with on-demand players created per clip event. Root cause of audio dropouts: each Player creates a permanent GainNode; 170+ GainNodes exceeded the 2.9ms render quantum budget (128 samples @ 44.1kHz). Now: `ToneAudioBuffer` stores sample data (zero audio graph footprint), `createOnDemandPlayer()` creates a fresh Player from the buffer at event time, routes through trackBus, and auto-disposes via `onstop` callback. `activeSources` Set tracks all live players. On pause: all activeSources are disposed, Part stays valid. On resume: Part callback + `startActiveClips()` create fresh players. See `docs/audio/archief/PLAN-AUDIO-REFACTOR.md` for full design rationale and implementation log.

**Playback flow**: `scheduleTimeline()` creates a `Tone.Part` with all clip events (each carrying `trackIndex` + `effects` config) → `play(fromBeat)` starts transport. Part callback calls `createOnDemandPlayer()` per event. For seek (fromBeat > 0), a **hybrid approach** is used: clips already active at the seek position are started directly via `startActiveClips()` (which also creates on-demand players), while future clips play via `Tone.Part`.

**Track bus submix**: `Tone.Gain` buses (grow-only, één per track — `ensureTrackBuses(count)` groeit mee met `tracks.length` tot max 12) + 1 `Tone.Volume` master → Destination. Buses handle mute + solo (gain 0 or 1; `setSoloTrack` past gains live toe zonder reschedule). Track + clip volume is baked into per-clip on-demand players. Total permanent nodes: ~9 (vs 170+ before refactor).

**Clip Loop (#65)**: `clip.loop` + `clip.loopDurationBeats` on the Clip interface. Looping clips generate multiple `ClipEvent`s in `scheduleTimeline()` (one per loop iteration). Resize handle uses pure pointer events (not dnd-kit) with half-beat grid snapping. Loop-aware collision detection via `getEffectiveClipDurationBeats()`. Loop-aware seek uses modulo arithmetic (`elapsedSeconds % singleDuration`) to find position within loop iteration.

**Audio Engine v2 (2026-07-24 — één motor voor live/preview/export)**: na de export-glitch-diagnose (`docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md` §15) is de effectlaag herbouwd rond gedeelde modules; volledige rationale in `docs/audio/PLAN-AUDIO-ENGINE-V2.md`. **Berts eind-luistertest is geslaagd (24-7): effecten + keiharde mix, MP3 én video, klinkt goed.**
- `src/services/audioEvents.ts` — **de éne bron van clip-events** (`generateClipEvents`: loop-iteraties, per-iteratie-fades, mute/solo, volumes, `lastAudibleSeconds` incl. galmstaart) + gedeelde constanten (`reverbDecay`, fade-curves). Puur, unit-getest.
- `src/services/audioGraph.ts` — **de éne ketenbouwer** (`buildClipChain`: → `chain.input`/`chain.output`) + fade-planners (`scheduleFadeCurves`, `scheduleFadeCurvesAtOffset` voor seek). Gebruikt door de live Part-callback, seek, EffectsModal-preview én `renderOffline`.
- `src/services/PitchBufferService.ts` — **pitch is een vooraf gebakken buffer** (Signalsmith Stretch WASM, duurbehoudend, cache per sample+semitonen). Live/preview/export spelen de gebakken buffer af — geen `Tone.PitchShift`-node meer in het pad (dat was de bewezen glitchbron); PitchShift bestaat alleen nog als fallback wanneer de worklet ontbreekt. Exports awaiten `ensurePitchBuffers`; live bakt fire-and-forget bij schedule en pakt bakes per event op.
- `src/services/ReverbIRService.ts` — **deterministische reverb**: geseede noise-IR (envelope als Tone.Reverb) per decay-bucket, in de keten als Convolver + equal-power CrossFade. Synchroon (geen `ready`-await), elke render bit-identiek.
- `src/utils/renderValidation.ts` — objectieve render-controle. **Herkalibratie 24-7**: alleen ondubbelzinnige glitch-signaturen keuren af — (a) een lokale regelmatige klik-trein in het kórrelbereik 0.02–0.11s (9–50 Hz; muzikale ritmes zoals 16en @120bpm=0.125s vallen erbuiten), (b) ≥10 extreme sprongen ≥0.9 (catastrofale modus). Een kale klik-teller is GEEN criterium: echt percussief materiaal telt honderden legitieme transiënten (eerste echte export: 523 "kliks" die ook in de live opname zaten).
- `src/services/masterLimiter.ts` — **master-limiter (lookahead brickwall)**: plafond −1.0 dBFS, 5ms lookahead, 1ms attack / 150ms release; voorkomt digitaal clippen bij hard gestapelde sporen, transparant (unity, bit-identiek) onder het plafond. Eén pure kernel op drie plekken: live als AudioWorklet ná de masterBus, offline via `applyLimiterToBuffer` ná de render (lookahead-gecompenseerd), en op de vangnet-opname. Live-fallback zonder worklet = geen live limiter (export limit altijd).
- **Export-vangnet**: `validateOrCapture` in `audioExport.ts` keurt elke offline render; bij een verdachte render neemt `AudioService.captureRender` de compositie onhoorbaar realtime op (master → capture-worklet → gain 0, frame-exact venster) en meldt de export dat eerlijk (i18n `stage.exportRealtimeFallback`). **Overeenstemmings-check**: flagt de opname hetzelfde profiel als de render, dan zijn de vlaggen de muziek zelf → deterministische offline render, géén melding (zelfherstellend bij valse positieven). Nooit-stilte-garantie: een (bijna) stille capture wordt verworpen.

**Clip Effects (#33, #79)**: Per-clip pitch (-12..+12 semitonen, gebakken buffer), reverb (0-100%, IR-convolver) en Fade In/Out (0..clipduur, s). Keten per event: Player → [PitchShift-fallback] → [reverb-unit] → FadeGain → Volume → trackBus → masterBus → Destination. `EffectsModal` preview (`playSampleWithEffects`, nu async — wacht op de pitch-bake zodat preview exact als export klinkt). Fade-curves: fade-in `x²`, fade-out `(1-x)²`, 128 stappen via `setValueCurveAtTime` op een aparte `Tone.Gain`. Loops: fade-in én fade-out op élke iteratie (pulse — UX-FADE-LOOP), **ook in de export**. Seek middenin een fade berekent de tussenwaarde en plant het curve-restant (`scheduleFadeCurvesAtOffset`). **Trim+fade clamping**: `updateClipTrim` schaalt fades proportioneel als `fadeIn + fadeOut > newDuration`. **Solo en mute tellen ook in de export** (export = wat je hoort); de reverbstaart klinkt live uit tot `autoStopBeat` — gelijk aan wat de export rendert.

**Live reschedule (#22)**: Timeline changes during playback are detected via `audioVersion` counter in `timelineStore` (incremented on every audio-relevant action). `useRescheduleOnChange` hook watches this counter; when it changes while `isPlaying === true`, it calls `AudioService.rescheduleWhilePlaying()` which disposes all activeSources, rebuilds the `Tone.Part` with current tracks, and resumes from the same beat position. **Convention**: any new timelineStore action that affects audio output MUST increment `audioVersion` in its `set()` call.

**Volume**: Track + clip volume (dB) is applied per on-demand player via `player.volume.setValueAtTime()` before `player.start()`. For effect chain players, volume is baked into the chain's `Tone.Volume` node. Track buses handle mute only (gain 0 or 1). Muted clips/tracks are skipped entirely.

**MP3 export**: `src/utils/audioExport.ts` — `renderOffline` gebruikt exact dezelfde `generateClipEvents` + `buildClipChain` als live (verse keten per event, buses, solo/mute, per-iteratie-fades), gevolgd door `validateOrCapture` (render-controle + realtime-vangnet) en MP3-encode via `@breezystack/lamejs` in een **Web Worker** (`src/workers/mp3EncoderWorker.ts`, main-thread-fallback). Output: 128kbps stereo. `preloadBuffers` hergebruikt al door de studio geladen buffers. Exportduur = hoorbaar einde incl. galmstaart, excl. gemute/weggesoloede clips.

**Video export**: `src/utils/videoExport.ts` orchestrates storyboard → video. Dual-engine architecture in `videoExportEngines.ts`:
- **Primary**: WebCodecs + Mediabunny → MP4 (H.264 + AAC). Uses `CanvasSource` + `AudioBufferSource`.
- **Fallback**: MediaRecorder → WebM (VP8 + Opus). Real-time rendering.
- Engine detection tries H.264 profiles in order: Main (`avc1.4d0028`) → High (`avc1.640028`) → Baseline (`avc1.42001f`), with hardware-first then software-fallback for each. Not all GPUs support Baseline encoding despite it being the most compatible for playback.
- Video duration = `Math.max(audioDuration, timelineDuration)` so silent storyboard sections are fully rendered.
- `useVideoExport` hook provides React interface (mirrors `useAudioExport` pattern).
- Settings: 1920×1080, 4 Mbps video, 128 kbps audio, 30 fps, 0.5s crossfade between images.

### Timeline Header & Studio Layout

The Timeline component (`Timeline.tsx`) has a header bar with three zones:
- **Left**: Timeline label
- **Center**: Inline clip edit actions (label, trim, duplicate, volume, effects, delete) — only visible when a clip is selected. Label icon is placed directly after sample name. Effects button opens `EffectsModal` (waveform + fade handles + pitch/reverb sliders + preview).
- **Right**: Flag (section mark), Eraser (clear timeline with inline confirm), Undo/Redo

The Timeline has `max-h-[50dvh]` to guarantee the sample library gets enough space. Tracks scroll vertically within `overflow-y-auto min-h-0 flex-1`.

**Template locking**: When `activeTemplate !== null`, section mark button is hidden and `SectionBar` gets `readOnly` prop. Template clips are locked per-clip via `clip.fromTemplate === true`.

### Drag-and-Drop

`StudioView.tsx` owns the dnd-kit `DndContext`. Two drag sources: samples from library, clips on tracks.

- **Visual feedback**: Snap preview (dashed outline) shown over tracks; DragOverlay shown only when NOT over a track; original clip hidden (`opacity-0`) during drag
- **Clip repositioning**: Delta-based — new position = original position + drag delta (not cursor position)
- **Smart snap** (`src/utils/clipCollision.ts`): Try original position → shift after blocking clip → try tracks below → reject
- Sensors: PointerSensor (8px distance) + TouchSensor (150ms delay)

### Stage / Podium Screen

The Stage screen (`StageView.tsx`) is the performance screen where students listen to their composition — and their "feedback-thuis": when a class session + own bewaarcode exist, the latest docent-feedback and peer-sterren are fetched silently and shown in a feedback block with a code badge. Primary actions: **Opslaan & Delen** (opens `StageActionsModal`), **Luister naar klasgenoten** (peer review, only when the teacher enabled it and the own submission is synced), and **Nieuwe compositie** (with confirm when clips exist).

`StageActionsModal` (testronde 3-redesign, approved mockup Bert) is a three-column modal, organised by "voor wie": **Voor jezelf** (save local, save online with bewaarcode — hidden in class-code flow, MP3 export, video export when a storyboard is active), **Voor de klas** ("Presenteren op het digibord" → `PresentationSurface` snapshot, **teacher-only**; "Lever in" when a class session is active — same save/submit path, closes the modal; otherwise submit-to-teacher; plus the class submission status + code), **Delen met anderen** (share link). A teacher-only row at the bottom holds "Opslaan als opdracht" (template). The modal slides up from the bottom on mobile and centers on desktop.

### Presentation Surface (universeel presentatiescherm)

**Studio Timeline**: `StudioView` passes `samples={librarySamples}` — Track resolves clips via that array, falling back to the theme only when the prop is absent. Never drop it: a composition opened in a different theme context (bewaarcode on another device) would then render an empty timeline.

`src/components/presentation/PresentationSurface.tsx` is THE single presentation screen (mockup style: light content card on `brand-900` backdrop, "Nu te horen" pill). Four `mode`s drive feature flags: `teacher-present` (playlist sidebar bij n>1, doorspelen/auto-advance, aankondigingsoverlay, feedbackrij), `teacher-review` (single submission, metadata line, montagelijn default open), `public` (no feedback; since 19-7 the playlist sidebar + prev/next DO appear when an album playlist has >1 items, without the feedback-status toggle), `peer` (anonymous, `ratingSlot` ReactNode under the card). An optional `onRefresh` prop adds a refresh button to the header (used by `ClassPresentationView`; `ClassDetail` also polls submissions every 20s and appends new ones to the end of the playlist). Key elements:

- **Montagelijn-toggle** — only for beeld-vormen (storyboard/praatplaat/afbeelding); expanding shrinks the visual (flex 2:1) and shows the read-only Timeline below. Vrij/template: the timeline IS the visual (always shown, no toggle). Visuals scale to fill the card (`StoryboardViewer` `fill` prop; praatplaat image `h-full` with shrink-wrapped wrapper so `PraatplaatMarker` positions stay correct).
- **Zijpaneel** — slides fully away; a right-edge handle with position badge ("3/8") reopens it. Rows: shape icon (Film/Image/Music) + composition + student + peer-sterren total (`peerStars` Map from `get_peer_stars_for_class`, migration 030) + optional docent-feedback status dot behind a toggle (`getReviewStatus`: new/seen/reviewed).
- **Fullscreen** — always-present button (+ `F` key) via `src/hooks/useFullscreen.ts` (webkit variants for iPad). Escape-guard: Escape exits fullscreen first (browser) and must NOT also close the surface — handled via `isDocumentFullscreen()` check in the `useModalBehavior` onClose. **On fullscreen enter** (TR6) a `useEffect([isFullscreen])` collapses the montagelijn (`montageOpen=false`) and sidebar (`sidebarOpen=false`) so the digibord shows only the visual on dark; the teacher can reopen both.
- **Per-modus-schakelaars** (TR6): geen centrale config-tabel — de vlaggen staan als afgeleide booleans (`isTeacherMode`/`hasPlaylistUi`/`hasVisual`/`showNames`) + `useState`-defaults. Belangrijk: `autoAdvance` ("Doorspelen") default **UIT** (alleen aan als de docent klikt); de "Open montage"-knop in de controls-rij staat óók in `public` (deel-/albumweergave). Snel naslag in het comment-blok bovenaan het bestand + `HANDLEIDING-BEHEER §4b`.
- **Audio** — `src/hooks/useCompositionPlayback.ts` (shared engine: AbortController load with progress, schedule/play/pause/resume via existing Part, ~30fps beat tracking with loop-modulo, `onEnded` for auto-advance, `respectLoop`/`autoLoad` options). NOT used by StageView itself (that stays on useAudioEngine/audioStore).

Thin wrappers: `ClassPresentationView` (teacher-present + fetches peer stars), `SubmissionPlayer` (teacher-review + gezien-stempel), `SharedPlayer` (data fetch + gesture-gate, then public mode), `PeerReviewModal` (stappenflow + surface for the listen/rate step), and since M5 also `PraatplaatViewer` (teacher-present + `interactiveBoard`) and `SharedPraatplaatViewer` (statemachine + gesture-gate, then public + `interactiveBoard`). The **`interactiveBoard` prop** renders one fixed board image with clustered clickable spots (`praatplaatClustering` + `PraatplaatSpot`) for the whole playlist — click plays that submission, multi-spot clusters open a picker.

### Theme System

Themes in `src/data/themes/{themeId}/` — each has `locations.ts`, `samples.ts`, `map.ts`, `index.ts`.

- `?theme=x` URL param loads theme (default: `basis`)
- Assets: `/public/audio/themes/{themeId}/{locationId}/{sampleId}.mp3` and `/public/images/themes/{themeId}/`
- Guide for adding themes: `docs/NIEUWE-LOCATIE-THEMA.md`

### Storyboards & Composition Images

**Standalone registries** — decoupled from themes, themeId is a field on each entry:

| Registry | File | Image folder | Purpose |
|---|---|---|---|
| Storyboards (multi-image) | `src/data/storyboards.ts` | `/public/images/storyboards/{id}/` | Sequenced image stories for storytelling mode |
| Composition images (single) | `src/data/praatplaatImages.ts` | `/public/images/praatplaten/` | Loose images for image mode + teacher praatplaten |

**Adding a new storyboard**: drop frames in `/public/images/storyboards/{id}/`, add entry to `src/data/storyboards.ts`, add i18n keys under `storyboards.{id}.*`.

**Adding a new composition image**: drop image in `/public/images/praatplaten/`, add entry to `src/data/praatplaatImages.ts` with `availableFor` tag (`'teacher'` | `'student'` | `'both'`).

**Helpers** in `src/data/themes/index.ts`: `getAllCompositionImages()` (reads praatplaatImages), `getAllMultiImageStoryboards()` (reads storyboards.ts), `findStoryboardById()` (supports standalone IDs, `pp-*` virtual IDs, `location-*` virtual IDs).

### Destructive Action Confirmations

"Nieuwe compositie" shows a confirmation modal when `hasClipsInProgress` is true. Implemented on both `StartScreen.tsx` and `StageView.tsx` (via `useStageModals`). Pattern: guard with `timelineStore.selectHasClips()`, show `<Modal>` with cancel/confirm, proceed only on confirm.

### Teacher Dashboard

Teachers log in via Supabase auth. `readOnly` prop on Timeline/Track/Clip disables DnD and hides edit controls. Class limit per teacher comes from `teachers.max_classes` in the DB (default 8, `NULL` = unlimited — enforced client-side in `useClasses.createClass`). The dashboard has three large tabs (`SegmentedTabs`), following the **opdrachten-model 17-7** (Mijn klassen = doe-wereld · Leskaarten = didactische kiesplek · Mijn materiaal = eigen grondstoffen):

- **Mijn klassen** — per-klas doe-wereld: `ClassDetail` with active assignment, a **startkeuze** ("Gebruik een leskaart" → `LessonCardPickerModal` (class fixed, one-click activate via `activate_lesson_card`) / "Stel zelf samen" → `AssignmentTypeCards`), submissions, and an "Eerdere opdrachten" history block (via `fetchPastAssignments`) where praatplaat rows also offer **Bekijken/Delen/Verwijderen** (viewer, share code, `deletePraatplaat` with submissions warning) next to reactivate.
- **Leskaarten** — dé kiesplek (`LessonCardsTab`, master-detail): built-in + own cards with **thema- and niveau-filterchips** (`getLessonCardThemeId` derives the theme from the card's content — no stored field) and **season badges**.
- **Mijn materiaal** — only own building blocks: opdrachtkaarten + templates. Template cards have "Maak er een leskaart van" → `LessonCardEditorModal` with `prefill` (also offered in `SaveAsTemplateModal`'s success state on the stage). Praatplaat instances are class data and do NOT appear here; app content (storyboards/catalog) lives only in the activation pickers.

**Seizoensregel (17-7)**: teacher-facing pickers show out-of-season themes with a `ThemeSeasonBadge` ("weer beschikbaar in {maand}", via `getTeacherThemes`/`getThemeSeasonInfo` in `src/data/themes/index.ts`); activating an out-of-season lesson card asks one soft confirmation — never block or hide. Student pickers keep the season filter (`getPublicThemes`); running assignments never break (`?theme=` stays functional).

### Assignments & Leskaarten (opdrachten-architectuur)

A teacher activates **one active assignment per class**; students enter the 4-digit class code to reach it. Four `AssignmentType`s (`src/lib/assignments.ts`): `template` (teacher-built composition), `praatplaat` (collaborative sound map, see #72 below), `storyboard` (app-content image story), `free` (free composition within a chosen theme — sound-only, no image/story).

**`class_assignments` table** = the per-class assignment *instance*. Polymorphic + discriminated by `assignment_type`: `template_id`/`praatplaat_id` (UUID FKs) · `storyboard_ref`/`free_theme_id` (TEXT registry refs) · `card_id` (opdrachtkaart) · `is_active`. A single-active trigger + a partial unique index per (class, source) enforce one active assignment and enable **resume-or-insert**: `activate_assignment(p_class_id, p_template_id, p_praatplaat_id, p_storyboard_ref, p_card_id, p_free_theme_id)` (SECURITY DEFINER, idempotent) reactivates an existing row rather than duplicating. `get_active_assignment(class_code)` returns a type-stable `{ assignment_type, payload JSONB, card JSONB, class_id, class_name }`; the client maps it in `getActiveAssignment()`. `useClassAssignment` (teacher) exposes `activateTemplate/Praatplaat/PraatplaatFromCatalog/Storyboard/Free`. Type-first UI: `AssignmentTypeCards` (4 cards) → `ActivateAssignmentModal` (2-column: scrollable resource/theme list + preview) in `ClassDetail`.

**Opdrachtkaart** (`assignment_cards`, migration 016) = a shape-independent instruction card (title + ≤10 bullets) the student sees before starting. Teacher-owned, reusable, linked per assignment via `class_assignments.card_id` (`ON DELETE SET NULL`); `card_id NULL` → the client shows a per-type default (`assignmentCards.defaults.{type}` in i18n). `AssignmentCardEditorModal` + `useAssignmentCards`.

**Praatplaat catalogus** (migration 017): praatplaten are chosen from a fixed catalog (`src/data/praatplaatCatalog.ts`); `activate_praatplaat_from_catalog(...)` find-or-creates one praatplaat instance per (class + image) then delegates to `activate_assignment`, so submissions + sharing keep working.

**Leskaarten** (`lesson_cards`, migrations 019–021) = reusable "packages" modeled as a **thin preset** over the above — a lesson card stores only *choices* (type + resource-ref + opdrachtkaart + presentation metadata: title/level/lesson_goal/phases/cover/pdf), never its own content. `activate_lesson_card(p_lesson_card_id, p_class_id)` resolves the opdrachtkaart (`card_id` direct, or `card_inline` JSONB find-or-creates a teacher `assignment_cards` row) and delegates to `activate_assignment`/`activate_praatplaat_from_catalog` — one source of truth. Two kinds: teacher-owned (`teacher_id = auth.uid()`, RLS CRUD) and **built-in** (`teacher_id NULL` + `builtin_key`, SQL-seeded in 020, read-only). CHECKs: `lesson_cards_one_resource`, `lesson_cards_one_card_source`, `lesson_cards_builtin_ownership`. Client: `src/lib/lessonCards.ts` + `useLessonCards`; UI: `LessonCardsTab` (dashboard master-detail), `LessonCardEditorModal` (authoring: type → resource → opdrachtkaart → presentation), `ActivateLessonCardModal` (pick/create class → activate → show code). The public landing (`/teacher`) reads built-ins via `get_builtin_lesson_cards()` (SECURITY DEFINER, anon); its **"Open voor je klas"** navigates to `/?screen=teacher&lesson=<builtin_key>` → `appStore.pendingLessonCardKey` survives the login hop → dashboard opens the Leskaarten tab on that card.

**System templates** (migration 022): a `template` can be ownerless (`teacher_id NULL` + `builtin_key`) so a built-in lesson card can offer a ready-made composition to *all* teachers. `activate_assignment` accepts a system template (`teacher_id IS NULL`) alongside the teacher's own; RLS lets any teacher read system templates. Content is seeded by copying a teacher-built template (migration 023 copies "Drum beat" → system template + built-in `template` lesson card, generating a fresh `code`). No client change — system templates are reachable only via built-in lesson cards; `useTemplates` stays own-only.

**Duration label** (migration 033): optional `class_assignments.duration_label` ("2 lessen") — teacher sets it inline on the active-assignment card in `ClassDetail` (`updateAssignmentDuration`, RLS update-policy from 006); `get_active_assignment` returns it in the payload JSONB and `AssignmentLandingScreen` shows it under the opdrachtkaart with a Clock icon.

**Edit card on active assignment** (TR5#2): the opdrachtkaart is no longer only chosen at activation — `ClassDetail`'s active-assignment card has a select (next to the duration field) to attach/clear the card on the live row via `updateAssignmentCard(assignmentId, cardId | null)` (mirrors `updateAssignmentDuration`; `card_id` is exposed by `fetchClassAssignment` and the `updateCard` action in `useClassAssignment`). Empty = per-type default.

**Praatplaat theme choice** (D2, TR5, migration 034): a praatplaat's sound-theme is now teacher-chosen at activation — `ActivateAssignmentModal` shows a theme dropdown (pre-filled with the praatplaat's own `themeId`) and passes it to `activate_praatplaat_from_catalog`. Migration 034 makes that RPC also **update** `theme_id` on an existing (class+image) row (it only set it on INSERT before). The student flow applies it via `useThemeStore.setTheme(activePraatplaat.themeId)` in `activatePendingAssignment` (+ `PraatplaatSelectScreen.handleConfirm` as a reload fallback), guarding unknown/`'general'` → `DEFAULT_THEME_ID`. Previously nothing called `setTheme`, so a piraten-praatplaat forced the student into 'stad'. The theme is **also editable on the live active-assignment card** in `ClassDetail` (theme select next to the opdrachtkaart, praatplaat-only) via `updatePraatplaatTheme(praatplaatId, themeId)` — a direct RLS-guarded `praatplaten.theme_id` update; `fetchClassAssignment` exposes `praatplaatThemeId`.

**Level buckets** (G3, 18-7): lesson-card levels are canonical buckets `g12/g34/g56/g78/all` (`normalizeLevelToBuckets`/`formatLevel`/`LEVEL_BUCKETS` in `src/lib/lessonCards.ts`); NL shows groepen, EN shows ages via `lessonCards.levels.*` — legacy free-text levels are normalized client-side. The editor uses a select; the LessonCardsTab list is grouped into built-in vs own cards.

Migrations for this subsystem: `006` class_assignments · `015` storyboard type · `016` opdrachtkaarten · `017` resume-model + praatplaat catalog · `018` `free` type · `019` lesson_cards + `activate_lesson_card` · `020` seed built-ins · `021` public `get_builtin_lesson_cards` · `022` system templates · `023` seed "Drum beat" system template · `024` derived assignment cards · `032` inline-card match on title+bullets (QA-7) · `033` duration_label · `034` praatplaat theme update-on-existing (D2/TR5).

### Feedback (docent + peer)

**Docent-feedback** (migration 026): columns on `submissions` — `feedback_sticker` (Lucide icon key), `feedback_level` (1-3), `feedback_text`, `feedback_at`, `teacher_seen_at` + `submitted_at` (formeel ingeleverd; every v2 class submission has a save_code, so WIP-splitsing runs on `submitted_at`). `getReviewStatus()` derives new/seen/reviewed. UI: `FeedbackPanel` (in PresentationSurface teacher modes), "Beluisterd" badge on `SubmissionCard`. The student sees feedback on the Podium (feedback block + "Je hebt een reactie!" banner via bewaarcode lookup).

**Peer-feedback 2.0** (migrations 027 + 028): after submitting, a student reviews ≤3 random anonymous classmate compositions with **1-3 sterren per criterium** of the teacher's feedbackkaart (`feedback_cards`, docent-instelbaar; built-ins + own). Table `peer_feedback` (unique per pair, no self-review, `ratings` JSONB; pre-028 rows are chips-only). Server enforces: cap 3, review-venster/timer (`peer_review_is_open`), rate limits. RPCs: `get_peer_review_batch`, `submit_peer_feedback` (v2), `get_peer_compliments` (per bewaarcode, avg per criterium), `get_peer_stars_for_class` (migration 030, batch totals for the presentation sidebar, owner-teacher only). Client `src/lib/peerFeedback.ts` uses typed `PeerFeedbackError` (rateLimit/capReached/windowClosed/generic) — server rejections show honest messages, never fake success. Teacher: `PeerFeedbackOverview` (+ top 3 podium) in ClassDetail; activation via uitklapbare peer-instellingen.

Other migrations: `025` anonymous analytics (`usage_stats`) · `029` fix `load_saved_composition` class_code cast (bewaarcode bug) · `030` peer stars batch · `031` class album share (R4).

### Klas-album (R4)

A teacher shares all formally submitted compositions of an assignment as one public "album" via an 8-char code (30 days, extendable). Migration 031 adds `share_code`/`share_expires_at`/`share_view_count` to `class_assignments`, a central `generate_share_code_v2()` (collision-checks submissions + praatplaten + class_assignments; `generate_praatplaat_share_code` delegates to it), and RPCs `share_class_album` (authenticated, ownership, 10/min) / `get_shared_class_album` (anon, 30/min, resolves submissions per assignment type, `submitted_at IS NOT NULL` only). Client: `src/lib/albums.ts` · `ShareAlbumModal` ("Deel album" on the active assignment card + every history row in `ClassDetail`) · `SharedAlbumViewer` (lazy; SharedPraatplaatViewer-statemachine → `PresentationSurface` mode `public`, `interactiveBoard` for praatplaat albums). Entry: `?album=CODE` in `App.tsx` and step 5 in the `ShareCodeInput` 8-char chain. The album code is shown large in `ShareAlbumModal` (same treatment as a class code).

`submissionMatchesAssignment(submission, assignment)` in `src/lib/assignments.ts` links a submission to an assignment row (template/praatplaat by UUID, storyboard/free by `assignment_ref`). Used by ClassDetail for the per-assignment "Bekijk inzendingen" action on history rows and for the "Actieve opdracht / Alle composities" choice before presenting.

### Statische leskaart-pagina's (/les/<key>, R4)

`scripts/generate-les-pages.mjs` (runs via `prebuild`) writes pure-HTML SEO pages to `public/les/<key>/index.html` + shared `public/les/les.css` and refreshes the `/les/` entries in `public/sitemap.xml` (idempotent). Content: i18n `lessonCards.builtin.<key>` (title/level/goal/phases) + non-i18n fields from `scripts/les-pages-data.json` (cover/typeLabel/pdf — keep in sync with `LANDING_LESSON_KEYS` and seed migrations 020/023). No JavaScript (CSP `script-src 'self'`-proof); CTA deeplinks to `/?screen=teacher&lesson=<key>`. `TeacherLandingPage` links each card to its page. Deploy: upload `dist/les/` along with the build.

### Supabase Security

**Row Level Security (RLS)** is required on all tables with user data. Always implement both:
1. Code-level filtering: `.eq('teacher_id', user.id)` in queries
2. Database-level: RLS policies (SELECT, INSERT, UPDATE, DELETE) using `auth.uid()`

**Server-side Rate Limiting**: All public RPC functions (`submit_composition`, `share_composition`, `get_shared_composition`, `share_praatplaat`, `get_shared_praatplaat`) are rate-limited via `check_rate_limit()` PostgreSQL function. Limits: 60/min per classcode (submit), 10/min per session (share), 30/min per code (get_shared), 10/min per teacher (share_praatplaat), 30/min per code (get_shared_praatplaat). Table: `rate_limits`. Migration: `supabase/migrations/002_rate_limiting.sql`.

**Lazy loading**: Supabase client is lazy-loaded via `getSupabase()` async getter in `src/lib/supabase.ts`. All 8 consumers use `await getSupabase()`. Main chunk reduced from 534KB to 152KB.

**Error constants**: `src/lib/supabaseErrors.ts` centralizes all Supabase/auth error string patterns (10 constants + `matchesError()` helper). Used by `submissions.ts`, `praatplaat.ts`, and `auth.ts` instead of inline string matching.

**Zod validation on RPC responses**: `parseCompositionData()` validates composition data from all Supabase RPC responses (`loadSavedComposition`, `getSharedComposition`, `getPraatplaatSubmissions`). Invalid data returns `null` + `logger.warn`.

### Online Bewaarcode (#52)

Students can save compositions online with a 6-character save code. On another device, entering the code loads the composition into the studio to continue working. Compositions expire after 60 days of inactivity (`last_updated_at`).

**Code types** (distinguished by length in `ShareCodeInput`):
- 4 digits → class code (teacher submission)
- 6 alphanumeric → save code (load into studio, read+write)
- 8 alphanumeric → share code, template code, or praatplaat share code (listen-only / template / public praatplaat)

**Security**: A `save_secret` (32-char token in localStorage via `storageService.setSaveOnlineInfo()`) is required for updates. On a new device, the student "claims" the composition via `claim_saved_composition()` which generates a new secret.

**Database**: Reuses `submissions` table with additional columns: `save_code`, `save_secret`, `last_updated_at`, `student_email`. Migration: `supabase/migrations/004_save_codes.sql`.

**RPC functions**: `save_composition_online`, `update_saved_composition`, `load_saved_composition`, `claim_saved_composition`. All rate-limited.

**Client flow**: `SaveOnlineModal` (Stage) → `saveCompositionOnline()` → code displayed. `ShareCodeInput` (Start) → 6-char detected → `loadSavedComposition()` → `claimSavedComposition()` → `initializeFromSavedComposition()` → studio.

**Auto-sync (#52-FASE2)**: When a local save occurs and `saveOnlineInfo` (saveCode + saveSecret) is in localStorage, `useStageSave` calls `updateSavedComposition()` to keep the online copy in sync. Success shows a green toast ("Online kopie bijgewerkt"); failure shows an amber warning toast ("Online kopie niet bijgewerkt"). State managed via `syncFeedback` in `useStageSave`.

**QR code**: `SaveOnlineModal` success state has a QR toggle button (via `qrcode` npm package) that shows a scannable QR of the 6-char code.

**Teacher "In bewerking" tab**: `ClassDetail` splits submissions by `save_code` presence. Compositions saved with a class code but not formally submitted appear under an "In bewerking" tab with a blue WIP badge and "Laatst bewerkt" timestamp.

### Praatplaat — Collaboratieve Klankkaart (#72)

A praatplaat (sound map) is a class activity where students create compositions and place them on a shared location image. The teacher presents the praatplaat on a digibord and clicks spots to play student compositions.

**Architecture**: Separate path from existing compose modes (Hypothesis C). Entry via class code → praatplaat detection → dedicated flow. No code overlap with "Bij een afbeelding" mode.

**Database**: `praatplaten` table (incl. `share_code`, `share_expires_at`, `share_view_count` for #73) + 3 nullable columns on `submissions` (`praatplaat_id`, `position_x`, `position_y`). **Activation is now driven by `class_assignments`** (migration 006 removed the old `praatplaten.is_active` trigger + partial unique index); the catalog find-or-create keys one instance per (class + image). Migrations: `005_praatplaten.sql`, `012_praatplaat_share.sql` (share), `017` (catalog). Share RPCs `share_praatplaat` / `get_shared_praatplaat` (SECURITY DEFINER); `get_active_praatplaat` remains a backward-compat wrapper.

**Teacher flow** (updated by praatplaat-catalogus, migration 017 — see **Assignments** above):
- Class-level activation is **catalog-based**: the teacher picks an image from `getPraatplaatCatalog()` (`src/data/praatplaatCatalog.ts` = praatplaatImages + theme locations) inside `ActivateAssignmentModal`, **plus a sound-theme** (dropdown pre-filled with the praatplaat's own `themeId`, TR5); `activate_praatplaat_from_catalog` find-or-creates one praatplaat instance per (class + image) and (since migration 034) updates its `theme_id`, then delegates to `activate_assignment`. `ClassDetail` no longer creates praatplaten per activation. The student flow calls `useThemeStore.setTheme(activePraatplaat.themeId)` so the collected sounds match the theme.
- `CreatePraatplaatModal` + `PraatplaatCard` are retained only for the **dashboard praatplaat library** (own/future-uploaded praatplaten), class-independent.
- `PraatplaatViewer` (opened from the active-assignment card in `ClassDetail`): fullscreen presentation with `PraatplaatSpot` icons on x,y positions, clustering (5% threshold), hover tooltips, click to play via `SubmissionPlayer`.
- `usePraatplaten` hook: dashboard-library CRUD with optimistic updates (follows `useTemplates` pattern)

**Student flow**:
- `ShareCodeInput`: 4-digit class code → `getActiveAssignment()` → `AssignmentLandingScreen` (#78) → on "Starten" `activatePendingAssignment()` sets the praatplaat context → `praatplaat-select`. (`getActivePraatplaat()` remains only as a backward-compat wrapper RPC.)
- `PraatplaatSelectScreen`: fullscreen image, click/tap to choose position (normalized 0-1)
- Position stored in `appStore.praatplaatPosition`
- Normal flow: map → studio → stage
- Auto-submit on save via `useStageSave` (fire-and-forget, like bewaarcode sync)
- **Important**: `useStageSave` has two submit paths — classSession (normal praatplaat flow) and legacy (no classSession). Both must set `setPraatplaatSubmitted(true)` on success for the StageView success modal to appear. The classSession path sets it when `assignmentType === 'praatplaat'`.
- After submission, a permanent "Kies een nieuwe plek" button appears on the stage (visible when `praatplaatSubmitted && activePraatplaat`)
- **Studio zoom (#80)**: `StorytellingPanel` zooms 2.5× to the chosen position via CSS `transform: scale()` + clamped `transformOrigin`. Toggle button (Crosshair/Maximize2) switches between zoomed and full view. Default: zoomed in.

**Sharing (#73)**: Docent deelt praatplaat via 8-char share code (30 dagen geldig, verlengbaar). `share_praatplaat()` RPC generates code (checks both `praatplaten.share_code` AND `submissions.share_code` for cross-collision avoidance). Public access via `?pp-share=CODE` → `SharedPraatplaatViewer` (lazy-loaded). State machine: loading → waiting-gesture → ready (+ error/not-found/expired). Audio init requires user gesture (`Tone.start()`). Generic clustering utility in `src/utils/praatplaatClustering.ts` shared between teacher and public viewer. `ShareCodeInput` 8-char fallback chain: template → share code → praatplaat share code → not found. Migration: `supabase/migrations/012_praatplaat_share.sql`.

**Key files**: `src/lib/praatplaat.ts` (Supabase client), `src/hooks/usePraatplaten.ts` (teacher hook), `src/components/praatplaat/` (PraatplaatSelectScreen, PraatplaatViewer, SharedPraatplaatViewer, PraatplaatSpot), `src/utils/praatplaatClustering.ts` (generic clustering), `src/components/teacher/` (PraatplaatCard, CreatePraatplaatModal, SharePraatplaatModal).

### i18n

Translation files at `src/i18n/locales/{nl,en}.json`. Uses `useTranslation()` hook. Keys are nested (e.g., `studio.timeline`, `samples.park-birds`). Some content arrays (e.g., `teacher.guide.sections.*.content`) mix plain strings with structured objects `{ type: 'heading', text: string }` — rendered via `isStructuredItem()` type guard in `TeacherGuideScreen`.

### Types

All shared interfaces in `src/types/index.ts`. Key types: `GameScreen`, `Location`, `Hotspot`, `Sample`, `Clip`, `Track`, `ClipEffects`, `SavedComposition` (localStorage) vs `SharedComposition` (Supabase), `Praatplaat`, `ActivePraatplaat`, `PraatplaatPosition`, `Opdrachtkaart` / `OpdrachtkaartContent` (assignment card), `ClassSession`. The assignment-type union lives in `src/lib/assignments.ts` (`AssignmentType = 'template' | 'praatplaat' | 'storyboard' | 'free'`).

### Design System

Design tokens in `src/index.css` via Tailwind `@theme`, following 60-30-10 rule:
- 60% neutral (slate), 30% brand (slate-900), 10% accent (amber)
- Semantic colors: `error-*`, `success-*`, `warning-*`
- Screen gradients: `--color-{start,location,studio,stage}-{from,via,to}`
- Responsive: `sm:` breakpoint (640px) for mobile/desktop. Touch-first with 44px minimum targets.

**Color conventions (CRITICAL — enforced by audit 2026-04-15):**
- **NEVER** use raw Tailwind colors (`red-*`, `green-*`, `blue-*`, `gray-*`, `amber-*`, `teal-*`). Always use design tokens.
- Error/destructive: `error-*` (not `red-*`)
- Success: `success-*` (not `green-*`)
- Warning/caution: `warning-*` (not `yellow-*`)
- Accent/interactive: `accent-*` or `primary-*` alias (not `amber-*`)
- Text: `text-text-main`, `text-text-muted`, `text-text-inverse` (not `gray-*` or `slate-*`)
- Borders: `border-border-subtle`, `border-neutral-*` (not `gray-*`)
- Backgrounds: `bg-bg-app`, `bg-bg-surface` (not arbitrary grays)

### UI Components

Reusable `Button`, `Card`, `Modal` in `src/components/ui/`. Use `cn()` from `src/utils/cn.ts` (clsx + tailwind-merge) for conditional classes.

**Button variants**: `primary` (accent bg, dark text), `secondary` (white bg), `ghost` (transparent), `danger` (error bg, white text). For destructive confirmation buttons that use `primary` variant with error override: always include `!text-white` — e.g., `className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"`.

**Destructive action pattern**: Never use `window.confirm()`. Use state-based Modal confirmation:
```tsx
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
// ...
<Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title={t('...')} size="sm">
  <p className="text-text-muted text-sm mb-6 leading-relaxed text-center whitespace-pre-line">{t('...')}</p>
  <div className="flex gap-3">
    <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="flex-1">{t('common.cancel')}</Button>
    <Button variant="primary" onClick={handleConfirm} className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white">{t('common.delete')}</Button>
  </div>
</Modal>
```

## Tone.js Pitfalls (Critical)

These are hard-won lessons — violating them causes subtle audio bugs:

1. **`Tone.Part` skips past events on seek**: `transport.start(time, offset)` skips events before offset. Clips already active at seek position must be started DIRECTLY with adjusted `trimStart` and `remainingDuration`. See `AudioService.startActiveClips()`.

2. **Players play independently of transport**: `player.start(time, offset, duration)` keeps playing even after `transport.pause()` or `transport.stop()`. Must explicitly stop all players on pause/stop. `transport.cancel()` must be called BEFORE `transport.stop()` to clear the lookahead buffer.

3. **`currentBeat` in callbacks causes re-render storms**: Never use `currentBeat` as a `useCallback` dependency — it updates ~20x/sec during playback. Read imperatively: `useAudioStore.getState().currentBeat`.

4. **Async sample loading race conditions**: Use `AbortController` pattern when loading samples. Always check `signal.aborted` BEFORE any state updates to prevent infinite render loops. Stabilize array dependencies with ID-based string comparison (not array references).

5. **On-demand players must auto-dispose**: Since PERF-1 refactor, all playback uses fire-and-forget players created from `ToneAudioBuffer`. Each player MUST register an `onstop` callback that disposes itself and removes from `activeSources`. Failing to dispose causes memory leaks. On pause/stop, `disposeActiveSources()` explicitly cleans up all tracked players.

6. **Permanent nodes cause audio dropouts at scale**: 170+ permanent `Tone.Player` nodes (each with a GainNode) exceed the audio render quantum budget (~2.9ms). Solution: use `ToneAudioBuffer` for storage (zero graph footprint) + on-demand players + track bus submix (9 permanent nodes total). See `docs/audio/archief/PLAN-AUDIO-REFACTOR.md`.

7. **CSS `transition-all` conflicts with pointer-based resize**: When resizing clips via pointer events, `transition-all` animates the width change, but absolutely-positioned children reposition instantly based on the final width. This creates visual jitter. Solution: conditionally disable `transition-all` during resize operations.

8. **`Tone.PitchShift` glitcht in `Tone.Offline`** (bewezen, dossier §15): granulaire korrelkliks op de korrelfrequentie (12 Hz bij pitch +12), offline ~12× erger dan live, met een sessie-afhankelijke catastrofale modus. Daarom is pitch sinds Audio Engine v2 een vooraf gebakken buffer (PitchBufferService/Signalsmith); gebruik PitchShift alleen nog als bewuste fallback. Algemener: bouw live- en offline-audio ALTIJD op dezelfde gedeelde modules (audioEvents/audioGraph) — parallelle implementaties groeien gegarandeerd uit elkaar.

9. **AudioWorklet-input wordt inactief zonder actieve bronnen**: `inputs[0]` kan leeg zijn zodra upstream-players disposen — een capture-worklet moet stilte dan expliciet zelf aanvullen (frame-geïndexeerd), anders mist de opname zijn stille staart. Zie `AudioService.captureRender`.

10. **Tone's context-wrapper ondersteunt maar ÉÉN `addAudioWorkletModule` per context** (empirisch, 24-7): een tweede module lijkt te registreren ("ok"), maar `createAudioWorkletNode` voor zijn processors gooit NotSupportedError. Oplossing: bundel álle eigen processors (limiter + capture) in één module (`AudioService.buildDspWorkletCode`), geregistreerd via één promise op het context-object (HMR-veilig — dubbele `registerProcessor` met dezelfde naam gooit ook NotSupportedError).

## Conventions

- Default exports for components, named exports for stores/hooks/types/utils
- Props destructured in function signatures
- Event handlers named `handleXxx`
- Section comments: `// --- Section ---`
- Tailwind utility classes only — no CSS modules, no styled-components
- Use `<Button>` component for standard buttons, custom only for specialized UI (e.g., circular transport controls)
- Beat-based positioning throughout (conversions in `src/utils/audio.ts`)
- Portal-based popovers for UI that needs to escape `overflow: hidden` (e.g., `VolumePopover`)
- Audio loading has graceful degradation (try-catch with `logger.warn`)

## Environment Variables

```bash
# .env.local
VITE_EMAILJS_SERVICE_ID=service_xxx    # Feedback system
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=xxx
VITE_SUPABASE_URL=xxx                  # Teacher dashboard
VITE_SUPABASE_ANON_KEY=xxx
VITE_ADMIN_EMAILS=xxx@example.com      # Comma-separated; these teacher accounts see the "Statistieken" button (UsageStatsPanel on usage_stats, migration 025) in the dashboard header
```

## Documentation

| File | Purpose |
|---|---|
| `docs/TODO.md` | Backlog (bundels, mobile-audit, device-tests) |
| `docs/USECASES-QA.md` | Rol-doorloop leerling+docent (56 usecases) + QA-bevindingen |
| `docs/audio/TONEJS-KENNISBANK.md` | Tone.js knowledge base & critical limitations |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Guide for adding locations and themes |
| `docs/PLAN-KLASCODE-SYSTEEM.md` | Supabase integration plan |
| `docs/PLAN-52-BEWAARCODE.md` | Online save code system design (#52) |
| `docs/audio/archief/PLAN-22-REALTIME-CLIP-TOEVOEGEN.md` | Real-time reschedule design (#22) |
| `docs/audio/archief/PLAN-CLIP-LOOP-EFFECTS.md` | Clip loop + effects implementation plan (#65, #33) |
| `docs/audio/archief/PLAN-AUDIO-REFACTOR.md` | Audio engine refactor: on-demand fire-and-forget players (PERF-1) |
| `docs/PLAN-72-PRAATPLAAT.md` | Praatplaat collaborative sound map design (#72) |
| `docs/HANDLEIDING-BEHEER.md` | Technical admin guide (deployment, Supabase, maintenance) + §4b "wat staat waar aan/uit" |
| `docs/TEKSTEN.md` | Generated NL+EN copy deck — edit the table, then `npm run teksten:import` |
| `docs/VIDEO-DRAAIBOEK.md` | Shot-by-shot script for the three `/teacher` videos (NL+EN labels, prep, where the IDs go) |
| `docs/LOGBOEK-MASTERPLAN.md` | 6-weken masterplan logbook (besluiten, sessies, acties voor Bert) |
| `docs/TESTPLAN-MASTERPLAN.md` | Manual test plan + hertest-lijsten per testronde |
| `docs/audio/AUDIT-EXPORTS.md` | Exports audit (MP3 + video): 16 findings + prioritized fix plan |
| `docs/audio/PLAN-AUDIO-ENGINE-V2.md` | **Audio Engine v2** (uitgevoerd 24-7): gedeelde motor, pitch-prebake, reverb-IR's, export-validator + vangnet |
| `docs/audio/ONDERZOEK-EXPORT-EFFECTGLITCH.md` | Afgerond onderzoek export-effectglitch (TR6) — §15 bevat de empirische bevindingen (PitchShift ontmaskerd) |
| `docs/BEWAREN-VAN-COMPOSITIES.md` | Leesbaar naslag: wanneer/waar/hoe lang leerlingwerk bewaard blijft en hoe je het terugvindt |
| `docs/WOORDENLIJST.md` | Terminology glossary (rollen, codes, termen) — draft |
| `soundscout-prd.md` | Product requirements document |
