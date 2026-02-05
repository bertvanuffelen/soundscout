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
| `docs/ROADMAP-PLAYHEAD-SEEKING.md` | Playhead Seeking implementatie roadmap (✅ voltooid) |
| `docs/TONEJS-KENNISBANK.md` | Tone.js kennis & best practices (incl. kritieke seek beperking) |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Guide for adding locations and themes |
| `docs/PLAN-EXPORT-MP3.md` | MP3 export implementation plan (voltooid) |
| `docs/PLAN-KLASCODE-SYSTEEM.md` | Supabase integration plan (gedeeltelijk voltooid) |
| `docs/PLAN-LOCATIE-EDITOR.md` | Location editor implementation plan |
| `docs/responsive-design-analysis.md` | Responsive design patterns and implementation |
| `soundscout-prd.md` | Product requirements document |

## Recent Updates (2026-02-05)

### Playhead Seeking (#17) ✅ VOLTOOID

Volledig functionele playhead met seek ondersteuning: audio speelt nu correct vanaf elke positie, inclusief halverwege een clip.

**Roadmap:** `docs/ROADMAP-PLAYHEAD-SEEKING.md`
**Kennisbank:** `docs/TONEJS-KENNISBANK.md` (sectie 8: kritieke Tone.js beperking)

**Features:**
- Playhead (rode lijn) altijd zichtbaar in studio
- Draggable playhead handle in ruler strip (16px boven timeline)
- 44px touch hitbox voor accessibility
- Audio speelt vanaf seek positie
- **Hybride aanpak**: Actieve clips worden direct gestart, toekomstige clips via Tone.Part

**Kritieke ontdekking (gedocumenteerd in kennisbank):**
`Tone.Part` + `transport.start(time, offset)` overslaat events die vóór de offset liggen. Clips die al begonnen zijn maar nog actief zijn op de seek positie moeten **DIRECT** worden gestart met aangepaste parameters.

**Oplossing - Hybride Aanpak:**
```typescript
play(fromBeat: number = 0): void {
  // STAP 1: Start clips die al actief zijn (direct)
  if (fromBeat > 0) {
    this.startActiveClips(fromBeat);  // Berekent adjustedTrimStart & remainingDuration
  }

  // STAP 2: Start transport voor toekomstige clips (via Tone.Part)
  transport.start('+0.05', offsetSeconds);
}

private getActiveClipsAtBeat(beat: number): ActiveClipInfo[] {
  // Vindt clips waar: startBeat <= beat < endBeat
  // Berekent: adjustedTrimStart = originalTrimStart + elapsedSeconds
  // Berekent: remainingDuration = originalDuration - elapsedSeconds
}
```

**Nieuwe/gewijzigde bestanden:**
| Bestand | Wijziging |
|---------|-----------|
| `src/services/AudioService.ts` | `scheduledTracks/Samples`, `isClipActiveAtBeat()`, `getActiveClipsAtBeat()`, `startActiveClips()`, `play(fromBeat)` |
| `src/hooks/useAudioEngine.ts` | `playTimeline(fromBeat)` |
| `src/hooks/useStudioPlayback.ts` | `currentBeat` integratie |
| `src/components/studio/Timeline.tsx` | 16px ruler strip |
| `src/components/studio/Playhead.tsx` | **NIEUW** - Draggable playhead component |
| `src/components/studio/StudioView.tsx` | Playhead integratie |

**AudioService architectuur (bijgewerkt):**
```
AudioService (singleton)
├── players: Map<sampleId, Tone.Player>
├── timelinePart: Tone.Part | null
├── scheduledTracks: Track[]          ← NIEUW
├── scheduledSamples: Sample[]        ← NIEUW
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

---

### Bug Fixes (2026-02-04)

**CRIT-1: MP3 Export negeerde clip trimming** ✅ GEFIXT

MP3 export gebruikte de volledige sample duration in plaats van de getrimde duration. Clips met `trimStart`/`trimEnd` werden verkeerd geëxporteerd.

**Fix in `src/utils/audioExport.ts`:**
```typescript
// calculateTimelineDuration() - Gebruik getrimde duration
const clipDuration = getClipDuration(clip, sample);
const endSeconds = startSeconds + clipDuration;

