# Roadmap: Clip Trimming & Smart Snap (#12 + #16)

**Document versie:** 1.0.0
**Aangemaakt:** 3 februari 2026
**Status:** 🔵 Planning Fase

---

## Overzicht

Dit document beschrijft het implementatieplan voor twee gerelateerde features:
- **#12 Clip Trimming** - Gebruikers kunnen samples inkorten via trim handles
- **#16 Smart Snap & Overlap Fix** - Verbeterde drag-and-drop UX met automatische plaatsing

### Doelstellingen
1. Clips kunnen worden ingekort zonder de originele sample te wijzigen
2. Bij overlap automatisch naar een vrije plek verplaatsen (smart snap)
3. Visuele feedback via waveform in trim modal
4. Toolbar boven de timeline voor geselecteerde clips

### Geschatte doorlooptijd
**Totaal: 12-16 uur** verdeeld over 7 fases

---

## Huidige Architectuur Analyse

### Relevante Bestanden

| Bestand | Regels | Functie |
|---------|--------|---------|
| `src/types/index.ts` | 321 | Type definities voor Clip, Sample, Track |
| `src/components/studio/Clip.tsx` | 89 | Clip component met drag functionaliteit |
| `src/components/studio/Track.tsx` | 96 | Track container met clips |
| `src/components/studio/Timeline.tsx` | 134 | Timeline met playhead en grid |
| `src/stores/timelineStore.ts` | 171 | Zustand store voor tracks/clips |
| `src/hooks/useStudioDnD.ts` | 217 | Drag-and-drop logic |
| `src/services/AudioService.ts` | 271 | Singleton voor Tone.js audio |
| `src/constants/config.ts` | 61 | Configuratie constanten |

### Huidige Clip Interface
```typescript
// src/types/index.ts (regel 124-130)
export interface Clip {
  id: string;
  sampleId: string;
  startBeat: number;
  effects?: ClipEffects;
}
```

### Huidige Overlap Detectie
```typescript
// src/stores/timelineStore.ts (regel 60-61)
const hasOverlap = track.clips.some((c) => c.startBeat === clip.startBeat);
```
**Probleem:** Controleert alleen exacte startBeat, niet daadwerkelijke overlap op basis van duration.

### Huidige Audio Scheduling
```typescript
// src/services/AudioService.ts (regel 160-162)
transport.schedule((time) => {
  player.start(time);  // Geen offset/duration - speelt hele sample
}, startSeconds);
```

---

## Fase 1: Type Extensies & Constants

**Geschatte tijd:** 1 uur
**Impact:** Minimaal - alleen type definities

### 1.1 Uitbreiden Clip Interface

**Bestand:** `src/types/index.ts`

```typescript
export interface Clip {
  id: string;
  sampleId: string;
  startBeat: number;
  effects?: ClipEffects;

  // NIEUW: Trim boundaries (optioneel, default = hele sample)
  /** Start positie van trim in seconden (0 = begin sample) */
  trimStart?: number;
  /** Eind positie van trim in seconden (undefined = eind sample) */
  trimEnd?: number;
}
```

### 1.2 Nieuwe Constants

**Bestand:** `src/constants/config.ts`

```typescript
// =============================================================================
// CLIP EDITING
// =============================================================================

/** Minimum trim duration in seconds */
export const MIN_TRIM_DURATION_SECONDS = 0.1;

/** Waveform resolution (samples per peak) */
export const WAVEFORM_SAMPLES_PER_PEAK = 100;

/** Waveform bar width in pixels */
export const WAVEFORM_BAR_WIDTH_PX = 3;

/** Waveform gap between bars in pixels */
export const WAVEFORM_GAP_PX = 1;
```

### 1.3 Helper Functie voor Effective Duration

**Bestand:** `src/utils/audio.ts`

```typescript
/**
 * Calculate the effective duration of a clip (trimmed or full)
 */
export function getClipDuration(clip: Clip, sample: Sample): number {
  const start = clip.trimStart ?? 0;
  const end = clip.trimEnd ?? sample.duration;
  return end - start;
}

/**
 * Calculate effective duration in beats
 */
export function getClipDurationBeats(clip: Clip, sample: Sample, bpm: number): number {
  const durationSeconds = getClipDuration(clip, sample);
  return secondsToBeats(durationSeconds, bpm);
}
```

