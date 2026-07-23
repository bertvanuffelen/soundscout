# Plan #22 — Real-time Geluiden Toevoegen tijdens Afspelen

**Status:** Onderzoek afgerond — klaar voor implementatie
**Datum:** 2026-03-18
**Complexiteit:** Medium (was ingeschat als "Zeer Hoog", maar valt mee dankzij bestaande architectuur)

---

## Probleem

Wanneer een leerling een sample uit de library naar de timeline sleept terwijl de muziek speelt, wordt de clip wel aan de Zustand store toegevoegd (en dus visueel zichtbaar), maar klinkt pas nadat de gebruiker pauzeert en opnieuw afspeelt. De `Tone.Part` die het afspelen regelt is namelijk al aangemaakt en kan niet dynamisch gewijzigd worden tijdens transport.

---

## Kernprobleem: Tone.Part is immutable tijdens playback

`Tone.Part` accepteert een events-array bij constructie. Hoewel de API `part.add(time, value)` biedt, worden wijzigingen **genegeerd** wanneer de Part in `started` state is. Dit is de fundamentele beperking.

Huidige flow:
```
handlePlay() → scheduleTimeline(tracks, samples) → new Tone.Part(events) → transport.start()
```

De `scheduleTimeline()` wordt bij élke play/resume aangeroepen (ook na pause). Dit is een belangrijk inzicht: de app "herschedult" al bij elke play-actie.

---

## Gekozen aanpak: Reschedule-on-Change (Option A)

### Waarom deze aanpak?

