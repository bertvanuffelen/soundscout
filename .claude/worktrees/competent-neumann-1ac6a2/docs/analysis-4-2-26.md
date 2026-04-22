# SoundScout — Comprehensive Code Analysis Report

**Analysis Depth:** `--ultrathink` (full-project deep analysis)
**Scope:** Full project (103 files, ~13,510 lines)
**Date:** 2026-02-04
**Branch:** `master`

---

## 1. Executive Summary

SoundScout is a well-structured React 19 educational music app with clean separation of concerns. The codebase demonstrates solid engineering fundamentals — independent Zustand stores, singleton audio service, proper React patterns — but has accumulated several issues that need attention before scaling.

| Domain | Rating | Key Finding |
|--------|--------|-------------|
| **Architecture** | 4/5 | Clean layering, zero inter-store deps, hook-based bridges |
| **Code Quality** | 4/5 | Good TypeScript strictness, consistent patterns, some duplication |
| **Security** | 3.5/5 | RLS configured, but input validation gaps and untyped data |
| **Performance** | 4/5 | Proper memoization, but some unnecessary re-renders and missing cancellation |
| **Reliability** | 3/5 | Race conditions in async operations, missing abort signals |
| **Accessibility** | 3.5/5 | Good touch targets, but missing focus traps and motion preferences |

**Critical Findings:** 3 | **High Priority:** 8 | **Medium:** 17 | **Low:** 22

---

## 2. Project Metrics

```
Files Analyzed:       103
Lines of Code:        13,510
Dependencies:         15 production, 20 dev
Zustand Stores:       7 (zero inter-dependencies)
React Components:     38 (avg 163 lines)
Custom Hooks:         8
Services:             2 (AudioService 716 lines, StorageService 319 lines)
Utilities:            9 files (1,078 lines)
Test Files:           1 (279 lines — ~2% coverage estimate)
Themes:               3 (basis, winterspelen, test-metro)
```

### Size Distribution

| Layer | Files | Lines | % |
|-------|-------|-------|---|
| Components | 38 | 6,202 | 45.9% |
| Data/Themes | 11 | 1,129 | 8.4% |
| Hooks | 8 | 1,122 | 8.3% |
| Utils | 9 | 1,078 | 8.0% |
| Stores | 8 | 1,052 | 7.8% |
| Services | 2 | 1,035 | 7.7% |
| Pages | 2 | 519 | 3.8% |
| Types | 3 | 388 | 2.9% |
| i18n | 3 | 386 | 2.9% |
| Lib | 3 | 239 | 1.8% |
| Contexts | 1 | 97 | 0.7% |

---

## 3. Architecture Analysis

### 3.1 Overall Structure

```
src/
├── components/     38 files  — UI layer
│   ├── studio/     10 files  — Timeline, Track, Clip, Transport, DnD
│   ├── teacher/    10 files  — Dashboard, Login, Classes, Submissions
│   ├── location/    5 files  — Scene, Hotspots, Recorder, Zoom
│   ├── map/         2 files  — World map, Location markers
│   ├── stage/       1 file   — Performance screen
│   ├── share/       2 files  — Teacher submission modal
│   ├── editor/      5 files  — Location editor (dev tool)
│   ├── compositions/ 3 files — Saved compositions list
│   ├── ui/          4 files  — Button, Card, Modal (reusable)
│   └── common/      1 file   — ErrorBoundary
├── hooks/           8 files  — Business logic bridges
├── stores/          8 files  — Zustand state management
├── services/        2 files  — AudioService + StorageService
├── utils/           9 files  — Pure functions
├── data/           11 files  — Theme definitions
├── types/           3 files  — Shared interfaces
├── lib/             3 files  — Supabase integration
├── pages/           2 files  — Editor pages
├── i18n/            3 files  — Translations (nl, en)
└── contexts/        1 file   — Auth provider
```

### 3.2 Strengths

- **Clean vertical slice:** data -> stores -> hooks -> components
- **Zero direct inter-store dependencies:** stores never import each other
- **Hook-based bridges:** `useStudioPlayback`, `useStudioDnD` coordinate stores without coupling
- **Singleton AudioService** properly isolates Tone.js complexity from React
- **Immutable state updates** throughout all stores

