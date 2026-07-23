# Audio Dropout Fix — Verificatie Ronde 2

## Context

We onderzoeken audio dropouts in een React + Tone.js 15 muziek-app (SoundScout). Een zware compositie (85 clips, 6 samples, 32 beats, 120 BPM) heeft last van wegvallende samples, krakjes, en stilte na pauze. Geen console errors. Het probleem treedt op bij zowel direct afspelen (geen UI/Timeline zichtbaar) als bij afspelen met Timeline (SubmissionPlayer).

Twee AI's hebben onafhankelijk geanalyseerd. Hieronder staat het gecombineerde beeld plus een concreet gefaseerd fixplan. **Jouw taak: verifieer of dit plan klopt, identificeer risico's of gemiste punten, en geef aan of je het ermee eens bent.**

---

## Wat we met zekerheid weten (geverifieerd in Tone.js broncode)

### 1. Elke `Tone.Player` maakt intern een GainNode
`Source` constructor: `this._volume = this.output = new Volume()`. Dat is een `Gain` node. Dus `new Tone.Player(buffer)` = 1 GainNode intern + 1 AudioBufferSourceNode per `.start()` call.

### 2. `Transport.pause()` behoudt alle scheduled events
`Transport.pause()` → `Clock.pause()` → alleen state change. De `_timeline` met Part events blijft intact. `Transport.start(time, offset)` hervat en events vuren opnieuw wanneer de clock door hun tick-positie loopt.

### 3. `Player.stop()` zet state op "stopped"
Na `player.stop()` → `_state.setStateAtTime("stopped", time)`. Bij volgende `player.start()` gaat het door het `_start()` pad (nieuwe ToneBufferSource, geen assertion). Chains zijn herbruikbaar na pause.

### 4. `ToneBufferSource` disposed zichzelf automatisch
`OneShotSource._stopSource()` → `requestIdleCallback(() => this.dispose())`. Fire-and-forget patroon. Elke source maakt 1 GainNode + 1 AudioBufferSourceNode, en ruimt zichzelf op na afspelen.

### 5. Huidige code reschedul-t bij ELKE play/resume
Drie plekken roepen `scheduleTimeline()` aan bij elke play-klik, ook bij resume na pauze:
- `SubmissionPlayer.tsx:173` — resume pad
- `useStudioPlayback.ts:57` — handlePlay
- `StagePlayback.tsx:89` — handlePlayAgain (met 50ms setTimeout race-conditie)

`scheduleTimeline()` doet synchroon: `disposeEffectChains()` (85× dispose) → 85× `new Tone.Player` + `new Tone.Volume` + `.chain()` → `new Tone.Part(callback, 85 events)`. Conservatief 30-80ms main thread, plus GC-druk van 170+ gedisposede objecten.

---

## Twee onafhankelijke probleemscenario's

### Scenario A: SubmissionPlayer (Timeline zichtbaar) — resume na pauze
**Oorzaak**: reschedule burst. Bij elke pause/resume worden 85 chains vernietigd en opnieuw aangemaakt. De Transport `lookAhead` = 100ms, maar de reschedule kost 30-80ms + GC kan 10-50ms blokkeren. Eerste events vallen binnen dit window → dropout/kraakje direct na resume.

**Bewijs**: dit is de enige verklaring voor "na pauze hoor ik niets" — de eerste ~100ms audio wordt gemist doordat de chains nog niet klaar zijn wanneer de Transport de eerste events vuur-t.

### Scenario B: PraatplaatViewer direct play (geen Timeline) — dropout TIJDENS afspelen
**Oorzaak**: permanente audio graph overhead. Er is hier maar één `scheduleTimeline()` call (bij start), dus de burst-theorie geldt niet. Maar de graph heeft 176+ GainNodes permanent verbonden (85 chain players × 2 GainNodes + 6 shared players). Plus eventuele ConvolverNodes (Reverb) en PitchShift chains. De audio rendering thread verwerkt elke ~2.9ms ALLE nodes, ook stille.

