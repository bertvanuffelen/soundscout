# Roadmap: Playhead Seeking met Tone.Part

**Feature:** Audio afspelen vanaf seek positie
**Status:** ✅ VOLTOOID
**Datum gestart:** 2026-02-04
**Datum voltooid:** 2026-02-04
**Geschatte complexiteit:** ⭐⭐ Medium

---

## Samenvatting

Implementatie van Tone.Part voor de timeline scheduling, waardoor audio correct afspeelt vanaf elke seek positie (niet alleen vanaf beat 0).

---

## Probleemanalyse

### Huidige situatie
- `transport.schedule()` scheduled clips op **absolute tijden**
- Bij seek naar beat X en dan Play: clips vóór X worden **niet** afgespeeld
- Dit is fundamenteel hoe Tone.js transport werkt

### Voorbeeld
```
Beat:     0    2    4    6    8    10   12   14
          |--A--|    |--B--|    |--C--|
                               ↑ seek naar beat 10

Resultaat: A en B worden NIET afgespeeld (al "voorbij")
```

### Oplossing
Gebruik `Tone.Part` met offset support: `transport.start(time, offset)`

---

## Implementatieplan

### Fase 1: Voorbereiding
- [ ] Git backup commit
- [ ] Tone.js kennisbank document aanmaken
- [ ] Deze roadmap document aanmaken

**Na fase 1:** Update deze roadmap.

---

### Fase 2: AudioService - Nieuwe property
**Bestand:** `src/services/AudioService.ts`

**Wijzigingen:**
- [ ] Toevoegen `private timelinePart: Tone.Part | null = null;`
- [ ] Import type uit Tone.js

**Code:**
```typescript
class AudioService {
  // ... bestaande properties ...

  private timelinePart: Tone.Part | null = null;
```

**Risico:** 🟢 Laag - alleen toevoegen, niets verwijderen

**Na fase 2:** Update deze roadmap.

---

### Fase 3: AudioService - scheduleTimeline refactor
**Bestand:** `src/services/AudioService.ts`

**Wijzigingen:**
- [ ] Dispose oude Part vóór nieuwe schedule
- [ ] Bouw events array van tracks/clips
- [ ] Maak nieuwe Tone.Part met callback
- [ ] Start Part op positie 0

**Code:**
```typescript
scheduleTimeline(tracks: Track[], samples: Sample[]): void {
  const transport = Tone.getTransport();
  transport.cancel();
  transport.bpm.value = DEFAULT_BPM;

  // Dispose oude Part
  if (this.timelinePart) {
    this.timelinePart.dispose();
    this.timelinePart = null;
  }

  // Build events array
  const sampleMap = new Map(samples.map((s) => [s.id, s]));
  const events: Array<[number, {sampleId: string; trimStart: number; duration: number}]> = [];

  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const sample = sampleMap.get(clip.sampleId);
      if (!sample) return;

      const player = this.players.get(clip.sampleId);
      if (!player || !player.loaded) return;

      events.push([
        beatsToSeconds(clip.startBeat, DEFAULT_BPM),
        {
          sampleId: clip.sampleId,
          trimStart: getClipTrimStart(clip),
          duration: getClipDuration(clip, sample),
        }
      ]);
    });
  });

  // Create Part
  this.timelinePart = new Tone.Part<{sampleId: string; trimStart: number; duration: number}>(
    (time, event) => {
      const player = this.players.get(event.sampleId);
      if (player?.loaded) {
        player.start(time, event.trimStart, event.duration);
      }
    },
    events
  );

  this.timelinePart.start(0);
}
```

**Risico:** 🟡 Medium - core scheduling logica wijzigt

**Testen:**
- [ ] Normale playback vanaf beat 0 werkt nog
- [ ] Clips met trim worden correct afgespeeld
- [ ] Meerdere clips tegelijk werken

**Na fase 3:** Update deze roadmap.

---

### Fase 4: AudioService - play() met offset
**Bestand:** `src/services/AudioService.ts`

