# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundScout is a React web app for teaching kids music composition. Players explore locations to collect audio samples, arrange them on a beat-based timeline in a studio, and perform compositions in a club venue.

## Commands

```bash
npm run dev       # Vite dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run lint      # ESLint (flat config, TS + React rules)
npm run preview   # Preview production build locally
```

npm test         # Vitest test suite

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode) + **Vite 7**
- **Zustand 5** for state management (multiple independent stores, no middleware)
- **Tone.js 15** for Web Audio (sample playback, transport scheduling)
- **@dnd-kit** for drag-and-drop (clips on timeline)
- **Tailwind CSS 4** (via `@tailwindcss/vite` plugin, utility classes only)
- **i18next** for i18n (Dutch default, English fallback)

## Architecture

### Screen Navigation

No router — `App.tsx` switches on `gameStore.currentScreen`:
`'start'` → `'map'` → `'location'` → `'studio'` → `'club'`

Each screen maps to a top-level component in `src/components/`.

### Theme System

Themes are configured in `src/data/themes/`:
- Each theme has: `locations.ts`, `samples.ts`, `map.ts`, `index.ts`
- `ThemeStore` (`src/stores/themeStore.ts`) manages active theme
- URL parameter `?theme=x` loads specific theme (default: `basis`)
- Assets at `/public/audio/themes/{themeId}/{locationId}/` and `/public/images/themes/{themeId}/`
- Documentation: `docs/NIEUWE-LOCATIE-THEMA.md`

### State Management (Zustand Stores)

Five independent stores in `src/stores/`:

| Store | Responsibility |
|---|---|
| `appStore` (alias: `gameStore`) | Current screen + active location ID + current composition ID |
| `audioStore` | Playback state (isPlaying, currentBeat) |
| `timelineStore` | Tracks (8 fixed), clips, BPM (120 fixed), 32 beats, looping, overlap prevention |
| `libraryStore` | Recorder slots (max 6), collected samples, transfer to library |
| `userStore` | User session, role (guest/student/teacher), class code (Fase 4 prep) |
| `themeStore` | Active theme, locations, samples, map config (loaded from URL param) |

Stores are consumed with direct selectors: `useStore((s) => s.field)`.

### Services

| Service | Responsibility |
|---|---|
| `AudioService.ts` | Singleton for Tone.js audio engine, sample loading, playback |
| `StorageService.ts` | localStorage wrapper for compositions, library, preferences |

### Audio Engine

`src/hooks/useAudioEngine.ts` wraps Tone.js:
- **Player pooling**: `Map<sampleId, Tone.Player>` cached in `useRef`, loaded lazily
- **Preview playback**: `playSample()` for hotspot interactions
- **Timeline scheduling**: `scheduleTimeline()` schedules all clips via `Tone.getTransport()`
- **Playhead sync**: 50ms interval (~20fps) pushes `currentBeat` to `audioStore`
- BPM is hardcoded at 120, not user-adjustable

### Audio Export

MP3 export implemented in `src/utils/audioExport.ts`:
- **Offline rendering**: Uses `Tone.Offline()` for sample-accurate, faster-than-realtime rendering
- **MP3 encoding**: `@breezystack/lamejs` (ES module compatible fork)
- **Hook**: `src/hooks/useAudioExport.ts` provides `exportMp3()` with progress tracking
- **UI**: Download button in ClubView with loading spinner and progress percentage
- **Output**: 128kbps stereo MP3, filename from composition name

### Drag-and-Drop

`StudioView.tsx` owns the dnd-kit `DndContext`. Clips are draggable within and across tracks. `DragOverlay` renders a preview during drag. Sensors: PointerSensor (8px) + TouchSensor (150ms delay).

### Data Layer

Theme-based organization in `src/data/themes/{themeId}/`:
- `locations.ts` — Location definitions with hotspot coordinates
- `samples.ts` — Sample metadata (name, duration, icon, color)
- `map.ts` — Map background image and location positions
- `index.ts` — Theme config export