**Bewijs**: probleem treedt op zonder enige UI-interactie, puur audio. Geen reschedule, geen React re-renders.

---

## Voorgesteld gefaseerd fixplan

### Fase 1: Verwijder onnodige reschedule bij resume
**Wat**: Resume na pauze mag NIET `scheduleTimeline()` aanroepen. De Part en chains zijn nog geldig na `pause()`. Alleen `play(currentBeat)` is nodig.

**Hoe**: Voeg een `isScheduled: boolean` flag toe aan AudioService:
- `scheduleTimeline()` → zet `true`
- `stop()` → zet `false` (want `stop()` doet `transport.cancel()` + `disposeEffectChains()`)
- `pause()` → laat `true` (chains + Part blijven intact)

Resume-paden worden:
```typescript
// SubmissionPlayer handlePlayPause (resume):
if (audioService.hasActiveSchedule()) {
  audioService.play(currentBeat);  // hergebruik bestaande chains + Part
} else {
  audioService.scheduleTimeline(tracks, samples);
  audioService.setLoop(isLooping, totalBeats);
  audioService.play(currentBeat);
}
```

Idem voor `useStudioPlayback.handlePlay` en `StagePlayback`.

**Verwacht effect**: elimineert dropout bij pause/resume volledig. Geen 30-80ms burst meer, geen GC-druk.

**Risico**: als de timeline DATA wijzigt tussen pause en resume (bijv. in studio), is de oude schedule stale. Maar in SubmissionPlayer (read-only) en StagePlayback (geen editing) wijzigt de data nooit. In de studio wacht `useRescheduleOnChange` toch al op audioVersion bumps.

### Fase 2: Vervang permanente Tone.Player per clip door on-demand ToneBufferSource
**Wat**: In plaats van 85 permanente `Tone.Player` instanties (elk met GainNode + Volume verbonden met Destination), gebruik `Tone.ToneBufferSource` per event in de Part callback. Fire-and-forget: source maakt zichzelf op na afspelen.

**Hoe**: 
```typescript
// Part callback (voor clips ZONDER effecten):
const buffer = this.players.get(event.sampleId)?.buffer;
if (buffer) {
  const source = new Tone.ToneBufferSource(buffer);
  source.connect(trackGainNode);  // één gedeelde GainNode per track (of per volume-level)
  source.start(time, event.trimStart, event.duration);
  // source disposed zichzelf na 'ended' via requestIdleCallback
}
```

**Audio graph wordt**: 
- 6 shared players (alleen als buffer storage, NIET verbonden met Destination)
- ~6-8 gedeelde GainNodes (per track of per volume-level)
- Alleen ACTIEVE clips hebben AudioBufferSourceNodes (5-20 tegelijk, auto-disposed)
- Totaal: ~15-30 nodes in plaats van 176+

**Verwacht effect**: elimineert audio thread overhead bij direct play. Graph is proportioneel aan actieve clips, niet totale clips.

**Risico**: `startActiveClips()` (seek support) moet herschreven — kan niet meer per clip.id een chain opzoeken. Moet in plaats daarvan on-the-fly sources aanmaken voor actieve clips. Volume per clip moet via de source's interne gain of een tijdelijke GainNode.

### Fase 3: Deel effect chains per (sampleId, effectsHash)
**Wat**: Clips met dezelfde sample + dezelfde effecten (pitch, reverb) delen één effect chain. In plaats van 25 Reverb ConvolverNodes voor 25 clips met reverb, is het bijv. 3 chains (als er 3 unieke effect-combinaties zijn).

**Hoe**: Bereken een hash van `(sampleId, pitch, reverb)` per clip. Maak één chain per unieke hash. Meerdere ToneBufferSources connecten aan dezelfde chain.

**Verwacht effect**: drastische reductie van ConvolverNode en PitchShift overhead. Van 25 Reverbs → ~3-5 gedeelde.

**Risico**: per-clip volume en fade moeten dan op source-niveau (ToneBufferSource gain), niet op chain-niveau. Losse fade-scheduling per source is complexer.

