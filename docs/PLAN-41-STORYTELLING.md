# Plan #41 — Soundscape Storytelling

> Implementatieplan voor het toevoegen van voorgebouwde storyboards aan SoundScout.
> Gebruikers componeren een soundscape bij één afbeelding of bij een storyboard (reeks afbeeldingen in vaste volgorde).

---

## 1. Overzicht

### Wat het is
Kinderen kiezen bij het starten van een nieuwe compositie een compositie-modus:
- **Vrij componeren** — huidige ervaring, geen afbeeldingen
- **Bij één afbeelding** — kies een afbeelding uit het thema, maak een soundscape erbij
- **Bij storyboard** — kies een reeks afbeeldingen (vaste volgorde), elke afbeelding = een sectie

### Kernprincipes
- **Afbeeldingen zijn voorgebouwd** (net als samples/locaties) — geen gebruikers-upload
- **"Veilige modus"** — alle nieuwe code achter `if (activeStoryboard)` checks, bestaande flow ongewijzigd
- **Storyboards zijn per thema** — "Een dag in de stad" hoort bij thema "basis"
- **Nieuwe componenten** in `src/components/studio/storytelling/` — isolatie van bestaande code

### Niet in scope (aparte issues)
- #47 — Sectie ↔ storyboard-afbeelding koppeling (gebruiker bepaalt slide-lengte)
- #48 — Video-storyboard (video i.p.v. stilstaande afbeeldingen)
- Gebruikers-upload van eigen afbeeldingen
- Supabase Storage voor afbeeldingen

---

## 2. Gebruikersflow

```
Startscherm
    │
    ▼
Thema selectie (bestaand)
    │
    ▼
┌─────────────────────────────────────────────┐
│  NIEUW: Compositie-modus tussenscherm       │
│                                             │
│  ┌───────┐  ┌───────────┐  ┌────────────┐  │
│  │  Vrij │  │ Afbeelding│  │ Storyboard │  │
│  │       │  │           │  │            │  │
│  │ 🎵    │  │ 🖼️        │  │ 🎬         │  │
│  └───────┘  └───────────┘  └────────────┘  │
│                                             │
│  Bij "Afbeelding": picker met beschikbare   │
│  afbeeldingen uit dit thema                 │
│  Bij "Storyboard": picker met beschikbare   │
│  storyboards uit dit thema                  │
└─────────────────────────────────────────────┘
    │
    ▼
Kaart → Locatie → Geluiden verzamelen (ongewijzigd)
    │
    ▼
┌─────────────────────────────────────────────┐
│  Studio (met storytelling-aanpassingen)      │
│                                             │
│  Toggle: [Alleen library] | [Split] | [Beeld]│
│                                             │
│  Desktop split-view:                        │
│  ┌──────────────┬──────────────┐            │
│  │   Library    │  Afbeelding  │            │
│  │  (samples)   │  ◀ ochtend ▶ │            │
│  └──────────────┴──────────────┘            │
│                                             │
│  Mobile: tabs [Geluiden] [Beeld]            │
│                                             │
│  Tijdlijn: secties automatisch aangemaakt   │
│  bij storyboard (1 per afbeelding)          │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  Podium (met storytelling-aanpassingen)      │
│                                             │
│  ┌─────────────────────────────┐            │
│  │                             │            │
│  │     Grote afbeelding        │            │
│  │     (synchroon met          │            │
│  │      playhead + secties)    │            │
│  │                             │            │
│  └─────────────────────────────┘            │
│  [▶ Play] [⟲ Opnieuw]                      │
│  [Opslaan] [Delen] [Export]                 │
└─────────────────────────────────────────────┘
```

---

## 3. Data-architectuur

### 3.1 Nieuwe types (`src/types/index.ts`)