### Verificatie Fase 1
- [ ] `npm run build` - TypeScript compileert zonder errors
- [ ] `npm run lint` - Geen nieuwe lint warnings
- [ ] Bestaande app werkt nog identiek (backwards compatible)

### Documentatie Update
- [ ] Update deze roadmap: Fase 1 ✅ Compleet
- [ ] Voeg JSDoc toe aan nieuwe types

---

## Fase 2: Smart Snap & Overlap Detectie

**Geschatte tijd:** 2-3 uur
**Impact:** Medium - wijzigt core placement logic

### 2.1 Overlap Detectie Functie

**Nieuw bestand:** `src/utils/clipCollision.ts`

```typescript
import type { Clip, Sample, Track } from '../types';
import { getClipDurationBeats } from './audio';

interface ClipBounds {
  startBeat: number;
  endBeat: number;
}

/**
 * Get the beat boundaries of a clip
 */
export function getClipBounds(clip: Clip, sample: Sample, bpm: number): ClipBounds {
  const durationBeats = getClipDurationBeats(clip, sample, bpm);
  return {
    startBeat: clip.startBeat,
    endBeat: clip.startBeat + durationBeats,
  };
}

/**
 * Check if two clips overlap
 */
export function clipsOverlap(
  bounds1: ClipBounds,
  bounds2: ClipBounds
): boolean {
  // Two ranges overlap if one starts before the other ends AND ends after the other starts
  return bounds1.startBeat < bounds2.endBeat && bounds1.endBeat > bounds2.startBeat;
}

/**
 * Check if a new clip would overlap with any existing clips on a track
 */
export function wouldOverlap(
  track: Track,
  newClip: Clip,
  newSample: Sample,
  samples: Sample[],
  bpm: number,
  excludeClipId?: string
): boolean {
  const newBounds = getClipBounds(newClip, newSample, bpm);
  const sampleMap = new Map(samples.map(s => [s.id, s]));

  return track.clips.some(existingClip => {
    if (excludeClipId && existingClip.id === excludeClipId) return false;

    const existingSample = sampleMap.get(existingClip.sampleId);
    if (!existingSample) return false;

    const existingBounds = getClipBounds(existingClip, existingSample, bpm);
    return clipsOverlap(newBounds, existingBounds);
  });
}
```

### 2.2 Smart Snap Logic

**Bestand:** `src/utils/clipCollision.ts` (toevoegen)

```typescript
export interface SmartSnapResult {
  trackIndex: number;
  startBeat: number;
  reason: 'original' | 'shifted' | 'track_below' | 'rejected';
}

/**
 * Find the best position for a clip using smart snap
 *
 * Strategy:
 * 1. Try original position on target track
 * 2. If overlap, try placing after the blocking clip (same track)
 * 3. If still no space, try tracks below
 * 4. If all fail, reject placement
 */
export function findSmartSnapPosition(
  tracks: Track[],
  targetTrackIndex: number,
  newClip: Clip,
  newSample: Sample,
  samples: Sample[],
  bpm: number,
  totalBeats: number,
  excludeClipId?: string
): SmartSnapResult {
  const sampleMap = new Map(samples.map(s => [s.id, s]));
  const clipDuration = getClipDurationBeats(newClip, newSample, bpm);

  // Try original position
  const targetTrack = tracks[targetTrackIndex];
  if (!wouldOverlap(targetTrack, newClip, newSample, samples, bpm, excludeClipId)) {
    return { trackIndex: targetTrackIndex, startBeat: newClip.startBeat, reason: 'original' };
  }

  // Find the blocking clip and try placing after it
  const newBounds = getClipBounds(newClip, newSample, bpm);
  const blockingClips = targetTrack.clips
    .filter(c => c.id !== excludeClipId)
    .map(c => ({ clip: c, bounds: getClipBounds(c, sampleMap.get(c.sampleId)!, bpm) }))
    .filter(({ bounds }) => clipsOverlap(newBounds, bounds))
    .sort((a, b) => a.bounds.endBeat - b.bounds.endBeat);

  if (blockingClips.length > 0) {
    // Try placing after the first blocking clip
    const shiftedStartBeat = Math.ceil(blockingClips[0].bounds.endBeat);
    if (shiftedStartBeat + clipDuration <= totalBeats) {
      const shiftedClip = { ...newClip, startBeat: shiftedStartBeat };
      if (!wouldOverlap(targetTrack, shiftedClip, newSample, samples, bpm, excludeClipId)) {
        return { trackIndex: targetTrackIndex, startBeat: shiftedStartBeat, reason: 'shifted' };
      }
    }
  }

  // Try tracks below
  for (let i = targetTrackIndex + 1; i < tracks.length; i++) {
    if (!wouldOverlap(tracks[i], newClip, newSample, samples, bpm, excludeClipId)) {
      return { trackIndex: i, startBeat: newClip.startBeat, reason: 'track_below' };
    }
  }

  return { trackIndex: targetTrackIndex, startBeat: newClip.startBeat, reason: 'rejected' };
}
```