### 3.3 Weaknesses

- **No routing library:** Custom screen switching via `gameStore.currentScreen` limits deep linking, back button, and URL state
- **Large view components:** Some top-level views (`StageView.tsx`, `LocationScene.tsx`) exceed 300 lines and manage too many concerns
- **No Supabase service layer:** Queries scattered across hooks (`useClasses`, `useSubmissions`) rather than abstracted into a service

### 3.4 Data Flow

```
┌─ Components (UI) ──────────────────────────────────┐
│  StudioView, StageView, LocationScene              │
├─ Hooks (Lifecycle & Coordination) ─────────────────┤
│  useAudioEngine, useStudioPlayback, useLocationAudio│
│  useStudioDnD, useAudioExport, useClasses          │
├─ Stores (State) ───────────────────────────────────┤
│  appStore, audioStore, timelineStore, libraryStore  │
│  userStore, themeStore, selectionStore              │
├─ Services (Singletons) ───────────────────────────┤
│  AudioService → Tone.js (Transport, Players, Part) │
│  StorageService → localStorage                     │
└────────────────────────────────────────────────────┘
```

**Coordination example (playing timeline):**
1. `StudioView` calls `useStudioPlayback().handlePlay()`
2. Hook reads `timelineStore.tracks` + `libraryStore.librarySamples`
3. Hook calls `audioEngine.scheduleTimeline(tracks, samples)`
4. `AudioService` creates `Tone.Part`, starts transport
5. `AudioService` emits beat updates via interval
6. `useAudioEngine()` pushes updates to `audioStore.setCurrentBeat()`
7. Components re-render with new `currentBeat`

---

## 4. State Management Deep Dive

### 4.1 Store Complexity

| Store | State Fields | Actions | Complexity | Inter-Deps | Middleware |
|-------|-------------|---------|------------|------------|------------|
| `appStore` | 3 | 8 | 0/10 | None | None |
| `audioStore` | 5 | 8 | 1/10 | None | None |
| `timelineStore` | 4 | 8 | **7/10** | None (uses utils) | None |
| `libraryStore` | 3 | 11 | 3/10 | None | None |
| `userStore` | 1 | 8 | 2/10 | None | `persist()` |
| `themeStore` | 3 | 10 | 1/10 | None | None |
| `selectionStore` | 2 | 2 | 0/10 | None | None |

### 4.2 Mutation Patterns

All stores use proper immutable patterns:

- **Direct set:** `appStore`, `selectionStore` (simple field updates)
- **Immutable array transform:** `timelineStore` (`.map()` + spread for nested updates)
- **Array spread + append:** `audioStore`, `libraryStore`
- **Object replacement:** `userStore` (intentional for role switching)
- **Persist middleware:** `userStore` with `partialize()` (only persists `session`)

### 4.3 Store Issues

**timelineStore — Required Parameter Coupling:**
```typescript
// addClip() and moveClip() require the caller to pass allSamples
addClip: (trackIndex, clip, sample, allSamples) => SmartSnapResult
```
- Caller must always provide fresh `allSamples` array
- If caller passes stale samples, collision detection breaks silently
- No defensive validation exists

**themeStore — Array Identity on Getters:**
```typescript
// Each call creates new array reference
getSamples: () => get().theme?.samples ?? [];
```
- Array identity changes every call, causing potential re-renders
- Components should use selector instead: `useThemeStore((s) => s.theme?.samples ?? [])`

**audioStore — Duplicate failedSamples:**
```typescript
// Doesn't deduplicate before adding
addFailedSample: (sampleId) =>
  set((state) => ({ failedSamples: [...state.failedSamples, sampleId] }))
```

---

## 5. Critical Findings

### CRIT-1: MP3 Export Ignores Clip Trimming

**File:** `src/utils/audioExport.ts` (lines 81-84)
**Impact:** Exported MP3 contains untrimmed audio — users hear trimmed audio in-app but export produces different content.

```typescript
// Current: uses full sample duration
const durationSeconds = sample.duration;

// Should use: trimmed duration
const durationSeconds = getClipDuration(clip, sample, bpm);
```

**Severity:** Bug — user-facing audio mismatch
**Fix effort:** Small — use existing `getClipDuration()` from `audio.ts`

---