### Fase 4: Debounce useRescheduleOnChange
**Wat**: Batch meerdere audioVersion bumps binnen 100-150ms tot één reschedule. Voorkomt 20+ reschedules/sec bij slider-interactie.

**Hoe**: `useRef` + `setTimeout` debounce in `useRescheduleOnChange.ts`.

**Verwacht effect**: voorkomt dropout-cascade bij live editing in studio.

**Risico**: 100-150ms vertraging tussen slider-beweging en audio-verandering. Acceptabel voor volume/effects, minder voor clip-positionering.

---

## Vragen aan jou

1. **Klopt het dat Fase 1 (verwijder reschedule bij resume) veilig is?** Specifiek: als `transport.pause()` is aangeroepen en de chains zijn gestopt met `player.stop()`, en dan `transport.start('+0.05', offsetSeconds)` wordt aangeroepen — vuur-t de Part dan correct events vanaf de offset positie? Of is er een edge case waar events gemist worden?

2. **Klopt het dat `ToneBufferSource` de juiste primitief is voor Fase 2?** Specifiek: `new Tone.ToneBufferSource(buffer).connect(gainNode).start(time, offset, duration)` — maakt dit een AudioBufferSourceNode die op het juiste moment start en zichzelf opruimt? Is er een risico dat de auto-dispose te vroeg of te laat komt?

3. **Is er een probleem met `startActiveClips()` in Fase 2?** Bij seek (play vanaf beat > 0) moeten clips die "al lopen" op dat moment direct gestart worden met aangepaste offset. Zonder permanente chain players, hoe start je een on-demand source voor een clip die al had moeten spelen? Is `ToneBufferSource.start(Tone.now() + 0.05, adjustedTrimStart, remainingDuration)` voldoende?

4. **Is het delen van effect chains (Fase 3) haalbaar met `ToneBufferSource`?** Meerdere sources naar dezelfde ConvolverNode → werkt dit in Web Audio? Of moet elke source zijn eigen convolution chain hebben?

5. **Missen we nog iets?** Is er een Tone.js feature of Web Audio patroon dat we over het hoofd zien dat dit eenvoudiger maakt?

6. **Volgorde**: zijn Fase 1 en Fase 2 onafhankelijk implementeerbaar? Of moet Fase 2 eerst om Fase 1 effectief te maken?

---

## Relevante bestanden
- `src/services/AudioService.ts` — volledige audio engine (1336 regels)
- `src/components/teacher/SubmissionPlayer.tsx` — timeline afspelen (354 regels)
- `src/hooks/useStudioPlayback.ts` — studio play/pause/stop (133 regels)
- `src/hooks/useRescheduleOnChange.ts` — live reschedule tijdens playback (39 regels)
- `src/components/stage/StagePlayback.tsx` — stage afspeel controls (157 regels)
- `src/components/praatplaat/PraatplaatViewer.tsx` — direct afspelen (337 regels)
- `src/utils/audio.ts` — beat/seconds conversie, trim utilities
- `src/types/index.ts` — Clip, Track, Sample, ClipEffects interfaces

## Tone.js versie
15.1.22 (package.json). Relevante Tone.js bronbestanden die we gelezen hebben:
- `source/Source.js` — `start()` met state machine, `_clampToCurrentTime()`, `stop()` state management
- `source/buffer/Player.js` — `_start()` (maakt ToneBufferSource), `_activeSources` Set, `_restart()` (stopt vorige source)
- `source/buffer/ToneBufferSource.js` — wrapper rond AudioBufferSourceNode
- `source/OneShotSource.js` — auto-dispose via `requestIdleCallback`
- `core/clock/Transport.js` — `pause()` (geen cancel), `start()` (resume), `_processTick()`
- `core/clock/Clock.js` — `_loop()` met `forEachTickBetween`
- `core/clock/Ticker.js` — Web Worker ticker
- `core/context/Context.js` — `lookAhead: 0.1`, `updateInterval: 0.05`
- `event/Part.js` — event scheduling op Transport
- `event/ToneEvent.js` — individuele event scheduling via `transport.schedule()`
