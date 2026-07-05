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

Other screens: `'tutorial'` (video tutorials), `'compose-mode'` (storytelling mode selection), `'compositions'` (saved compositions), `'shared'` (shared composition player), `'shared-praatplaat'` (public praatplaat viewer #73), `'praatplaat-select'` (student position picker for praatplaat #72), `'assignment-landing'` (class code assignment preview before starting)

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
| `timelineStore` | Tracks (8 fixed), clips, BPM (120 fixed), 32 beats, looping, smart snap, clip trim, volume/mute, sections, clearAllTracks, clip loop, clip effects (pitch/reverb). Clip actions (`addClip`, `moveClip`, `duplicateClip`) accept `samples: Sample[]` as parameter — no direct dependency on libraryStore |
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
├── trackBuses: Tone.Gain[] (8)              — submix per track (mute control)
├── masterBus: Tone.Volume                   — master output
├── activeSources: Set<{player, nodes}>      — lifecycle-tracked on-demand players
├── timelinePart: Tone.Part | null           — scheduled clip events
├── scheduledTracks: Track[]                 — current timeline state for seek
├── scheduledSamples: Sample[]               — sample metadata for seek
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

**On-demand fire-and-forget architecture (PERF-1, 2026-04-22)**: Replaced 170+ permanent `Tone.Player` nodes with on-demand players created per clip event. Root cause of audio dropouts: each Player creates a permanent GainNode; 170+ GainNodes exceeded the 2.9ms render quantum budget (128 samples @ 44.1kHz). Now: `ToneAudioBuffer` stores sample data (zero audio graph footprint), `createOnDemandPlayer()` creates a fresh Player from the buffer at event time, routes through trackBus, and auto-disposes via `onstop` callback. `activeSources` Set tracks all live players. On pause: all activeSources are disposed, Part stays valid. On resume: Part callback + `startActiveClips()` create fresh players. See `docs/PLAN-AUDIO-REFACTOR.md` for full design rationale and implementation log.

**Playback flow**: `scheduleTimeline()` creates a `Tone.Part` with all clip events (each carrying `trackIndex` + `effects` config) → `play(fromBeat)` starts transport. Part callback calls `createOnDemandPlayer()` per event. For seek (fromBeat > 0), a **hybrid approach** is used: clips already active at the seek position are started directly via `startActiveClips()` (which also creates on-demand players), while future clips play via `Tone.Part`.

**Track bus submix**: 8 `Tone.Gain` buses (one per track) + 1 `Tone.Volume` master → Destination. Buses handle mute only (gain 0 or 1). Track + clip volume is baked into per-clip on-demand players. Total permanent nodes: ~9 (vs 170+ before refactor).

**Clip Loop (#65)**: `clip.loop` + `clip.loopDurationBeats` on the Clip interface. Looping clips generate multiple `ClipEvent`s in `scheduleTimeline()` (one per loop iteration). Resize handle uses pure pointer events (not dnd-kit) with half-beat grid snapping. Loop-aware collision detection via `getEffectiveClipDurationBeats()`. Loop-aware seek uses modulo arithmetic (`elapsedSeconds % singleDuration`) to find position within loop iteration.

**Clip Effects (#33, #79)**: Per-clip `PitchShift` (-12 to +12 semitones), `Reverb` (0-100%), and `Fade In/Out` (0 to clip duration in seconds). Clips with effects get **isolated effect chains** via `createOnDemandPlayer(buffer, volume, trackIndex, effects)` — the effects parameter triggers PitchShift/Reverb/FadeGain node creation in the chain. Clips without effects get a simple Player → trackBus route. `EffectsModal` component provides waveform with always-visible draggable fade handles + pitch/reverb sliders + preview button (`playSampleWithEffects()` creates temporary isolated chain). Chain order: Player → PitchShift → Reverb → FadeGain → Volume → trackBus → masterBus → Destination. Fade uses symmetric exponential curves: fade-in `x²` (gradual build from silence), fade-out `(1-x)²` (smooth descent to silence). Pre-computed `number[]` (128 steps) scheduled via `setValueCurveAtTime()` on a separate `Tone.Gain` node. For looping clips: fade-in and fade-out on every iteration (pulse effect — UX-FADE-LOOP, 2026-05-01). Seek into a fade region calculates intermediate volume using the same curve formula and schedules the remaining curve portion via `slice()`. **Trim+fade clamping**: when a clip is trimmed shorter, `updateClipTrim` proportionally scales down fades if `fadeIn + fadeOut > newDuration`.

**Live reschedule (#22)**: Timeline changes during playback are detected via `audioVersion` counter in `timelineStore` (incremented on every audio-relevant action). `useRescheduleOnChange` hook watches this counter; when it changes while `isPlaying === true`, it calls `AudioService.rescheduleWhilePlaying()` which disposes all activeSources, rebuilds the `Tone.Part` with current tracks, and resumes from the same beat position. **Convention**: any new timelineStore action that affects audio output MUST increment `audioVersion` in its `set()` call.

**Volume**: Track + clip volume (dB) is applied per on-demand player via `player.volume.setValueAtTime()` before `player.start()`. For effect chain players, volume is baked into the chain's `Tone.Volume` node. Track buses handle mute only (gain 0 or 1). Muted clips/tracks are skipped entirely.

**MP3 export**: `src/utils/audioExport.ts` uses `Tone.Offline()` for offline rendering + `@breezystack/lamejs` (dynamic import, loaded on first export) for MP3 encoding. Output: 128kbps stereo.

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

The Stage screen (`StageView.tsx`) is the performance screen where students listen to their composition. Clean layout with only 3 buttons visible: **Save** (primary), **Share & Export** (secondary, opens `StageActionsModal`), and **New Composition** (ghost).

`StageActionsModal` groups all secondary actions with section headers and hint text per button: Save & Share (save online, share link, share with teacher), Export (MP3, video), and Teacher (save as template, teacher-only). The modal slides up from the bottom on mobile (`items-end`, `rounded-t-2xl`) and centers on desktop.

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

Teachers log in via Supabase auth. `readOnly` prop on Timeline/Track/Clip disables DnD and hides edit controls. Max 8 classes per teacher (free tier). The dashboard has three large tabs (`SegmentedTabs`): **Mijn klassen**, **Mijn opdrachten** (opdrachtkaarten + praatplaten + storyboards + templates), **Leskaarten**.

### Assignments & Leskaarten (opdrachten-architectuur)

A teacher activates **one active assignment per class**; students enter the 4-digit class code to reach it. Four `AssignmentType`s (`src/lib/assignments.ts`): `template` (teacher-built composition), `praatplaat` (collaborative sound map, see #72 below), `storyboard` (app-content image story), `free` (free composition within a chosen theme — sound-only, no image/story).

**`class_assignments` table** = the per-class assignment *instance*. Polymorphic + discriminated by `assignment_type`: `template_id`/`praatplaat_id` (UUID FKs) · `storyboard_ref`/`free_theme_id` (TEXT registry refs) · `card_id` (opdrachtkaart) · `is_active`. A single-active trigger + a partial unique index per (class, source) enforce one active assignment and enable **resume-or-insert**: `activate_assignment(p_class_id, p_template_id, p_praatplaat_id, p_storyboard_ref, p_card_id, p_free_theme_id)` (SECURITY DEFINER, idempotent) reactivates an existing row rather than duplicating. `get_active_assignment(class_code)` returns a type-stable `{ assignment_type, payload JSONB, card JSONB, class_id, class_name }`; the client maps it in `getActiveAssignment()`. `useClassAssignment` (teacher) exposes `activateTemplate/Praatplaat/PraatplaatFromCatalog/Storyboard/Free`. Type-first UI: `AssignmentTypeCards` (4 cards) → `ActivateAssignmentModal` (2-column: scrollable resource/theme list + preview) in `ClassDetail`.

**Opdrachtkaart** (`assignment_cards`, migration 016) = a shape-independent instruction card (title + ≤10 bullets) the student sees before starting. Teacher-owned, reusable, linked per assignment via `class_assignments.card_id` (`ON DELETE SET NULL`); `card_id NULL` → the client shows a per-type default (`assignmentCards.defaults.{type}` in i18n). `AssignmentCardEditorModal` + `useAssignmentCards`.

**Praatplaat catalogus** (migration 017): praatplaten are chosen from a fixed catalog (`src/data/praatplaatCatalog.ts`); `activate_praatplaat_from_catalog(...)` find-or-creates one praatplaat instance per (class + image) then delegates to `activate_assignment`, so submissions + sharing keep working.

**Leskaarten** (`lesson_cards`, migrations 019–021) = reusable "packages" modeled as a **thin preset** over the above — a lesson card stores only *choices* (type + resource-ref + opdrachtkaart + presentation metadata: title/level/lesson_goal/phases/cover/pdf), never its own content. `activate_lesson_card(p_lesson_card_id, p_class_id)` resolves the opdrachtkaart (`card_id` direct, or `card_inline` JSONB find-or-creates a teacher `assignment_cards` row) and delegates to `activate_assignment`/`activate_praatplaat_from_catalog` — one source of truth. Two kinds: teacher-owned (`teacher_id = auth.uid()`, RLS CRUD) and **built-in** (`teacher_id NULL` + `builtin_key`, SQL-seeded in 020, read-only). CHECKs: `lesson_cards_one_resource`, `lesson_cards_one_card_source`, `lesson_cards_builtin_ownership`. Client: `src/lib/lessonCards.ts` + `useLessonCards`; UI: `LessonCardsTab` (dashboard master-detail), `LessonCardEditorModal` (authoring: type → resource → opdrachtkaart → presentation), `ActivateLessonCardModal` (pick/create class → activate → show code). The public landing (`/teacher`) reads built-ins via `get_builtin_lesson_cards()` (SECURITY DEFINER, anon); its **"Open voor je klas"** navigates to `/?screen=teacher&lesson=<builtin_key>` → `appStore.pendingLessonCardKey` survives the login hop → dashboard opens the Leskaarten tab on that card.

Migrations for this subsystem: `006` class_assignments · `015` storyboard type · `016` opdrachtkaarten · `017` resume-model + praatplaat catalog · `018` `free` type · `019` lesson_cards + `activate_lesson_card` · `020` seed built-ins · `021` public `get_builtin_lesson_cards`.

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
- Class-level activation is **catalog-based**: the teacher picks an image from `getPraatplaatCatalog()` (`src/data/praatplaatCatalog.ts` = praatplaatImages + theme locations) inside `ActivateAssignmentModal`; `activate_praatplaat_from_catalog` find-or-creates one praatplaat instance per (class + image), then delegates to `activate_assignment`. `ClassDetail` no longer creates praatplaten per activation.
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

6. **Permanent nodes cause audio dropouts at scale**: 170+ permanent `Tone.Player` nodes (each with a GainNode) exceed the audio render quantum budget (~2.9ms). Solution: use `ToneAudioBuffer` for storage (zero graph footprint) + on-demand players + track bus submix (9 permanent nodes total). See `docs/PLAN-AUDIO-REFACTOR.md`.

7. **CSS `transition-all` conflicts with pointer-based resize**: When resizing clips via pointer events, `transition-all` animates the width change, but absolutely-positioned children reposition instantly based on the final width. This creates visual jitter. Solution: conditionally disable `transition-all` during resize operations.

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
```

## Documentation

| File | Purpose |
|---|---|
| `docs/TODO-IMPLEMENTATIE.md` | Fase 4-5 prioritized feature list |
| `docs/TONEJS-KENNISBANK.md` | Tone.js knowledge base & critical limitations |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Guide for adding locations and themes |
| `docs/PLAN-KLASCODE-SYSTEEM.md` | Supabase integration plan |
| `docs/PLAN-52-BEWAARCODE.md` | Online save code system design (#52) |
| `docs/PLAN-22-REALTIME-CLIP-TOEVOEGEN.md` | Real-time reschedule design (#22) |
| `docs/PLAN-CLIP-LOOP-EFFECTS.md` | Clip loop + effects implementation plan (#65, #33) |
| `docs/PLAN-AUDIO-REFACTOR.md` | Audio engine refactor: on-demand fire-and-forget players (PERF-1) |
| `docs/PLAN-72-PRAATPLAAT.md` | Praatplaat collaborative sound map design (#72) |
| `docs/HANDLEIDING-BEHEER.md` | Technical admin guide (deployment, Supabase, maintenance) |
| `soundscout-prd.md` | Product requirements document |
