# PLAN: Audio Engine Refactor — On-Demand Sources + Track Buses

> **Doel**: Elimineer audio dropouts bij zware composities (85+ clips, 6 samples, 32 beats)  
> **Backup branch**: `backup/pre-audio-refactor` (commit `520bcf2`)  
> **Start**: 2026-04-22  
> **Status**: 🔵 In uitvoering

---

## Inhoudsopgave

1. [Probleemanalyse](#1-probleemanalyse)
2. [Huidige architectuur](#2-huidige-architectuur)
3. [Doel-architectuur](#3-doel-architectuur)
4. [Implementatiestappen](#4-implementatiestappen)
5. [Risico's en mitigatie](#5-risicos-en-mitigatie)
6. [Rollback-strategie](#6-rollback-strategie)
7. [Voortgangslog](#7-voortgangslog)
8. [Verificatie-checklist](#8-verificatie-checklist)

---

## 1. Probleemanalyse

### Symptomen
- Samples vallen weg tijdens afspelen (niet alle clips zijn hoorbaar)
- Kraakgeluiden (audio buffer underruns)
- Playhead vertraagt visueel (main thread congestion door audio thread overload)
- Audio stopt willekeurig halverwege composities
- Dezelfde problemen bij zowel docent (SubmissionPlayer/PraatplaatViewer) als leerling (Studio/Stage)

### Oorzaak (bevestigd via diagnostics + Tone.js maintainer bronnen)
Elke niet-gemute clip krijgt een **permanent Tone.Player** object met eigen GainNode(s):
- 85 clips × 2+ nodes = **170+ permanente GainNodes** in de audio graph
- Audio rendering budget: 128 samples @ 44.1kHz = **~2.9ms per render quantum**
- 170+ GainNodes overschrijden dit budget → buffer underruns → dropouts
- Slechts 0-5 sources tegelijk actief op enig moment — de rest is idle maar kost wel render-tijd

### Bronnen
- Tone.js #982 (marcelblum): "Player is not meant to be fire and forget"
- Tone.js #1076 (jamescqcampbell): ToneAudioBuffers + verse Player per schedule
- Tone.js #188 (Yotam Mann): bevestiging on-demand patroon

---

## 2. Huidige architectuur

```
Sample loading:
  loadSample() → new Tone.Player({ url }).toDestination()
  Opgeslagen in: this.players: Map<sampleId, Tone.Player>

scheduleTimeline():
  Per niet-gemute clip:
    → createSimpleChain() of createEffectChain()
    → Tone.Player(sourcePlayer.buffer) + Volume/PitchShift/Reverb/FadeGain
    → Opgeslagen in: this.effectChains[]
    → Mapping: this.clipEffectChainMap: Map<clipId, chainIndex>
  
  Alle events → Tone.Part callback:
    → chain.player.start(time, trimStart, duration)

play(fromBeat):
  → startActiveClips(seekBeat) — clips actief op seek-positie
  → transport.start('+0.05', offsetSeconds)

pause():
  → transport.pause()
  → Stop alle shared players + effect chain players
  → Cancel fadeGain automation
  → _isScheduled blijft true (kan hervatten zonder reschedule)

stop():
  → transport.cancel() + stop()
  → Stop alle shared players
  → disposeEffectChains() → _isScheduled = false

rescheduleWhilePlaying():
  → Stop alles → scheduleTimeline() → play(currentBeat)
```

### Probleem in detail

Bij `scheduleTimeline()` worden **alle** effect chains upfront aangemaakt:
- 85 clips = 85 Tone.Player instanties + 85 Volume nodes + N PitchShift/Reverb nodes
- Totaal: **170-250+ nodes** permanent verbonden aan de audio graph
- Elke node wordt elk render quantum (2.9ms) geëvalueerd, ook als de clip niet speelt

### Bestanden die geraakt worden

| Bestand | Reden |
|---|---|
| `src/services/AudioService.ts` | Kern-refactor: sample loading, scheduling, seek, pause/stop |
| `src/hooks/useAudioEngine.ts` | Mogelijk nieuwe methods doorvoeren |
| `src/utils/audioDiagnostics.ts` | Node count tracking aanpassen |
| `src/utils/audioExport.ts` | Gebruikt eigen buffers — **NIET geraakt** |
| `src/utils/videoExport.ts` | Roept audioExport aan — **NIET geraakt** |

### Consumers (gebruiken AudioService via useAudioEngine of direct)

Geen van deze hoeft te veranderen — de externe API van AudioService blijft identiek:

- `useStudioPlayback.ts` — studio play/pause/stop
- `useRescheduleOnChange.ts` — live reschedule
- `SubmissionPlayer.tsx` — docent compositie viewer
- `PraatplaatViewer.tsx` — docent praatplaat
- `SharedPraatplaatViewer.tsx` — publiek praatplaat
- `SharedPlayer.tsx` — gedeelde compositie
- `StagePlayback.tsx` — stage afspelen
- `StorytellingDisplay.tsx` — storyboard preview
- `EffectsModal.tsx` — effects preview (playSampleWithEffects)
- `TrimModal.tsx` — trim preview (playSampleRegion)
- `compositionInit.ts` — initialize/disposeUnusedPlayers
- `useAudioCleanup.ts` — cleanup bij schermwissel
- `useUndoRedoTimeline.ts` — stop bij undo/redo

---

## 3. Doel-architectuur

```
Sample loading (VERANDERT):
  loadSample() → ToneAudioBuffer opslaan (GEEN Player, geen graph footprint)
  Opgeslagen in: this.buffers: Map<sampleId, Tone.ToneAudioBuffer>

Track buses (NIEUW):
  8 Tone.Gain nodes (1 per track) → master Tone.Volume → Destination
  Aangemaakt bij eerste scheduleTimeline(), hergebruikt daarna
  Total vaste nodes: 8 + 1 = 9 (was 170+)

scheduleTimeline() (VERANDERT):
  Geen upfront chain creatie meer
  Events bevatten: sampleId, trimStart, duration, volumeDb, trackIndex, effects
  
  Tone.Part callback (on-demand):
    → new Tone.Player(buffer) — verse player van buffer
    → Optioneel: PitchShift/Reverb/FadeGain
    → Connect naar track bus[trackIndex]
    → player.start(time, trimStart, duration)
    → Toevoegen aan activeSources Set
    → player.onstop → dispose + remove uit activeSources

play(fromBeat) (LICHT AANGEPAST):
  → startActiveClips() — creëert on-demand players voor actieve clips
  → transport.start()

pause() (VERANDERT):
  → transport.pause()
  → Alle activeSources stoppen (maar track buses blijven intact)

stop() (VERANDERT):
  → transport.cancel() + stop()
  → Alle activeSources stoppen + disposen
  → Track buses NIET disposen (hergebruikt)

Node count vergelijking:
  Oud: 170-250 nodes (groeit met clips)
  Nieuw: 9 vaste nodes + max ~5-10 dynamische (groeit met gelijktijdig actieve clips)
```

---

## 4. Implementatiestappen

### Stap 1: Buffer-gebaseerde sample opslag ✅ / ⬜
**Risico: LAAG** — Alleen interne opslag verandert, externe API ongewijzigd

- [ ] Voeg `this.buffers: Map<string, Tone.ToneAudioBuffer>` toe naast bestaande `this.players`
- [ ] Pas `loadSample()` aan: sla buffer op in `this.buffers` (in plaats van Player)
- [ ] Behoud een **minimale shared Player** per sample voor preview (`playSample()`, `playSampleRegion()`)
- [ ] Pas `getWaveform()` aan: lees van `this.buffers` in plaats van `this.players`
- [ ] Pas `isSampleLoaded()` aan: check `this.buffers`
- [ ] Pas `disposeUnusedPlayers()` aan → `disposeUnusedBuffers()`
- [ ] Pas `dispose()` aan: ruim buffers op
- [ ] **Test**: Build + lint + alle 227 tests moeten slagen
- [ ] **Test**: Preview samples werken nog (klik op sample in library)
- [ ] **Commit**

### Stap 2: Track bus infrastructuur ⬜
**Risico: LAAG** — Voegt alleen toe, verandert nog niets

- [ ] Maak `this.trackBuses: Tone.Gain[]` (8 stuks) + `this.masterBus: Tone.Volume`
- [ ] Lazy init in `ensureTrackBuses()` — aangemaakt bij eerste `scheduleTimeline()`
- [ ] Track buses → master bus → Destination
- [ ] Track volume/mute verwerken via bus gain (niet per-event)
- [ ] `dispose()` ruimt buses op
- [ ] **Test**: Build + lint
- [ ] **Commit**

### Stap 3: On-demand player creatie in Part callback ⬜
**Risico: HOOG** — Kern van de refactor

- [ ] Voeg `this.activeSources: Set<{player, nodes, clipId}>` toe
- [ ] Refactor `scheduleTimeline()`:
  - Verwijder upfront `createSimpleChain()` / `createEffectChain()` calls
  - Events bevatten nu: sampleId, trimStart, duration, volumeDb, trackIndex, effectsConfig, clipId
  - Behoud `this.effectChains` en `this.clipEffectChainMap` tijdelijk voor seek (Stap 4)
- [ ] Refactor Part callback:
  - Creëer on-demand `new Tone.Player(this.buffers.get(sampleId))`
  - Bij effects: maak PitchShift/Reverb/FadeGain nodes on-demand
  - Connect naar `this.trackBuses[trackIndex]`
  - Start player
  - Voeg toe aan `activeSources`
  - Register `onstop` handler voor auto-dispose
- [ ] Pas `pause()` aan: stop alle `activeSources` (niet disposen — Part events hergebruiken players niet, dus wél disposen)
- [ ] Pas `stop()` aan: stop + dispose alle `activeSources`, clear set
- [ ] **Test**: Build + lint + tests
- [ ] **Test handmatig**: Simpele compositie afspelen (geen effects, geen loops)
- [ ] **Test handmatig**: Pause + resume werken
- [ ] **Commit**

### Stap 4: Seek-compatibiliteit migreren ⬜
**Risico: HOOG** — Meest complexe logica

- [ ] Refactor `startActiveClips()`:
  - Creëer on-demand players (niet meer via clipEffectChainMap lookup)
  - Connect naar juiste track bus
  - Bereken seek-positie offsets (bestaande logica behouden)
  - Voeg toe aan `activeSources` met onstop handler
- [ ] Refactor `getActiveClipsAtBeat()`:
  - Voeg `trackIndex` toe aan return type
  - Behoud loop-aware modulo arithmetic
- [ ] Fade-curve seek logica:
  - Behoud bestaande logica voor partial fade curves
  - Creëer fadeGain node on-demand per actieve clip
- [ ] Verwijder `this.effectChains` en `this.clipEffectChainMap` (nu overbodig)
- [ ] **Test**: Build + lint + tests
- [ ] **Test handmatig**: Seek naar midden van compositie
- [ ] **Test handmatig**: Seek naar midden van clip met fade-in/fade-out
- [ ] **Test handmatig**: Seek naar midden van looping clip
- [ ] **Commit**

### Stap 5: Live reschedule + pause/resume stabiliteit ⬜
**Risico: GEMIDDELD**

- [ ] Verifieer `rescheduleWhilePlaying()`:
  - Stop + dispose alle activeSources
  - scheduleTimeline() bouwt verse Part (geen stale chains)
  - play(currentBeat) start actieve clips on-demand
- [ ] Verifieer `hasActiveSchedule()` / `_isScheduled` flow:
  - pause() → _isScheduled blijft true
  - Resume → Part callback creëert verse on-demand players
  - stop() → _isScheduled = false
- [ ] Pas debounce reschedule (useRescheduleOnChange) aan indien nodig
- [ ] **Test handmatig**: Clip toevoegen tijdens afspelen
- [ ] **Test handmatig**: Volume slider bewegen tijdens afspelen
- [ ] **Commit**

### Stap 6: Opruimen en diagnostics update ⬜
**Risico: LAAG**

- [ ] Verwijder `createSimpleChain()` en `createEffectChain()` (nu unused)
- [ ] Verwijder `this.sharedPlayerLastStart` (niet meer nodig)
- [ ] Update `audioDiagnostics.ts`: track activeSources count i.p.v. effectChains count
- [ ] Update diagnostics snapshots: node count tracking
- [ ] Verwijder shared player fallback code uit Part callback
- [ ] **Test**: Build + lint + alle tests
- [ ] **Commit**

### Stap 7: Eindverificatie ⬜
**Risico: N/A — alleen testen**

- [ ] Build succesvol (`npm run build`)
- [ ] Alle tests slagen (`npm run test:run`)
- [ ] Lint clean (`npm run lint`)
- [ ] Handmatige test: 85-clip compositie afspelen (docent SubmissionPlayer)
- [ ] Handmatige test: 85-clip compositie afspelen (PraatplaatViewer)
- [ ] Handmatige test: Studio met effecten (pitch, reverb, fade)
- [ ] Handmatige test: Seek naar verschillende posities
- [ ] Handmatige test: Looping clips
- [ ] Handmatige test: Pause + resume (geen reschedule)
- [ ] Handmatige test: Live edit tijdens afspelen
- [ ] Diagnostics vergelijken: node count voor/na
- [ ] Chrome DevTools Web Audio panel: node count verificatie

---

## 5. Risico's en mitigatie

| Risico | Ernst | Mitigatie |
|---|---|---|
| Seek + fade + loop combinatie breekt | HOOG | Stap 4 apart, uitgebreid testen elke combinatie |
| On-demand player creatie te langzaam in Part callback | GEMIDDELD | `new Tone.Player(buffer)` is snel (buffer al in geheugen), geen netwerk I/O |
| Player onstop handler niet betrouwbaar | GEMIDDELD | Backup: periodiek activeSources opschonen via setInterval |
| Track bus volume interactie met clip volume | LAAG | Duidelijke scheiding: track volume op bus, clip volume op event player |
| Regressie in audioExport / videoExport | LAAG | Deze gebruiken eigen buffer-aanpak, niet AudioService.scheduleTimeline() |
| Preview (playSample/playSampleRegion) breekt | LAAG | Behoud minimale shared Players apart voor preview |

---

## 6. Rollback-strategie

### Volledige rollback
```bash
git checkout backup/pre-audio-refactor
```

### Partiële rollback (per stap)
Elke stap heeft een eigen commit. Rollback naar vorige stap:
```bash
git log --oneline  # Vind commit hash van gewenste stap
git revert <hash>  # Of: git reset --hard <hash>
```

### Rollback-triggers
- Tests falen na een stap en zijn niet snel te fixen
- Audio klinkt hoorbaar slechter dan voor de refactor
- Diagnostics tonen meer nodes dan verwacht
- Seek-logica produceert dubbele geluiden of stilte

---

## 7. Voortgangslog

| Datum | Stap | Status | Notities |
|---|---|---|---|
| 2026-04-22 | Voorbereiding | ✅ | Backup branch `backup/pre-audio-refactor` (commit `520bcf2`), AudioService.ts geanalyseerd (1481 regels), plan geschreven |
| 2026-04-22 | Stap 1 | ✅ | Buffer-gebaseerde sample opslag (commit `c860844`). `this.buffers: Map<sampleId, ToneAudioBuffer>` als primaire opslag. Preview Players behouden voor playSample/playSampleRegion. Build+lint+227 tests OK. |
| 2026-04-22 | Stap 2 | ✅ | Track bus infrastructuur (commit `63776e7`). 8 Gain buses + 1 master Volume, lazy init, buses→mute only. Build+tests OK. |
| 2026-04-22 | Stap 3a | ✅ | Route chains via track buses (commit `47570f2`). createSimpleChain/createEffectChain routeren naar trackBuses[i] i.p.v. Destination. Build+tests OK. |
| 2026-04-22 | Stap 3b+3c | ✅ | **KERN-REFACTOR** (commit `f17c19c`). On-demand player creatie in Part callback + startActiveClips. `createOnDemandPlayer()` + `activeSources` Set + `disposeActiveSources()`. Verwijderd: effectChains[], clipEffectChainMap, sharedPlayerLastStart, createSimpleChain, createEffectChain, disposeEffectChains. 232 regels erbij, 338 eruit. Build+lint+227 tests OK. |
| | Stap 5 | ⬜ | |
| | Stap 6 | ⬜ | |
| | Stap 7 | ⬜ | |

---

## 8. Verificatie-checklist

### Na elke stap
- [ ] `npm run build` slaagt
- [ ] `npm run lint` clean
- [ ] `npm run test:run` — alle tests slagen
- [ ] Geen TypeScript errors

### Na stap 3 (kern-refactor)
- [ ] Simpele compositie: alle clips hoorbaar
- [ ] Pause + resume: geen dubbele geluiden
- [ ] Stop + opnieuw: clean start

### Na stap 4 (seek)
- [ ] Seek naar beat 0: normaal afspelen
- [ ] Seek naar midden: actieve clips hoorbaar, geen dubbele
- [ ] Seek in looping clip: juiste positie in iteratie
- [ ] Seek in fade-in zone: fade hervat correct
- [ ] Seek in fade-out zone: fade hervat correct

### Na stap 7 (eindverificatie)
- [ ] 85-clip compositie: geen dropouts
- [ ] Node count in Chrome Web Audio panel: <20 (was 170+)
- [ ] `window.__AUDIO_DIAG_SUMMARY()`: alle events fired
- [ ] Geen kraakgeluiden
- [ ] Playhead beweegt op constante snelheid