### CRIT-2: No Async Operation Cancellation

**Files:** `src/hooks/useLocationAudio.ts`, `src/hooks/useStudioPlayback.ts`, `src/hooks/useClasses.ts`
**Impact:** When users navigate between screens while audio loads or data fetches, the previous operation's callbacks still fire, potentially updating state on unmounted components.

**Scenario:**
1. User enters Location A -> samples start loading
2. User presses Back before loading completes
3. Loading finishes -> state updates applied to unmounted component

**Severity:** Race condition — can cause React warnings and inconsistent state

**Fix pattern:**
```typescript
useEffect(() => {
  let isMounted = true;

  loadSamples(samples).then(() => {
    if (isMounted) {
      // Update state only if still mounted
    }
  });

  return () => { isMounted = false; };
}, [samples]);
```

---

### CRIT-3: Ambient Audio Timeout Not Cleaned Up

**File:** `src/services/AudioService.ts` — `stopAmbient()` method
**Impact:** `setTimeout` used for fade-out has no cleanup reference. If component unmounts during fade, timeout fires on disposed player.

```typescript
// Current: no cleanup reference
stopAmbient(fade = true): void {
  if (fade && this.ambientVolume) {
    this.ambientVolume.volume.rampTo(-60, AMBIENT_AUDIO_FADE_SECONDS);
    setTimeout(() => {  // <-- No way to cancel
      this.ambientPlayer?.stop();
      this.isAmbientPlaying = false;
    }, AMBIENT_AUDIO_FADE_SECONDS * 1000);
  }
}
```

**Severity:** Memory leak + potential error on disposed player

**Fix:**
```typescript
private ambientFadeTimeoutId: number | null = null;

stopAmbient(fade = true): void {
  if (this.ambientFadeTimeoutId !== null) {
    clearTimeout(this.ambientFadeTimeoutId);
    this.ambientFadeTimeoutId = null;
  }
  // ... rest of logic with stored timeout id
}
```

---

## 6. Security Analysis

### 6.1 Strengths

- Supabase Row Level Security (RLS) enabled on tables
- Teacher queries filter by `teacher_id`
- No exposed API keys in source code (Supabase env vars used)
- Auth state management via Supabase auth provider

### 6.2 Vulnerabilities

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| SEC-1 | No input validation on student names | Medium | `src/stores/userStore.ts` — `setStudentName()` |
| SEC-2 | Untyped `composition_data: any` from Supabase | Medium | `src/hooks/useSubmissions.ts` |
| SEC-3 | `Math.random()` UUID fallback (not crypto-safe) | Low | `src/utils/uuid.ts` |
| SEC-4 | Share code collision not checked | Low | `src/services/StorageService.ts` |
| SEC-5 | Type assertion `as any` bypasses TS safety | Low | `src/hooks/useClasses.ts` |
| SEC-6 | No localStorage quota check before save | Medium | `src/services/StorageService.ts` |

**SEC-1 Detail:** `setStudentName(name)` accepts any string without length, XSS, or content validation. Since names are displayed in UI and potentially stored in Supabase, this is a vector for injection if names contain HTML/script tags.

**SEC-2 Detail:** `composition_data` from Supabase submissions is typed as `any` and rendered directly in the timeline viewer. A malformed submission could crash the `SubmissionPlayer` component. Should validate with a schema (e.g., Zod) before rendering.

**SEC-6 Detail:** `StorageService.saveComposition()` does not check if the save will fit within the ~5MB localStorage quota. The save could silently fail, leading to data loss the user doesn't discover until they try to reopen their composition.

---

## 7. Performance Analysis

### 7.1 Strengths

- Extensive `React.memo()` usage on Studio components (Timeline, Track, Clip, etc.)
- `useCallback` for stable handler references
- `useMemo` for expensive lookups (e.g., `selectedClipData` in StudioView)
- Audio player pooling (`Map<sampleId, Tone.Player>`) avoids re-instantiation
- Batch loading with concurrency limit (3 parallel loads via `AUDIO_LOAD_CONCURRENCY`)
- Canvas-based waveform rendering (no DOM overhead)
- DPI scaling for Retina displays in waveform component

### 7.2 Issues

