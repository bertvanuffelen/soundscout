# Plan #79 — Clip-effecten: Fade In & Fade Out

**Datum:** 2026-04-16
**Status:** ✅ Volledig geïmplementeerd (2026-04-16)

> **Implementatie-afwijkingen t.o.v. plan:**
> - Fade-curves gewijzigd van logaritmisch (`log(1+10x)/log(11)`) naar symmetrisch exponentieel: **fade-in `x²`**, **fade-out `(1-x)²`** (equal-power, gelijkmatigere perceptie)
> - Curve datatype: `number[]` (128 stappen), niet `Float32Array` — Tone.js `setValueCurveAtTime` accepteert `number[]`
> - Fade-handles zijn **altijd zichtbaar** (zoals TrimModal), niet alleen bij hover/drag
> - Preview-knop gebruikt nieuw `AudioService.playSampleWithEffects()` met tijdelijke geïsoleerde effect chain
> - Toolbar-volgorde gewijzigd: label-icoon direct na sample-naam (vóór trim)
> - Alle UI in design token kleuren (`accent-*`), niet violet
> - `updateClipTrim` clampt fades proportioneel bij inkorten: `scale = newDuration / (fadeIn + fadeOut)`

---

## Overzicht

Per clip een fade-in en/of fade-out instellen. De fade is een effect (net als pitch en reverb) en wordt ingesteld via een nieuwe **EffectsModal** die de huidige EffectsPopover vervangt. De modal toont de waveform van de sample met visuele fade-handles, plus de bestaande pitch/reverb-sliders.

---

## Stap 1 — Data-laag: ClipEffects uitbreiden

**Bestanden:** `src/types/index.ts`, `src/utils/schemas.ts`

### ClipEffects interface
```typescript
export interface ClipEffects {
  volume: number;       // bestaand
  mute?: boolean;       // bestaand
  pitch: number;        // bestaand
  reverb: number;       // bestaand
  pan: number;          // bestaand
  fadeIn: number;       // NIEUW — duur in seconden (0 = uit)
  fadeOut: number;      // NIEUW — duur in seconden (0 = uit)
}
```

### DEFAULT_CLIP_EFFECTS
```typescript
export const DEFAULT_CLIP_EFFECTS: ClipEffects = {
  volume: 0,
  pitch: 0,
  reverb: 0,
  pan: 0,
  fadeIn: 0,   // NIEUW
  fadeOut: 0,   // NIEUW
};
```

### Zod schema (schemas.ts)
```typescript
export const ClipEffectsSchema = z.object({
  volume: z.number(),
  mute: z.boolean().optional(),
  pitch: z.number(),
  reverb: z.number(),
  pan: z.number(),
  fadeIn: z.number().optional().default(0),   // NIEUW — optional voor backward compat
  fadeOut: z.number().optional().default(0),   // NIEUW
});
```

`optional().default(0)` zorgt dat bestaande opgeslagen composities zonder fade-velden gewoon 0 krijgen.

---

## Stap 2 — timelineStore: acties voor fade

**Bestand:** `src/stores/timelineStore.ts`

Nieuwe actie `updateClipFade(trackIndex, clipId, fadeIn, fadeOut)`:
- Clampt `fadeIn` en `fadeOut` tot `[0, effectieve clip-duur]`
- Zorgt dat `fadeIn + fadeOut ≤ effectieve clip-duur` (anders proportioneel terugschalen)
- Mergt in `clip.effects`
- `audioVersion++` (triggert live reschedule)

---

## Stap 3 — EffectsPopover → EffectsModal

**Bestanden:** `src/components/studio/EffectsModal.tsx` (nieuw), `src/components/studio/EffectsPopover.tsx` (verwijderen)

### Layout van de modal

```
┌─────────────────────────────────────────────┐
│  ● 🎵  Effecten: [sample naam]          ✕  │  ← header
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  │    │  ← waveform
│  │ ◆                              ◆   │    │  ← fade handles (violet)
│  └─────────────────────────────────────┘    │
│  Fade in: 0.4s              Fade out: 0.8s  │  ← duur-labels
│                                             │
│  ─── Toonhoogte ───────────────────── ↺    │  ← pitch slider (bestaand)
│  Laag ──────────●────────────── Hoog        │
│                                             │
│  ─── Galm ─────────────────────────── ↺    │  ← reverb slider (bestaand)
│  Droog ────────────●───────────── Nat       │
│                                             │
├─────────────────────────────────────────────┤
│  ▶ Voorbeeld   ↺  │          Annuleer  OK  │  ← footer
└─────────────────────────────────────────────┘
```

### Waveform-sectie

Hergebruikt de bestaande `Waveform`-component (`src/components/studio/Waveform.tsx`). Die ontvangt een nieuw optioneel prop:

