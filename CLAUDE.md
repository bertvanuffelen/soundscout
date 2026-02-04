# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoundScout is a React web app for teaching kids music composition. Players explore locations to collect audio samples, arrange them on a beat-based timeline in a studio, and perform compositions on a stage (formerly "club"). Teachers can create classes, receive student submissions via class codes, and review compositions through a dedicated dashboard.

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
`'start'` → `'map'` → `'location'` → `'studio'` → `'stage'`

Additional screens for teachers:
`'teacher-login'` → `'teacher-dashboard'` → `'compositions'`

Each screen maps to a top-level component in `src/components/`.

**Note:** "Club" renamed to "Stage" (2026-02-02)

### Theme System

Themes are configured in `src/data/themes/`:
- Each theme has: `locations.ts`, `samples.ts`, `map.ts`, `index.ts`
- `ThemeStore` (`src/stores/themeStore.ts`) manages active theme
- URL parameter `?theme=x` loads specific theme (default: `basis`)
- Assets at `/public/audio/themes/{themeId}/{locationId}/` and `/public/images/themes/{themeId}/`
- Documentation: `docs/NIEUWE-LOCATIE-THEMA.md`

### State Management (Zustand Stores)

Six independent stores in `src/stores/`:

| Store | Responsibility |
|---|---|
| `appStore` (alias: `gameStore`) | Current screen + active location ID + current composition ID |
| `audioStore` | Playback state (isPlaying, currentBeat) |
| `timelineStore` | Tracks (8 fixed), clips, BPM (120 fixed), 32 beats, looping, smart snap, clip trim |
| `libraryStore` | Recorder slots (max 6), collected samples, transfer to library |
| `userStore` | User session, role (guest/student/teacher), class code (Fase 4 prep) |
| `themeStore` | Active theme, locations, samples, map config (loaded from URL param) |
| `selectionStore` | Selected clip ID + track index for edit toolbar |

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

`StudioView.tsx` owns the dnd-kit `DndContext`. Clips are draggable within and across tracks.

**Visual feedback:**
- When dragging over a track: only the **snap preview** (dashed outline) is visible
- When not over a track: only the **DragOverlay** is visible
- Original clip is hidden (`opacity-0`) during drag

**Clip repositioning:** Uses delta-based calculation so clips stay at their original position + drag delta (not cursor position). This allows precise fine-tuning.

Sensors: PointerSensor (8px) + TouchSensor (150ms delay).

### Teacher Dashboard

Teachers can log in via Supabase auth and view student compositions:
- `TeacherDashboard.tsx` - Class overview with student submissions
- `CompositionsView.tsx` - Detailed list of compositions per class
- `SubmissionPlayer.tsx` - Fullscreen modal to play student compositions with read-only timeline

**Class Limits:**
- Free tier: Maximum 8 classes per teacher (sufficient for primary school groups 1-8)
- Stored in `teachers.max_classes` column (default: 8)
- Future: Paid tier with unlimited classes

**Read-Only Timeline Viewing:**
The Timeline, Track, and Clip components support a `readOnly` prop:
- `readOnly={true}` disables drag-and-drop (via `disabled` prop on useDraggable/useDroppable)
- Hides remove buttons on clips
- Hides drag hints
- Custom `samples` prop allows lookup from submission data instead of theme store

### Supabase Security (BELANGRIJK)

**Row Level Security (RLS)** moet ALTIJD worden ingesteld voor alle tabellen met gebruikersdata. Dit voorkomt dat gebruikers elkaars data kunnen zien/bewerken.

**Basis principe:**
1. **Code-level filtering:** Queries filteren op `user.id` (bijv. `.eq('teacher_id', user.id)`)
2. **Database-level security:** RLS policies als tweede beveiligingslaag

**RLS Policies voor classes tabel (voorbeeld):**
```sql
-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Docenten kunnen alleen eigen klassen zien
CREATE POLICY "Teachers can view own classes"
ON classes FOR SELECT
USING (teacher_id = auth.uid());

-- Docenten kunnen alleen voor zichzelf klassen aanmaken
CREATE POLICY "Teachers can insert own classes"
ON classes FOR INSERT
WITH CHECK (teacher_id = auth.uid());

-- Docenten kunnen alleen eigen klassen updaten
CREATE POLICY "Teachers can update own classes"
ON classes FOR UPDATE
USING (teacher_id = auth.uid());

-- Docenten kunnen alleen eigen klassen verwijderen
CREATE POLICY "Teachers can delete own classes"
ON classes FOR DELETE
USING (teacher_id = auth.uid());
```

**Checklist bij nieuwe tabellen:**
- [ ] RLS inschakelen: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- [ ] SELECT policy aanmaken
- [ ] INSERT policy met `WITH CHECK`
- [ ] UPDATE/DELETE policies indien nodig
- [ ] Code-level filtering toevoegen (`.eq('user_id', user.id)`)

**URL Configuration (Authentication → URL Configuration):**
- **Site URL**: Productie domein (zonder trailing slash)
- **Redirect URLs**: Beide toevoegen met wildcard:
  - `https://jouw-domein.nl/**`
  - `http://localhost:5173/**`

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