| Aspect | Beoordeling |
|--------|------------|
| Hergebruik bestaande code | ✅ `scheduleTimeline()` is al battle-tested |
| Effect chains (#33) | ✅ Automatisch correct na reschedule |
| Loop-aware clips (#65) | ✅ Automatisch correct na reschedule |
| Seek support | ✅ `scheduledTracks` wordt bijgewerkt, `startActiveClips()` werkt correct |
| Looping | ✅ Geen aanpassingen nodig |
| Complexiteit | ✅ Minimale nieuwe code |
| Audio glitch | ⚠️ Korte onderbreking (~50-100ms, bij veel clips met effecten tot ~260ms) |

### Afgewezen alternatieven

| Alternatief | Reden afgewezen |
|------------|----------------|
| **Dynamic `part.add()`** | Werkt niet tijdens playback (Tone.js beperking). Zou hybrid moeten: `add()` voor verre clips + reschedule voor nabije clips. Te complex voor het voordeel. |
| **`Tone.Loop` i.p.v. `Tone.Part`** | Verliest precisie (16th-note interval i.p.v. exact beat-timing). Volledige architectuurwijziging nodig. |
| **Pending queue** | Clip klinkt pas bij volgende pause/loop — slechte UX, gebruiker verwacht direct geluid. |

---

## Scope: Wat triggert reschedule?

Reschedule wordt getriggerd bij elke timeline-wijziging tijdens playback:

| Actie | Trigger reschedule? | Reden |
|-------|:-------------------:|-------|
| Sample droppen op timeline | ✅ | Nieuwe clip moet klinken |
| Clip verplaatsen (drag) | ✅ | Positie is gewijzigd |
| Clip verwijderen | ✅ | Clip moet stoppen |
| Clip dupliceren | ✅ | Nieuwe clip |
| Clip trim wijzigen | ✅ | Duration/offset gewijzigd |
| Volume/mute wijzigen | ✅ | Audio output gewijzigd |
| Pitch/reverb wijzigen | ✅ | Effect chains moeten opnieuw |
| Loop resize | ✅ | Clip duration gewijzigd |
| Clear timeline | ✅ | Alles moet stoppen |
| Section marks wijzigen | ❌ | Geen invloed op audio |
| Clip label wijzigen | ❌ | Visueel, geen audio |
| Track kleur wijzigen | ❌ | Visueel, geen audio |

---

## Architectuur

### Flow bij clip-toevoeging tijdens playback

```
Gebruiker dropt sample op timeline
         ↓
handleDragEnd() in useStudioDnD
         ↓
addClip() / moveClip() → Zustand store update
         ↓
useRescheduleOnChange() effect detecteert wijziging
         ↓
isPlaying === true?
    ├─ NEE → niets doen (bestaand gedrag)
    └─ JA ↓
         ↓
Record currentBeat via useAudioStore.getState()
         ↓
scheduleTimeline(newTracks, samples)
  ├─ transport.cancel()
  ├─ Dispose oude Part + effect chains
  ├─ Scan alle tracks (inclusief nieuwe clip)
  ├─ Maak effect chains voor clips met effecten
  ├─ new Tone.Part(events)
  └─ timelinePart.start(0)
         ↓
play(recordedBeat)
  ├─ startActiveClips(recordedBeat) [hybride seek]
  └─ transport.start('+0.05', offsetSeconds)
         ↓
Playback hervat naadloos vanaf zelfde positie
```

### Waarom GEEN pause/resume nodig?

Het plan uit het onderzoek suggereerde `pause → reschedule → resume`. Maar eigenlijk is dat niet nodig:

1. `scheduleTimeline()` roept al `transport.cancel()` aan — dit stopt alle geplande events
2. Daarna wordt een nieuwe `Tone.Part` gemaakt met alle clips (inclusief de nieuwe)
3. `play(currentBeat)` start de transport opnieuw vanaf dezelfde positie

De **players moeten wél gestopt worden** voordat we reschedulen, anders spelen ze door. De bestaande `pause()` methode doet dit al. Dus de flow is eigenlijk:

```typescript
// In AudioService — nieuwe methode
rescheduleWhilePlaying(tracks: Track[], samples: Sample[]): void {
  const currentBeat = this.getCurrentBeat();

  // 1. Stop alle actieve players (zoals pause)
  this.players.forEach((p) => { try { p.stop(); } catch {} });
  this.effectChains.forEach(({ player }) => { try { player.stop(); } catch {} });
  this.stopPlayheadUpdates();

  // 2. Volledig opnieuw schedulen
  this.scheduleTimeline(tracks, samples);

  // 3. Hervat playback vanaf zelfde positie
  this.play(currentBeat);
}
```

Dit is schoner dan `pause() → scheduleTimeline() → play()` omdat het de transport niet expliciet pauzert — het is één atomaire operatie.

---

## Implementatieplan

### Stap 1: `rescheduleWhilePlaying()` op AudioService

Nieuwe publieke methode die players stopt, opnieuw schedult, en hervat:

```typescript
// AudioService.ts
rescheduleWhilePlaying(tracks: Track[], samples: Sample[], looping: boolean, totalBeats: number): void {
  const currentBeat = this.getCurrentBeat();

  // Stop alle actieve audio
  this.players.forEach((p) => { try { p.stop(); } catch {} });
  this.effectChains.forEach(({ player }) => { try { player.stop(); } catch {} });
  this.stopPlayheadUpdates();

  // Reschedule
  this.scheduleTimeline(tracks, samples);
  this.setLoop(looping, totalBeats);

  // Hervat
  this.play(currentBeat);
}
```

### Stap 2: Expose via `useAudioEngine` hook

```typescript
// useAudioEngine.ts
const rescheduleWhilePlaying = useCallback(
  (tracks: Track[], samples: Sample[], looping: boolean, totalBeats: number) => {
    audioService.rescheduleWhilePlaying(tracks, samples, looping, totalBeats);
  }, []
);
```

### Stap 3: `useRescheduleOnChange` hook

Nieuwe hook die detecteert wanneer audio-relevante timeline state wijzigt tijdens playback:

```typescript
// useRescheduleOnChange.ts
export function useRescheduleOnChange(
  tracks: Track[],
  samples: Sample[],
  isLooping: boolean,
  totalBeats: number,
) {
  const { rescheduleWhilePlaying } = useAudioEngine();

  // Bereken een "audio fingerprint" van de tracks
  // (alleen audio-relevante velden, niet labels/kleuren)
  const audioFingerprint = useMemo(() => {
    return tracks.map(t => ({
      clips: t.clips.map(c => ({
        id: c.id,
        sampleId: c.sampleId,
        startBeat: c.startBeat,
        trimStart: c.trimStart,
        trimEnd: c.trimEnd,
        loop: c.loop,
        loopDurationBeats: c.loopDurationBeats,
        effects: c.effects,
      })),
      volume: t.volume,
      mute: t.mute,
    }));
  }, [tracks]);

  const prevFingerprintRef = useRef(audioFingerprint);

  useEffect(() => {
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = audioFingerprint;

    // Vergelijk met vorige state — alleen als ze verschillen EN we spelen
    const isPlaying = useAudioStore.getState().isPlaying;
    if (!isPlaying) return;

    // Shallow compare faalt altijd (nieuwe objecten), dus vergelijk via JSON
    if (JSON.stringify(prev) === JSON.stringify(audioFingerprint)) return;

    // Timeline is gewijzigd tijdens playback → reschedule
    rescheduleWhilePlaying(tracks, samples, isLooping, totalBeats);
  }, [audioFingerprint, samples, isLooping, totalBeats, rescheduleWhilePlaying]);
}
```

**Alternatief (simpeler):** In plaats van fingerprinting, een versienummer bijhouden:

```typescript
// In timelineStore — nieuw veld
audioVersion: 0,

// In elke audio-relevante actie (addClip, moveClip, removeClip, etc.)
set((prev) => ({
  ...changes,
  audioVersion: prev.audioVersion + 1,
}));
```

Dan in de hook:
```typescript
const audioVersion = useTimelineStore((s) => s.audioVersion);

useEffect(() => {
  const isPlaying = useAudioStore.getState().isPlaying;
  if (!isPlaying) return;
  if (isFirstRender) return; // Skip initial mount

  rescheduleWhilePlaying(tracks, samples, isLooping, totalBeats);
}, [audioVersion]);
```

**Voordeel van versienummer:** Geen dure JSON.stringify vergelijking. Eén integer increment. Direct reactief via Zustand selector.

### Stap 4: Integreer in StudioView

```typescript
// StudioView.tsx
useRescheduleOnChange(tracks, librarySamples, isLooping, totalBeats);
```

Eén regel. De hook doet de rest.

### Stap 5: DnD tijdens playback toestaan

Controleer of DnD momenteel geblokkeerd wordt tijdens playback. Zo ja, verwijder die guard. Uit het onderzoek blijkt dat er geen expliciete blokkade is — DnD werkt al tijdens playback, alleen klinkt de nieuwe clip nog niet.

### Stap 6: Visuele feedback

Optioneel: een subtiele visuele indicatie wanneer een clip is toegevoegd tijdens playback (bijv. korte flash/highlight op de clip). Dit helpt de gebruiker te bevestigen dat de actie werkte.

### Stap 7: Tests

- Test clip toevoegen tijdens playback → clip klinkt mee
- Test clip verplaatsen tijdens playback → geluid verplaatst mee
- Test clip verwijderen tijdens playback → geluid stopt
- Test volume/mute wijzigen → direct effect
- Test pitch/reverb wijzigen → direct effect met correcte effect chain
- Test loop resize tijdens playback → direct effect
- Test seek na reschedule → correcte seek
- Test looping na reschedule → loop werkt correct

### Stap 8: i18n

Geen nieuwe vertaalsleutels nodig — deze feature is puur functioneel, geen UI-tekst.

---

## Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Audio glitch bij reschedule | Medium — hoorbare klik/stilte van ~50ms | Acceptabel voor kinderen-app. Optie B (dynamic Part.add) als fallback als UX-testen dit uitwijzen |
| Performance bij veel clips met effecten | Laag — max ~260ms voor 50 clips met effecten | Onwaarschijnlijk in praktijk (leerlingen gebruiken 5-15 clips). Monitoren bij edge cases |
| Race condition: twee snelle drops achter elkaar | Laag — reschedule is synchroon | Elke reschedule overschrijft de vorige. Laatste state wint altijd |
| Undo/redo tijdens playback | Medium — undo wijzigt tracks, triggert reschedule | Werkt correct: audioVersion increment bij undo/redo, reschedule volgt automatisch |
| `audioVersion` vergeten in nieuwe store acties | Medium — nieuwe clip-acties klinken niet live | Conventie documenteren in CLAUDE.md. Linter kan dit niet afdwingen |

---

## Ontwerpbeslissingen

| Beslissing | Keuze | Alternatief | Reden |
|-----------|-------|-------------|-------|
| Detectie van wijzigingen | `audioVersion` counter | JSON fingerprint | Performanter, simpeler, geen dure vergelijking |
| Reschedule-trigger | `useEffect` op `audioVersion` | Directe aanroep in elke actie | Centraal, minder kans op vergeten |
| Player stop methode | Expliciete stop in `rescheduleWhilePlaying` | Via `pause()` + `play()` | Schoner — één atomaire operatie, geen state-machine overgang |
| Scope | Alle audio-relevante acties | Alleen addClip/moveClip | Consistentie — volume, trim, effects wijzigingen klinken ook direct |

---

## Bestanden te wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/services/AudioService.ts` | Nieuwe `rescheduleWhilePlaying()` methode |
| `src/hooks/useAudioEngine.ts` | Expose `rescheduleWhilePlaying` |
| `src/hooks/useRescheduleOnChange.ts` | **Nieuw** — hook die audioVersion + isPlaying monitort |
| `src/stores/timelineStore.ts` | `audioVersion` veld + increment in audio-relevante acties |
| `src/components/studio/StudioView.tsx` | Één regel: `useRescheduleOnChange(...)` |
| `src/hooks/useStudioPlayback.ts` | Mogelijk: `handlePlay` hoeft niet meer apart `scheduleTimeline` aan te roepen als de hook dat al doet. Of laten zoals het is voor expliciete play-from-stop. |
| `CLAUDE.md` | Documenteer `audioVersion` patroon |

---

## Geschatte effort

| Stap | Tijd |
|------|------|
| AudioService.rescheduleWhilePlaying | 15 min |
| useAudioEngine expose | 5 min |
| audioVersion in timelineStore | 20 min (veel acties om aan te passen) |
| useRescheduleOnChange hook | 15 min |
| StudioView integratie | 5 min |
| Tests | 30 min |
| CLAUDE.md update | 5 min |
| **Totaal** | **~1.5 uur** |
