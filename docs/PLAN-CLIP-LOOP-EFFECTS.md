# Implementatieplan: #65 Clip Loop + #33 Clip Effects (Pitch & Reverb)

> Datum: 2026-03-16
> Status: Geaccordeerd ontwerp, klaar voor implementatie

## Samenvatting beslissingen

| Beslissing | Keuze |
|---|---|
| Loop mechanisme | Clip-breedte = loop-duur, resize handle aan rechterrand |
| Loop visueel | Herhaald stuk lichter dan origineel, 1px scheiding |
| Loop limiet | Geen max — mag hele tijdlijn vullen |
| Loop + trim | Loop herhaalt altijd het getrimde stuk |
| Effects scope | Alleen pitch + reverb (geen pan/filter nu) |
| Effects per | Per-clip (niet per-track). Dupliceren kopieert effects mee |
| Reverb duur | Binnen clip-grenzen (geen tail voorbij clip-einde) |
| Effect engine | Aparte Player per clip met effects (Optie B) |
| Resize handle | Dedicated pointer-based resize (niet dnd-kit), alleen zichtbaar bij selectie |

---

## Stap 1: Types — `src/types/index.ts`

### Clip interface uitbreiden

```typescript
export interface Clip {
  id: string;
  sampleId: string;
  startBeat: number;
  effects?: ClipEffects;
  trimStart?: number;
  trimEnd?: number;
  fromTemplate?: boolean;
  label?: string;
  // NIEUW #65:
  /** When true, clip repeats the (trimmed) sample until loopDurationBeats */
  loop?: boolean;
  /** Total clip width in beats when looping (must be > sample duration in beats) */
  loopDurationBeats?: number;
}
```

### ClipEffects — geen wijzigingen nodig

`pitch: number` en `reverb: number` bestaan al in de interface. Alleen de implementatie ontbreekt.

---

## Stap 2: Zod Schemas — `src/utils/schemas.ts`

### ClipSchema uitbreiden

```typescript
export const ClipSchema = z.object({
  id: z.string(),
  sampleId: z.string(),
  startBeat: z.number().min(0),
  effects: ClipEffectsSchema.optional(),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
  fromTemplate: z.boolean().optional(),
  label: z.string().max(30).optional(),
  // NIEUW #65:
  loop: z.boolean().optional(),
  loopDurationBeats: z.number().positive().optional(),
});
```

Backward compatible: bestaande data zonder `loop`/`loopDurationBeats` passeert validatie.

---

## Stap 3: Audio utils — `src/utils/audio.ts`

### Nieuwe/aangepaste functies

```typescript
/**
 * Get the VISUAL/SCHEDULING width of a clip in beats.
 * For looping clips: loopDurationBeats.
 * For normal clips: sample duration minus trim, in beats.
 */
export function getEffectiveClipDurationBeats(
  clip: Clip, sample: Sample, bpm: number
): number {
  if (clip.loop && clip.loopDurationBeats) {
    return clip.loopDurationBeats;
  }
  return getClipDurationBeats(clip, sample, bpm);
}

/**
 * Calculate the end beat of a clip (loop-aware).
 */
export function getEffectiveClipEndBeat(
  clip: Clip, sample: Sample, bpm: number
): number {
  return clip.startBeat + getEffectiveClipDurationBeats(clip, sample, bpm);
}
```

Bestaande `getClipDurationBeats()` en `getClipEndBeat()` blijven bestaan voor interne berekeningen (single-sample duur). Alle externe callers die clip-breedte op de tijdlijn bepalen migreren naar `getEffectiveClip*`.

### Callers die migreren naar `getEffective*`

| File | Functie/gebruik | Reden |
|---|---|---|
| `clipCollision.ts` | `getClipBounds()` | Clip-breedte voor collision detection |
| `clipCollision.ts` | `findSmartSnapPosition()` — `clipDurationBeats` | Bounds check |
| `clipCollision.ts` | `clipFitsInTimeline()` | End beat check |
| `AudioService.ts` | `isClipActiveAtBeat()` | Seek: is clip actief? |
| `AudioService.ts` | `lastActiveBeat` berekening | Auto-stop positie |
| `audioExport.ts` | `calculateTimelineDuration()` | Export duur |
| `Clip.tsx` | `durationBeats` voor width% | Visuele breedte |

### Callers die NIET migreren (bewust)