**Wijzigingen:**
- [ ] Voeg `fromBeat` parameter toe aan `play()`
- [ ] Gebruik `transport.start()` met offset

**Code:**
```typescript
play(fromBeat: number = 0): void {
  const transport = Tone.getTransport();
  const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

  // Start met kleine delay voor browser, plus offset
  transport.start("+0.05", offsetSeconds);
  this.startPlayheadUpdates();
}
```

**Risico:** 🟢 Laag - default parameter behoudt backward compatibility

**Na fase 4:** Update deze roadmap.

---

### Fase 5: AudioService - dispose() cleanup
**Bestand:** `src/services/AudioService.ts`

**Wijzigingen:**
- [ ] Dispose timelinePart in `dispose()` methode

**Code:**
```typescript
dispose(): void {
  this.stopPlayheadUpdates();

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();

  // Dispose Part
  this.timelinePart?.dispose();
  this.timelinePart = null;

  // ... rest blijft hetzelfde
}
```

**Risico:** 🟢 Laag - alleen cleanup toevoegen

**Na fase 5:** Update deze roadmap.

---

### Fase 6: useAudioEngine hook update
**Bestand:** `src/hooks/useAudioEngine.ts`

**Wijzigingen:**
- [ ] Update `playTimeline` om `fromBeat` parameter door te geven

**Code:**
```typescript
const playTimeline = useCallback((fromBeat: number = 0) => {
  audioService.play(fromBeat);
  setIsPlaying(true);
}, [setIsPlaying]);
```

**Risico:** 🟢 Laag - signature uitbreiding met default

**Na fase 6:** Update deze roadmap.

---

### Fase 7: useStudioPlayback hook update
**Bestand:** `src/hooks/useStudioPlayback.ts`

**Wijzigingen:**
- [ ] Import `useAudioStore` voor `currentBeat`
- [ ] Update `handlePlay` om `currentBeat` door te geven

**Code:**
```typescript
import { useAudioStore } from '../stores/audioStore';

// In de hook:
const currentBeat = useAudioStore((s) => s.currentBeat);

const handlePlay = useCallback(() => {
  scheduleTimeline(tracks, librarySamples);
  setTransportLoop(isLooping, totalBeats);
  playTimeline(currentBeat);  // ← Gebruik currentBeat
}, [
  scheduleTimeline,
  playTimeline,
  setTransportLoop,
  librarySamples,
  tracks,
  isLooping,
  totalBeats,
  currentBeat,  // ← Nieuwe dependency
]);
```

**Risico:** 🟢 Laag - logica uitbreiding

**Na fase 7:** Update deze roadmap.

---

### Fase 8: Testen Basis Implementatie
**Doel:** Test wat werkt en wat niet

**Test resultaten (2026-02-04):**
- [x] **Normale playback:** Start vanaf beat 0 → ✅ WERKT
- [x] **Seek en play:** Seek naar beat 8, clips vanaf beat 8 → ✅ WERKT (toekomstige clips)
- [x] **Overlap test:** Seek naar midden van een clip → ❌ **FAALT** (clip speelt niet)
- [ ] **Lege timeline:** Geen errors bij lege timeline
- [ ] **Pause/Resume:** Pause werkt nog correct
- [ ] **Stop:** Stop reset naar begin
- [ ] **Loop:** Looping werkt correct met seek
- [ ] **Trim:** Getrimde clips spelen correct

**Conclusie:** Hybride aanpak nodig voor "actieve clips" - zie TONEJS-KENNISBANK.md sectie 8.

---

## NIEUWE FASEN: Hybride Aanpak voor Actieve Clips

> **Probleem:** Clips die al begonnen zijn maar nog actief zijn op de seek positie worden overgeslagen door Tone.Part.
>
> **Oplossing:** Start actieve clips DIRECT voordat transport begint.
>
> **Zie:** `docs/TONEJS-KENNISBANK.md` sectie 8 voor volledige uitleg.

---

### Fase 8a: AudioService - Opslaan van timeline data
**Bestand:** `src/services/AudioService.ts`