| # | Finding | Impact | Location |
|---|---------|--------|----------|
| PERF-1 | `currentBeat` in `handlePlay` dependency array | ~20 unnecessary callback recreations/sec | `src/hooks/useStudioPlayback.ts` |
| PERF-2 | `themeStore.getSamples()` creates new array on every call | Re-renders from identity change | `src/stores/themeStore.ts` |
| PERF-3 | No pagination on submissions fetch | Memory bloat for large classes | `src/hooks/useSubmissions.ts` |
| PERF-4 | All beat callbacks invoked every 50ms tick | Wasted CPU for unmounted listeners | `src/services/AudioService.ts` |
| PERF-5 | Waveform cache has no eviction policy | Unbounded memory growth | `src/services/AudioService.ts` |
| PERF-6 | Duplicate state + ref for drag sample | Extra renders, sync risk | `src/hooks/useStudioDnD.ts` |
| PERF-7 | `lamejs` bundled in main chunk | ~80KB not needed until export | `src/utils/audioExport.ts` |

**PERF-1 Detail:** `currentBeat` changes every 50ms during playback. Because it's in the dependency array of `handlePlay`, the callback is recreated ~20 times per second. Fix with a ref:

```typescript
const currentBeatRef = useRef(currentBeat);
currentBeatRef.current = currentBeat;

const handlePlay = useCallback(() => {
  playTimeline(currentBeatRef.current); // Stable reference
}, [playTimeline]); // No currentBeat in deps
```

**PERF-7 Detail:** `@breezystack/lamejs` (~80KB) is imported at module level in `audioExport.ts`. It's only needed when the user clicks Export. Lazy-loading with `import()` would reduce the initial bundle.

### 7.3 Bundle Composition

| Dependency | Estimated Size (gzipped) | Justification |
|-----------|--------------------------|---------------|
| `tone@15.1.22` | ~250KB | Core requirement |
| `@breezystack/lamejs` | ~80KB | Lazy-loadable |
| `@supabase/supabase-js` | ~40KB | Backend requirement |
| `@dnd-kit/*` | ~25KB | Core requirement |
| `lucide-react` | Tree-shakeable | Good |
| `tailwindcss@4` | Build-time only | No runtime cost |

---

## 8. Reliability & Error Handling

### 8.1 Race Conditions

| # | Scenario | Severity | Location |
|---|----------|----------|----------|
| RACE-1 | Location change during sample load — old callbacks update current state | Medium | `src/hooks/useLocationAudio.ts` |
| RACE-2 | Library loading while switching views — stale load results applied | Medium | `src/hooks/useStudioPlayback.ts` |
| RACE-3 | `scheduledTracks` updated during `getActiveClipsAtBeat()` iteration | Medium | `src/services/AudioService.ts` |
| RACE-4 | Concurrent class create/delete can produce inconsistent state | Low | `src/hooks/useClasses.ts` |
| RACE-5 | `failedSamplesRef.current` not cleared after successful retry | Medium | `src/hooks/useLocationAudio.ts` |

### 8.2 Missing Error Boundaries

The app has a single `ErrorBoundary` component but it's not strategically placed around failure-prone zones:

- **Missing around `StudioView`** — DnD + audio playback can fail
- **Missing around `SubmissionPlayer`** — renders unvalidated `composition_data`
- **Missing around `LocationScene`** — audio loading with network errors

### 8.3 Silent Failures

| Location | Behavior | Risk |
|----------|----------|------|
| `AudioService.playSample()` | Logs warning, returns void | User clicks produce no audio with no feedback |
| `AudioService.seek()` | No range validation | Invalid beat causes silent state corruption |
| `StorageService.set()` | Catches error, returns void | Save appears successful when localStorage is full |
| `useClasses` auth failure | Returns empty array | Teacher sees empty dashboard with no error message |

### 8.4 Timeout/Interval Cleanup

| Timer | Cleanup | Status |
|-------|---------|--------|
| Playhead interval (50ms) | Cleared on stop/dispose | OK |
| Ambient fade timeout | **Not tracked** | **Leak risk** |
| Export auto-reset timeout (3s) | **Not tracked** | **Leak risk** |
| Beat update interval | Cleared on stop | OK |

---

## 9. Code Quality

### 9.1 TypeScript

