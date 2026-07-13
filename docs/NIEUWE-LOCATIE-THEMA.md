# Nieuwe Locatie of Thema Toevoegen

> **⚡ Sinds week 4 van het masterplan is er een begeleide route:** open `/editor`
> (dev-server) → tab **Thema-wizard**. Die leidt je van thema-idee → AI-prompts
> (afbeeldingen + geluid-zoekpakketten) → kaartposities → validatie → complete
> code-export met een kant-en-klare Claude Code-opdracht. Hotspots plaats je
> daarna per locatie via de tab **Locatie-editor**. Thema's kunnen een
> seizoensvenster krijgen (`activeFrom`/`activeUntil`, 'MM-DD') zodat er 3-4
> thema's tegelijk actief staan die automatisch verschijnen/verdwijnen.
> De checklist hieronder blijft gelden als naslag voor de handmatige route.

## Checklist: Nieuwe Locatie (binnen bestaand thema)

### Stap 1: Assets voorbereiden
- [ ] Maak audio samples (MP3 format, ~10-30 sec loops)
- [ ] Maak achtergrond afbeelding (PNG, aanbevolen 1920x1080)
- [ ] Naamgeving: `{locatie}-{sample}.mp3` (bijv. `metro-train.mp3`)

### Stap 2: Bestanden plaatsen
```
public/
├── audio/themes/{thema}/{locatie}/
│   ├── {locatie}-sample1.mp3
│   ├── {locatie}-sample2.mp3
│   └── ...
└── images/themes/{thema}/
    └── {locatie}.png
```

### Stap 3: Locatie configureren
**Bestand:** `src/data/themes/{thema}/locations.ts`

```typescript
{
  id: '{locatie}',
  name: 'locations.{locatie}.name',
  description: 'locations.{locatie}.description',
  backgroundImage: '/images/themes/{thema}/{locatie}.png',
  ambientAudio: '', // optioneel: '/audio/themes/{thema}/{locatie}/ambient.mp3'
  hotspots: [
    { id: 'hs-{locatie}-1', sampleId: '{locatie}-sample1', x: 30, y: 50 },
    { id: 'hs-{locatie}-2', sampleId: '{locatie}-sample2', x: 60, y: 40 },
    // Voeg meer hotspots toe...
  ],
}
```

### Stap 4: Samples configureren
**Bestand:** `src/data/themes/{thema}/samples.ts`

```typescript
{
  id: '{locatie}-sample1',
  name: 'samples.{locatie}-sample1',
  locationId: '{locatie}',
  category: 'nature', // of: 'urban', 'people', 'animals', 'music', 'effects'
  audioUrl: '/audio/themes/{thema}/{locatie}/{locatie}-sample1.mp3',
  icon: 'music', // lucide icon naam
  color: '#22c55e', // hex kleur voor UI
},
```

### Stap 5: Kaartpositie toevoegen
**Bestand:** `src/data/themes/{thema}/map.ts`

```typescript
locationPositions: [
  // bestaande locaties...
  { locationId: '{locatie}', x: 25, y: 70, size: 'md' },
]
```

**Size opties:** `'sm'` | `'md'` | `'lg'`
**x/y:** Percentage positie (0-100)

### Stap 6: Vertalingen toevoegen
**Bestanden:** `src/i18n/locales/nl.json` en `en.json`

```json
"locations": {
  "{locatie}": {
    "name": "Locatie Naam",
    "description": "Beschrijving van de locatie"
  }
},
"samples": {
  "{locatie}-sample1": "Sample Naam",
  "{locatie}-sample2": "Sample Naam"
}
```

### Stap 7: Testen
- [ ] `npm run build` - geen TypeScript errors
- [ ] Locatie verschijnt op de kaart
- [ ] Klikken opent de locatie
- [ ] Hotspots zijn zichtbaar en klikbaar
- [ ] Audio speelt correct af
- [ ] Samples verschijnen in library na verzamelen

---

## Checklist: Nieuw Thema

### Stap 1: Thema structuur aanmaken
```
src/data/themes/{nieuw-thema}/
├── index.ts        # Exporteert het thema
├── locations.ts    # Alle locaties
├── samples.ts      # Alle samples
└── map.ts          # Kaart configuratie
```

### Stap 2: Assets mappen aanmaken
```
public/
├── audio/themes/{nieuw-thema}/
│   └── {locatie}/
│       └── *.mp3
└── images/themes/{nieuw-thema}/
    ├── map-background.png  # Stadskaart achtergrond
    └── {locatie}.png       # Per locatie
```

### Stap 3: Thema bestanden maken

**index.ts:**
```typescript
import type { ThemeConfig } from '../types';
import { locations } from './locations';
import { samples } from './samples';
import { mapConfig } from './map';

export const themeConfig: ThemeConfig = {
  id: '{nieuw-thema}',
  name: 'themes.{nieuw-thema}.name',
  description: 'themes.{nieuw-thema}.description',
  isPublic: false, // true = zichtbaar in dropdown, false = alleen via URL
  locations,
  samples,
  map: mapConfig,
};
```

**locations.ts:** (zie locatie checklist)

**samples.ts:** (zie locatie checklist)

**map.ts:**
```typescript
import type { MapConfig } from '../types';

export const mapConfig: MapConfig = {
  backgroundImage: '/images/themes/{nieuw-thema}/map-background.png',
  locationPositions: [
    { locationId: '{locatie1}', x: 50, y: 50, size: 'lg' },
    // meer locaties...
  ],
};
```

### Stap 4: Thema registreren
**Bestand:** `src/data/themes/index.ts`

```typescript
import { themeConfig as nieuwThemaConfig } from './{nieuw-thema}';

const themes: Record<string, ThemeConfig> = {
  basis: basisThemeConfig,
  '{nieuw-thema}': nieuwThemaConfig, // ← toevoegen
};
```

### Stap 5: Vertalingen toevoegen
```json
"themes": {
  "{nieuw-thema}": {
    "name": "Thema Naam",
    "description": "Beschrijving van het thema"
  }
}
```

### Stap 6: Testen
- [ ] `npm run build` - geen errors
- [ ] Thema laden via URL: `?theme={nieuw-thema}`
- [ ] Als `isPublic: true`: verschijnt in dropdown
- [ ] Alle locaties en samples werken

---

## Handige Tips

### Hotspot posities bepalen
1. Open de locatie achtergrond in een image editor
2. Noteer x/y als percentage van breedte/hoogte
3. Test en pas aan in de browser (DevTools)

### Sample categorieën
- `nature` - Natuurgeluiden (vogels, wind, water)
- `urban` - Stadsgeluiden (verkeer, bouw)
- `people` - Menselijke geluiden (praten, lachen)
- `animals` - Diergeluiden
- `music` - Muzikale elementen
- `effects` - Geluidseffecten

### Kleuren per categorie (suggestie)
- Nature: `#22c55e` (groen)
- Urban: `#6b7280` (grijs)
- People: `#f59e0b` (oranje)
- Animals: `#8b5cf6` (paars)
- Music: `#3b82f6` (blauw)
- Effects: `#ec4899` (roze)