```typescript
// Een enkele afbeelding in een storyboard
export interface StoryboardImage {
  id: string;            // uniek binnen storyboard
  url: string;           // pad naar /public/images/themes/{themeId}/storyboards/
  label: string;         // i18n key (bijv. 'storyboards.stad-dag.ochtend')
}

// Een storyboard: reeks afbeeldingen of enkele afbeelding
export interface Storyboard {
  id: string;            // uniek binnen thema (bijv. 'stad-dag')
  themeId: string;       // gekoppeld aan thema
  name: string;          // i18n key
  description: string;   // i18n key
  coverImage: string;    // thumbnail voor selectiescherm
  images: StoryboardImage[];  // vaste volgorde, 1 = enkele afbeelding, 2+ = slideshow
}
```

### 3.2 Compositie-modus (`src/types/index.ts`)

```typescript
// Modus die de gebruiker kiest na thema-selectie
export type ComposeMode = 'free' | 'image' | 'storyboard';
```

### 3.3 Thema-uitbreiding (`src/data/themes/types.ts`)

```typescript
export interface ThemeConfig {
  // ... bestaande velden ...
  storyboards?: Storyboard[];  // optioneel — thema's zonder storyboards werken gewoon
}
```

### 3.4 Storyboard data per thema

```
src/data/themes/basis/storyboards.ts     ← storyboard definities
public/images/themes/basis/storyboards/  ← afbeeldingen

Voorbeeld:
export const storyboards: Storyboard[] = [
  {
    id: 'stad-dag',
    themeId: 'basis',
    name: 'storyboards.basis.stad-dag.name',
    description: 'storyboards.basis.stad-dag.description',
    coverImage: '/images/themes/basis/storyboards/stad-dag-cover.jpg',
    images: [
      { id: 'ochtend', url: '/images/themes/basis/storyboards/stad-dag-ochtend.jpg', label: 'storyboards.basis.stad-dag.ochtend' },
      { id: 'middag',  url: '/images/themes/basis/storyboards/stad-dag-middag.jpg',  label: 'storyboards.basis.stad-dag.middag' },
      { id: 'avond',   url: '/images/themes/basis/storyboards/stad-dag-avond.jpg',   label: 'storyboards.basis.stad-dag.avond' },
    ],
  },
  {
    id: 'stad-markt',
    themeId: 'basis',
    name: 'storyboards.basis.stad-markt.name',
    description: 'storyboards.basis.stad-markt.description',
    coverImage: '/images/themes/basis/storyboards/stad-markt-cover.jpg',
    images: [
      { id: 'markt', url: '/images/themes/basis/storyboards/stad-markt.jpg', label: 'storyboards.basis.stad-markt.markt' },
    ],
  },
];
```

### 3.5 Persistence — storyboardId meenemen

Alle plekken waar compositie-data wordt opgeslagen/gedeeld moeten `storyboardId` bevatten:

| Locatie | Veld | Hoe |
|---------|------|-----|
| `SavedComposition` | `storyboardId?: string` | Opslaan in localStorage |
| `CompositionData` | `storyboardId?: string` | Meegeven bij delen/templates |
| `SharedComposition` | via `CompositionData` | Supabase JSONB |
| Zod schema's | `storyboardId: z.string().optional()` | Validatie |

De afbeeldingen zelf worden NIET opgeslagen — alleen de `storyboardId`. Bij het openen wordt het storyboard opnieuw geladen uit de thema-data.

### 3.6 Store-uitbreiding (`src/stores/appStore.ts`)

```typescript
interface AppStore {
  // ... bestaand ...

  // Storytelling (#41)
  composeMode: ComposeMode;           // 'free' | 'image' | 'storyboard'
  activeStoryboard: Storyboard | null;
  currentImageIndex: number;          // welke afbeelding actief is (0-based)

  setComposeMode: (mode: ComposeMode) => void;
  setActiveStoryboard: (sb: Storyboard | null) => void;
  setCurrentImageIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  clearStoryboard: () => void;
}
```

---

## 4. Nieuwe componenten

### 4.1 Compositie-modus selectie

```
src/components/start/ComposeModeScreen.tsx
```