| File | Functie/gebruik | Reden |
|---|---|---|
| `AudioService.ts` | `getClipDuration()` — trimStart/trimDuration | Audio: duur van één sample-iteratie |
| `Timeline.tsx` | `getClipDuration()` — clip info pill | Toont enkele sample-duur (informatief) |

---

## Stap 4: clipCollision — `src/utils/clipCollision.ts`

### `getClipBounds()` → loop-aware

```typescript
export function getClipBounds(clip: Clip, sample: Sample, bpm: number): ClipBounds {
  const durationBeats = getEffectiveClipDurationBeats(clip, sample, bpm);
  return {
    startBeat: clip.startBeat,
    endBeat: clip.startBeat + durationBeats,
  };
}
```

Import wijzigen: `getClipDurationBeats` → `getEffectiveClipDurationBeats`.

### `findSmartSnapPosition()` — `clipDurationBeats`

Regel 117: `getClipDurationBeats(newClip, newSample, bpm)` → `getEffectiveClipDurationBeats(...)`.

### `clipFitsInTimeline()`

Regel 203: `getClipDurationBeats(clip, sample, bpm)` → `getEffectiveClipDurationBeats(...)`.

---

## Stap 5: timelineStore — `src/stores/timelineStore.ts`

### Nieuwe acties

```typescript
// #65 Clip Loop
setClipLoop: (trackIndex: number, clipId: string, loop: boolean, durationBeats?: number) => void;
resizeClipLoop: (trackIndex: number, clipId: string, loopDurationBeats: number) => void;

// #33 Clip Effects (pitch + reverb)
updateClipPitch: (trackIndex: number, clipId: string, pitch: number) => void;
updateClipReverb: (trackIndex: number, clipId: string, reverb: number) => void;
```

### `setClipLoop` implementatie

```typescript
setClipLoop: (trackIndex, clipId, loop, durationBeats) => {
  set((prev) => ({
    tracks: prev.tracks.map((track, i) =>
      i === trackIndex
        ? {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id === clipId
                ? {
                    ...clip,
                    loop: loop || undefined,           // false → undefined (clean)
                    loopDurationBeats: loop ? durationBeats : undefined,
                  }
                : clip,
            ),
          }
        : track,
    ),
  }));
},
```

### `resizeClipLoop` implementatie

Aangeroepen tijdens resize drag. Zelfde patroon maar update alleen `loopDurationBeats`.

### `updateClipPitch` / `updateClipReverb`

Zelfde patroon als bestaande `updateClipVolume()`:

```typescript
updateClipPitch: (trackIndex, clipId, pitch) => {
  set((prev) => ({
    tracks: prev.tracks.map((track, i) =>
      i === trackIndex
        ? {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id === clipId
                ? {
                    ...clip,
                    effects: { ...DEFAULT_CLIP_EFFECTS, ...clip.effects, pitch },
                  }
                : clip,
            ),
          }
        : track,
    ),
  }));
},
```

### `duplicateClip` — geen wijzigingen nodig

Bestaande `{ ...clip, id: uuid() }` spread kopieert `loop`, `loopDurationBeats`, en `effects` automatisch mee.

---

## Stap 6: AudioService.scheduleTimeline — `src/services/AudioService.ts`

Dit is de meest complexe stap. Twee grote wijzigingen: loop-events en effect chains.

### 6a. Nieuw veld op AudioService

```typescript
// Effect chains: isolated players + effect nodes for clips with pitch/reverb
private effectChains: Array<{
  player: Tone.Player;
  nodes: Tone.ToneAudioNode[];  // PitchShift, Reverb, Volume
}> = [];
```

### 6b. Helper: heeft clip effects?

```typescript
private clipHasEffects(clip: Clip): boolean {
  const fx = clip.effects;
  if (!fx) return false;
  return (fx.pitch !== 0 && fx.pitch !== undefined) ||
         (fx.reverb !== 0 && fx.reverb !== undefined);
}
```

### 6c. Helper: maak effect chain