- `strict: true` enabled
- `noUnusedLocals: true`, `noUnusedParameters: true`
- 326 lines of type definitions covering all domains
- Good use of type aliases, discriminated unions, and optional properties
- One `any` type assertion in `useClasses.ts` (should use proper Supabase types)

### 9.2 Patterns & Consistency

**Positive:**
- Consistent naming: `handleXxx` for events, `useXxx` for hooks
- Section comments use `// --- Section ---` format
- Default exports for components, named for stores/hooks/types
- Tailwind utility classes only — no CSS modules, no styled-components
- Proper use of `forwardRef` on UI components
- `cn()` utility for conditional class merging

**Negative:**
- Deprecated `Hotspot.radius` still present in types AND theme data
- `SharedComposition` duplicates fields from `SavedComposition` instead of extending
- Sample icon names are unvalidated strings — typo causes runtime error
- Inconsistent use of `createSampleMap()` — some files build their own maps
- Logger has a `logger.audio()` method that duplicates `logger.debug()` functionality

### 9.3 Test Coverage

**Current state: Very limited**

| Category | Files | Coverage |
|----------|-------|----------|
| Store tests | 1 (`timelineStore.test.ts`, 279 lines) | timelineStore only |
| Component tests | 0 | None |
| Hook tests | 0 | None |
| Integration tests | 0 | None |
| E2E tests | 0 | None |

**Risk:** Major regression potential. The existing `timelineStore.test.ts` covers smart snap and clip management well, but 6 other stores and all hooks/components have no automated tests.

---

## 10. Accessibility

### 10.1 Strengths

- 44px minimum touch targets on all interactive elements
- `role="dialog"` and `aria-modal="true"` on modals
- `aria-labelledby` connecting modal titles
- `title` attributes on icon buttons
- Mobile-first responsive approach with `sm:` breakpoint
- Touch-friendly patterns (`active:scale-95`, tap feedback)
- Hover-dependent actions visible by default on mobile

### 10.2 Gaps

| # | Finding | WCAG Criterion | Impact |
|---|---------|----------------|--------|
| A11Y-1 | No focus trap in modals | 2.4.3 Focus Order | Keyboard users can tab behind modal |
| A11Y-2 | No `prefers-reduced-motion` for stage animation | 2.3.3 Animation | Motion-sensitive users affected |
| A11Y-3 | Drag handles missing `aria-describedby` | 4.1.2 Name/Role/Value | Screen readers can't discover drag |
| A11Y-4 | No keyboard shortcuts for playback (Space=play, etc.) | 2.1.1 Keyboard | Desktop users limited to mouse |
| A11Y-5 | Map and timeline lack ARIA landmarks | 1.3.1 Info/Relationships | Screen readers lack context |
| A11Y-6 | Error messages lack `role="alert"` | 4.1.3 Status Messages | Assistive tech may miss errors |

---

## 11. i18n & Data Integrity

### 11.1 Translation Coverage

- Dutch (primary) and English (fallback) — both complete for basis theme
- Both translation files have identical key structure (good)
- Categories: app, common, map, themes, start, location, recorder, studio, transport, stage, compositions, locations, samples

### 11.2 Issues

| Issue | Impact |
|-------|--------|
| Winterspelen theme translations missing from i18n files | Translation keys render as raw keys |
| No i18next pluralization handling (e.g., `"{{count}} geluid(en)"`) | Grammatically incorrect counts |
| Some sample translations exist in i18n but locations not yet in themes | Orphaned translation keys |
| "Het Podium" (Dutch) vs "stage" (code) — terminology gap | Confusion in maintenance |

### 11.3 Theme Data Integrity

| Issue | Files Affected |
|-------|---------------|
| `Hotspot.radius` deprecated in types but still defined in theme data | `src/types/index.ts`, `src/data/themes/*/locations.ts` |
| Sample duration hardcoded in theme data — can drift from actual audio | `src/data/themes/*/samples.ts` |
| `ambientAudio: ''` on all locations — feature built but not activated | `src/data/themes/*/locations.ts` |
| Icon names are unvalidated strings — typo causes runtime error | `src/data/themes/*/samples.ts` |
| Two-way sample-location reference could get out of sync | `samples.ts` has `locationId`, `locations.ts` has `hotspots[].sampleId` |

---

