# Audio Dropout Analyse — Prompt voor Second Opinion

## Context

SoundScout is een React + TypeScript web app waarmee kinderen muziekcomposities maken. De app gebruikt **Tone.js 15** voor audio playback. Composities bestaan uit clips (audio samples geplaatst op een beat-gebaseerde timeline). De audio-engine is een singleton `AudioService` die Tone.js wraps.

## Het probleem

Bij het afspelen van een zware leerling-compositie (85 clips, 6 unieke samples, veel getrimde en gekopieerde clips, 32 beats, 120 BPM) vallen samples weg tijdens afspelen:

- Soms stopt het geluid terwijl de playhead doorloopt
- Soms hoor je een kraakje of worden bepaalde samples niet afgespeeld
- Soms na pauze hoor je niets
- Geen console errors

Dit gebeurt ook bij **direct afspelen** (geen React Timeline component zichtbaar, minimale UI rendering). Dat sluit React re-render overhead als hoofdoorzaak uit.

## Huidige architectuur

### Oorspronkelijk (vóór recente fix):
- **1 gedeelde `Tone.Player` per sampleId** (6 players voor 6 samples)
- Players zijn permanent verbonden met `Tone.getDestination()` via `.toDestination()`
- `Tone.Part` scheduled alle clip-events. De Part callback roept `player.start(time, offset, duration)` aan op de gedeelde player
- **Probleem**: twee clips van dezelfde sample die overlappen in tijd → de tweede `player.start()` overschrijft de eerste (Tone.Player's interne `_restart()` stopt de vorige `ToneBufferSource`). Een dedup-guard skipped de tweede, waardoor die clip stil wegvalt

### Na recente fix poging:
- **1 geïsoleerde `Tone.Player` per clip** (85 players), elk aangemaakt met `new Tone.Player(sourcePlayer.buffer)` (deelt dezelfde AudioBuffer, geen extra geheugen)
- Elke player is verbonden via een `Tone.Volume` (GainNode) naar `Tone.getDestination()`
- Geen dedup meer nodig want elke clip heeft eigen player
- **Nieuw probleem**: de Web Audio graph heeft nu ~176 GainNodes permanent verbonden (85 players × 2 GainNodes + 6 originele shared players), waarvan ~91 direct verbonden met Destination. Zelfs als 80% stil is, verwerkt de audio rendering thread alle nodes elke render quantum (~2.9ms bij 44.1kHz/128 samples)

### Tone.js internals (geverifieerd in broncode):

**`Tone.Player` structuur:**
- Extends `Source`, die `this.output = new Volume()` (= GainNode) aanmaakt
- `player.start(time, offset, duration)` → maakt een `ToneBufferSource` (wrapper rond `AudioBufferSourceNode`), connect naar `this.output`, schedule start
- `_activeSources: Set<ToneBufferSource>` — houdt alle actieve sources bij
- Intern `_state: StateTimeline` — tracked "started"/"stopped" state
- Als state === "started" bij een nieuwe `start()` call: assertion "Start time must be strictly greater than previous start time", dan `_restart()` die de vorige source stopt

**`Source.start()` flow:**
```
IF !synced AND state === "started":
  ASSERT(newTime > previousStartTime)  // crasht als niet waar
  call _restart() → stop meest recente source, start nieuwe
ELSE:
  call _start() → maak NIEUWE ToneBufferSource, voeg toe aan _activeSources
```

**Tone.Transport scheduling:**
- Ticker draait via Web Worker (`setTimeout` in worker, `postMessage('tick')` naar main thread)
- Default `lookAhead = 0.1s`, `updateInterval = 0.05s` (50ms)
- `_processTick(tickTime, ticks)` → `timeline.forEachAtTime(ticks, event => event.invoke(tickTime))` — alle events op zelfde tick vuren **synchroon**
- Bij main thread delay: ticks worden gequeued, vuren alsnog maar `time` is mogelijk in het verleden → `_clampToCurrentTime` → onmiddellijke start

**`Tone.Part` event scheduling:**
- Elk event wordt individueel op de Transport gescheduled via `transport.schedule(callback, time)`
- Bij `Part.start(0)`: alle events worden gescheduled relatief aan transport positie
- Bij Transport loop: events vuren opnieuw met nieuwe AudioContext time

### Relevante code (AudioService.ts, ingekort):

```typescript
// Sample laden — gedeelde player, verbonden met Destination
async loadSample(sample: Sample): Promise<SampleLoadResult> {
  const player = new Tone.Player({ url: sample.audioUrl }).toDestination();
  await player.load(sample.audioUrl);
  this.players.set(sample.id, player); // Map<sampleId, Tone.Player>
}

// Timeline scheduling — maakt isoleerde players per clip
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  this.disposeEffectChains(); // dispose vorige 85 chains
  
  tracks.forEach(track => {
    track.clips.forEach(clip => {
      const player = this.players.get(clip.sampleId); // shared player (buffer bron)
      if (!isMuted) {
        if (this.clipHasEffects(clip)) {
          // Full effect chain: Player → PitchShift → Reverb → FadeGain → Volume → Destination
          chain = this.createEffectChain(player, clip, volumeDb);
        } else {
          // Simple chain: Player(buffer) → Volume → Destination
          chain = this.createSimpleChain(player, volumeDb);
          // createSimpleChain doet:
          //   const volumeNode = new Tone.Volume(volumeDb);
          //   const player = new Tone.Player(sourcePlayer.buffer);
          //   player.chain(volumeNode, Tone.getDestination());
        }
        this.effectChains.push(chain);
        this.clipEffectChainMap.set(clip.id, chainIndex);
      }
      
      events.push({ time, sampleId, trimStart, duration, volumeDb, effectChainIndex, ... });
    });
  });
  
  // Tone.Part met alle events
  this.timelinePart = new Tone.Part((time, event) => {
    if (event.effectChainIndex !== undefined) {
      const chain = this.effectChains[event.effectChainIndex];
      chain.player.start(time, event.trimStart, event.duration);
    }
  }, events);
  this.timelinePart.start(0);
}

// Playback
play(fromBeat: number = 0): void {
  if (fromBeat > 0) this.startActiveClips(fromBeat); // seek support
  transport.start('+0.05', offsetSeconds);
}

// Pause — stopt alle players maar disposed NIET
pause(): void {
  transport.pause();
  this.players.forEach(p => p.stop());
  this.effectChains.forEach(({ player }) => player.stop());
}

// Stop — disposed effect chains
stop(): void {
  transport.cancel();
  transport.stop();
  this.players.forEach(p => p.stop());
  this.disposeEffectChains(); // dispose alle 85 chains
}
```

### Pause/Resume cyclus (SubmissionPlayer):
```typescript
// Bij resume: volledige herscedulering
audioService.scheduleTimeline(tracks, samples);  // DISPOSE 85 chains + MAAK 85 NIEUWE
audioService.setLoop(isLooping, totalBeats);
audioService.play(currentBeat);  // start vanaf pauzepositie
```

Dit betekent: elke pause/resume creëert en disposed 170+ objecten (85 Players + 85 Volumes + connecties).

## Onze analyse tot nu toe

### Hypothese: Audio graph overhead
De audio rendering thread verwerkt elke ~2.9ms (128 samples @ 44.1kHz) ALLE verbonden nodes, ook stille. Met 176 GainNodes en 91 verbindingen naar Destination kan dit op minder krachtige devices het audio budget overschrijden → buffer underruns → dropouts, klikken, stilte.

### Mogelijk betere architectuur
In plaats van permanente Tone.Player instances per clip, on-demand `AudioBufferSourceNode` creatie in de Part callback:
- Houd shared players alleen als buffer storage (niet verbonden met Destination)
- In Part callback: maak rauwe AudioBufferSourceNode, connect aan minimale gain, start
- Audio graph bevat alleen ACTIEF spelende clips (5-20 nodes) in plaats van ALLE clips (85)

## Vragen aan jou

1. **Is onze diagnose correct?** Is 176 permanent verbonden GainNodes + 91 Destination-inputs realistisch een probleem voor de Web Audio rendering thread? Of optimaliseren moderne browsers silent nodes weg?

2. **Is de "on-demand AudioBufferSourceNode" aanpak de juiste richting?** Zo ja, hoe implementeer je dit het beste met Tone.js? Of moeten we voor timeline playback Tone.Player bypassen en direct met de Web Audio API werken?

3. **Zijn er andere oorzaken die we over het hoofd zien?** Denk aan: Tone.Transport scheduling overhead, AudioContext latency settings, GC pauses door object creatie/disposal, Web Worker → main thread message latency.

4. **Hoe zit het met de pause/resume cyclus?** Is het nodig om alle 85 chains te disposen en opnieuw te maken bij elke resume? Of kan je de bestaande chains hergebruiken?

5. **Specifiek voor Tone.js 15**: is er een ingebouwd mechanisme voor polyfoon sample playback (meerdere gelijktijdige instanties van dezelfde sample) dat we over het hoofd zien? Bijv. `Tone.Sampler`, `Tone.GrainPlayer`, of een ander patroon?

## Bestanden om te bekijken
- `src/services/AudioService.ts` — de complete audio engine (1336 regels)
- `src/components/praatplaat/PraatplaatViewer.tsx` — de afspeel-flow
- `src/components/teacher/SubmissionPlayer.tsx` — timeline afspelen met beat tracking
- `src/types/index.ts` — Clip, Track, Sample interfaces
- `src/utils/audio.ts` — beat/seconds conversie, trim utilities