Tussenscherm na thema-selectie. Drie kaarten:
- **Vrij componeren**: icoon + korte beschrijving → `goToMap()`
- **Bij afbeelding**: icoon + beschrijving → opent image picker → `goToMap()`
- **Bij storyboard**: icoon + beschrijving → opent storyboard picker → `goToMap()`

Als het thema geen storyboards heeft, wordt alleen "Vrij componeren" getoond en wordt dit scherm overgeslagen.

```
src/components/start/StoryboardPicker.tsx
```

Grid/lijst met beschikbare storyboards voor het actieve thema. Elke kaart toont:
- Cover image (thumbnail)
- Naam + beschrijving
- Aantal afbeeldingen (bijv. "3 delen")

### 4.2 Studio storytelling panel

```
src/components/studio/storytelling/StorytellingPanel.tsx
```

Het afbeeldingen-paneel in de studio. Toont:
- Huidige afbeelding (groot, zo groot mogelijk binnen beschikbare ruimte)
- Label van de afbeelding
- Pijltjes links/rechts om te navigeren (bij storyboard)
- Indicator: "2 van 3" (bij storyboard)
- Geen pijltjes bij enkele afbeelding

```
src/components/studio/storytelling/StorytellingToggle.tsx
```

Toggle-knop in de studio om te schakelen tussen drie standen:
- Alleen library (huidige ervaring)
- Library + afbeelding (split-view)
- Alleen afbeelding (library verborgen)

Mogelijke implementatie: segmented control of icon-toggle balk.

### 4.3 Podium storytelling weergave

```
src/components/stage/StorytellingDisplay.tsx
```

Grote afbeelding-weergave op het podium. Toont:
- Huidige afbeelding (neemt grote ruimte in)
- Label als overlay
- Fade-transitie bij sectie-wissel (CSS transition)
- Synchroon met playhead: bepaalt welke afbeelding actief is op basis van `currentBeat` en `sections`

---

## 5. Bestaande bestanden die wijzigen

### 5.1 Types en schemas

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | + `Storyboard`, `StoryboardImage`, `ComposeMode` types |
| `src/data/themes/types.ts` | + `storyboards?: Storyboard[]` in `ThemeConfig` |
| `src/utils/schemas.ts` | + `storyboardId: z.string().optional()` in relevante schema's |

### 5.2 Stores

| Bestand | Wijziging |
|---------|-----------|
| `src/stores/appStore.ts` | + `composeMode`, `activeStoryboard`, `currentImageIndex`, + acties |

### 5.3 Navigatie en initialisatie

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | + `'compose-mode'` aan `GameScreen` union type |
| `src/App.tsx` | + case `'compose-mode'` in screen switch, lazy import |
| `src/utils/compositionInit.ts` | Na thema-selectie → `goToComposeMode()` i.p.v. `goToMap()` (tenzij thema geen storyboards heeft) |

### 5.4 Studio layout

| Bestand | Wijziging |
|---------|-----------|
| `src/components/studio/StudioView.tsx` | Conditionally render split-view: als `activeStoryboard`, toon toggle + StorytellingPanel naast/boven SampleLibrary |

Layout-wijziging in StudioView (conceptueel):

```
// Huidige situatie (vrij componeren):
<DndContext>
  <SampleLibrary />    ← flex-1
  <Timeline />         ← shrink-0, max-h-[50dvh]
</DndContext>

// Met storytelling (split-view, desktop):
<DndContext>
  <div className="flex-1 flex min-h-0">           ← nieuw: horizontale split
    <SampleLibrary className="flex-1 min-w-0" />  ← helft links
    <StorytellingPanel className="flex-1 min-w-0" /> ← helft rechts
  </div>
  <Timeline />
</DndContext>

// Met storytelling (alleen beeld):
<DndContext>
  <StorytellingPanel className="flex-1" />  ← volle breedte
  <Timeline />
</DndContext>

// Mobile (< 640px): tabs
<DndContext>
  <div className="flex-1 flex flex-col min-h-0">
    <TabBar tabs={['Geluiden', 'Beeld']} />
    {activeTab === 'sounds' ? <SampleLibrary /> : <StorytellingPanel />}
  </div>
  <Timeline />
</DndContext>
```