## 12. Component Analysis Highlights

### 12.1 Largest Components (consider decomposition)

| Component | Lines | Concern Count |
|-----------|-------|---------------|
| `StageView.tsx` | 474 | Playback, save, export, share, navigation, modals |
| `LocationScene.tsx` | ~400 | Audio loading, hotspots, recorder, zoom, navigation |
| `useStudioDnD.ts` | 296 | Drag start/move/end, snap preview, collision |

### 12.2 Well-Designed Components

- **Button, Card, Modal** — Clean reusable UI library with proper variants
- **TransportControls** — Memoized, clear props, confirmation for destructive actions
- **Playhead** — Proper pointer capture, 44px touch target, responsive
- **Waveform** — Efficient canvas rendering with DPI scaling

### 12.3 Component Issues

- **Modal:** No focus trap implementation (keyboard users can tab out)
- **StageView:** Audience bounce animation lacks `prefers-reduced-motion`
- **ZoomableView:** `touchAction: 'none'` set in style — verify no passive event console warnings
- **SubmissionPlayer:** Uses `setInterval` (~30fps) for beat tracking — stable but less smooth than RAF

---

## 13. Services Analysis

### 13.1 AudioService (716 lines)

**Architecture:** Singleton with lazy initialization wrapping Tone.js

**Strengths:**
- Player pooling with `Map<sampleId, Tone.Player>` caching
- Batch loading with concurrency control (3 parallel)
- Retry mechanism with exponential backoff (1s, 2s)
- Timeout protection (15s per sample)
- Proper disposal pattern (`dispose()` cleans everything)
- Waveform data caching
- Timeline scheduling via `Tone.Part` with seek support

**Issues:**
- Ambient fade timeout not tracked (CRIT-3)
- No validation on `seek()` beat range
- `playSample()` fails silently
- Waveform cache has no eviction policy
- `getActiveClipsAtBeat()` can race with `scheduleTimeline()` data updates

### 13.2 StorageService (319 lines)

**Architecture:** Singleton utility class for localStorage

**Strengths:**
- Type-safe CRUD with try-catch on all operations
- Share code generation
- Metadata computation respecting trim
- Auto-cleanup (max 10 compositions)

**Issues:**
- No localStorage quota check before save
- No concurrent update lock (multi-tab risk)
- Share code uniqueness not validated

---

## 14. Hooks Analysis

| Hook | Lines | Purpose | Key Issues |
|------|-------|---------|------------|
| `useStudioDnD` | 296 | Drag-and-drop logic | Duplicate state+ref, floating point edge cases |
| `useLocationAudio` | 160 | Sample loading + ambient | Race conditions, failed ref not cleared |
| `useAudioEngine` | 152 | Tone.js React bridge | Potential duplicate subscriptions |
| `useStudioPlayback` | 116 | Playback controller | `currentBeat` in deps, loading race |
| `useClasses` | 193 | Teacher class CRUD | `any` type, silent auth failure |
| `useAudioExport` | 94 | MP3 export progress | Timeout not cleaned on unmount |
| `useSubmissions` | 94 | Student submissions | No pagination, unvalidated data |
| `useAudioCleanup` | 17 | Unmount cleanup | No issues |

---

## 15. Prioritized Recommendations

### Immediate (This Sprint)

| # | Action | Files | Impact |
|---|--------|-------|--------|
| 1 | **Fix MP3 export trim bug** (CRIT-1) | `src/utils/audioExport.ts` | Audio correctness |
| 2 | **Add `isMounted` guards** to async hooks (CRIT-2) | `useLocationAudio.ts`, `useStudioPlayback.ts`, `useClasses.ts`, `useSubmissions.ts` | Race condition prevention |
| 3 | **Store ambient timeout ID** for cleanup (CRIT-3) | `src/services/AudioService.ts` | Memory leak |
| 4 | **Add input validation** to `setStudentName` (SEC-1) | `src/stores/userStore.ts` | XSS prevention |
| 5 | **Validate `composition_data` shape** (SEC-2) | `src/hooks/useSubmissions.ts` | Crash prevention |

### Short Term (2-4 Weeks)