### 2.3 Update timelineStore

**Bestand:** `src/stores/timelineStore.ts`

Vervang de huidige `addClip` en `moveClip` functies om `findSmartSnapPosition` te gebruiken:

```typescript
import { findSmartSnapPosition, wouldOverlap } from '../utils/clipCollision';
import { useThemeStore } from './themeStore'; // For samples access

// In addClip:
addClip: (trackIndex, clip, sample, samples) => {
  const state = get();
  const result = findSmartSnapPosition(
    state.tracks,
    trackIndex,
    clip,
    sample,
    samples,
    state.bpm,
    state.totalBeats
  );

  if (result.reason === 'rejected') return false;

  const finalClip = { ...clip, startBeat: result.startBeat };

  set((prev) => ({
    tracks: prev.tracks.map((t, i) =>
      i === result.trackIndex ? { ...t, clips: [...t.clips, finalClip] } : t
    ),
  }));

  return true;
};
```

### Verificatie Fase 2
- [ ] Unit tests voor `clipsOverlap` en `findSmartSnapPosition`
- [ ] Handmatige test: Sleep clip naar overlap → plaatst automatisch na blocking clip
- [ ] Handmatige test: Geen ruimte op track → plaatst op track eronder
- [ ] Handmatige test: Nergens ruimte → drop wordt geweigerd (clip keert terug)
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 2 ✅ Compleet
- [ ] Voeg unit tests toe aan `src/utils/__tests__/clipCollision.test.ts`

---

## Fase 3: Clip Selection State

**Geschatte tijd:** 1-2 uur
**Impact:** Medium - nieuwe UI state

### 3.1 Selection Store

**Nieuw bestand:** `src/stores/selectionStore.ts`

```typescript
import { create } from 'zustand';

interface SelectionStore {
  selectedClipId: string | null;
  selectedTrackIndex: number | null;

  selectClip: (clipId: string, trackIndex: number) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selectedClipId: null,
  selectedTrackIndex: null,

  selectClip: (clipId, trackIndex) => set({
    selectedClipId: clipId,
    selectedTrackIndex: trackIndex
  }),

  clearSelection: () => set({
    selectedClipId: null,
    selectedTrackIndex: null
  }),
}));
```

### 3.2 Update Clip Component

**Bestand:** `src/components/studio/Clip.tsx`

```typescript
import { useSelectionStore } from '../../stores/selectionStore';

// In component:
const selectedClipId = useSelectionStore((s) => s.selectedClipId);
const selectClip = useSelectionStore((s) => s.selectClip);
const isSelected = selectedClipId === clip.id;

// Update onClick handler:
const handleClick = (e: React.MouseEvent) => {
  if (readOnly) return;
  e.stopPropagation();
  selectClip(clip.id, trackIndex);
};

// Update className voor selection highlight:
className={`
  ...existing classes...
  ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}
`}

// Add onClick to wrapper div:
onClick={handleClick}
```