```typescript
private createEffectChain(
  buffer: Tone.ToneAudioBuffer | Tone.Player,
  clip: Clip,
  volumeDb: number,
): { player: Tone.Player; nodes: Tone.ToneAudioNode[] } {
  const fx = clip.effects ?? DEFAULT_CLIP_EFFECTS;
  const nodes: Tone.ToneAudioNode[] = [];

  // Volume node (altijd, want we moeten volume instellen)
  const volumeNode = new Tone.Volume(volumeDb);
  nodes.push(volumeNode);

  // PitchShift (alleen als pitch ≠ 0)
  if (fx.pitch !== 0) {
    const pitchShift = new Tone.PitchShift({ pitch: fx.pitch });
    nodes.push(pitchShift);
  }

  // Reverb (alleen als reverb > 0)
  if (fx.reverb > 0) {
    const reverb = new Tone.Reverb({
      decay: 1.5 + (fx.reverb / 100) * 3,  // 1.5s tot 4.5s
    });
    reverb.wet.value = fx.reverb / 100;
    nodes.push(reverb);
  }

  // Maak geïsoleerde player
  const sourceBuffer = buffer instanceof Tone.Player
    ? buffer.buffer!            // Live: extract buffer van bestaande player
    : buffer;                   // Export: direct ToneAudioBuffer
  const player = new Tone.Player(sourceBuffer);

  // Chain: player → [pitchShift] → [reverb] → volume → destination
  // Tone.js chain() gaat van links naar rechts
  player.chain(...nodes, Tone.getDestination());

  return { player, nodes };
}
```

### 6d. scheduleTimeline() — herzien

```typescript
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  const transport = Tone.getTransport();
  transport.cancel();
  transport.bpm.value = DEFAULT_BPM;

  this.scheduledTracks = tracks;
  this.scheduledSamples = samples;

  // Dispose previous Part
  if (this.timelinePart) {
    this.timelinePart.dispose();
    this.timelinePart = null;
  }

  // Dispose previous effect chains
  this.disposeEffectChains();

  const sampleMap = new Map(samples.map((s) => [s.id, s]));

  type ClipEvent = {
    time: number;
    sampleId: string;
    trimStart: number;
    duration: number;
    volumeDb: number;
    isMuted: boolean;
    effectChainIndex?: number;  // NIEUW: index in this.effectChains
  };

  const events: ClipEvent[] = [];

  tracks.forEach((track) => {
    const trackVolume = track.volume ?? 0;
    const trackMuted = track.mute ?? false;

    track.clips.forEach((clip) => {
      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;

      const clipVolume = clip.effects?.volume ?? 0;
      const clipMuted = clip.effects?.mute ?? false;
      const volumeDb = trackVolume + clipVolume;
      const isMuted = trackMuted || clipMuted;
      const trimStart = getClipTrimStart(clip);
      const singleDuration = getClipDuration(clip, sample);

      // Bepaal of dit een effect-clip is
      const hasEffects = this.clipHasEffects(clip);
      let effectChainIndex: number | undefined;

      if (hasEffects && !isMuted) {
        const cachedPlayer = this.players.get(clip.sampleId);
        if (cachedPlayer?.loaded) {
          const chain = this.createEffectChain(cachedPlayer, clip, volumeDb);
          effectChainIndex = this.effectChains.length;
          this.effectChains.push(chain);
        }
      }

      // LOOP LOGIC
      if (clip.loop && clip.loopDurationBeats) {
        const totalSeconds = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM);
        const startSeconds = beatsToSeconds(clip.startBeat, DEFAULT_BPM);
        let offset = 0;

        while (offset < totalSeconds - 0.001) {  // -0.001 floating point safety
          const remaining = totalSeconds - offset;
          const dur = Math.min(singleDuration, remaining);
          events.push({
            time: startSeconds + offset,
            sampleId: clip.sampleId,
            trimStart,
            duration: dur,
            volumeDb,
            isMuted,
            effectChainIndex,
          });
          offset += singleDuration;
        }
      } else {
        // Normal clip (niet geloopt)
        const player = this.players.get(clip.sampleId);
        if (!player || !player.loaded) return;

        events.push({
          time: beatsToSeconds(clip.startBeat, DEFAULT_BPM),
          sampleId: clip.sampleId,
          trimStart,
          duration: singleDuration,
          volumeDb,
          isMuted,
          effectChainIndex,
        });
      }
    });
  });

  // lastActiveBeat — loop-aware
  this.lastActiveBeat = 0;
  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;
      const endBeat = getEffectiveClipEndBeat(clip, sample, DEFAULT_BPM);
      if (endBeat > this.lastActiveBeat) {
        this.lastActiveBeat = endBeat;
      }
    });
  });

  // Tone.Part met effect-aware callback
  this.timelinePart = new Tone.Part<ClipEvent>(
    (time, event) => {
      if (event.isMuted) return;

      // Gebruik effect chain als beschikbaar
      if (event.effectChainIndex !== undefined) {
        const chain = this.effectChains[event.effectChainIndex];
        if (chain?.player) {
          chain.player.start(time, event.trimStart, event.duration);
        }
        return;
      }

      // Standaard: gebruik gedeelde player
      const player = this.players.get(event.sampleId);
      if (player?.loaded) {
        player.volume.setValueAtTime(event.volumeDb, time);
        player.start(time, event.trimStart, event.duration);
      }
    },
    events,
  );

  this.timelinePart.start(0);
}
```