### 5.5 Podium

| Bestand | Wijziging |
|---------|-----------|
| `src/components/stage/StageView.tsx` | Als `activeStoryboard`, toon `StorytellingDisplay` boven playback controls |

### 5.6 Thema-data

| Bestand | Wijziging |
|---------|-----------|
| `src/data/themes/basis/index.ts` | + `storyboards` import en toevoegen aan `basisTheme` |
| `src/data/themes/basis/storyboards.ts` | **NIEUW** — storyboard definities |
| `src/data/themes/winterspelen/index.ts` | + `storyboards` (optioneel, kan later) |

### 5.7 Persistence

| Bestand | Wijziging |
|---------|-----------|
| `src/services/StorageService.ts` | + `storyboardId` meenemen bij save/update |
| `src/hooks/useStageSave.ts` | + `storyboardId` uit appStore toevoegen aan save-data |

### 5.8 i18n

| Bestand | Wijziging |
|---------|-----------|
| `src/i18n/locales/nl.json` | + `storyboards.*`, `composeMode.*` keys |
| `src/i18n/locales/en.json` | + `storyboards.*`, `composeMode.*` keys |

---

## 6. Automatische sectie-aanmaak bij storyboard

Wanneer een storyboard met N afbeeldingen wordt geactiveerd:
1. `timelineStore.clearSections()` — verwijder bestaande secties
2. Loop door `storyboard.images` (behalve de laatste):
   - `addSection(endBeat)` op gelijke intervallen
   - Bijv. 3 afbeeldingen, 32 beats → secties op beat 11, 22 (derde sectie loopt tot einde)
3. Labels instellen op afbeelding-labels
4. Kleuren toewijzen uit `SECTION_COLORS` palette

Dit gebeurt in `compositionInit.ts` of een nieuwe `storyboardInit.ts` utility.

---

## 7. Podium — afbeelding synchroon met playback

De `StorytellingDisplay` component bepaalt welke afbeelding actief is:

```typescript
function getActiveImageIndex(currentBeat: number, sections: Section[], imageCount: number): number {
  if (imageCount <= 1) return 0;

  // Bepaal in welke sectie de playhead zich bevindt
  let sectionIndex = 0;
  for (let i = 0; i < sections.length; i++) {
    if (currentBeat < sections[i].endBeat) {
      sectionIndex = i;
      break;
    }
    sectionIndex = i + 1;
  }

  return Math.min(sectionIndex, imageCount - 1);
}
```

**Belangrijk**: `currentBeat` NIET als useCallback-dependency gebruiken (re-render storm).
Gebruik `useAudioStore.getState().currentBeat` imperatively, of een subscription met requestAnimationFrame.

---

## 8. Fasering

### Fase A — Fundament (dag 1-2)
1. Types toevoegen (`Storyboard`, `StoryboardImage`, `ComposeMode`)
2. `ThemeConfig` uitbreiden met `storyboards?`
3. Schema's updaten (Zod)
4. `appStore` uitbreiden met storytelling state
5. Eerste storyboard data aanmaken voor thema "basis" (placeholder afbeeldingen)
6. `GameScreen` uitbreiden met `'compose-mode'`
7. `ComposeModeScreen` component bouwen
8. Navigatie-flow aanpassen: thema → compose-mode → kaart

**Testbaar na Fase A**: Gebruiker kan via tussenscherm een modus kiezen. Bij "vrij" gaat flow normaal door. Bij storyboard wordt state ingesteld maar nog geen visuele weergave.