### 3.3 Click-Away to Deselect

**Bestand:** `src/components/studio/Timeline.tsx`

```typescript
import { useSelectionStore } from '../../stores/selectionStore';

// In component:
const clearSelection = useSelectionStore((s) => s.clearSelection);

// Add onClick to timeline container (not on clips):
<div
  onClick={(e) => {
    // Only clear if clicking on timeline background, not a clip
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  }}
>
```

### Verificatie Fase 3
- [ ] Klik op clip → clip krijgt highlight ring
- [ ] Klik op andere clip → vorige deselecteert, nieuwe selecteert
- [ ] Klik op lege timeline → selectie verdwijnt
- [ ] Drag clip → selectie blijft behouden (of update naar gedragged clip)
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 3 ✅ Compleet

---

## Fase 4: Edit Toolbar Component

**Geschatte tijd:** 2 uur
**Impact:** Medium - nieuwe UI component

### 4.1 Toolbar Component

**Nieuw bestand:** `src/components/studio/EditToolbar.tsx`

```typescript
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors, Trash2, Copy, Volume2 } from 'lucide-react';
import { useSelectionStore } from '../../stores/selectionStore';
import type { Clip, Sample } from '../../types';

interface EditToolbarProps {
  clip: Clip;
  sample: Sample;
  trackIndex: number;
  onTrim: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export const EditToolbar = memo(function EditToolbar({
  clip,
  sample,
  trackIndex,
  onTrim,
  onDelete,
  onDuplicate,
}: EditToolbarProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 px-2 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sample info */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-neutral-200">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: sample.color }}
        />
        <span className="text-xs font-medium text-neutral-700 max-w-20 truncate">
          {t(sample.name)}
        </span>
      </div>

      {/* Trim button */}
      <button
        onClick={onTrim}
        className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors"
        title={t('studio.trim')}
      >
        <Scissors size={16} className="text-neutral-600" />
      </button>

      {/* Duplicate button (optional) */}
      {onDuplicate && (
        <button
          onClick={onDuplicate}
          className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors"
          title={t('studio.duplicate')}
        >
          <Copy size={16} className="text-neutral-600" />
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-error-100 rounded-md transition-colors"
        title={t('studio.delete')}
      >
        <Trash2 size={16} className="text-error-500" />
      </button>
    </div>
  );
});
```

### 4.2 Toolbar Positioning

**Bestand:** `src/components/studio/StudioView.tsx` (of nieuwe wrapper)

```typescript
import { EditToolbar } from './EditToolbar';
import { useSelectionStore } from '../../stores/selectionStore';

// In component, render toolbar ABOVE timeline when clip is selected:
const selectedClipId = useSelectionStore((s) => s.selectedClipId);
const selectedTrackIndex = useSelectionStore((s) => s.selectedTrackIndex);

// Find the selected clip and sample
const selectedClip = selectedClipId
  ? tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
  : null;
const selectedSample = selectedClip
  ? samples.find(s => s.id === selectedClip.sampleId)
  : null;

// In JSX, above <Timeline>:
{selectedClip && selectedSample && selectedTrackIndex !== null && (
  <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200">
    <EditToolbar
      clip={selectedClip}
      sample={selectedSample}
      trackIndex={selectedTrackIndex}
      onTrim={() => setTrimModalOpen(true)}
      onDelete={() => handleRemoveClip(selectedTrackIndex, selectedClip.id)}
    />
  </div>
)}
```

### 4.3 Translations

**Bestand:** `public/locales/nl/translation.json`

```json
{
  "studio": {
    "trim": "Inkorten",
    "duplicate": "Dupliceren",
    "delete": "Verwijderen",
    "trimModal": {
      "title": "Sample inkorten",
      "preview": "Voorbeeld",
      "apply": "Toepassen",
      "cancel": "Annuleren",
      "reset": "Reset"
    }
  }
}
```

### Verificatie Fase 4
- [ ] Selecteer clip → toolbar verschijnt boven timeline
- [ ] Toolbar toont sample naam en kleur
- [ ] Scissors/Delete buttons zijn klikbaar
- [ ] Klik buiten clip → toolbar verdwijnt
- [ ] Mobile: toolbar is touch-friendly (voldoende padding)
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 4 ✅ Compleet