### 6e. Effect chain note: volume

Bij effect chains wordt volume ingesteld via de `Tone.Volume` node in de chain (niet via `player.volume.setValueAtTime`). Dit is omdat de player direct naar de effect-keten is gerouteerd, niet naar destination.

---

## Stap 7: AudioService.startActiveClips — loop-aware seek

### isClipActiveAtBeat() — loop-aware

```typescript
private isClipActiveAtBeat(clip: Clip, sample: Sample, beat: number): boolean {
  const clipEndBeat = getEffectiveClipEndBeat(clip, sample, DEFAULT_BPM);
  return clip.startBeat <= beat && beat < clipEndBeat;
}
```

### getActiveClipsAtBeat() — loop-aware trimStart

Bij seek in een loopende clip moeten we berekenen in welke loop-iteratie we zitten:

```typescript
// In getActiveClipsAtBeat(), na "clip is actief" check:
const elapsedBeats = beat - clip.startBeat;
const elapsedSeconds = beatsToSeconds(elapsedBeats, DEFAULT_BPM);

const originalTrimStart = getClipTrimStart(clip);
const singleDuration = getClipDuration(clip, sample);

if (clip.loop && clip.loopDurationBeats) {
  // Bereken welke loop-iteratie en positie daarin
  const posInLoop = elapsedSeconds % singleDuration;
  const adjustedTrimStart = originalTrimStart + posInLoop;
  const remainingInIteration = singleDuration - posInLoop;
  const totalRemaining = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM) - elapsedSeconds;
  const remainingDuration = Math.min(remainingInIteration, totalRemaining);
  // ... push met deze waarden
} else {
  // Bestaande logica (ongewijzigd)
  const adjustedTrimStart = originalTrimStart + elapsedSeconds;
  const remainingDuration = singleDuration - elapsedSeconds;
  // ... push
}
```

### Effect chains bij seek

Bij seek moeten actieve clips met effects hun effect chain gebruiken. We slaan de effect chain index op per clip in de scheduled data, of rebuilden de chain. Pragmatisch: bij seek gewoon de gedeelde player gebruiken (zonder effects). De seek is een kort moment; effecten worden weer actief zodra de volgende loop-iteratie via Tone.Part speelt.

> **Tradeoff**: Bij seek klinkt een clip met pitch/reverb even zonder die effects (~0.5 seconde tot volgende loop-start). Dit is acceptabel voor een kinderapp. Het alternatief (dynamisch effect chains rebuilden bij seek) is disproportioneel complex.

---

## Stap 8: AudioService.stop() — cleanup

### disposeEffectChains()

```typescript
private disposeEffectChains(): void {
  this.effectChains.forEach(({ player, nodes }) => {
    try { player.stop(); } catch { /* ignore */ }
    try { player.dispose(); } catch { /* ignore */ }
    nodes.forEach((node) => {
      try { node.dispose(); } catch { /* ignore */ }
    });
  });
  this.effectChains = [];
}
```

### stop() aanpassen

```typescript
stop(): void {
  const transport = Tone.getTransport();
  transport.cancel();
  transport.stop();
  transport.seconds = 0;

  // Stop shared players
  this.players.forEach((player) => {
    try { player.stop(); } catch { /* ignore */ }
  });

  // Stop + dispose effect chains
  this.disposeEffectChains();

  this.stopPlayheadUpdates();
  this.beatUpdateCallbacks.forEach((cb) => cb(0));
}
```

### pause() aanpassen