Asset paths:
- Audio: `/public/audio/themes/{themeId}/{locationId}/{sampleId}.mp3`
- Images: `/public/images/themes/{themeId}/{locationId}.png`

### i18n

Configured in `src/i18n/index.ts`. Translation files at `src/i18n/locales/{nl,en}.json`. Uses `useTranslation()` hook. Keys are nested (e.g., `studio.timeline`, `samples.park-birds`).

### Types

All shared interfaces in `src/types/index.ts`:

**Core types:**
`GameScreen`, `Location`, `Hotspot`, `Sample`, `Clip`, `Track`, `TimelineState`, `LibraryState`

**Composition types (important distinction):**
| Type | Storage | Purpose |
|---|---|---|
| `SavedComposition` | localStorage | Private, local saves (max 10) |
| `SharedComposition` | Supabase (future) | Public, shared with class/teacher |

**User/Class types (Fase 4 prep):**
`UserRole`, `UserSession`, `ClassInfo`

**Audio effect types (Fase 5 prep):**
`ClipEffects`, `CompositionMetadata`

### UI Component Library

Reusable components in `src/components/ui/`:

| Component | Variants | Usage |
|---|---|---|
| `Button` | primary, secondary, ghost, danger | All standard buttons |
| `Card` | default, elevated, glass | Container panels |
| `Modal` | sm, md, lg | Dialogs, confirmations |

Use `cn()` utility from `src/utils/cn.ts` for conditional class merging (clsx + tailwind-merge).

### CSS Theme

Design tokens defined in `src/index.css` via Tailwind `@theme` directive:
- `--color-primary-*` (sky blue)
- `--color-accent-*` (amber)
- `--color-danger-*`, `--color-success-*`, `--color-warning-*`
- Screen gradients: `--color-{start,location,studio,club}-{from,via,to}`

### Responsive Design

All components use Tailwind `sm:` breakpoint (640px) for mobile/desktop distinction:

| Component | Mobile (<640px) | Desktop (≥640px) |
|---|---|---|
| Buttons | 36-40px height, smaller text | 44-56px height |
| LocationMarker | 20×20px, no labels | 64×64px with labels |
| SampleLibrary items | Compact (py-1, text-[10px]) | Normal (py-2, text-sm) |
| RecorderBar slots | 48px min-width | 56px min-width |
| Track height | 40px | 48px |

**Touch-first patterns:**
- `active:scale-95` + `active:bg-*` for tap feedback
- Hover-dependent actions (CompositionCard, Clip) visible by default on mobile (`sm:opacity-0 sm:group-hover:opacity-100`)
- Minimum touch targets: 44px (WCAG), hotspots have `minWidth: 44px`
- Touch events added to Hotspot (`onTouchStart`, `onTouchEnd`)

## Conventions

- Default exports for components, named exports for stores/hooks/types
- Props destructured in function signatures
- Event handlers named `handleXxx`
- Section comments use `// --- Section ---` format
- Tailwind utility classes only — no CSS modules, no styled-components
- Use `<Button>` component for standard buttons, custom only for specialized UI (circular transport controls)
- Audio loading has graceful degradation (try-catch with `logger.warn`)
- Beat-based positioning throughout (conversions in `src/utils/audio.ts`)

## Documentation

| File | Purpose |
|---|---|
| `todo-implementatie.md` | MVP implementation progress (Fase 1-3, voltooid) |
| `docs/TODO-IMPLEMENTATIE.md` | Fase 4-5 prioritized feature list |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Guide for adding locations and themes |
| `docs/PLAN-EXPORT-MP3.md` | MP3 export implementation plan (voltooid) |
| `docs/PLAN-KLASCODE-SYSTEEM.md` | Future Supabase integration plan |
| `docs/responsive-design-analysis.md` | Responsive design patterns and implementation |
| `soundscout-prd.md` | Product requirements document |