**Probleem:** `play()` heeft geen toegang tot tracks/samples om actieve clips te bepalen.

**Wijzigingen:**
- [ ] Voeg private properties toe voor timeline data
- [ ] Sla tracks en samples op in `scheduleTimeline()`

**Code:**
```typescript
class AudioService {
  // Bestaande properties...

  // NIEUW: Timeline data voor seek calculations
  private scheduledTracks: Track[] = [];
  private scheduledSamples: Sample[] = [];

  scheduleTimeline(tracks: Track[], samples: Sample[]): void {
    // Bestaande code...

    // NIEUW: Sla data op voor later gebruik
    this.scheduledTracks = tracks;
    this.scheduledSamples = samples;
  }
}
```

**Risico:** 🟢 Laag - alleen data opslaan

---

### Fase 8b: AudioService - Helper functie isClipActiveAtBeat
**Bestand:** `src/services/AudioService.ts`

**Doel:** Bepaal of een clip actief is op een bepaalde beat positie.

**Code:**
```typescript
/**
 * Check if a clip is active (playing) at a specific beat position.
 * A clip is active if: startBeat <= beat < endBeat
 */
private isClipActiveAtBeat(
  clip: Clip,
  sample: Sample,
  beat: number
): boolean {
  const clipEndBeat = getClipEndBeat(clip, sample, DEFAULT_BPM);
  return clip.startBeat <= beat && beat < clipEndBeat;
}
```

**Test cases:**
```
Clip: startBeat=2, duration=4 beats (endBeat=6)

isClipActiveAtBeat(clip, sample, 1) → false  (voor clip)
isClipActiveAtBeat(clip, sample, 2) → true   (exact op start)
isClipActiveAtBeat(clip, sample, 4) → true   (midden)
isClipActiveAtBeat(clip, sample, 6) → false  (exact op eind, clip is voorbij)
isClipActiveAtBeat(clip, sample, 7) → false  (na clip)
```

**Risico:** 🟢 Laag - pure functie

---

### Fase 8c: AudioService - Helper functie getActiveClipsAtBeat
**Bestand:** `src/services/AudioService.ts`

**Doel:** Vind alle clips die actief zijn op een bepaalde beat.

**Code:**
```typescript
interface ActiveClipInfo {
  clip: Clip;
  sample: Sample;
  player: Tone.Player;
  /** Hoeveel beats zijn al verstreken sinds clip start */
  elapsedBeats: number;
  /** Aangepaste trimStart (origineel + elapsed) in seconden */
  adjustedTrimStart: number;
  /** Resterende duration in seconden */
  remainingDuration: number;
}

/**
 * Get all clips that are active at a specific beat position,
 * with calculated playback parameters for immediate start.
 */
private getActiveClipsAtBeat(beat: number): ActiveClipInfo[] {
  const activeClips: ActiveClipInfo[] = [];
  const sampleMap = new Map(this.scheduledSamples.map(s => [s.id, s]));

  this.scheduledTracks.forEach(track => {
    track.clips.forEach(clip => {
      const sample = sampleMap.get(clip.sampleId);
      const player = this.players.get(clip.sampleId);

      if (!sample || !player || !player.loaded) return;
      if (!this.isClipActiveAtBeat(clip, sample, beat)) return;

      // Bereken hoeveel al verstreken is
      const elapsedBeats = beat - clip.startBeat;
      const elapsedSeconds = beatsToSeconds(elapsedBeats, DEFAULT_BPM);

      // Bereken originele trim parameters
      const originalTrimStart = getClipTrimStart(clip);
      const originalDuration = getClipDuration(clip, sample);

      // Bereken aangepaste parameters
      const adjustedTrimStart = originalTrimStart + elapsedSeconds;
      const remainingDuration = originalDuration - elapsedSeconds;

      // Alleen toevoegen als er nog iets te spelen is
      if (remainingDuration > 0.01) { // 10ms minimum
        activeClips.push({
          clip,
          sample,
          player,
          elapsedBeats,
          adjustedTrimStart,
          remainingDuration,
        });
      }
    });
  });

  return activeClips;
}
```