// renderOffline() - Pas trim toe bij player.start()
const trimStart = getClipTrimStart(clip);
const clipDuration = getClipDuration(clip, sample);
player.start(time, trimStart, clipDuration);
```

**PERF-1: currentBeat veroorzaakte ~20 callback recreaties/sec** ✅ GEFIXT

`useStudioPlayback` subscribed op `currentBeat` en gebruikte het in de `handlePlay` dependency array. Dit veroorzaakte dat `handlePlay` ~20x per seconde opnieuw werd aangemaakt tijdens playback.

**Fix in `src/hooks/useStudioPlayback.ts`:**
```typescript
// VOOR: currentBeat als reactive state
const currentBeat = useAudioStore((s) => s.currentBeat);
// ... in handlePlay dependency array: [currentBeat, ...]

// NA: currentBeat alleen ophalen wanneer nodig
const handlePlay = useCallback(() => {
  // Read at call time, not as a dependency
  const currentBeat = useAudioStore.getState().currentBeat;
  playTimeline(currentBeat);
}, [/* geen currentBeat! */]);
```

**CRIT-2: Race conditions bij async sample loading** ✅ GEFIXT

Bij snel navigeren tussen locaties konden meerdere load operaties tegelijk lopen, wat kon leiden tot verkeerde state updates of memory leaks.

**Fix:** AbortController pattern toegevoegd:
```typescript
// useLocationAudio.ts
useEffect(() => {
  const controller = new AbortController();
  loadAllSamples(samples, controller.signal);
  return () => controller.abort();  // Cancel bij unmount
}, [samples]);

// AudioService.ts - check signal voor elke batch
if (signal?.aborted) break;
```

**Gewijzigde bestanden:**
- `src/services/AudioService.ts` - signal parameter in loadSamples/loadSampleWithRetry
- `src/hooks/useAudioEngine.ts` - signal parameter doorgeven
- `src/hooks/useLocationAudio.ts` - AbortController bij location change

**CRIT-3: Ambient audio timeout niet opgeruimd** 📝 GEDOCUMENTEERD

Ambient audio wordt gestart na 500ms timeout. Als component unmount tijdens deze delay, wordt de timeout niet gecanceld. Gedocumenteerd in `docs/TODO-IMPLEMENTATIE.md` als P3 prioriteit.

---

### Infinite Render Loop Bug (2026-02-05) ✅ GEFIXT

**Probleem:** App bevroor volledig wanneer op een hotspot werd geklikt. Browser tab crashte met 22.000+ renders.

**Oorzaak:** De AbortController implementatie (CRIT-2 fix) had twee problemen:
1. `setIsLoading(true)` werd aangeroepen VOORDAT gecontroleerd werd of de operatie al geannuleerd was
2. De `samples` array creëerde elke render een nieuwe referentie, waardoor de useEffect steeds opnieuw triggerde

**Flow van de bug:**
```
1. samples array krijgt nieuwe referentie (maar zelfde inhoud)
2. useEffect cleanup roept controller.abort() aan
3. loadAllSamples wordt aangeroepen
4. setIsLoading(true) veroorzaakt re-render VOORDAT abort check
5. Nieuwe render → nieuwe samples referentie → terug naar stap 1
```

**Fix in `src/hooks/useLocationAudio.ts`:**
```typescript
// 1. Check abort EERST, voordat enige state wordt bijgewerkt
const loadAllSamples = useCallback(
  async (samplesToLoad: Sample[], signal?: AbortSignal) => {
    // CRITICAL: Check abort FIRST before any state updates
    if (signal?.aborted) return;

    // Nu pas state updates...
    setIsLoading(true);
    // ...
  },
  [loadSamples]
);

// 2. Stabiliseer samples referentie met ID-based vergelijking
const prevSampleIdsRef = useRef<string>('');
const currentSampleIds = samples.map(s => s.id).sort().join(',');
if (prevSampleIdsRef.current !== currentSampleIds) {
  prevSampleIdsRef.current = currentSampleIds;
}

