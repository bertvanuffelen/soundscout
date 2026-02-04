# Tone.js Kennisbank - SoundScout

**Doel:** Centrale documentatie van Tone.js kennis voor SoundScout
**Laatst bijgewerkt:** 2026-02-04
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
8. [Bekende Issues & Workarounds](#8-bekende-issues--workarounds)
9. [SoundScout Specifieke Implementatie](#9-soundscout-specifieke-implementatie)
10. [Bronnen](#10-bronnen)

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

## 8. Bekende Issues & Workarounds

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

## 9. SoundScout Specifieke Implementatie

### AudioService architectuur
```
AudioService (singleton)
├── players: Map<sampleId, Tone.Player>
├── timelinePart: Tone.Part | null
├── waveformCache: Map<sampleId, WaveformData>
└── ambientPlayer: Tone.Player | null
```

### Timeline scheduling met Tone.Part
```typescript
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  // 1. Cancel transport & dispose oude Part
  transport.cancel();
  this.timelinePart?.dispose();

  // 2. Build events array van clips
  const events = tracks.flatMap(track =>
    track.clips.map(clip => [
      beatsToSeconds(clip.startBeat, BPM),
      { sampleId, trimStart, duration }
    ])
  );

  // 3. Create nieuwe Part
  this.timelinePart = new Tone.Part(callback, events);
  this.timelinePart.start(0);
}
```

### Play met seek offset
```typescript
play(fromBeat: number = 0): void {
  const offset = beatsToSeconds(fromBeat, BPM);
  transport.start("+0.05", offset);
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

## 10. Bronnen

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
