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

No router — `App.tsx` switches on `gameStore.currentScreen`:
`'start'` → `'map'` → `'location'` → `'studio'` → `'stage'`

Teacher screens: `'teacher-login'` → `'teacher-dashboard'` → `'compositions'`

Each screen maps to a component in `src/components/` (e.g., `StudioView`, `MapView`).

### State Management (Zustand Stores)

Seven independent stores in `src/stores/`:

| Store | Responsibility |
|---|---|
| `appStore` (alias: `gameStore`) | Current screen, active location ID, current composition ID |
| `audioStore` | Playback state (isPlaying, currentBeat) |
| `timelineStore` | Tracks (8 fixed), clips, BPM (120 fixed), 32 beats, looping, smart snap, clip trim, volume/mute, sections, clearAllTracks, clip loop, clip effects (pitch/reverb) |
| `libraryStore` | Recorder slots (max 6), collected samples, transfer to library |
| `userStore` | User session, role (guest/student/teacher), class code |
| `themeStore` | Active theme, locations, samples, map config (loaded from `?theme=` URL param) |
| `selectionStore` | Selected clip ID + track index for inline clip edit |

**Pattern**: Direct selectors `useStore((s) => s.field)`. For non-reactive reads in callbacks, use `useStore.getState().field` to avoid unnecessary re-renders (see Tone.js Pitfalls below).

### Services (Singletons)

| Service | Responsibility |
|---|---|
| `AudioService.ts` | Tone.js audio engine — sample loading (parallel with retry), playback scheduling, seek, ambient audio, waveform cache |
| `StorageService.ts` | localStorage wrapper for compositions (max 10), library, preferences |

### Audio Engine — Key Architecture

`AudioService` is a singleton wrapping Tone.js. `useAudioEngine` hook provides the React interface.

