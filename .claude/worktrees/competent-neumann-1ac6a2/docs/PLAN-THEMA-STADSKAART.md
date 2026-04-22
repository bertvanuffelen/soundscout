# Plan: Thema Systeem + Stadskaart

**Status**: 📋 Wacht op akkoord
**Datum**: 2025-02-01

---

## 1. Overzicht

Dit plan beschrijft de implementatie van:
1. **Thema systeem** - Meerdere thema's met eigen locaties/samples, selecteerbaar via URL
2. **Stadskaart** - Visueel map scherm met locatie posities

---

## 2. Bestandsstructuur

### 2.1 Thema's

```
src/data/themes/
├── index.ts                    # Theme registry, loader, URL param handler
├── types.ts                    # ThemeConfig interface
│
├── basis/                      # Default thema (publiek)
│   ├── index.ts                # Export theme config
│   ├── locations.ts            # Park + toekomstige locaties
│   ├── samples.ts              # Alle samples voor dit thema
│   └── map.ts                  # Kaart configuratie (posities)
│
└── test-metro/                 # Test thema (alleen via URL)
    ├── index.ts
    ├── locations.ts
    ├── samples.ts
    └── map.ts
```

### 2.2 Audio Bestanden

```
public/audio/
├── themes/
│   ├── basis/
│   │   ├── park/
│   │   │   ├── ambient.mp3
│   │   │   ├── birds.mp3
│   │   │   ├── fountain.mp3
│   │   │   └── ...
│   │   └── metro/              # Toekomstig
│   │       ├── ambient.mp3
│   │       └── ...
│   │
│   └── test-metro/             # Test thema
│       └── metro/
│           └── ...
```

**Migratie nodig:**
- Verplaats `public/audio/locations/park/` → `public/audio/themes/basis/park/`
- Update alle audioUrl referenties

### 2.3 Afbeeldingen

```
public/images/
├── themes/
│   ├── basis/
│   │   ├── map-background.png  # Stadskaart achtergrond
│   │   ├── park.png            # Locatie achtergrond
│   │   ├── park-icon.png       # Icoon voor op kaart
│   │   └── metro/              # Toekomstig
│   │
│   └── test-metro/
│       └── ...
```

**Migratie nodig:**
- Verplaats `public/images/locations/` → `public/images/themes/basis/`

---

## 3. Types

### 3.1 ThemeConfig

```typescript
// src/data/themes/types.ts

export interface ThemeConfig {
  /** Unieke identifier, gebruikt in URL */
  id: string;

  /** Display naam (i18n key) */
  name: string;

  /** Beschrijving (i18n key) */
  description: string;

  /**
   * Is dit thema zichtbaar voor gebruikers?
   * false = alleen toegankelijk via ?theme=xxx
   */
  isPublic: boolean;

  /** Alle locaties in dit thema */
  locations: Location[];

  /** Alle samples in dit thema */
  samples: Sample[];

  /** Kaart configuratie */
  map: MapConfig;

  /** Optionele kleur overrides */
  colors?: ThemeColors;
}

export interface MapConfig {
  /** Achtergrond afbeelding voor de kaart */
  backgroundImage: string;

  /** Posities van locaties op de kaart */
  locationPositions: LocationPosition[];
}

export interface LocationPosition {
  /** Location ID */
  locationId: string;

  /** X positie als percentage (0-100) */
  x: number;

  /** Y positie als percentage (0-100) */
  y: number;

  /** Optioneel: custom icoon voor op kaart */
  iconUrl?: string;

  /** Grootte van het icoon (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
}

export interface ThemeColors {
  primary?: string;
  accent?: string;
  mapBackground?: string;
}
```

### 3.2 Theme Registry

```typescript
// src/data/themes/index.ts

import { basisTheme } from './basis';
import { testMetroTheme } from './test-metro';
import type { ThemeConfig } from './types';

/** Alle beschikbare thema's */
const themes: Record<string, ThemeConfig> = {
  'basis': basisTheme,
  'test-metro': testMetroTheme,
};

/** Default thema ID */
export const DEFAULT_THEME_ID = 'basis';

/** Haal thema op basis van ID */
export function getTheme(id: string): ThemeConfig | undefined {
  return themes[id];
}

/** Haal thema ID uit URL parameter */
export function getThemeIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const themeId = params.get('theme');

  if (themeId && themes[themeId]) {
    return themeId;
  }

  return DEFAULT_THEME_ID;
}

/** Alle publieke thema's (voor dropdown later) */
export function getPublicThemes(): ThemeConfig[] {
  return Object.values(themes).filter(t => t.isPublic);
}
```

---

## 4. Stores

### 4.1 useThemeStore

```typescript
// src/stores/themeStore.ts

interface ThemeStore {
  /** Actieve thema ID */
  activeThemeId: string;

  /** Geladen thema config */
  theme: ThemeConfig | null;

  /** Initialiseer thema (lees URL param) */
  initTheme: () => void;

  /** Wissel naar ander thema */
  setTheme: (id: string) => void;

  // Helpers
  getLocations: () => Location[];
  getSamples: () => Sample[];
  getLocationById: (id: string) => Location | undefined;
  getSampleById: (id: string) => Sample | undefined;
  getMapConfig: () => MapConfig | undefined;
}
```

### 4.2 Aanpassing bestaande code

Huidige code gebruikt:
- `import { locations } from '../data/locations'`
- `import { samples } from '../data/samples'`

