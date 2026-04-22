# Tone.js Kennisbank - SoundScout

**Doel:** Centrale documentatie van Tone.js kennis voor SoundScout
**Laatst bijgewerkt:** 2026-04-16
**Tone.js versie:** 15.1.22

---

## Inhoudsopgave

1. [Overzicht](#1-overzicht)
2. [Transport](#2-transport)
3. [Scheduling Methoden](#3-scheduling-methoden)
4. [Tone.Part](#4-tonepart)
5. [Tone.Player](#5-toneplayer)
6. [Timing & Tempo](#6-timing--tempo)
7. [Best Practices](#7-best-practices)
8. [**KRITIEK: Seeking naar Midden van Actieve Clips**](#8-kritiek-seeking-naar-midden-van-actieve-clips) ⚠️
9. [Bekende Issues & Workarounds (Tone.js GitHub)](#9-bekende-issues--workarounds-tonejs-github)
10. [SoundScout Specifieke Implementatie](#10-soundscout-specifieke-implementatie)
11. [Fade In/Out met setValueCurveAtTime (#79)](#11-fade-inout-met-setvaluecurveattime-79)
12. [Bronnen](#12-bronnen)

---

## 1. Overzicht

Tone.js is een Web Audio framework voor interactieve muziek in de browser. Het biedt:
- **Transport:** Master timekeeper voor synchronisatie
- **Players:** Audio sample playback
- **Scheduling:** Precisie timing van events
- **Effects:** Audio effecten keten

### Basis initialisatie
```typescript
import * as Tone from 'tone';

// MOET aangeroepen worden na user interactie (click/touch)
await Tone.start();

// Check of audio context actief is
Tone.context.state === 'running';
```

---

## 2. Transport

### Wat is Transport?
`Tone.Transport` is de centrale timekeeper - vergelijkbaar met de "arrangement view" in een DAW (Ableton, Logic). Het biedt:
- Start/stop/pause/seek
- BPM control
- Looping
- Event scheduling

### Basis gebruik
```typescript
const transport = Tone.getTransport();

// Tempo instellen
transport.bpm.value = 120;

// Start/stop
transport.start();
transport.pause();
transport.stop();

// Positie opvragen/instellen
const seconds = transport.seconds;
const position = transport.position; // "0:0:0" format
transport.seconds = 5.0; // Seek naar 5 seconden

// Looping
transport.loop = true;
transport.loopStart = 0;
transport.loopEnd = "8:0:0"; // 8 maten
```

### Transport.start() met offset
```typescript
// Start direct vanaf positie 0
transport.start();

// Start over 0.1 seconde, vanaf transport positie 0
transport.start("+0.1");

// Start direct, maar vanaf transport positie 4 seconden
transport.start(undefined, 4);

// Start over 0.1 seconde, vanaf transport positie "4:0:0" (maat 4)
transport.start("+0.1", "4:0:0");
```

**BELANGRIJK:** De tweede parameter is de **offset** - vanaf welk punt in de timeline te starten.

---

## 3. Scheduling Methoden

### transport.schedule()
Scheduled een eenmalige callback op een absolute transport tijd.

```typescript
transport.schedule((time) => {
  // `time` is AudioContext tijd (voor precisie)
  player.start(time);
}, "2:0:0"); // Op maat 2
```

**⚠️ Beperking:** Als transport start VOORBIJ de scheduled tijd, wordt de callback NIET uitgevoerd.

### transport.scheduleRepeat()
Scheduled een herhalende callback.

```typescript
transport.scheduleRepeat((time) => {
  synth.triggerAttackRelease("C4", "8n", time);
}, "4n"); // Elke kwartnoot
```

### transport.scheduleOnce()
Scheduled een callback die maar één keer wordt uitgevoerd (en automatisch wordt verwijderd).

```typescript
transport.scheduleOnce((time) => {
  // Eenmalige actie
}, "1:0:0");
```

### transport.cancel()
Verwijdert alle scheduled events.

```typescript
transport.cancel(); // Verwijder alles
transport.cancel(time); // Verwijder events na `time`
```

---

## 4. Tone.Part

### Wat is Tone.Part?
Een collectie van events die als eenheid gestart/gestopt/geloopt kunnen worden. **Ideaal voor timelines en sequenties.**

### Constructie
```typescript
// Format 1: [time, value] tuples
const part = new Tone.Part(callback, [
  [0, { note: "C4" }],
  [0.5, { note: "E4" }],
  [1, { note: "G4" }],
]);

// Format 2: Objects met "time" property
const part = new Tone.Part(callback, [
  { time: 0, note: "C4" },
  { time: 0.5, note: "E4" },
  { time: 1, note: "G4" },
]);

// Callback signature
(time: number, value: T) => void
```

### Start met offset
```typescript
part.start(0); // Start Part op transport tijd 0

// MET OFFSET - cruciaal voor seeking!
part.start(0, "2:0:0"); // Start op transport tijd 0, maar BEGIN bij maat 2 in de Part
```

**Dit is de oplossing voor seeking:** Start de Part vanaf een offset zodat events in het "verleden" worden overgeslagen, maar events onder de playhead WEL worden afgespeeld.

### Belangrijke methoden
```typescript
// Lifecycle
part.start(time?, offset?);
part.stop(time?);
part.dispose(); // BELANGRIJK: cleanup voor memory

// Looping
part.loop = true;
part.loopStart = 0;
part.loopEnd = "4:0:0";

// Events beheren
part.at("0:2:0"); // Get event op tijd
part.at("0:2:0", { note: "D4" }); // Set event op tijd
part.add(time, value); // Voeg event toe
part.remove(time, value); // Verwijder event
part.clear(); // Verwijder alle events

// Properties
part.length; // Aantal events
part.state; // "started" | "stopped"
part.progress; // 0-1 loop voortgang
```

### TypeScript typing
```typescript
interface ClipEvent {
  sampleId: string;
  trimStart: number;
  duration: number;
}

const part = new Tone.Part<ClipEvent>(
  (time, event) => {
    // event is typed als ClipEvent
    const player = players.get(event.sampleId);
    player?.start(time, event.trimStart, event.duration);
  },
  events
);
```

---

## 5. Tone.Player

### Basis gebruik
```typescript
const player = new Tone.Player({
  url: "/audio/sample.mp3",
  loop: false,
  autostart: false,
}).toDestination();

// Wacht tot geladen
await player.load("/audio/sample.mp3");
// OF
await Tone.loaded(); // Wacht op ALLE audio

// Check loaded state
player.loaded; // boolean

// Afspelen
player.start();
player.start(time); // Start op specifieke tijd
player.start(time, offset); // Start met offset IN het audiobestand
player.start(time, offset, duration); // Start met offset en duur

player.stop();
```

### Player.start() parameters
```typescript
player.start(
  when?,      // AudioContext tijd om te starten
  offset?,    // Seconden offset IN het audiobestand
  duration?   // Hoelang af te spelen
);

// Voorbeeld: speel vanaf seconde 2, voor 3 seconden
player.start(Tone.now(), 2, 3);
```

### Player.seek()
```typescript
// Seek naar positie IN de player buffer
player.seek(offset, when?);
```

### Sync met Transport
```typescript
// Sync player met transport
player.sync();
player.start(0).stop("4:0:0"); // Speelt van 0 tot maat 4

// Start transport
transport.start();

// Unsync
player.unsync();
```

**⚠️ Let op:** `sync()` heeft bekende issues met seeking (zie GitHub #154).

---

## 6. Timing & Tempo

### Tijd formaten
```typescript
// Seconden
"1.5" of 1.5

// Notation (relatief aan tempo)
"4n"   // Kwartnoot
"8n"   // Achtste noot
"16n"  // Zestiende noot
"2n"   // Halve noot
"1n"   // Hele noot
"4n."  // Gepunteerde kwartnoot
"8t"   // Achtste triplet

// Transport tijd (Bars:Beats:Sixteenths)
"0:0:0"   // Begin
"1:0:0"   // Maat 2
"0:1:0"   // Beat 2
"0:0:2"   // Zestiende 3

// Relatieve tijd
"+0.5"    // 0.5 seconden vanaf nu
"+4n"     // Een kwartnoot vanaf nu
```

### Conversie helpers
```typescript
// In SoundScout: src/utils/audio.ts
function beatsToSeconds(beat: number, bpm: number): number {
  return (beat / bpm) * 60;
}

function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds / 60) * bpm;
}
```

### BPM en timing
```typescript
// Bij 120 BPM:
// 1 beat = 0.5 seconden
// 4 beats (1 maat) = 2 seconden
// 16 beats (4 maten) = 8 seconden

const transport = Tone.getTransport();
transport.bpm.value = 120;

// Tempo automation
transport.bpm.rampTo(140, 4); // Ramp naar 140 BPM over 4 seconden
```

---

## 7. Best Practices

### Memory Management
```typescript
// ALTIJD dispose() aanroepen bij cleanup
player.dispose();
part.dispose();

// Bij reschedulen: dispose eerst de oude Part
if (this.timelinePart) {
  this.timelinePart.dispose();
  this.timelinePart = null;
}
```

### Transport starten met kleine delay
```typescript
// Geef browser even tijd om te settlen
transport.start("+0.05");  // 50ms delay
transport.start("+0.1");   // 100ms delay
```

### Callback timing
```typescript
// IN een scheduled callback, gebruik de `time` parameter voor precisie
transport.schedule((time) => {
  // GOED: gebruik time parameter
  player.start(time);

  // FOUT: Tone.now() kan afwijken
  player.start(Tone.now());
}, "1:0:0");
```

### Singleton pattern
```typescript
// AudioService is een singleton - één instantie voor hele app
// Dit voorkomt meerdere audio contexts en scheduling conflicten
class AudioService {
  private static instance: AudioService | null = null;

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }
}
```

---

## 8. KRITIEK: Seeking naar Midden van Actieve Clips

### Het probleem

Dit is een **kritieke beperking** van Tone.Part + transport offset die niet direct uit de documentatie blijkt.

**Scenario:**
```
Timeline:
Beat:  0    1    2    3    4    5    6    7    8
       |----[===CLIP A (4 beats)===]----|----[==CLIP B==]
            ↑ start=1                         ↑ start=6
                      ↑ seek naar beat 3
```

**Wat gebeurt bij `transport.start("+0.05", 1.5s)` (seek naar beat 3):**
1. Transport positie wordt 1.5 seconden (= beat 3 bij 120 BPM)
2. Tone.Part kijkt: "welke events hebben time >= 1.5s?"
3. Clip A event (time=0.5s, beat 1) → **OVERGESLAGEN** (0.5s < 1.5s)
4. Clip B event (time=3s, beat 6) → Wordt getriggerd (3s > 1.5s)

**Het probleem:** Clip A is nog ACTIEF op beat 3 (loopt van beat 1-5), maar wordt niet afgespeeld omdat het event in het "verleden" ligt.

### Waarom dit gebeurt

Tone.Part events worden gepland op het **startmoment** van de audio, niet op de volledige range waarin ze actief zijn. Als de transport voorbij het startmoment springt, wordt het event overgeslagen - ongeacht of de audio nog zou moeten klinken.

```typescript
// Hoe events worden gepland:
events.push({
  time: 0.5,        // Start van clip (beat 1)
  sampleId: "A",
  trimStart: 0,
  duration: 2.0     // Duration wordt NIET gebruikt voor scheduling
});

// De duration bepaalt hoelang de audio speelt NADAT het event triggert,
// maar heeft GEEN invloed op WANNEER het event triggert.
```

### De oplossing: Hybride Aanpak

**Stap 1:** Bij seek, identificeer clips die "actief" zijn op de seek positie:
```typescript
function isClipActiveAtBeat(clip: Clip, sample: Sample, beat: number, bpm: number): boolean {
  const clipEndBeat = getClipEndBeat(clip, sample, bpm);
  return clip.startBeat <= beat && beat < clipEndBeat;
}
```

**Stap 2:** Voor actieve clips, bereken aangepaste parameters:
```typescript
// Clip A: startBeat=1, duration=4 beats, trimStart=0
// Seek naar beat 3
const elapsedBeats = 3 - 1; // = 2 beats
const elapsedSeconds = beatsToSeconds(2, 120); // = 1 seconde

// Nieuwe parameters voor directe playback:
const adjustedTrimStart = originalTrimStart + elapsedSeconds; // 0 + 1 = 1s
const remainingDuration = originalDuration - elapsedSeconds;  // 2 - 1 = 1s
```

**Stap 3:** Start actieve clips DIRECT (niet via Part):
```typescript
// Start direct met Tone.now() + kleine buffer
player.start(Tone.now() + 0.05, adjustedTrimStart, remainingDuration);
```

**Stap 4:** Laat Tone.Part de toekomstige clips afhandelen:
```typescript
transport.start("+0.05", offsetSeconds);
```

### Waarom dit werkt

```
Seek naar beat 3:

DIRECT gestart (actieve clips):
  - Clip A: player.start(now+0.05, 1.0s, 1.0s)
    → Speelt sample vanaf seconde 1, voor 1 seconde
    → Dit is het resterende deel van Clip A

VIA TONE.PART (toekomstige clips):
  - Clip B: getriggerd door Part wanneer transport beat 6 bereikt
    → Normaal afgespeeld
```

### Implementatie in AudioService

```typescript
play(fromBeat: number = 0): void {
  const transport = Tone.getTransport();
  const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

  // STAP 1: Start actieve clips direct
  this.startActiveClipsAtPosition(fromBeat);

  // STAP 2: Start transport voor toekomstige clips
  transport.start('+0.05', offsetSeconds);
  this.startPlayheadUpdates();
}

private startActiveClipsAtPosition(seekBeat: number): void {
  // Vereist toegang tot tracks en samples
  // → Moet via scheduleTimeline beschikbaar zijn of apart opgeslagen
}
```

### Vereiste data voor hybride aanpak

De `play()` methode heeft toegang nodig tot:
1. **Tracks met clips** - om te bepalen welke clips actief zijn
2. **Samples** - om clip duration te berekenen
3. **Players** - om audio direct te starten

**Optie A:** Sla tracks/samples op als class properties na `scheduleTimeline()`
**Optie B:** Geef tracks/samples mee aan `play(fromBeat, tracks, samples)`
**Optie C:** Bouw een index van "clip time ranges" in `scheduleTimeline()`

### Randgevallen

1. **Seek naar exact begin van clip:** Clip begint net, moet volledig afspelen via directe start (niet dubbel via Part)
2. **Seek naar exact eind van clip:** Clip is net afgelopen, niet actief
3. **Getrimde clips:** Moet rekening houden met trim in alle berekeningen
4. **Lege timeline:** Geen actieve clips, alleen transport starten
5. **Looping:** Bij loop reset moeten alle clips correct resetten

---

## 9. Bekende Issues & Workarounds (Tone.js GitHub)

### Issue #154: Source.sync() en Transport seeking
**Probleem:** Synced sources starten niet correct bij transport seek/resume.
**Workaround:** Gebruik Tone.Part in plaats van sync().

### Issue #182: transport.seconds reset
**Probleem:** `transport.seconds` kan onverwacht resetten.
**Workaround:** In nieuwere versies opgelost. Gebruik Tone.js v14+.

### Issue #1076: Rescheduling met Players
**Probleem:** Errors bij cancel en reschedule met players.
**Workaround:** Dispose Part voor reschedule, hergebruik Player instances.

### Browser Autoplay Policy
**Probleem:** Audio start niet zonder user interactie.
**Workaround:** Roep `Tone.start()` aan in een click/touch handler.

```typescript
button.addEventListener('click', async () => {
  await Tone.start();
  // Nu kan audio afspelen
});
```

---

## 10. SoundScout Specifieke Implementatie

> **Status:** ✅ Volledig geïmplementeerd (2026-02-04)

### AudioService architectuur
```
AudioService (singleton)
├── players: Map<sampleId, Tone.Player>
├── timelinePart: Tone.Part | null
├── scheduledTracks: Track[]           ← NIEUW (voor seek)
├── scheduledSamples: Sample[]         ← NIEUW (voor seek)
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

### Timeline scheduling met Tone.Part
```typescript
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  // 1. Cancel transport & dispose oude Part
  transport.cancel();
  this.timelinePart?.dispose();

  // 2. Store timeline data voor seek (NIEUW)
  this.scheduledTracks = tracks;
  this.scheduledSamples = samples;

  // 3. Build events array van clips
  const events = tracks.flatMap(track =>
    track.clips.map(clip => ({
      time: beatsToSeconds(clip.startBeat, BPM),
      sampleId: clip.sampleId,
      trimStart: getClipTrimStart(clip),
      duration: getClipDuration(clip, sample)
    }))
  );

  // 4. Create nieuwe Part
  this.timelinePart = new Tone.Part(callback, events);
  this.timelinePart.start(0);
}
```

### Play met hybride seek aanpak (GEÏMPLEMENTEERD)
```typescript
play(fromBeat: number = 0): void {
  const transport = Tone.getTransport();
  const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

  // HYBRIDE AANPAK: Start actieve clips direct
  if (fromBeat > 0) {
    this.startActiveClips(fromBeat);
  }

  // Transport voor toekomstige clips
  transport.start('+0.05', offsetSeconds);
  this.startPlayheadUpdates();
}
```

### Actieve clips detectie en playback (NIEUW)
```typescript
// Check of clip actief is op bepaalde beat
private isClipActiveAtBeat(clip: Clip, sample: Sample, beat: number): boolean {
  const clipEndBeat = getClipEndBeat(clip, sample, DEFAULT_BPM);
  return clip.startBeat <= beat && beat < clipEndBeat;
}

// Vind alle actieve clips met berekende parameters
private getActiveClipsAtBeat(beat: number): ActiveClipInfo[] {
  // Filtert clips waar startBeat <= beat < endBeat
  // Berekent adjustedTrimStart en remainingDuration
  // Retourneert array met player references
}

// Start actieve clips direct
private startActiveClips(seekBeat: number): void {
  const activeClips = this.getActiveClipsAtBeat(seekBeat);
  const startTime = Tone.now() + 0.05;

  activeClips.forEach(({ player, adjustedTrimStart, remainingDuration }) => {
    player.start(startTime, adjustedTrimStart, remainingDuration);
  });
}
```

### Clip trimming
```typescript
// Clip heeft trimStart en trimEnd (in seconden)
// Bij playback:
player.start(time, clip.trimStart, clipDuration);

// Helpers in src/utils/audio.ts:
getClipTrimStart(clip)  // Start offset in audio
getClipDuration(clip, sample)  // Effectieve duur
```

---

## 11. Fade In/Out met setValueCurveAtTime (#79)

### Overzicht

Per-clip fade-in en fade-out worden gerealiseerd via een aparte `Tone.Gain` node (FadeGain) in de effect chain. Dit is gescheiden van de clip-volume node zodat fade en volume onafhankelijk werken.

**Chain-volgorde:** Player → PitchShift → Reverb → **FadeGain** → Volume → Destination

### Fade-curves

Symmetrische exponentiële curves (equal-power, DAW-conventie):

```typescript
// Fade-in: x² — geleidelijke opbouw van stilte naar vol volume
fadeInCurve[i] = progress * progress;  // progress = i / (steps - 1)

// Fade-out: (1-x)² — soepele afdaling van vol volume naar stilte
fadeOutCurve[i] = (1 - progress) * (1 - progress);
```

De curves worden voorberekend als `number[]` (128 stappen) en hergebruikt. **Let op:** Tone.js `Param.setValueCurveAtTime()` accepteert `number[]`, **niet** `Float32Array`.

### Scheduling

```typescript
// Fade-in: start op 0, bouw op naar 1
gainParam.setValueAtTime(0, clipStartTime);
gainParam.setValueCurveAtTime(fadeInCurve, clipStartTime, fadeInDuration);

// Fade-out: daal af van 1 naar 0
const fadeOutStart = clipEndTime - fadeOutDuration;
gainParam.setValueCurveAtTime(fadeOutCurve, fadeOutStart, fadeOutDuration);
```

### Seek in fade-zone

Bij seek halverwege een fade-in of fade-out zone:
1. Bereken het voortgangspercentage: `progress = elapsedInFade / fadeDuration`
2. Bereken tussenliggend volume met dezelfde curve-formule
3. `setValueAtTime(tussenVolume, startTime)` — zet huidige waarde
4. `setValueCurveAtTime(restCurve, startTime, resterendeDuur)` — schedule resterende curve via `slice()`

```typescript
// Voorbeeld: seek in fade-in zone
const progress = elapsed / fadeIn;
const currentGain = progress * progress;  // x² curve
const remainingCurve = fadeInCurve.slice(Math.floor(progress * 127));
fadeGain.gain.setValueAtTime(currentGain, startTime);
fadeGain.gain.setValueCurveAtTime(remainingCurve, startTime, fadeIn - elapsed);
```

### Loop-interactie

Bij loopende clips worden fade events per iteratie gepland:
- **Eerste iteratie**: fade-in (als fadeIn > 0)
- **Laatste iteratie**: fade-out (als fadeOut > 0)
- **Middelste iteraties**: geen fade, gain blijft op 1

### Trim+fade clamping

Als een clip korter wordt getrimd en `fadeIn + fadeOut > newDuration`, worden fades proportioneel teruggeschaald:
```typescript
const scale = newDuration / (fadeIn + fadeOut);
newFadeIn = fadeIn * scale;
newFadeOut = fadeOut * scale;
```

### Preview in EffectsModal

De EffectsModal heeft een "Voorbeeld"-knop die de sample afspeelt met alle effecten (pitch, reverb, fade). Dit gebruikt `AudioService.playSampleWithEffects()` die een tijdelijke geïsoleerde effect chain opbouwt (los van de timeline). Opruiming via `stopPreviewWithEffects()`.

### Waveform-visualisatie

De `Waveform`-component toont fades visueel via twee effecten per bar:
1. **Hoogte-schaling**: `barHeight *= fadeFactor` — bars worden kleiner in fade-zones
2. **Kleur-transitie**: bars blenden van sample-kleur naar `neutral-400` naarmate de fade vordert

---

## 12. Bronnen

### Officiële documentatie
- [Tone.js Docs](https://tonejs.github.io/docs/)
- [Tone.js Wiki](https://github.com/Tonejs/Tone.js/wiki)
- [Tone.js Examples](https://tonejs.github.io/examples/)

### Specifieke pagina's
- [Transport](https://tonejs.github.io/docs/15.0.4/classes/Transport.html)
- [Part](https://tonejs.github.io/docs/15.0.4/classes/Part.html)
- [Player](https://tonejs.github.io/docs/15.0.4/classes/Player.html)
- [Events Wiki](https://github.com/Tonejs/Tone.js/wiki/Events)

### GitHub Issues (relevante discussies)
- [#154 - Source.sync() and Transport seeking](https://github.com/Tonejs/Tone.js/issues/154)
- [#182 - Setting current transport time](https://github.com/Tonejs/Tone.js/issues/182)
- [#1076 - Clearing and Rescheduling Timeline](https://github.com/Tonejs/Tone.js/issues/1076)

### Community resources
- [Reactronica](https://github.com/unkleho/reactronica) - React wrapper
- [JSDJ](https://github.com/lukebertram/jsdj) - React/Redux DAW voorbeeld

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-02-04 | Document aangemaakt met basis Tone.js kennis |
| 2026-02-04 | Tone.Part sectie toegevoegd voor Playhead Seeking feature |
| 2026-02-04 | **KRITIEK:** Sectie 8 toegevoegd - Seeking naar midden van actieve clips probleem + hybride oplossing |
| 2026-02-04 | ✅ Sectie 10 bijgewerkt - Hybride aanpak volledig geïmplementeerd en werkend |
| 2026-04-16 | Sectie 11 toegevoegd - Fade In/Out: x² / (1-x)² curves, FadeGain node, seek in fade-zone, loop-interactie, trim clamping, preview |
