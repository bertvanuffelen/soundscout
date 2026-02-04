# Roadmap: Playhead Seeking met Tone.Part

**Feature:** Audio afspelen vanaf seek positie
**Status:** 🔄 In Planning
**Datum gestart:** 2026-02-04
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

### Fase 8: Testen & Verificatie
**Doel:** Alle scenario's grondig testen

**Test cases:**
- [ ] **Normale playback:** Start vanaf beat 0, alle clips spelen
- [ ] **Seek en play:** Seek naar beat 8, clips vanaf beat 8 spelen
- [ ] **Overlap test:** Seek naar midden van een clip, clip start met offset
- [ ] **Lege timeline:** Geen errors bij lege timeline
- [ ] **Pause/Resume:** Pause werkt nog correct
- [ ] **Stop:** Stop reset naar begin
- [ ] **Loop:** Looping werkt correct met seek
- [ ] **Trim:** Getrimde clips spelen correct
- [ ] **Memory:** Geen memory leaks bij veelvuldig reschedulen

**Na fase 8:** Update deze roadmap.

---

### Fase 9: Documentatie & Cleanup
- [ ] Update `TODO-IMPLEMENTATIE.md` met nieuwe feature
- [ ] Update `claude.md` met Tone.Part kennis
- [ ] Verwijder eventuele debug logs
- [ ] Final commit

**Na fase 9:** Update deze roadmap - markeer als VOLTOOID.

---

## Voortgang Log

| Datum | Fase | Status | Notities |
|-------|------|--------|----------|
| 2026-02-04 | Analyse | ✅ Voltooid | Tone.Part gekozen als oplossing |
| 2026-02-04 | Planning | 🔄 In progress | Roadmap aangemaakt |
| | Fase 1 | ⏳ Pending | |
| | Fase 2 | ⏳ Pending | |
| | Fase 3 | ⏳ Pending | |
| | Fase 4 | ⏳ Pending | |
| | Fase 5 | ⏳ Pending | |
| | Fase 6 | ⏳ Pending | |
| | Fase 7 | ⏳ Pending | |
| | Fase 8 | ⏳ Pending | |
| | Fase 9 | ⏳ Pending | |

---

## Referenties

- [Tone.Part Documentation](https://tonejs.github.io/docs/15.0.4/classes/Part.html)
- [Tone.js Transport Wiki](https://github.com/Tonejs/Tone.js/wiki/Transport)
- [Tone.js Events Wiki](https://github.com/Tonejs/Tone.js/wiki/Events)
- `docs/TONEJS-KENNISBANK.md` - Interne kennisbank