---

## Fase 5: Waveform Generatie & Component

**Geschatte tijd:** 2-3 uur
**Impact:** Medium - nieuwe audio processing

### 5.1 Waveform Utility

**Nieuw bestand:** `src/utils/waveform.ts`

```typescript
import { WAVEFORM_SAMPLES_PER_PEAK } from '../constants/config';

export interface WaveformData {
  peaks: number[];  // Normalized 0-1 values
  duration: number; // In seconds
}

/**
 * Extract peak data from an AudioBuffer
 *
 * @param audioBuffer - The decoded audio buffer
 * @param targetPeaks - Target number of peaks (will be adjusted based on duration)
 * @returns Normalized peak values (0-1)
 */
export function extractWaveformPeaks(
  audioBuffer: AudioBuffer,
  targetPeaks: number = 100
): number[] {
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const totalSamples = channelData.length;
  const samplesPerPeak = Math.floor(totalSamples / targetPeaks);

  const peaks: number[] = [];

  for (let i = 0; i < targetPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, totalSamples);

    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }

    peaks.push(max);
  }

  // Normalize to 0-1 range
  const maxPeak = Math.max(...peaks, 0.01);
  return peaks.map(p => p / maxPeak);
}
```

### 5.2 Extend AudioService met Waveform Cache

**Bestand:** `src/services/AudioService.ts`

```typescript
private waveformCache: Map<string, WaveformData> = new Map();

/**
 * Get waveform data for a sample (cached)
 */
async getWaveform(sampleId: string): Promise<WaveformData | null> {
  // Check cache first
  if (this.waveformCache.has(sampleId)) {
    return this.waveformCache.get(sampleId)!;
  }

  const player = this.players.get(sampleId);
  if (!player || !player.loaded || !player.buffer) {
    return null;
  }

  // Extract peaks from the Tone.js buffer
  const audioBuffer = player.buffer.get() as AudioBuffer;
  if (!audioBuffer) return null;

  const peaks = extractWaveformPeaks(audioBuffer, WAVEFORM_SAMPLES_PER_PEAK);
  const waveformData: WaveformData = {
    peaks,
    duration: audioBuffer.duration,
  };

  this.waveformCache.set(sampleId, waveformData);
  return waveformData;
}

/**
 * Clear waveform cache (call in dispose)
 */
clearWaveformCache(): void {
  this.waveformCache.clear();
}
```

### 5.3 Waveform Visualization Component

**Nieuw bestand:** `src/components/studio/Waveform.tsx`

```typescript
import { memo, useEffect, useRef } from 'react';
import type { WaveformData } from '../../utils/waveform';
import { WAVEFORM_BAR_WIDTH_PX, WAVEFORM_GAP_PX } from '../../constants/config';

interface WaveformProps {
  data: WaveformData;
  color: string;
  /** Trim region in seconds [start, end] */
  trimRegion?: [number, number];
  /** Callback when trim region changes via drag */
  onTrimChange?: (start: number, end: number) => void;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Current playhead position in seconds (for preview) */
  playheadPosition?: number;
}

export const Waveform = memo(function Waveform({
  data,
  color,
  trimRegion,
  onTrimChange,
  width,
  height,
  playheadPosition,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const barWidth = WAVEFORM_BAR_WIDTH_PX;
    const gap = WAVEFORM_GAP_PX;
    const barCount = data.peaks.length;

    const trimStart = trimRegion?.[0] ?? 0;
    const trimEnd = trimRegion?.[1] ?? data.duration;

    // Calculate pixel positions for trim region
    const trimStartPx = (trimStart / data.duration) * width;
    const trimEndPx = (trimEnd / data.duration) * width;

    // Draw dimmed area outside trim region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, trimStartPx, height);
    ctx.fillRect(trimEndPx, 0, width - trimEndPx, height);

    // Draw waveform bars
    const centerY = height / 2;
    data.peaks.forEach((peak, i) => {
      const x = (i / barCount) * width;
      const barHeight = peak * (height - 10);

      // Check if bar is in trim region
      const peakTime = (i / barCount) * data.duration;
      const inTrimRegion = peakTime >= trimStart && peakTime <= trimEnd;

      ctx.fillStyle = inTrimRegion ? color : `${color}40`;
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        Math.max(barWidth, width / barCount - gap),
        barHeight
      );
    });

    // Draw playhead if provided
    if (playheadPosition !== undefined && playheadPosition >= 0) {
      const playheadX = (playheadPosition / data.duration) * width;
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }

  }, [data, color, trimRegion, width, height, playheadPosition]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="block"
    />
  );
});
```

