# Roadmap: Drag Offset Alignment (#16)

**Status:** ✅ Voltooid
**Startdatum:** 2026-02-04
**Doel:** Intuïtieve drag-and-drop met één visueel element

---

## Probleemanalyse

### Oorspronkelijk probleem
Bij het slepen van een sample/clip naar de timeline waren er meerdere visuele elementen zichtbaar:
1. **Originele clip** (met opacity-30 en transform)
2. **DragOverlay** (volgt cursor op grip-punt)
3. **Snap Preview** (gestippeld, toont daadwerkelijke drop positie)

Dit veroorzaakte verwarring bij leerlingen.

### Extra probleem (na eerste fix)
Als je een clip in het midden aanklikt, sprong de snap preview naar de cursor positie i.p.v. de originele positie van de clip.

---

## Implementatie - Deel 1: Eén visueel element

### Wijzigingen StudioView.tsx
```typescript
// DragOverlay toont null wanneer snapPreview bestaat
<DragOverlay>
  {activeDragSample && !snapPreview ? (...) : null}
</DragOverlay>
```

### Wijzigingen Clip.tsx
```typescript
// Originele clip volledig verborgen tijdens slepen
${isDragging ? 'opacity-0' : ''}
```

---

## Implementatie - Deel 2: Delta-based clip repositioning

### Nieuwe refs in useStudioDnD.ts
```typescript
const originalClipStartBeatRef = useRef<number | null>(null);
const activeDragTypeRef = useRef<'sample' | 'clip' | null>(null);
```

### Nieuwe functie: calculateClipDropBeat
```typescript
const calculateClipDropBeat = useCallback(
  (over, delta) => {
    const originalBeat = originalClipStartBeatRef.current;
    // Convert delta pixels to delta beats
    const deltaBeats = (delta.x / clipAreaWidth) * totalBeats;
    return originalBeat + deltaBeats;
  },
  [totalBeats]
);
```

### Logica in handleDragMove en handleDragEnd
```typescript
const beat =
  activeDragTypeRef.current === 'clip'
    ? calculateClipDropBeat(over, delta)    // Delta-based voor clips
    : calculateDropBeat(over, activatorEvent, delta);  // Cursor-based voor samples
```

---

## Resultaat

| Scenario | Gedrag |
|----------|--------|
| Sample uit library slepen | Cursor = linkerrand snap preview |
| Clip verplaatsen | Originele positie + delta = snap preview |
| Boven track | Alleen snap preview zichtbaar |
| Niet boven track | Alleen DragOverlay zichtbaar |

---

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useStudioDnD.ts` | Nieuwe refs, calculateClipDropBeat, delta-based logica |
| `src/components/studio/StudioView.tsx` | DragOverlay verbergen bij snapPreview |
| `src/components/studio/Clip.tsx` | opacity-0 bij isDragging |

---

## Logboek

### 2026-02-04 - Eerste poging (MISLUKT)
- `snapToLeftEdge` modifier geïmplementeerd
- Resultaat: 3 visuele elementen zichtbaar

### 2026-02-04 - Fix deel 1
- DragOverlay verbergen wanneer snap preview actief
- Originele clip opacity-0 tijdens slepen
- Resultaat: Eén visueel element ✅

### 2026-02-04 - Fix deel 2
- Delta-based berekening voor clip repositioning
- Snap preview blijft op originele positie + delta
- Build succesvol ✅