```typescript
pause(): void {
  const transport = Tone.getTransport();
  transport.pause();

  // Stop shared players
  this.players.forEach((player) => {
    try { player.stop(); } catch { /* ignore */ }
  });

  // Stop effect chain players (maar dispose NIET — needed for resume)
  this.effectChains.forEach(({ player }) => {
    try { player.stop(); } catch { /* ignore */ }
  });

  this.stopPlayheadUpdates();
}
```

---

## Stap 9: audioExport — `src/utils/audioExport.ts`

### calculateTimelineDuration() — loop-aware

```typescript
// Wijzig:
const clipDuration = getClipDuration(clip, sample);
// Naar:
const effectiveDuration = clip.loop && clip.loopDurationBeats
  ? beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM)
  : getClipDuration(clip, sample);
const endSeconds = startSeconds + effectiveDuration;
```

### renderOffline() — loop + effects

Dezelfde logica als scheduleTimeline, maar met offline-specifieke players:

```typescript
// Binnen de tracks.forEach loop:
track.clips.forEach((clip) => {
  // ... bestaande setup ...

  const trimStart = getClipTrimStart(clip);
  const singleDuration = getClipDuration(clip, sample);
  const hasEffects = (clip.effects?.pitch ?? 0) !== 0 || (clip.effects?.reverb ?? 0) > 0;

  // Maak audio chain
  let targetNode: Tone.ToneAudioNode;
  if (hasEffects) {
    const nodes: Tone.ToneAudioNode[] = [];
    const vol = new Tone.Volume(totalVolumeDb);
    nodes.push(vol);
    if ((clip.effects?.pitch ?? 0) !== 0) {
      nodes.push(new Tone.PitchShift({ pitch: clip.effects!.pitch }));
    }
    if ((clip.effects?.reverb ?? 0) > 0) {
      const reverb = new Tone.Reverb({ decay: 1.5 + (clip.effects!.reverb / 100) * 3 });
      reverb.wet.value = clip.effects!.reverb / 100;
      nodes.push(reverb);
    }
    // chain: last node → destination
    for (let i = nodes.length - 1; i > 0; i--) nodes[i - 1].connect(nodes[i]);
    nodes[nodes.length - 1].toDestination();
    targetNode = nodes[0];
  } else {
    targetNode = new Tone.Volume(totalVolumeDb).toDestination();
  }

  const player = new Tone.Player(buffer).connect(targetNode);

  // LOOP LOGIC (identiek aan live scheduling)
  if (clip.loop && clip.loopDurationBeats) {
    const totalSeconds = beatsToSeconds(clip.loopDurationBeats, DEFAULT_BPM);
    let offset = 0;
    while (offset < totalSeconds - 0.001) {
      const remaining = totalSeconds - offset;
      const dur = Math.min(singleDuration, remaining);
      const scheduleTime = startSeconds + offset;
      transport.schedule((time) => {
        player.start(time, trimStart, dur);
      }, scheduleTime);
      offset += singleDuration;
    }
  } else {
    transport.schedule((time) => {
      player.start(time, trimStart, singleDuration);
    }, startSeconds);
  }
});
```

> **Let op**: In offline context maakt export al aparte players per clip. De effect chain past hier naadloos in.

---

## Stap 10: Clip.tsx — resize handle + loop visualisatie + effect indicators

### 10a. Resize handle

Nieuwe state en event handlers in Clip component:

```typescript
// State
const [isResizing, setIsResizing] = useState(false);
const resizeStartRef = useRef<{ startX: number; originalBeats: number } | null>(null);

// Resize handle callback
const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
  e.stopPropagation();
  e.preventDefault();

  const singleDurationBeats = getClipDurationBeats(clip, sample, bpm);
  const currentBeats = clip.loop && clip.loopDurationBeats
    ? clip.loopDurationBeats
    : singleDurationBeats;

  resizeStartRef.current = { startX: e.clientX, originalBeats: currentBeats };
  setIsResizing(true);

  const trackElement = e.currentTarget.closest('[role="list"]') as HTMLElement;
  const trackWidth = trackElement?.querySelector('[class*="absolute left-"]')?.clientWidth ?? trackElement?.clientWidth ?? 1;
  const beatsPerPixel = totalBeats / trackWidth;

  const onPointerMove = (moveEvent: PointerEvent) => {
    if (!resizeStartRef.current) return;
    const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
    const deltaBeats = deltaX * beatsPerPixel;
    const newBeats = Math.max(singleDurationBeats, resizeStartRef.current.originalBeats + deltaBeats);

    // Snap to beat grid
    const snapped = Math.round(newBeats * 2) / 2; // snap to half-beat
    resizeClipLoop(trackIndex, clip.id, snapped);
  };

  const onPointerUp = () => {
    setIsResizing(false);
    resizeStartRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}, [clip, sample, bpm, totalBeats, trackIndex]);
```