```
AudioService (singleton)
├── players: Map<sampleId, Tone.Player>     — cached, loaded lazily (shared)
├── timelinePart: Tone.Part | null          — scheduled clip events
├── scheduledTracks: Track[]                — current timeline state for seek
├── scheduledSamples: Sample[]              — sample metadata for seek
├── effectChains: Array<{player, nodes}>    — isolated players for clips with effects
├── clipEffectChainMap: Map<clipId, index>  — lookup for seek support
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

**Playback flow**: `scheduleTimeline()` creates a `Tone.Part` with all clip events → `play(fromBeat)` starts transport. For seek (fromBeat > 0), a **hybrid approach** is used: clips already active at the seek position are started directly via `startActiveClips()`, while future clips play via `Tone.Part`.

**Clip Loop (#65)**: `clip.loop` + `clip.loopDurationBeats` on the Clip interface. Looping clips generate multiple `ClipEvent`s in `scheduleTimeline()` (one per loop iteration). Resize handle uses pure pointer events (not dnd-kit) with half-beat grid snapping. Loop-aware collision detection via `getEffectiveClipDurationBeats()`. Loop-aware seek uses modulo arithmetic (`elapsedSeconds % singleDuration`) to find position within loop iteration.

**Clip Effects (#33)**: Per-clip `PitchShift` (-12 to +12 semitones) and `Reverb` (0-100%). Clips with effects get **isolated effect chains** (separate `Tone.Player` + effect nodes) stored in `effectChains[]`. Shared players remain unmodified for clips without effects. `clipEffectChainMap` maps clipId → effectChainIndex so `startActiveClips()` uses the correct player on seek. Effect chains are created in `scheduleTimeline()`, stopped (not disposed) on `pause()`, and fully disposed on `stop()` and before re-scheduling. `EffectsPopover` component (portal-based) provides pitch/reverb sliders.

**Live reschedule (#22)**: Timeline changes during playback are detected via `audioVersion` counter in `timelineStore` (incremented on every audio-relevant action). `useRescheduleOnChange` hook watches this counter; when it changes while `isPlaying === true`, it calls `AudioService.rescheduleWhilePlaying()` which stops all players, rebuilds the `Tone.Part` with current tracks, and resumes from the same beat position. **Convention**: any new timelineStore action that affects audio output MUST increment `audioVersion` in its `set()` call.

**Volume**: No persistent `Tone.Gain` nodes. Volume is calculated per clip event as `trackVolume + clipVolume` (dB) and applied via `player.volume.setValueAtTime()` before each `player.start()`. For effect chain clips, volume is baked into the chain's `Tone.Volume` node. Muted clips/tracks are skipped entirely.

**MP3 export**: `src/utils/audioExport.ts` uses `Tone.Offline()` for offline rendering + `@breezystack/lamejs` for MP3 encoding. Output: 128kbps stereo.

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
- **Center**: Inline clip edit actions (trim, duplicate, volume, effects, delete) — only visible when a clip is selected. Effects button opens `EffectsPopover` (pitch/reverb sliders).
- **Right**: Flag (section mark), Eraser (clear timeline with inline confirm), Undo/Redo

The Timeline has `max-h-[50dvh]` to guarantee the sample library gets enough space. Tracks scroll vertically within `overflow-y-auto min-h-0 flex-1`.

**Template locking**: When `activeTemplate !== null`, section mark button is hidden and `SectionBar` gets `readOnly` prop. Template clips are locked per-clip via `clip.fromTemplate === true`.

### Drag-and-Drop

`StudioView.tsx` owns the dnd-kit `DndContext`. Two drag sources: samples from library, clips on tracks.

- **Visual feedback**: Snap preview (dashed outline) shown over tracks; DragOverlay shown only when NOT over a track; original clip hidden (`opacity-0`) during drag
- **Clip repositioning**: Delta-based — new position = original position + drag delta (not cursor position)
- **Smart snap** (`src/utils/clipCollision.ts`): Try original position → shift after blocking clip → try tracks below → reject
- Sensors: PointerSensor (8px distance) + TouchSensor (150ms delay)

### Theme System

Themes in `src/data/themes/{themeId}/` — each has `locations.ts`, `samples.ts`, `map.ts`, `index.ts`.

- `?theme=x` URL param loads theme (default: `basis`)
- Assets: `/public/audio/themes/{themeId}/{locationId}/{sampleId}.mp3` and `/public/images/themes/{themeId}/`
- Guide for adding themes: `docs/NIEUWE-LOCATIE-THEMA.md`

### Teacher Dashboard

Teachers log in via Supabase auth. `readOnly` prop on Timeline/Track/Clip disables DnD and hides edit controls. Max 8 classes per teacher (free tier).

### Supabase Security

**Row Level Security (RLS)** is required on all tables with user data. Always implement both:
1. Code-level filtering: `.eq('teacher_id', user.id)` in queries
2. Database-level: RLS policies (SELECT, INSERT, UPDATE, DELETE) using `auth.uid()`

**Server-side Rate Limiting**: All public RPC functions (`submit_composition`, `share_composition`, `get_shared_composition`) are rate-limited via `check_rate_limit()` PostgreSQL function. Limits: 60/min per classcode (submit), 10/min per session (share), 30/min per code (get_shared). Table: `rate_limits`. Migration: `supabase/migrations/002_rate_limiting.sql`.

### i18n

Translation files at `src/i18n/locales/{nl,en}.json`. Uses `useTranslation()` hook. Keys are nested (e.g., `studio.timeline`, `samples.park-birds`).

### Types

All shared interfaces in `src/types/index.ts`. Key types: `GameScreen`, `Location`, `Hotspot`, `Sample`, `Clip`, `Track`, `ClipEffects`, `SavedComposition` (localStorage) vs `SharedComposition` (Supabase).

### Design System

Design tokens in `src/index.css` via Tailwind `@theme`, following 60-30-10 rule:
- 60% neutral (slate), 30% brand (slate-900), 10% accent (amber)
- Semantic colors: `danger-*`, `success-*`, `warning-*`
- Screen gradients: `--color-{start,location,studio,stage}-{from,via,to}`
- Responsive: `sm:` breakpoint (640px) for mobile/desktop. Touch-first with 44px minimum targets.

### UI Components

Reusable `Button`, `Card`, `Modal` in `src/components/ui/`. Use `cn()` from `src/utils/cn.ts` (clsx + tailwind-merge) for conditional classes.

## Tone.js Pitfalls (Critical)

These are hard-won lessons — violating them causes subtle audio bugs:

1. **`Tone.Part` skips past events on seek**: `transport.start(time, offset)` skips events before offset. Clips already active at seek position must be started DIRECTLY with adjusted `trimStart` and `remainingDuration`. See `AudioService.startActiveClips()`.

2. **Players play independently of transport**: `player.start(time, offset, duration)` keeps playing even after `transport.pause()` or `transport.stop()`. Must explicitly stop all players on pause/stop. `transport.cancel()` must be called BEFORE `transport.stop()` to clear the lookahead buffer.

3. **`currentBeat` in callbacks causes re-render storms**: Never use `currentBeat` as a `useCallback` dependency — it updates ~20x/sec during playback. Read imperatively: `useAudioStore.getState().currentBeat`.

4. **Async sample loading race conditions**: Use `AbortController` pattern when loading samples. Always check `signal.aborted` BEFORE any state updates to prevent infinite render loops. Stabilize array dependencies with ID-based string comparison (not array references).

5. **Shared players can't have per-clip effects**: `Tone.Player` instances are shared across clips using the same sample. If one clip needs pitch shift and another doesn't, the shared player can't serve both. Solution: create **isolated players** (cloned from the shared player's buffer) with their own effect chain for clips with effects. Store in `effectChains[]` and map via `clipEffectChainMap`.

6. **Seek must use effect chain players**: `startActiveClips()` starts clips that are "already playing" at the seek position. It MUST use the effect chain player (not the shared player) for clips with effects, otherwise both the original and effected sound play simultaneously. The `clipEffectChainMap` lookup solves this.

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
| `soundscout-prd.md` | Product requirements document |
