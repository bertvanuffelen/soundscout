# Plan #79 — Clip-effecten: Fade In & Fade Out

**Datum:** 2026-04-16
**Status:** Voorstel — wacht op goedkeuring

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

De Waveform-component rendert een **transparantie-gradiënt** over de bars:
- **Fade-in zone** (0 → fadeIn seconden): bars krijgen opacity van 0.1 → 1.0 (logaritmisch)
- **Fade-out zone** (duur - fadeOut → duur): bars krijgen opacity van 1.0 → 0.1 (logaritmisch)

Dit wordt berekend per bar in de bestaande render-loop — geen extra canvas of overlay nodig, alleen een opacity-berekening per bar positie.

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

### Logaritmische fade-curve generator

Nieuwe private helper:

```typescript
private createFadeCurve(duration: number, type: 'in' | 'out'): Float32Array
```

Genereert een `Float32Array` met een logaritmische curve:
- **Fade in**: `Math.log(1 + 10 * progress) / Math.log(11)` — van 0 naar 1
- **Fade out**: zelfde formule, maar dan van 1 naar 0
- Array-lengte: `Math.ceil(duration * sampleRate)` of een vaste 1024 punten (genoeg voor smooth)

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
- `setValueCurveAtTime()` schedulen met dezelfde logaritmische curve
- Werkt automatisch omdat `Tone.Offline()` dezelfde scheduling-API ondersteunt

---

## Stap 7 — Waveform-component: fade-visualisatie

**Bestand:** `src/components/studio/Waveform.tsx`

Nieuwe optionele prop `fadeRegion`:

```typescript
fadeRegion?: { fadeIn: number; fadeOut: number };
```

In de render-loop: per bar de opacity berekenen op basis van positie in de fade-zone.

```
barTime = (i / barCount) * duration

Als barTime < fadeIn:
  opacity = logaritmischeCurve(barTime / fadeIn)  // 0.1 → 1.0
Anders als barTime > (duration - fadeOut):
  progress = (barTime - (duration - fadeOut)) / fadeOut
  opacity = logaritmischeCurve(1 - progress)       // 1.0 → 0.1
Anders:
  opacity = 1.0

ctx.fillStyle = `rgba(r, g, b, ${opacity})`
```

Dit is ~10 regels extra in de bestaande canvas draw loop. Geen performance-impact (het is dezelfde loop, alleen een extra berekening per bar).

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