### 10b. Loop visualisatie

Binnen de clip-div, loop-herhalingen als lichtere blokken:

```tsx
{/* Loop repeats visualization */}
{clip.loop && clip.loopDurationBeats && (() => {
  const singleBeats = getClipDurationBeats(clip, sample, bpm);
  const totalBeatsClip = clip.loopDurationBeats;
  const repeats: { leftPct: number; widthPct: number; isPartial: boolean }[] = [];

  let offset = singleBeats; // skip first (that's the original)
  while (offset < totalBeatsClip) {
    const remaining = totalBeatsClip - offset;
    const width = Math.min(singleBeats, remaining);
    repeats.push({
      leftPct: (offset / totalBeatsClip) * 100,
      widthPct: (width / totalBeatsClip) * 100,
      isPartial: width < singleBeats,
    });
    offset += singleBeats;
  }

  return repeats.map((r, i) => (
    <div
      key={i}
      className="absolute top-0 bottom-0 border-l border-white/30"
      style={{
        left: `${r.leftPct}%`,
        width: `${r.widthPct}%`,
        backgroundColor: 'rgba(255,255,255,0.25)',
      }}
    />
  ));
})()}
```

### 10c. Effect indicators

Klein icoon rechtsonder in de clip als pitch ≠ 0 of reverb > 0:

```tsx
{/* Effect indicator */}
{((clip.effects?.pitch ?? 0) !== 0 || (clip.effects?.reverb ?? 0) > 0) && (
  <div className="absolute right-0.5 bottom-0.5 text-white/70">
    <Sparkles size={10} />
  </div>
)}
```

### 10d. Resize handle element

Alleen zichtbaar als clip geselecteerd is en niet readOnly:

```tsx
{/* Resize handle (rechterrand) — alleen bij selectie */}
{isSelected && !readOnly && !locked && (
  <div
    onPointerDown={handleResizePointerDown}
    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-30
               hover:bg-white/30 active:bg-white/50 transition-colors"
    style={{ touchAction: 'none' }}
  />
)}
```

### 10e. Width berekening aanpassen

```typescript
// Was:
const durationBeats = getClipDurationBeats(clip, sample, bpm);
// Wordt:
const durationBeats = getEffectiveClipDurationBeats(clip, sample, bpm);
```

---

## Stap 11: EffectsPopover — `src/components/studio/EffectsPopover.tsx`

Nieuw component, patroon van VolumePopover:

```tsx
interface EffectsPopoverProps {
  pitch: number;           // -12 tot +12
  reverb: number;          // 0 tot 100
  onPitchChange: (pitch: number) => void;
  onReverbChange: (reverb: number) => void;
  onClose: () => void;
  label: string;
}
```

### Layout

```
┌─────────────────────────────┐
│ Effects: {label}        [×] │
├─────────────────────────────┤
│ Toonhoogte                  │
│ Laag ──●────────── Hoog     │
│                      [↺]    │
├─────────────────────────────┤
│ Galm                        │
│ Droog ──●────────── Galm    │
│                      [↺]    │
└─────────────────────────────┘
```

- Sliders: `<input type="range" />`
- Pitch: step=1, min=-12, max=12
- Reverb: step=5, min=0, max=100
- Reset knop per slider (dubbelklik op slider of reset icon)
- Portal-gebaseerd (zelfde patroon als VolumePopover)

---

## Stap 12: Timeline.tsx — effects knop

### ClipEditProps uitbreiden

```typescript
interface ClipEditProps {
  // bestaand...
  onClipPitchChange?: (pitch: number) => void;    // NIEUW
  onClipReverbChange?: (reverb: number) => void;   // NIEUW
}
```

### Nieuwe knop in clip edit toolbar

Tussen Volume en Delete, een Sparkles/Sliders knop:

```tsx
{/* Effects popover button */}
{clipEdit.onClipPitchChange && clipEdit.onClipReverbChange && (
  <button
    ref={effectsBtnRef}
    onClick={handleEffectsClick}
    aria-label={t('studio.effects')}
    title={t('studio.effects')}
    className={`
      p-1 sm:p-1.5 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px]
      flex items-center justify-center rounded-lg transition-colors
      ${hasEffects ? 'bg-violet-50 text-violet-600' : 'hover:bg-neutral-100 text-neutral-600'}
    `}
  >
    <Sparkles size={14} />
  </button>
)}
```

### EffectsPopover portal

Zelfde patroon als clipVolumePopover — portal naar `document.body`.

### StudioView.tsx — wiring

```typescript
const handleClipPitchChange = useCallback(
  (pitch: number) => {
    if (selectedClipId !== null && selectedTrackIndex !== null) {
      updateClipPitch(selectedTrackIndex, selectedClipId, pitch);
    }
  },
  [selectedClipId, selectedTrackIndex],
);

// idem handleClipReverbChange
```

Doorgeven als prop:
```typescript
clipEdit={{
  // bestaand...
  onClipPitchChange: handleClipPitchChange,
  onClipReverbChange: handleClipReverbChange,
}}
```

---

## Stap 13: i18n — `src/i18n/locales/nl.json` + `en.json`

### Nieuwe keys (NL)

```json
{
  "studio": {
    "effects": "Effecten",
    "pitch": "Toonhoogte",
    "pitchLow": "Laag",
    "pitchHigh": "Hoog",
    "reverbLabel": "Galm",
    "reverbDry": "Droog",
    "reverbWet": "Galm",
    "resetEffect": "Reset",
    "loopEnabled": "Loop aan",
    "loopDisabled": "Loop uit"
  }
}
```

### Nieuwe keys (EN)

```json
{
  "studio": {
    "effects": "Effects",
    "pitch": "Pitch",
    "pitchLow": "Low",
    "pitchHigh": "High",
    "reverbLabel": "Reverb",
    "reverbDry": "Dry",
    "reverbWet": "Reverb",
    "resetEffect": "Reset",
    "loopEnabled": "Loop on",
    "loopDisabled": "Loop off"
  }
}
```

---

## Stap 14: Tests

### Schema tests (`schemas.test.ts`)

- Clip met `loop: true, loopDurationBeats: 8` passeert
- Clip met `loop: false` zonder `loopDurationBeats` passeert
- Clip met `loopDurationBeats: -1` faalt (`.positive()`)

### Audio utils tests (`audio.test.ts`)

- `getEffectiveClipDurationBeats()` met loop
- `getEffectiveClipDurationBeats()` zonder loop (fallback naar sample)
- `getEffectiveClipEndBeat()` met loop

### Collision tests (`clipCollision.test.ts`)

- `getClipBounds()` met loopende clip
- `wouldOverlap()` met loopende clips
- `clipFitsInTimeline()` met loopende clip die voorbij tijdlijn gaat

### Build verificatie

- `npm run build` (TypeScript strict + Vite)
- `npm run lint`
- `npm run test:run`

---

## Risico's & mitigatie

| Risico | Kans | Impact | Mitigatie |
|---|---|---|---|
| PitchShift CPU te zwaar | Laag | Hoog | Max 2-3 clips met pitch tegelijk. Monitor performance. |
| Reverb.generate() is async | Medium | Medium | Pre-generate bij scheduling, niet in Part callback |
| Effect chains lekken geheugen | Medium | Medium | disposeEffectChains() in stop(), pause() stopt maar disposeert niet |
| Resize handle conflicteert met dnd-kit | Laag | Medium | stopPropagation op pointer events |
| Bestaande composities met `loop: undefined` | Nul | Nul | Alle nieuwe velden zijn optional |

---

## Implementatievolgorde

1. Types + Schemas (backward compatible, 0 risico)
2. Audio utils (pure functies, goed testbaar)
3. clipCollision (pure functies, goed testbaar)
4. timelineStore (state acties, simpel)
5. AudioService (scheduling + cleanup — kernlogica)
6. audioExport (offline rendering — mirror van scheduling)
7. Clip.tsx (resize handle + visualisatie)
8. EffectsPopover.tsx (nieuw UI component)
9. Timeline.tsx + StudioView.tsx (wiring)
10. i18n (strings)
11. Tests + build
