# Plan: Locatie Editor

**Status:** Planning
**Prioriteit:** P2
**Doel:** Visuele tool om hotspots te plaatsen voor nieuwe locaties

---

## Scope

### Wel
- Losse pagina via URL (`/editor`)
- Location metadata invoeren (id, name, description, backgroundImage)
- Afbeelding uploaden/weergeven met correcte aspect ratio
- Klikken om hotspots te plaatsen (x/y percentage)
- Sample ID invoeren per hotspot
- Hotspots verwijderen
- Bestaande locatie laden om te bewerken
- JSON exporteren (kopiëren + downloaden)

### Niet
- Sample metadata (duration, color, icon) → handmatig in apart document
- Ambient audio configuratie
- Preview/test modus
- Hotspots verslepen (delete + opnieuw is OK)
- Radius/visualHint aanpassen (standaard waarden)

---

## Technische Aanpak

### 1. Route
```
/editor                    → Nieuwe locatie
/editor?location=park      → Bestaande locatie laden
```

Implementatie via React Router of simpele URL param check in App.tsx.

### 2. Aspect Ratio
De LocationView gebruikt `aspect-ratio: 4/3` voor de afbeelding container.
Editor moet dezelfde ratio gebruiken zodat hotspot posities 1:1 matchen.

```tsx
<div className="aspect-[4/3] relative">
  <img src={backgroundImage} className="w-full h-full object-cover" />
  {/* Hotspots overlay */}
</div>
```

### 3. Hotspot Plaatsen
Bij klik op afbeelding:
1. Bereken x/y als percentage van container
2. Open modal voor sampleId invoer
3. Voeg hotspot toe aan state

```typescript
interface EditorHotspot {
  id: string;           // Auto-generated UUID
  sampleId: string;     // User input, e.g. "vogels"
  x: number;            // 0-100 percentage
  y: number;            // 0-100 percentage
}
```

### 4. State Management
Lokale React state (geen Zustand nodig):

```typescript
interface EditorState {
  locationId: string;
  locationName: string;        // i18n key stub
  locationDescription: string; // i18n key stub
  backgroundImage: string;     // Data URL of pad
  hotspots: EditorHotspot[];
}
```

### 5. Bestaande Locatie Laden
Bij `?location=park`:
1. Zoek locatie in huidige theme data
2. Populate form met bestaande waarden
3. Toon hotspots op afbeelding

### 6. JSON Export
Output format dat past bij bestaande structuur:

```json
{
  "location": {
    "id": "strand",
    "name": "locations.strand.name",
    "description": "locations.strand.description",
    "backgroundImage": "/images/themes/basis/strand.png",
    "ambientAudio": "",
    "hotspots": [
      {
        "id": "strand-golven",
        "x": 25.4,
        "y": 32.1,
        "radius": 8,
        "sampleId": "strand-golven",
        "visualHint": "pulse"
      }
    ],
    "unlocked": true
  },
  "i18n": {
    "nl": {
      "locations.strand.name": "Het Strand",
      "locations.strand.description": "Een zonnig strand vol zomerse geluiden"
    },
    "en": {
      "locations.strand.name": "The Beach",
      "locations.strand.description": "A sunny beach full of summer sounds"
    }
  },
  "sampleStubs": [
    {
      "id": "strand-golven",
      "name": "samples.strand-golven",
      "locationId": "strand",
      "audioUrl": "/audio/themes/basis/strand/golven.mp3",
      "duration": 0,
      "icon": "?",
      "color": "#000000"
    }
  ]
}
```

**Note:** `sampleStubs` bevat placeholders die handmatig aangevuld moeten worden (duration, icon, color).

---

## UI Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  🗺️ LOCATIE EDITOR                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Location ID    [strand__________]                              │
│  Naam (NL)      [Het Strand______]                              │
│  Naam (EN)      [The Beach_______]                              │
│  Beschrijving   [Een zonnig strand vol zomerse geluiden___]     │
│  Beschr. (EN)   [A sunny beach full of summer sounds_____]      │
│                                                                 │
│  Achtergrond    [📁 Kies bestand]  strand.png                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌───────────────────────────────────────────────┐            │
│    │                                               │            │
│    │                                               │            │
│    │         (Klik om hotspot te plaatsen)         │            │
│    │                                               │            │
│    │           ●[1]            ●[2]                │            │
│    │                                               │            │
│    │                    ●[3]                       │            │
│    │                                               │            │
│    └───────────────────────────────────────────────┘            │
│                      aspect-ratio: 4/3                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  HOTSPOTS (3)                                    [+ Handmatig]  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. strand-golven     x: 25.4%   y: 32.1%            [🗑️]  │ │
│  │ 2. strand-meeuwen    x: 68.2%   y: 18.5%            [🗑️]  │ │
│  │ 3. strand-kinderen   x: 45.0%   y: 72.3%            [🗑️]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [📋 Kopieer JSON]    [💾 Download JSON]    [🔄 Reset]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bestandsstructuur

```
src/
  pages/
    LocationEditor.tsx      # Hoofdcomponent
  components/
    editor/
      EditorCanvas.tsx      # Afbeelding + hotspot overlay
      HotspotList.tsx       # Lijst met hotspots
      HotspotModal.tsx      # Modal voor sampleId invoer
      JsonExport.tsx        # Export preview + buttons
```

---

## Implementatie Stappen

1. **Route setup** - URL param detectie in App.tsx
2. **Basis layout** - Form fields + canvas area
3. **Afbeelding upload** - FileReader + preview
4. **Hotspot plaatsen** - Click handler + modal
5. **Hotspot lijst** - Tabel met delete functie
6. **Bestaande locatie laden** - URL param + theme data lookup
7. **JSON export** - Generate + copy/download
8. **Styling** - Tailwind consistent met rest van app

---

## Defaults

| Property | Waarde |
|----------|--------|
| `radius` | 8 |
| `visualHint` | "pulse" |
| `unlocked` | true |
| `ambientAudio` | "" |

---

## Open Vragen

Geen - scope is helder.

---

## Geschatte Tijd

~3-4 uur implementatie