**Risico:** 🟡 Medium - kern logica voor seek

---

### Fase 8d: AudioService - startActiveClips methode
**Bestand:** `src/services/AudioService.ts`

**Doel:** Start alle actieve clips direct met aangepaste parameters.

**Code:**
```typescript
/**
 * Start all clips that are active at the given beat position.
 * These clips have their start moment in the "past" relative to seek position,
 * so they need to be started immediately with adjusted offset and duration.
 */
private startActiveClips(seekBeat: number): void {
  const activeClips = this.getActiveClipsAtBeat(seekBeat);

  if (activeClips.length === 0) return;

  // Start all active clips with small stagger to prevent audio glitches
  const startTime = Tone.now() + 0.05; // 50ms buffer

  activeClips.forEach(({ player, adjustedTrimStart, remainingDuration }) => {
    player.start(startTime, adjustedTrimStart, remainingDuration);
  });

  logger.audio('startActiveClips', {
    seekBeat,
    count: activeClips.length,
    clips: activeClips.map(c => ({
      sampleId: c.clip.sampleId,
      elapsed: c.elapsedBeats,
      remaining: c.remainingDuration
    }))
  });
}
```

**Risico:** 🟡 Medium - audio timing kritiek

---

### Fase 8e: AudioService - Integratie in play()
**Bestand:** `src/services/AudioService.ts`

**Doel:** Roep startActiveClips aan in play() vóór transport start.

**Huidige code:**
```typescript
play(fromBeat: number = 0): void {
  const transport = Tone.getTransport();
  const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

  transport.start('+0.05', offsetSeconds);
  this.startPlayheadUpdates();
}
```

**Nieuwe code:**
```typescript
play(fromBeat: number = 0): void {
  const transport = Tone.getTransport();
  const offsetSeconds = beatsToSeconds(fromBeat, DEFAULT_BPM);

  // NIEUW: Start clips die al actief zijn op seek positie
  if (fromBeat > 0) {
    this.startActiveClips(fromBeat);
  }

  // Transport start voor toekomstige clips
  transport.start('+0.05', offsetSeconds);
  this.startPlayheadUpdates();
}
```

**Waarom `if (fromBeat > 0)`:**
- Bij beat 0 zijn er geen "actieve" clips (alles begint op of na 0)
- Voorkomt onnodige berekeningen bij normale playback

**Risico:** 🟡 Medium - core playback flow

---

### Fase 8f: AudioService - dispose() cleanup uitbreiden
**Bestand:** `src/services/AudioService.ts`

**Wijzigingen:**
- [ ] Clear scheduledTracks en scheduledSamples in dispose()

**Code:**
```typescript
dispose(): void {
  // Bestaande cleanup...

  // NIEUW: Clear timeline data
  this.scheduledTracks = [];
  this.scheduledSamples = [];
}
```

**Risico:** 🟢 Laag - alleen cleanup

---

### Fase 9: Uitgebreid Testen Hybride Aanpak
**Doel:** Alle scenario's grondig testen

**Test cases:**
- [ ] **Normale playback (beat 0):** Alle clips spelen, geen dubbele audio
- [ ] **Seek naar toekomst:** Seek naar beat waar geen clips actief zijn
- [ ] **Seek naar midden clip:** Clip speelt vanaf seek positie ✨
- [ ] **Seek naar exact begin clip:** Clip speelt volledig
- [ ] **Seek naar net voor einde clip:** Kort stukje speelt
- [ ] **Meerdere actieve clips:** Alle actieve clips spelen tegelijk
- [ ] **Getrimde clip seek:** Trim offsets correct berekend
- [ ] **Pause/Resume:** Na seek + pause, resume werkt correct
- [ ] **Stop:** Stop reset alles correct
- [ ] **Loop met seek:** Loop reset speelt clips correct
- [ ] **Lege timeline:** Geen errors
- [ ] **Memory:** Geen leaks bij herhaald seek/play

**Performance test:**
- [ ] Seek 100x herhalen → geen audio glitches
- [ ] Timeline met 50+ clips → seek blijft responsive

