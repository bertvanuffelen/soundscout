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
| `timelineStore` | Tracks (8 fixed), clips, BPM (120 fixed), 32 beats, looping, smart snap, clip trim, volume/mute |
| `libraryStore` | Recorder slots (max 6), collected samples, transfer to library |
| `userStore` | User session, role (guest/student/teacher), class code |
| `themeStore` | Active theme, locations, samples, map config (loaded from `?theme=` URL param) |
| `selectionStore` | Selected clip ID + track index for edit toolbar |

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
├── players: Map<sampleId, Tone.Player>     — cached, loaded lazily
├── timelinePart: Tone.Part | null          — scheduled clip events
├── scheduledTracks: Track[]                — current timeline state for seek
├── scheduledSamples: Sample[]              — sample metadata for seek
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

**Playback flow**: `scheduleTimeline()` creates a `Tone.Part` with all clip events → `play(fromBeat)` starts transport. For seek (fromBeat > 0), a **hybrid approach** is used: clips already active at the seek position are started directly via `startActiveClips()`, while future clips play via `Tone.Part`.

**Volume**: No persistent `Tone.Gain` nodes. Volume is calculated per clip event as `trackVolume + clipVolume` (dB) and applied via `player.volume.setValueAtTime()` before each `player.start()`. Muted clips/tracks are skipped entirely.

**MP3 export**: `src/utils/audioExport.ts` uses `Tone.Offline()` for offline rendering + `@breezystack/lamejs` for MP3 encoding. Output: 128kbps stereo.

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