### CSS Theme & Design System

Design tokens defined in `src/index.css` via Tailwind `@theme` directive, following the **60-30-10 rule**:

**60% - Neutral Colors (Background & Text)**
- `--color-neutral-*` (slate 50-900)
- `--color-bg-app` (#F4F6F8 - main app background)
- `--color-bg-surface` (#FFFFFF - cards/panels)
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`

**30% - Brand Colors (Headers, Navigation)**
- `--color-brand-*` (slate palette, 50-900)
- Primary brand color: `#0f172a` (slate-900) - used for headers, logo

**10% - Accent Colors (CTAs, Interactive)**
- `--color-accent-*` (amber palette)
- Primary accent: amber-400/500 for buttons, highlights
- `--color-primary-*` aliased to accent colors for compatibility

**Semantic Colors:**
- `--color-danger-*`, `--color-success-*`, `--color-warning-*`
- Screen gradients: `--color-{start,location,studio,stage}-{from,via,to}`

**Note:** "Club" has been renamed to "Stage" throughout the app.

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
| `todo-implementatie.md` | MVP implementation progress (Fase 1-3) + styling/UX updates |
| `docs/TODO-IMPLEMENTATIE.md` | Fase 4-5 prioritized feature list |
| `docs/ROADMAP-CLIP-TRIMMING.md` | Clip Trimming & Smart Snap roadmap (✅ voltooid) |
| `docs/ROADMAP-DRAG-OFFSET.md` | Drag Offset Alignment implementatie log (tijdelijk) |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Guide for adding locations and themes |
| `docs/PLAN-EXPORT-MP3.md` | MP3 export implementation plan (voltooid) |
| `docs/PLAN-KLASCODE-SYSTEEM.md` | Supabase integration plan (gedeeltelijk voltooid) |
| `docs/PLAN-LOCATIE-EDITOR.md` | Location editor implementation plan |
| `docs/responsive-design-analysis.md` | Responsive design patterns and implementation |
| `soundscout-prd.md` | Product requirements document |

## Recent Updates (2026-02-04)

### Drag Offset Alignment (#16) ✅ VOLTOOID

Verbeterde drag-and-drop UX: één duidelijk visueel element tijdens slepen.

**Problemen (opgelost):**
1. Meerdere visuele elementen zichtbaar tijdens drag (verwarrend voor leerlingen)
2. Bij clip verplaatsen: snap preview sprong naar cursor i.p.v. originele positie

**Oplossing - Deel 1: Eén visueel element**
- DragOverlay verborgen wanneer snap preview actief (boven track)
- Originele clip volledig verborgen tijdens drag (`opacity-0`)

**Oplossing - Deel 2: Delta-based clip repositioning**
- Clips behouden originele positie als uitgangspunt
- Nieuwe positie = originele positie + drag delta
- Samples uit library: cursor = linkerrand (ongewijzigd)

**Gewijzigde bestanden:**

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useStudioDnD.ts` | Delta-based berekening voor clips |
| `src/components/studio/StudioView.tsx` | DragOverlay verbergen bij snapPreview |
| `src/components/studio/Clip.tsx` | `opacity-0` bij isDragging |

**Implementatie useStudioDnD.ts:**
```typescript
// Nieuwe refs voor clip repositioning
const originalClipStartBeatRef = useRef<number | null>(null);
const activeDragTypeRef = useRef<'sample' | 'clip' | null>(null);

// Bij drag start: onthoud originele positie
if (dragType === 'clip') {
  originalClipStartBeatRef.current = clip?.startBeat ?? null;
}

// Bij drag move/end: delta-based berekening voor clips
if (currentDragType === 'clip' && originalClipStartBeat !== null) {
  const deltaBeats = (delta.x / clipAreaWidth) * totalBeats;
  startBeat = Math.round(originalClipStartBeat + deltaBeats);
} else {
  startBeat = calculateDropBeat(over, activatorEvent, delta);
}
```

**Implementatie StudioView.tsx:**
```typescript
// DragOverlay alleen tonen als NIET boven track (geen snapPreview)
<DragOverlay>
  {activeDragSample && !snapPreview ? (...) : null}
</DragOverlay>
```

**Implementatie Clip.tsx:**
```typescript
// Originele clip volledig verborgen tijdens drag
${isDragging ? 'opacity-0' : ''}
```

---

## Updates (2026-02-03)

### Audio Loading Robuuster (#15) ✅ VOLTOOID

Verbeterde audio loading met parallel loading, retry mechanisme, timeout bescherming, en progress UI:

**Nieuwe constants (`config.ts`):**
```typescript
AUDIO_LOAD_TIMEOUT_MS = 15000     // 15 seconden per sample
AUDIO_LOAD_MAX_RETRIES = 2        // Max 2 retry pogingen
AUDIO_LOAD_CONCURRENCY = 3        // Max 3 parallel loads
AMBIENT_AUDIO_VOLUME_DB = -15     // Ambient volume (-15dB)
AMBIENT_AUDIO_FADE_SECONDS = 1.5  // Fade duur
```

**AudioService verbeteringen:**
- `loadSamples()`: Nu parallel met batching (3 tegelijk) i.p.v. sequentieel
- `loadSampleWithRetry()`: Automatische retry met exponential backoff (1s, 2s)
- `loadSampleWithTimeout()`: 15 seconden timeout per sample
- Errors worden gelogd maar app crasht niet

**useLocationAudio verbeteringen:**
```typescript
const {
  isLoading,        // boolean
  loadingProgress,  // 0-100
  hasError,         // boolean (sommige samples gefaald)
  failedCount,      // aantal gefaalde samples
  retry,            // () => void - herlaad gefaalde samples
  playSample,
  stopSample,
  stopAll,
} = useLocationAudio({ samples, locationId, ambientUrl });
```

**LocationScene UI:**
- Progress bar met percentage tijdens laden
- Error state met amber icon + "Opnieuw proberen" knop

### Ambient Audio (#18) ✅ VOLTOOID

Ambient audio functionaliteit geïmplementeerd maar nog niet gekoppeld aan bestaande thema's:

**AudioService ambient methods:**
```typescript
audioService.loadAmbient(url: string): Promise<boolean>
audioService.playAmbient(): void
audioService.stopAmbient(fade?: boolean): void
audioService.setAmbientVolume(db: number): void
audioService.isAmbientAudioPlaying(): boolean
```

**Hoe ambient audio toe te voegen aan een locatie:**
```typescript
// In locations.ts van een thema:
{
  id: 'boerderij',
  name: 'locations.boerderij.name',
  description: 'locations.boerderij.description',
  backgroundImage: '/images/themes/basis/boerderij.png',
  ambientAudio: '/audio/themes/basis/ambient/boerderij.mp3', // ← Vul in
  hotspots: [...],
  unlocked: true,
}
```

**Kenmerken:**
- Loopt automatisch (loop: true)
- Zachter volume dan samples (-15dB)
- Fade in/out bij scene transitions (1.5s)
- Optioneel per locatie (lege string = geen ambient)

**Huidige status:** Alle locaties hebben `ambientAudio: ''` - feature is klaar voor gebruik maar nog niet actief.

### Clip Trimming & Smart Snap (#12 + #16) ✅ VOLTOOID
**Roadmap:** `docs/ROADMAP-CLIP-TRIMMING.md`

Volledig geïmplementeerde 7-fase roadmap voor clip trimming en smart snap functionaliteit:

**Nieuwe bestanden:**
| Bestand | Functie |
|---------|---------|
| `src/utils/clipCollision.ts` | Overlap detectie & smart snap algoritme |
| `src/utils/waveform.ts` | Waveform peak extractie uit AudioBuffer |
| `src/stores/selectionStore.ts` | Clip selectie state management |
| `src/components/studio/EditToolbar.tsx` | Toolbar voor geselecteerde clips |
| `src/components/studio/Waveform.tsx` | Canvas-based waveform visualisatie |
| `src/components/studio/TrimModal.tsx` | Modal met drag handles voor trimmen |

**Uitgebreide types:**
```typescript
// src/types/index.ts
interface Clip {
  id: string;
  sampleId: string;
  startBeat: number;
  effects?: ClipEffects;
  trimStart?: number;  // Start positie trim in seconden
  trimEnd?: number;    // Eind positie trim in seconden
}
```

**Smart Snap strategie:**
1. Probeer originele positie op target track
2. Bij overlap: schuif na blokkerende clip (zelfde track)
3. Geen ruimte: probeer tracks eronder
4. Nergens ruimte: reject plaatsing

**Audio scheduling met trim:**
```typescript
// In AudioService.scheduleTimeline()
player.start(time, trimStart, trimDuration);
```

**Bug fixes (2026-02-03):**
- Toolbar deselect: Click-away werkt nu correct op Track component
- Trim handle: Rechter handle nu sleepbaar bij ongetrimde samples (clamp fix)

### Eerdere Updates (2026-02-03)
- **RLS Security Fix**: Classes query nu gefilterd op `teacher_id` - docenten zien alleen eigen klassen
- **Hotspot Hiding**: Verzamelde geluiden verdwijnen nu van de locatie (in recorder of library)
- **ZoomableView Fix**: Console errors opgelost (passive touch event listener)
- **White Logo Mobile**: Wit logo voor donkere mobiele achtergrond toegevoegd

## Updates (2026-02-02)

- **Styling Overhaul**: Implemented 60-30-10 color rule with brand (slate), accent (amber), and neutral colors
- **Club → Stage Rename**: "Club" renamed to "Stage" throughout app and documentation
- **Stage Lights Background**: Added animated stage lights effect with gradient overlays
- **Teacher Timeline Viewer**: Teachers can view student compositions with read-only timeline and playhead
- **Playhead Fix**: Changed from requestAnimationFrame to setInterval (~30fps) for stable animation
- **StartScreen Footer**: Added social links (Instagram, Facebook, LinkedIn, YouTube) and "About" modal
- **Logo Integration**: Added SoundScout logo to StartScreen and as favicon (brand blue #0f172a)