---

### Fase 10: Documentatie & Cleanup
- [ ] Update `claude.md` met Tone.Part + hybride aanpak kennis
- [ ] Verwijder debug logs (behalve logger.audio calls)
- [ ] Final commit met descriptive message
- [ ] Update deze roadmap → VOLTOOID

---

## Voetnoten

### Waarom geen Part.start(time, offset)?

Je zou denken dat `part.start(0, seekOffset)` het probleem oplost, maar:

1. `part.start(transportTime, partOffset)` start de Part op een transport tijd, met een offset BINNEN de Part
2. Dit betekent: events vóór de offset worden overgeslagen
3. Het lost NIET op dat events die al begonnen maar nog actief zijn, moeten worden afgespeeld

De Part offset is bedoeld voor "spring naar maat 4 in het nummer", niet voor "speel wat er nu zou moeten klinken".

### Waarom niet gewoon alle clips altijd direct starten?

1. **Timing precisie:** Tone.Part + Transport biedt sample-accurate timing
2. **Lookahead:** Transport kan events voorbereiden voor glitch-free playback
3. **Sync:** Alle "toekomstige" clips blijven perfect gesynchroniseerd

De hybride aanpak combineert het beste van beide: directe start voor actieve clips, Part scheduling voor toekomstige clips.

---

## Voortgang Log

| Datum | Fase | Status | Notities |
|-------|------|--------|----------|
| 2026-02-04 | Analyse | ✅ Voltooid | Tone.Part gekozen als oplossing |
| 2026-02-04 | Planning | ✅ Voltooid | Roadmap aangemaakt |
| 2026-02-04 | Fase 1 | ✅ Voltooid | Git backup: 5113c63 |
| 2026-02-04 | Fase 2 | ✅ Voltooid | timelinePart property toegevoegd |
| 2026-02-04 | Fase 3 | ✅ Voltooid | scheduleTimeline refactored naar Tone.Part |
| 2026-02-04 | Fase 4 | ✅ Voltooid | play(fromBeat) met offset support |
| 2026-02-04 | Fase 5 | ✅ Voltooid | dispose() cleanup toegevoegd |
| 2026-02-04 | Fase 6 | ✅ Voltooid | useAudioEngine playTimeline(fromBeat) |
| 2026-02-04 | Fase 7 | ✅ Voltooid | useStudioPlayback currentBeat integratie |
| 2026-02-04 | Fase 8 | ⚠️ Deels | Test: seek naar midden clip FAALT |
| 2026-02-04 | Analyse | ✅ Voltooid | Probleem gedocumenteerd in TONEJS-KENNISBANK.md sectie 8 |
| 2026-02-04 | Planning | ✅ Voltooid | Hybride aanpak gepland (Fase 8a-8f) |
| 2026-02-04 | Fase 8a | ✅ Voltooid | Timeline data opslaan |
| 2026-02-04 | Fase 8b | ✅ Voltooid | isClipActiveAtBeat helper |
| 2026-02-04 | Fase 8c | ✅ Voltooid | getActiveClipsAtBeat helper |
| 2026-02-04 | Fase 8d | ✅ Voltooid | startActiveClips methode |
| 2026-02-04 | Fase 8e | ✅ Voltooid | Integratie in play() |
| 2026-02-04 | Fase 8f | ✅ Voltooid | dispose() cleanup |
| 2026-02-04 | Fase 9 | ✅ Voltooid | Seek naar midden clip WERKT! |
| 2026-02-04 | Fase 10 | ✅ Voltooid | Documentatie bijgewerkt |

---

## Referenties

- [Tone.Part Documentation](https://tonejs.github.io/docs/15.0.4/classes/Part.html)
- [Tone.js Transport Wiki](https://github.com/Tonejs/Tone.js/wiki/Transport)
- [Tone.js Events Wiki](https://github.com/Tonejs/Tone.js/wiki/Events)
- `docs/TONEJS-KENNISBANK.md` - Interne kennisbank