### Fase B — Studio split-view (dag 2-3)
1. `StorytellingPanel` component bouwen
2. `StorytellingToggle` component bouwen
3. `StudioView` aanpassen voor split-view (conditionally)
4. Mobile tabs implementeren
5. Pijltjes navigatie (links/rechts) in panel
6. Automatische sectie-aanmaak bij storyboard activatie

**Testbaar na Fase B**: Gebruiker ziet afbeeldingen in de studio, kan navigeren, secties worden aangemaakt.

### Fase C — Podium weergave (dag 3-4)
1. `StorytellingDisplay` component bouwen
2. `StageView` aanpassen voor afbeelding-weergave
3. Synchroon met playhead (welke afbeelding is actief?)
4. Fade-transitie bij sectie-wissel

**Testbaar na Fase C**: Volledige flow werkt — van keuze tot performance met afbeeldingen.

### Fase D — Persistence en afronding (dag 4-5)
1. `storyboardId` toevoegen aan `SavedComposition` + `CompositionData`
2. Schema's + StorageService updaten
3. Save/Share/Template flows updaten
4. Docent template-integratie (docent kan storyboard meegeven)
5. i18n compleet (NL + EN)
6. Build + tests + handmatig testen volledige flow
7. Edge cases: thema zonder storyboards, storyboard met 1 afbeelding, resize, etc.

**Testbaar na Fase D**: Alles werkt inclusief opslaan, delen, en docent-templates met storyboard.

---

## 9. Risico's en mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Split-view breekt responsive layout | Hoog | Mobile tabs als alternatief, uitgebreid testen op 640px breakpoint |
| DnD context conflict met split-view | Medium | DndContext wrapping ongewijzigd, alleen interne layout verandert |
| Performance bij grote afbeeldingen | Laag | Afbeeldingen zijn voorgebouwd, kunnen geoptimaliseerd worden |
| Sectie-aanmaak conflicteert met templates | Medium | Template-secties hebben voorrang, storyboard-secties alleen bij vrije compositie |
| Scope creep | Hoog | Strikte fasering, #47 en #48 zijn aparte issues |

---

## 10. Bestanden overzicht

### Nieuwe bestanden
```
src/components/start/ComposeModeScreen.tsx        ← modus-keuze tussenscherm
src/components/start/StoryboardPicker.tsx          ← storyboard selectie grid
src/components/studio/storytelling/StorytellingPanel.tsx  ← afbeelding-paneel
src/components/studio/storytelling/StorytellingToggle.tsx ← toggle 3 standen
src/components/stage/StorytellingDisplay.tsx        ← podium afbeelding
src/data/themes/basis/storyboards.ts               ← storyboard data
public/images/themes/basis/storyboards/            ← afbeeldingen (door gebruiker aangeleverd)
```

### Gewijzigde bestanden
```
src/types/index.ts                    ← nieuwe types + GameScreen uitbreiding
src/data/themes/types.ts              ← ThemeConfig.storyboards
src/data/themes/basis/index.ts        ← storyboards importeren
src/stores/appStore.ts                ← storytelling state
src/utils/schemas.ts                  ← Zod schema updates
src/utils/compositionInit.ts          ← navigatie naar compose-mode
src/App.tsx                           ← nieuwe screen case
src/components/studio/StudioView.tsx  ← split-view layout
src/components/stage/StageView.tsx    ← afbeelding op podium
src/services/StorageService.ts        ← storyboardId persistence
src/hooks/useStageSave.ts            ← storyboardId bij opslaan
src/i18n/locales/nl.json             ← nieuwe vertalingen
src/i18n/locales/en.json             ← nieuwe vertalingen
```

---

## 11. Voortgang

| Fase | Status | Datum |
|------|--------|-------|
| Ontwerp & plan | ✅ Afgerond | 2026-03-11 |
| Fase A — Fundament | ⬜ Niet begonnen | |
| Fase B — Studio split-view | ⬜ Niet begonnen | |
| Fase C — Podium weergave | ⬜ Niet begonnen | |
| Fase D — Persistence & afronding | ⬜ Niet begonnen | |