| # | Action | Impact |
|---|--------|--------|
| 6 | Fix `currentBeat` in `handlePlay` deps with ref pattern (PERF-1) | ~20 re-renders/sec eliminated |
| 7 | Add localStorage quota check before save (SEC-6) | Data loss prevention |
| 8 | Add pagination to submissions fetch (PERF-3) | Scalability |
| 9 | Add error boundaries around Studio, Location, SubmissionPlayer | Graceful degradation |
| 10 | Add winterspelen i18n translations | Translation completeness |
| 11 | Remove deprecated `Hotspot.radius` from types and data | Code clarity |
| 12 | Lazy-load `lamejs` for MP3 export | Bundle size reduction (~80KB) |
| 13 | Clean up export auto-reset timeout (useAudioExport) | Memory leak |

### Medium Term (1-2 Months)

| # | Action | Impact |
|---|--------|--------|
| 14 | Add focus trap library to Modal | WCAG compliance |
| 15 | Add `prefers-reduced-motion` to stage animations | Accessibility |
| 16 | Expand test coverage: stores, hooks, critical components | Regression safety |
| 17 | Introduce Supabase service layer (extract from hooks) | Maintainability |
| 18 | Consolidate `useStudioDnD` duplicate state+ref pattern | Code quality |
| 19 | Add Zod validation for persisted state hydration | Data integrity |
| 20 | Deduplicate `audioStore.failedSamples` | State correctness |
| 21 | Add `role="alert"` to error messages | Accessibility |

### Long Term (Q2 2026+)

| # | Action | Impact |
|---|--------|--------|
| 22 | Consider routing library for deep linking and back button | UX, shareability |
| 23 | Build-time asset validation (audio files exist, durations match) | Data integrity |
| 24 | Add E2E tests with Playwright for critical student/teacher flows | Quality assurance |
| 25 | Implement error tracking service (Sentry or similar) | Observability |
| 26 | Add keyboard shortcuts for playback (Space, arrows) | Desktop UX |
| 27 | Break down large view components (StageView, LocationScene) | Maintainability |
| 28 | Add waveform cache eviction policy | Memory management |

---

## 16. Risk Matrix

| Risk | Probability | Impact | Mitigation | Priority |
|------|-------------|--------|------------|----------|
| MP3 export produces wrong audio | **High** (active bug) | High | Fix CRIT-1 | Immediate |
| State update on unmounted component | Medium | Medium | Fix CRIT-2 | Immediate |
| Malformed submission crashes player | Low | High | Fix SEC-2 | Immediate |
| localStorage quota exceeded silently | Medium | Medium | Fix SEC-6 | Short term |
| Large class with 100+ submissions | Low | High | Fix PERF-3 | Short term |
| Regression in timeline logic | Medium | High | Expand tests | Medium term |
| Accessibility complaint | Low | Medium | Fix A11Y 1-6 | Medium term |
| Student name XSS injection | Low | Medium | Fix SEC-1 | Immediate |
| Audio memory leak from ambient timer | Medium | Low | Fix CRIT-3 | Immediate |

---

## 17. Dependency Health

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `react` | 19.2.0 | Current | |
| `typescript` | 5.9.3 | Current | |
| `vite` | 7.2.4 | Current | |
| `zustand` | 5.0.10 | Current | |
| `tone` | 15.1.22 | Current | |
| `@dnd-kit/core` | 6.3.1 | Current | |
| `@supabase/supabase-js` | 2.93.3 | Current | |
| `tailwindcss` | 4.1.18 | Current | |
| `i18next` | 25.8.0 | Current | |
| `lucide-react` | 0.563.0 | Current | |
| `vitest` | 4.0.18 | Current | |

All dependencies are on current major versions. No known security advisories.

---

## 18. Conclusion

SoundScout has a solid architectural foundation with clean state management and good React patterns. The three critical findings (export trim bug, missing async cancellation, ambient timeout leak) should be addressed immediately. The security gaps around input validation and data typing are moderate risk but straightforward to fix.

The biggest long-term risks are:
1. **Very low test coverage** (~2%) — any significant refactoring carries regression risk
2. **Race conditions** in async hooks — systemic pattern that needs `isMounted`/`AbortController` across all async effects
3. **Scalability gaps** — no pagination, no cache eviction, large view components

The codebase is well-positioned for the next phase of development if these foundational issues are addressed first.