Na refactor:
- `const locations = useThemeStore(s => s.getLocations())`
- Of: centrale `useThemeData()` hook

---

## 5. Componenten

### 5.1 MapView (nieuw)

```typescript
// src/components/map/MapView.tsx

/**
 * Visuele stadskaart met locatie iconen.
 *
 * Features:
 * - Achtergrond afbeelding van de stad
 * - Klikbare locatie iconen op vaste posities
 * - Visuele indicatie van voortgang (verzamelde samples)
 * - Animatie bij hover
 */
```

**UI Elementen:**
- Volledige scherm achtergrond (kaart)
- Per locatie: icoon op x,y positie
- Badge met aantal verzamelde samples
- Terug naar Start knop
- Thema naam (optioneel, voor debug)

### 5.2 LocationMarker (nieuw)

```typescript
// src/components/map/LocationMarker.tsx

/**
 * Klikbaar locatie icoon op de kaart.
 *
 * Props:
 * - position: { x, y }
 * - location: Location
 * - collectedCount: number
 * - totalCount: number
 * - onClick: () => void
 */
```

---

## 6. Flow Aanpassingen

### 6.1 Nieuwe navigatie

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌───────┐
│  START  │ ──► │   MAP   │ ──► │ LOCATION │ ──► │ STUDIO │ ──► │ CLUB  │
└─────────┘     └─────────┘     └──────────┘     └────────┘     └───────┘
                    │                 │               │
                    │                 │               │
                    ◄─────────────────┘               │
                    │         (terug naar kaart)      │
                    │                                 │
                    ◄─────────────────────────────────┘
                              (terug naar kaart)
```

### 6.2 App.tsx wijzigingen

```typescript
// Nieuwe case toevoegen
case 'map':
  return <MapView />;
```

### 6.3 StartScreen wijzigingen

```typescript
// "Start" knop gaat nu naar Map, niet direct naar Location
const handleStartGame = () => {
  themeStore.initTheme(); // Lees URL param
  goToMap(); // Nieuwe actie
};
```

### 6.4 appStore wijzigingen

```typescript
// Nieuwe actie
goToMap: () => set({ currentScreen: 'map', currentLocationId: null }),
```

---

## 7. Migratie Stappen

### Stap 1: Types toevoegen
- [ ] `src/data/themes/types.ts` aanmaken

### Stap 2: Thema structuur
- [ ] `src/data/themes/index.ts` aanmaken
- [ ] `src/data/themes/basis/` map aanmaken
- [ ] Bestaande `locations.ts` verplaatsen naar `themes/basis/locations.ts`
- [ ] Bestaande `samples.ts` verplaatsen naar `themes/basis/samples.ts`
- [ ] `themes/basis/map.ts` aanmaken met posities
- [ ] `themes/basis/index.ts` aanmaken

### Stap 3: Assets verplaatsen
- [ ] `public/audio/locations/` → `public/audio/themes/basis/`
- [ ] `public/images/locations/` → `public/images/themes/basis/`
- [ ] Alle URL referenties updaten

### Stap 4: Store aanmaken
- [ ] `src/stores/themeStore.ts` aanmaken
- [ ] URL parameter logica implementeren

### Stap 5: Componenten updaten
- [ ] `App.tsx` - case 'map' toevoegen
- [ ] `StartScreen.tsx` - naar Map navigeren
- [ ] `appStore.ts` - goToMap actie
- [ ] Alle plekken die `locations`/`samples` importeren updaten

### Stap 6: MapView bouwen
- [ ] `src/components/map/MapView.tsx`
- [ ] `src/components/map/LocationMarker.tsx`
- [ ] Styling en layout

### Stap 7: Test thema
- [ ] `src/data/themes/test-metro/` aanmaken
- [ ] Placeholder data (kan zonder echte audio)

### Stap 8: Testen
- [ ] Default thema laden zonder URL param
- [ ] Test thema laden met `?theme=test-metro`
- [ ] Navigatie: Start → Map → Location → Studio → Club → Map
- [ ] Samples correct verzamelen over locaties
- [ ] TypeScript check
- [ ] Bestaande tests

---

## 8. Risico's & Aandachtspunten

### 8.1 Breaking Changes
- Alle imports van `data/locations` en `data/samples` moeten aangepast
- Audio/image URLs veranderen

### 8.2 Backwards Compatibility
- Oude URL `/audio/locations/...` werkt niet meer
- Oplossing: redirect of oude paden behouden als alias

### 8.3 Performance
- Thema config moet vroeg laden (voor eerste render)
- Assets lazy loaden per locatie

---

## 9. Buiten Scope (Later)

- Thema dropdown in UI (pas als we meerdere publieke thema's hebben)
- Thema kleuren (CSS variables override)
- Animaties op de kaart
- Ambient audio op de kaart

---

## 10. Akkoord Vereist

Bevestig of je akkoord bent met:

1. ✅/❌ Bestandsstructuur (themes/basis/, themes/test-metro/)
2. ✅/❌ Asset verplaatsing (audio/images naar themes/)
3. ✅/❌ Types (ThemeConfig, MapConfig, LocationPosition)
4. ✅/❌ Nieuwe store (useThemeStore)
5. ✅/❌ Flow (Start → Map → Location → ...)
6. ✅/❌ Migratie stappen

**Na akkoord start ik met implementatie.**