### Verificatie Fase 5
- [ ] `audioService.getWaveform(sampleId)` retourneert peaks array
- [ ] Waveform component rendert correct
- [ ] Trim region wordt visueel gemarkeerd (dimmed areas)
- [ ] Performance check: waveform generation < 50ms per sample
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 5 ✅ Compleet

---

## Fase 6: Trim Modal

**Geschatte tijd:** 3-4 uur
**Impact:** High - nieuwe modal met interactie

### 6.1 Trim Modal Component

**Nieuw bestand:** `src/components/studio/TrimModal.tsx`

```typescript
import { memo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { Waveform } from './Waveform';
import { audioService } from '../../services/AudioService';
import type { Clip, Sample } from '../../types';
import type { WaveformData } from '../../utils/waveform';
import { MIN_TRIM_DURATION_SECONDS } from '../../constants/config';

interface TrimModalProps {
  clip: Clip;
  sample: Sample;
  isOpen: boolean;
  onClose: () => void;
  onApply: (trimStart: number, trimEnd: number) => void;
}

export const TrimModal = memo(function TrimModal({
  clip,
  sample,
  isOpen,
  onClose,
  onApply,
}: TrimModalProps) {
  const { t } = useTranslation();
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [trimStart, setTrimStart] = useState(clip.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(clip.trimEnd ?? sample.duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState<number | undefined>(undefined);

  // Load waveform on mount
  useEffect(() => {
    if (isOpen) {
      audioService.getWaveform(sample.id).then(setWaveform);
      // Reset to current clip values
      setTrimStart(clip.trimStart ?? 0);
      setTrimEnd(clip.trimEnd ?? sample.duration);
    }
  }, [isOpen, sample.id, clip.trimStart, clip.trimEnd, sample.duration]);

  // Handle trim region drag
  const handleTrimChange = useCallback((start: number, end: number) => {
    // Enforce minimum duration
    if (end - start < MIN_TRIM_DURATION_SECONDS) return;
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  // Preview playback (trimmed region only)
  const handlePreview = useCallback(async () => {
    if (isPlaying) {
      audioService.stopSample(sample.id);
      setIsPlaying(false);
      setPlayheadPos(undefined);
      return;
    }

    setIsPlaying(true);
    setPlayheadPos(trimStart);

    // Play with offset and duration
    await audioService.playSampleRegion(sample.id, trimStart, trimEnd - trimStart);

    // Animate playhead
    const startTime = performance.now();
    const duration = (trimEnd - trimStart) * 1000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        setIsPlaying(false);
        setPlayheadPos(undefined);
        return;
      }
      setPlayheadPos(trimStart + (elapsed / 1000));
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isPlaying, sample.id, trimStart, trimEnd]);

  // Reset to original
  const handleReset = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(sample.duration);
  }, [sample.duration]);

  // Apply and close
  const handleApply = useCallback(() => {
    onApply(trimStart, trimEnd);
    onClose();
  }, [trimStart, trimEnd, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-900">
            {t('studio.trimModal.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Waveform */}
        <div className="p-4">
          <div className="relative bg-neutral-100 rounded-lg overflow-hidden">
            {waveform ? (
              <TrimHandles
                waveform={waveform}
                color={sample.color}
                trimStart={trimStart}
                trimEnd={trimEnd}
                onTrimChange={handleTrimChange}
                playheadPosition={playheadPos}
              />
            ) : (
              <div className="h-24 flex items-center justify-center">
                <span className="text-sm text-neutral-400">Loading...</span>
              </div>
            )}
          </div>

          {/* Time display */}
          <div className="flex justify-between mt-2 text-xs text-neutral-500">
            <span>{trimStart.toFixed(1)}s</span>
            <span className="font-medium text-neutral-700">
              {(trimEnd - trimStart).toFixed(1)}s
            </span>
            <span>{trimEnd.toFixed(1)}s</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span className="text-sm">{t('studio.trimModal.preview')}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors"
              title={t('studio.trimModal.reset')}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              {t('studio.trimModal.cancel')}
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              {t('studio.trimModal.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### 6.2 Trim Handles Sub-component

**Bestand:** `src/components/studio/TrimModal.tsx` (toevoegen)

```typescript
interface TrimHandlesProps {
  waveform: WaveformData;
  color: string;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  playheadPosition?: number;
}