```typescript
interface WaveformProps {
  // ... bestaande props ...
  fadeRegion?: { fadeIn: number; fadeOut: number };  // NIEUW — in seconden
}
```

De Waveform-component rendert fades visueel via hoogte-schaling + kleurtransitie (zie geïmplementeerde versie in Stap 7).

### Fade-handles

Twee drag-handles op de waveform (pointer events, zelfde patroon als TrimModal):
- **Links**: violet bolletje/staaf, sleepbaar naar rechts → bepaalt fadeIn-duur
- **Rechts**: violet bolletje/staaf, sleepbaar naar links → bepaalt fadeOut-duur
- Positie wordt omgerekend van pixels naar seconden: `fadeIn = (handleX / containerWidth) * sampleDuration`
- Minimum afstand tot rand: 0s (handle helemaal links = geen fade-in)
- Maximum: tot het midden van de clip of tot de andere handle

### Pitch en reverb sliders

Exact dezelfde sliders als de huidige EffectsPopover, maar nu in de modal. Geen functionele wijziging.

### Preview

De "Voorbeeld"-knop speelt de sample af **met alle effecten** (pitch, reverb, fade). Dit hergebruikt `audioService.playSampleRegion()` met een tijdelijke gain-node die de fade-curve toepast. Playhead-animatie op de waveform (al bestaand patroon uit TrimModal).

### Props

```typescript
interface EffectsModalProps {
  clip: Clip;
  sample: Sample;
  isOpen: boolean;
  onClose: () => void;
  onApply: (effects: Partial<ClipEffects>) => void;
}
```

De modal werkt met lokale state en past pas toe bij "OK". Dit is consistent met de TrimModal (die ook pas bij "Toepassen" wijzigt).

---

## Stap 4 — Timeline.tsx: EffectsPopover vervangen door EffectsModal

**Bestand:** `src/components/studio/Timeline.tsx`

- Import `EffectsModal` i.p.v. `EffectsPopover`
- Sparkles-knop opent nu de modal (i.p.v. portal-positioned popover)
- Vereenvoudigt de code: geen portal-positionering meer nodig
- `onApply` callback roept `updateClipEffects()` aan (nieuw, vervangt losse pitch/reverb updates)

---

## Stap 5 — AudioService: fade-scheduling

**Bestand:** `src/services/AudioService.ts`

### Exponentiële fade-curve generator (geïmplementeerd als x² / (1-x)²)

Private helper:

```typescript
private createFadeCurve(type: 'in' | 'out', steps: number = 128): number[]
```

Genereert een `number[]` met exponentiële curves:
- **Fade in**: `progress * progress` (x²) — geleidelijke opbouw van stilte naar vol volume
- **Fade out**: `(1 - progress) * (1 - progress)` ((1-x)²) — soepele afdaling naar stilte
- Array-lengte: 128 stappen (voldoende voor smooth, voorberekend en hergebruikt)

### Fade-node in createEffectChain()

Chain-volgorde wordt: Player → PitchShift → Reverb → **FadeGain** → Volume → Destination

```typescript
// NIEUW: Fade gain node (apart van clip-volume)
const fadeGain = new Tone.Gain(1);  // start op 1 (vol volume)
nodes.push(fadeGain);
```

De `fadeGain`-node wordt mee teruggegeven zodat we er later de curve op kunnen schedulen.

### Fade scheduling in scheduleTimeline()

Bij het aanmaken van clip events:
```
Als fadeIn > 0:
  fadeGain.gain.setValueAtTime(0, clipStartTime)
  fadeGain.gain.setValueCurveAtTime(fadeInCurve, clipStartTime, fadeInDuration)

Als fadeOut > 0:
  fadeOutStart = clipEndTime - fadeOutDuration
  fadeGain.gain.setValueCurveAtTime(fadeOutCurve, fadeOutStart, fadeOutDuration)
```

### clipHasEffects() bijwerken

```typescript
private clipHasEffects(clip: Clip): boolean {
  const fx = clip.effects;
  if (!fx) return false;
  return (fx.pitch !== 0 && fx.pitch !== undefined) ||
         (fx.reverb !== 0 && fx.reverb !== undefined) ||
         (fx.fadeIn > 0) ||    // NIEUW
         (fx.fadeOut > 0);     // NIEUW
}
```

Clips met alleen fade (geen pitch/reverb) krijgen nu ook een eigen geïsoleerde player. Dit is nodig omdat de fade-gain op de player zelf zit.

### Seek + fade: startActiveClips() aanpassen

Bij seek halverwege een fade-in:

```
elapsedInClip = seekPositie - clipStartBeat (in seconden)

Als elapsedInClip < fadeInDuur:
  → Bereken tussenliggend volume: fadeCurve[elapsedInClip / fadeInDuur]
  → fadeGain.gain.setValueAtTime(tussenVolume, startTime)
  → fadeGain.gain.setValueCurveAtTime(restCurve, startTime, resterendeFadeDuur)
Anders:
  → fadeGain.gain.setValueAtTime(1, startTime)  // fade is al voorbij

Analoog voor fade-out (als seekPositie in de fade-out zone valt).
```

### Loop-interactie

In `scheduleTimeline()` worden loopende clips al opgesplitst in meerdere ClipEvents (één per iteratie). Per event:
- **Eerste iteratie**: fade-in curve schedulen (als fadeIn > 0)
- **Laatste iteratie**: fade-out curve schedulen (als fadeOut > 0)
- **Middelste iteraties**: geen fade, gain blijft op 1

De iteratie-positie (eerste/laatste) is al af te leiden uit de loop-index.

---

## Stap 6 — Offline export: fades meenemen

**Bestand:** `src/utils/audioExport.ts`

De export bouwt al per clip de effect chain op in `Tone.Offline()`. Uitbreiding:
- FadeGain-node toevoegen aan de chain (zelfde als live)
- `setValueCurveAtTime()` schedulen met dezelfde x² / (1-x)² curves
- Werkt automatisch omdat `Tone.Offline()` dezelfde scheduling-API ondersteunt

---

## Stap 7 — Waveform-component: fade-visualisatie

**Bestand:** `src/components/studio/Waveform.tsx`

Nieuwe optionele prop `fadeRegion`:

```typescript
fadeRegion?: { fadeIn: number; fadeOut: number };
```

In de render-loop: per bar de fadeFactor berekenen. Geïmplementeerd met **twee visuele effecten**:

1. **Hoogte-schaling**: `barHeight = peak * maxBarHeight * fadeFactor` — bars worden fysiek kleiner
2. **Kleur-transitie**: bars blenden van sample-kleur naar `neutral-400` (#9ca3af) via dubbele layer (fade-kleur base + sample-kleur bovenop)

```
barTime = (i / barCount) * duration

Als barTime < fadeIn:
  fadeFactor = (barTime / fadeIn)²              // x² curve
Anders als barTime > (duration - fadeOut):
  progress = (barTime - fadeOutStart) / fadeOut
  fadeFactor = (1 - progress)²                   // (1-x)² curve
Anders:
  fadeFactor = 1.0

fadeFactor = max(0.06, fadeFactor)  // minimum zichtbaarheid
barHeight = max(2, peak * maxBarHeight * fadeFactor)
```

Geen performance-impact (zelfde loop, alleen extra berekening per bar).

---

## Stap 8 — i18n keys

**Bestanden:** `src/i18n/locales/nl.json`, `src/i18n/locales/en.json`

```json
"studio": {
  "fadeIn": "Fade in",
  "fadeOut": "Fade out",
  "fadeInDuration": "Fade in: {{duration}}s",
  "fadeOutDuration": "Fade out: {{duration}}s",
  "effectsModal": {
    "title": "Effecten",
    "apply": "Toepassen",
    "cancel": "Annuleer",
    "preview": "Voorbeeld",
    "reset": "Reset"
  }
}
```

---

## Stap 9 — CLAUDE.md en TODO.md bijwerken

- CLAUDE.md: fade-documentatie toevoegen bij ClipEffects en AudioService secties
- TODO.md: #79 verplaatsen naar Afgerond

---

## Implementatievolgorde

| Stap | Wat | Risico | Geschatte duur |
|------|-----|--------|----------------|
| 1 | Data-laag (types, schema) | Laag | 10 min |
| 2 | timelineStore actie | Laag | 15 min |
| 3 | EffectsModal (UI + waveform + handles) | Medium | 45 min |
| 4 | Timeline.tsx integratie | Laag | 15 min |
| 5 | AudioService fade-scheduling | Hoog | 45 min |
| 6 | Offline export | Laag-Medium | 20 min |
| 7 | Waveform fade-visualisatie | Laag | 15 min |
| 8 | i18n keys | Laag | 10 min |
| 9 | Documentatie + build | Laag | 10 min |

**Totaal: ~3 uur**

---

## Risico's en mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Seek halverwege fade klinkt niet smooth | Hoog | Tussenliggend volume berekenen + resterende curve schedulen |
| `setValueCurveAtTime` conflicteert met volume-node | Medium | Aparte FadeGain-node, gescheiden van clip-volume |
| Fades op zeer korte clips (<0.5s) | Laag | Clamp: fadeIn + fadeOut ≤ clip-duur |
| Backward compat bestaande composities | Laag | Zod `optional().default(0)` |
| Performance bij veel clips met fades | Laag | Elke fade-clip krijgt toch al eigen player (effect chain); curve is voorberekend |