// 3. Gebruik stabiele currentSampleIds als dependency
useEffect(() => {
  // ...
}, [locationId, currentSampleIds, loadAllSamples]);
```

**Lessen geleerd:**
- Bij async operations met AbortController: ALTIJD abort status checken vóór state updates
- Array dependencies in useEffect: gebruik stabiele referenties (ID strings) i.p.v. array objecten
- Console.log render counters zijn effectief voor het opsporen van infinite loops

---

### Vereenvoudigde Transport Controls (#23) ✅ VOLTOOID

Transport controls vereenvoudigd voor betere UX, vooral voor kinderen.

**Oude layout:**
```
[Play] [Pause] [Stop] [Loop] | [Alles Wissen]
```

**Nieuwe layout:**
```
[Play/Pause] [Rewind] [Loop]
```

**Wijzigingen:**
- Play/Pause was al een toggle (ongewijzigd)
- Stop → Rewind (SkipBack icoon van lucide-react)
- "Alles Wissen" knop verwijderd

**Gewijzigde bestanden:**
| Bestand | Wijziging |
|---------|-----------|
| `src/components/studio/TransportControls.tsx` | Stop → Rewind, Clear All verwijderd |
| `src/hooks/useStudioPlayback.ts` | `handleRewind` toegevoegd |
| `src/components/studio/StudioView.tsx` | Props aangepast |
| `src/i18n/locales/nl.json` | `"rewind": "Terug"` |
| `src/i18n/locales/en.json` | `"rewind": "Rewind"` |

**Implementatie notities:**
- `handleRewind` = `handleStop` (zelfde gedrag: stop + ga naar beat 0)
- `handleStop` blijft intern beschikbaar voor navigatie (bijv. terug naar map)
- Rewind is disabled wanneer geen clips aanwezig zijn (`hasClips`)

---

### Clip Dupliceren (#25) ✅ VOLTOOID

Clips kunnen nu worden gedupliceerd met behoud van alle trim settings.

**Features:**
- Dupliceer knop in EditToolbar (Copy icoon)
- Keyboard shortcut: `Ctrl+D` / `Cmd+D`
- Trim settings (trimStart, trimEnd) worden meegekopieerd
- Smart snap: duplicaat wordt direct na origineel geplaatst
- Na duplicatie wordt nieuwe clip automatisch geselecteerd

**Gewijzigde bestanden:**
| Bestand | Wijziging |
|---------|-----------|
| `src/stores/timelineStore.ts` | `duplicateClip()` functie toegevoegd |
| `src/components/studio/StudioView.tsx` | `handleDuplicate()`, keyboard shortcut, prop |

**Plaatsingsstrategie:**
```
Origineel:    [===CLIP===]
Duplicaat:                  [===CLIP===]  (direct na origineel)
```

Als geen ruimte op zelfde track → smart snap naar track eronder.
Als nergens ruimte → geen duplicatie.

**Implementatie:**
```typescript
// timelineStore.ts
duplicateClip: (trackIndex, clipId, sample, allSamples) => {
  const originalClip = findClip(trackIndex, clipId);
  const desiredStartBeat = Math.ceil(getClipEndBeat(originalClip, sample, bpm));

  const newClip = {
    id: generateClipId(),
    sampleId: originalClip.sampleId,
    startBeat: desiredStartBeat,
    trimStart: originalClip.trimStart,
    trimEnd: originalClip.trimEnd,
  };

  const result = findSmartSnapPosition(...);
  if (result.reason !== 'rejected') {
    addClip(result.trackIndex, newClip);
  }
  return { ...result, newClipId };
}
```

---

### Getrimde Clip Visuele Lengte bij Drag (#24) ✅ VOLTOOID

Snap preview toont nu de correcte getrimde lengte wanneer een getrimde clip wordt versleept.

**Probleem:**
Wanneer je een getrimde clip versleept, toonde de snap preview (gestippelde lijn) de volledige originele sample lengte in plaats van de getrimde lengte.

**Oorzaak:**
In `useStudioDnD.ts` lijn 187 werd `secondsToBeats(sample.duration, bpm)` gebruikt, wat de trim boundaries negeerde. Voor clip drags moest `getClipDurationBeats(clip, sample, bpm)` worden gebruikt.

**Oplossing:**
```typescript
// Nieuwe ref om clip data op te slaan
const activeDragClipRef = useRef<Clip | null>(null);

// In handleDragStart: clip opslaan
if (dragType === 'clip') {
  activeDragClipRef.current = clip ?? null;
}

// In handleDragMove: juiste durationBeats berekenen
const durationBeats =
  activeDragTypeRef.current === 'clip' && clip
    ? getClipDurationBeats(clip, sample, bpm)  // Respecteert trim
    : secondsToBeats(sample.duration, bpm);     // Volledige lengte
```

**Gewijzigde bestanden:**
| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useStudioDnD.ts` | `activeDragClipRef`, import `getClipDurationBeats`, logica in handleDragMove |

**Resultaat:**
| Scenario | Snap Preview Breedte |
|----------|---------------------|
| Sample uit library | Volledige sample duration |
| Getrimde clip verplaatsen | Getrimde duration |

---

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