function TrimHandles({
  waveform,
  color,
  trimStart,
  trimEnd,
  onTrimChange,
  playheadPosition,
}: TrimHandlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const handlePointerDown = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const time = (x / rect.width) * waveform.duration;

    if (dragging === 'start') {
      const newStart = Math.min(time, trimEnd - MIN_TRIM_DURATION_SECONDS);
      onTrimChange(Math.max(0, newStart), trimEnd);
    } else {
      const newEnd = Math.max(time, trimStart + MIN_TRIM_DURATION_SECONDS);
      onTrimChange(trimStart, Math.min(waveform.duration, newEnd));
    }
  };

  const handlePointerUp = () => setDragging(null);

  const startPercent = (trimStart / waveform.duration) * 100;
  const endPercent = (trimEnd / waveform.duration) * 100;

  return (
    <div
      ref={containerRef}
      className="relative h-24 touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Waveform
        data={waveform}
        color={color}
        trimRegion={[trimStart, trimEnd]}
        width={containerRef.current?.clientWidth ?? 400}
        height={96}
        playheadPosition={playheadPosition}
      />

      {/* Left handle */}
      <div
        className="absolute top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center bg-primary-500/20 hover:bg-primary-500/40 transition-colors"
        style={{ left: `${startPercent}%`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown('start')}
      >
        <div className="w-1 h-8 bg-primary-500 rounded-full" />
      </div>

      {/* Right handle */}
      <div
        className="absolute top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center bg-primary-500/20 hover:bg-primary-500/40 transition-colors"
        style={{ left: `${endPercent}%`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown('end')}
      >
        <div className="w-1 h-8 bg-primary-500 rounded-full" />
      </div>
    </div>
  );
}
```

### 6.3 Extend AudioService met Region Playback

**Bestand:** `src/services/AudioService.ts`

```typescript
/**
 * Play a specific region of a sample
 */
async playSampleRegion(
  sampleId: string,
  offsetSeconds: number,
  durationSeconds: number
): Promise<void> {
  const player = this.players.get(sampleId);
  if (!player || !player.loaded) {
    logger.warn(`Sample "${sampleId}" not loaded for region playback`);
    return;
  }

  player.start(Tone.now(), offsetSeconds, durationSeconds);
}
```

### Verificatie Fase 6
- [ ] Modal opent vanuit EditToolbar
- [ ] Waveform toont correcte audio representatie
- [ ] Trim handles zijn sleepbaar (touch + mouse)
- [ ] Minimum trim duration wordt afgedwongen
- [ ] Preview speelt alleen geselecteerde regio
- [ ] Apply slaat trimStart/trimEnd op in clip
- [ ] Cancel keert terug zonder wijzigingen
- [ ] Reset zet handles terug naar begin/eind
- [ ] Mobile: fullscreen modal werkt correct
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 6 ✅ Compleet

---

## Fase 7: Audio Scheduling met Trim

**Geschatte tijd:** 1-2 uur
**Impact:** Medium - wijzigt playback

### 7.1 Update scheduleTimeline

**Bestand:** `src/services/AudioService.ts`

```typescript
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  const transport = Tone.getTransport();
  transport.cancel();
  transport.bpm.value = DEFAULT_BPM;

  const sampleMap = new Map(samples.map((s) => [s.id, s]));

  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const player = this.players.get(clip.sampleId);
      const sample = sampleMap.get(clip.sampleId);

      if (!player || !player.loaded || !sample) return;

      const startSeconds = beatsToSeconds(clip.startBeat, DEFAULT_BPM);

      // Calculate trim offset and duration
      const trimStart = clip.trimStart ?? 0;
      const trimEnd = clip.trimEnd ?? sample.duration;
      const trimDuration = trimEnd - trimStart;

      transport.schedule((time) => {
        // Play with offset and duration for trimmed clips
        player.start(time, trimStart, trimDuration);
      }, startSeconds);
    });
  });
}
```

### 7.2 Update Clip Visuele Breedte

**Bestand:** `src/components/studio/Clip.tsx`

```typescript
import { getClipDurationBeats } from '../../utils/audio';

