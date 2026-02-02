# Implementatieplan: Read-Only Timeline Viewer voor Docenten

## Overzicht

Uitbreiding van de SubmissionPlayer modal zodat docenten een visuele weergave van de tijdlijn zien wanneer ze naar een leerling-compositie luisteren.

## Wijzigingen per bestand

### 1. `src/components/studio/Clip.tsx`

**Doel**: Voeg `readOnly` prop toe om remove-knop te verbergen en drag uit te schakelen.

**Wijzigingen**:
```typescript
interface ClipProps {
  // ... bestaande props
  readOnly?: boolean;  // NIEUW
}

// In component:
// - Conditionally disable useDraggable wanneer readOnly=true
// - Verberg remove button wanneer readOnly=true
// - Verander cursor naar 'default' wanneer readOnly=true
```

**Geschatte regels**: ~10 regels wijziging

---

### 2. `src/components/studio/Track.tsx`

**Doel**: Voeg `readOnly` prop toe om drop zone uit te schakelen.

**Wijzigingen**:
```typescript
interface TrackProps {
  // ... bestaande props
  readOnly?: boolean;  // NIEUW
}

// In component:
// - Conditionally disable useDroppable wanneer readOnly=true
// - Verberg hover highlight wanneer readOnly=true
// - Geef readOnly door aan Clip components
```

**Geschatte regels**: ~8 regels wijziging

---

### 3. `src/components/studio/Timeline.tsx`

**Doel**: Voeg `readOnly` prop toe en verberg "sleep samples" hint.

**Wijzigingen**:
```typescript
interface TimelineProps {
  // ... bestaande props
  readOnly?: boolean;  // NIEUW
}

// In component:
// - Geef readOnly door aan Track components
// - Verberg empty state "sleep samples hiernaartoe" tekst wanneer readOnly=true
// - Optioneel: andere empty state tekst of helemaal geen hint
```

**Geschatte regels**: ~6 regels wijziging

---

### 4. `src/components/teacher/SubmissionPlayer.tsx`

**Doel**: Volledige refactor naar fullscreen modal met timeline weergave.

**Huidige structuur**:
```
Modal (max-w-lg)
├── Header (titel, student, datum)
├── Metadata box (tracks/clips/samples)
├── Player box (geel, met play knop)
└── Close button
```

**Nieuwe structuur**:
```
Modal (fullscreen met padding)
├── Close button (X rechtsboven)
├── Header
│   ├── Titel compositie
│   ├── Student naam + datum
│   └── Metadata (tracks/clips/samples) op één regel
├── Timeline container
│   └── <Timeline readOnly={true} ... />
├── Transport controls
│   ├── Play/Pause button (grote gele cirkel)
│   └── Stop button (grote gele cirkel)
```

**Nieuwe state**:
```typescript
const [isPlaying, setIsPlaying] = useState(false);
const [currentBeat, setCurrentBeat] = useState(0);
```

**currentBeat tracking**:
```typescript
useEffect(() => {
  if (!isPlaying) return;

  let animationId: number;
  const updateBeat = () => {
    const seconds = Tone.Transport.seconds;
    const beat = (seconds / 60) * bpm;
    setCurrentBeat(beat % totalBeats); // Loop support
    animationId = requestAnimationFrame(updateBeat);
  };

  animationId = requestAnimationFrame(updateBeat);
  return () => cancelAnimationFrame(animationId);
}, [isPlaying, bpm, totalBeats]);
```

**Play/Pause logica**:
```typescript
const handlePlayPause = () => {
  if (isPlaying) {
    audioService.pause();
    setIsPlaying(false);
  } else {
    audioService.play();
    setIsPlaying(true);
  }
};

const handleStop = () => {
  audioService.stop();
  setIsPlaying(false);
  setCurrentBeat(0);
};
```

**Geschatte regels**: ~80-100 regels wijziging/toevoeging

---

## UI Design Details

### Modal styling
```typescript
// Fullscreen met padding
<div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 sm:p-6 md:p-8 z-50">
  <div className="bg-bg-surface rounded-2xl shadow-xl w-full h-full max-h-full flex flex-col overflow-hidden">
    ...
  </div>
</div>
```

### Header sectie
```typescript
<div className="p-4 sm:p-6 border-b border-border-subtle">
  {/* Close button absolute positioned */}
  <button className="absolute top-4 right-4 ...">
    <X />
  </button>

  {/* Composition info */}
  <h2 className="text-xl font-bold">{composition_name}</h2>
  <p className="text-text-muted">
    Door: {student_name} • {formatted_date}
  </p>
  <p className="text-sm text-text-muted">
    {trackCount} Tracks • {clipCount} Clips • {sampleCount} Samples
  </p>
</div>
```

### Timeline sectie
```typescript
<div className="flex-1 overflow-hidden p-4 sm:p-6">
  <Timeline
    tracks={tracks}
    bpm={bpm}
    totalBeats={totalBeats}
    currentBeat={currentBeat}
    isPlaying={isPlaying}
    onRemoveClip={() => {}} // No-op, wordt niet aangeroepen door readOnly
    snapPreview={null}
    readOnly={true}
  />
</div>
```

### Transport controls
```typescript
<div className="p-4 sm:p-6 border-t border-border-subtle flex justify-center gap-4">
  {/* Play/Pause - grote gele cirkel */}
  <button
    onClick={handlePlayPause}
    className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center shadow-lg"
  >
    {isPlaying ? <Pause /> : <Play />}
  </button>

  {/* Stop - grote gele cirkel */}
  <button
    onClick={handleStop}
    className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center shadow-lg"
  >
    <Square />
  </button>
</div>
```

---

## Implementatie volgorde

1. **Clip.tsx** - Voeg readOnly prop toe
2. **Track.tsx** - Voeg readOnly prop toe
3. **Timeline.tsx** - Voeg readOnly prop toe
4. **SubmissionPlayer.tsx** - Refactor naar nieuwe layout
5. **Testen** - Build + visuele verificatie

---

## Risico's en aandachtspunten

| Risico | Mitigatie |
|--------|-----------|
| DnD hooks kunnen errors geven bij disabled state | Test grondig met readOnly=true |
| Timeline scrollt niet goed in nieuwe container | Zorg dat flex-1 en overflow correct zijn |
| Playhead sync loopt achter | RAF loop moet snel genoeg zijn |
| Mobile layout te krap | Responsive padding en font sizes |

---

## Niet in scope (geparkeerd voor later)

- Feedback functionaliteit
- Terugsturen naar leerling
- Bewerken van leerling compositie
- Exporteren/downloaden

---

## Geschatte tijd

- Clip.tsx: 5 min
- Track.tsx: 5 min
- Timeline.tsx: 5 min
- SubmissionPlayer.tsx: 30-45 min
- Testen & fixes: 15 min

**Totaal: ~60-75 minuten**