// Replace current duration calculation:
// OLD: const durationBeats = secondsToBeats(sample.duration, bpm);
// NEW:
const durationBeats = getClipDurationBeats(clip, sample, bpm);
```

### 7.3 Update timelineStore voor Trim Persistence

**Bestand:** `src/stores/timelineStore.ts`

```typescript
// Add updateClipTrim action
updateClipTrim: (trackIndex: number, clipId: string, trimStart: number, trimEnd: number) => {
  set((prev) => ({
    tracks: prev.tracks.map((track, i) =>
      i === trackIndex
        ? {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id === clipId
                ? { ...clip, trimStart, trimEnd }
                : clip
            ),
          }
        : track
    ),
  }));
};
```

### Verificatie Fase 7
- [ ] Getrimde clips spelen alleen de geselecteerde regio
- [ ] Clip visuele breedte reflecteert getrimde duration
- [ ] Timeline scheduling houdt rekening met trim offset
- [ ] Compositions met getrimde clips slaan correct op/laden
- [ ] Overlap detectie werkt correct met getrimde clips
- [ ] `npm run build` succesvol

### Documentatie Update
- [ ] Update deze roadmap: Fase 7 ✅ Compleet
- [ ] Update `docs/todo-implementatie.md` - markeer #12 en #16 als compleet

---

## Testplan Eindresultaat

### Functionele Tests

| Test | Expected Result |
|------|-----------------|
| Sleep sample naar bezette positie | Plaatst na blocking clip of op track eronder |
| Sleep sample, geen ruimte | Clip keert terug naar library |
| Klik op clip | Highlight + toolbar verschijnt |
| Klik scissors in toolbar | Trim modal opent |
| Sleep trim handles | Waveform update + time display update |
| Klik Preview | Speelt alleen geselecteerde regio |
| Klik Apply | Modal sluit, clip is visueel korter |
| Play timeline met getrimde clip | Speelt correcte regio op juiste moment |
| Save/load composition met trim | Trim values blijven behouden |

### Performance Tests

| Metric | Target |
|--------|--------|
| Waveform generation | < 50ms per sample |
| Collision detection | < 5ms voor 50 clips |
| Modal open animation | 60fps |
| Timeline re-render | < 16ms |

### Browser Compatibility

- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (iPad - touch)
- [ ] Chrome (Android tablet - touch)

---

## Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Waveform memory usage | Medium | Cache alleen geladen samples, clear bij unload |
| Touch drag conflicts | High | Careful pointer event handling, test extensively |
| Tone.js timing issues | Medium | Use Transport.schedule, not setTimeout |
| Store state corruption | High | Immutable updates, proper Zustand patterns |

---

## Changelog

| Datum | Fase | Status |
|-------|------|--------|
| 2026-02-03 | Planning | Document aangemaakt |
| - | Fase 1 | 🔵 Pending |
| - | Fase 2 | 🔵 Pending |
| - | Fase 3 | 🔵 Pending |
| - | Fase 4 | 🔵 Pending |
| - | Fase 5 | 🔵 Pending |
| - | Fase 6 | 🔵 Pending |
| - | Fase 7 | 🔵 Pending |

---

*Dit document wordt bijgewerkt na elke fase.*
