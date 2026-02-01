# SoundScout Development Status

**Laatst bijgewerkt**: 2025-02-01

---

## Huidige Focus
🎯 **Fase 4/5 Architectuur Voorbereidingen**

---

## Voltooide Items ✅

### Architectuur Refactoring (Fase 1-7) - VOLTOOID
- [x] Constants file (`src/constants/audio.ts`)
- [x] AudioService singleton (`src/services/AudioService.ts`)
- [x] Store consolidatie (gameStore, timelineStore, audioStore, libraryStore)
- [x] Component splitting (StudioView, LocationScene)
- [x] Memoization van components
- [x] ErrorBoundary + logger
- [x] Vitest setup met 11 tests

### Styling & UI Architectuur - VOLTOOID
- [x] CSS Theme Foundation - design tokens in `index.css`
- [x] UI Component Library: Button, Card, Modal
- [x] `cn()` utility voor class merging (clsx + tailwind-merge)
- [x] ~18 buttons omgezet naar `<Button>` component
- [x] Screen gradients via CSS variables

### Types voor Fase 4/5 - VOLTOOID
- [x] `SavedComposition` interface
- [x] `CompositionMetadata` interface
- [x] `ClipEffects` interface (volume, pitch, reverb, pan)
- [x] `StorageKey` type
- [x] `UserPreferences` interface
- [x] `GameScreen` uitgebreid met 'map' en 'compositions'

### Services & Utilities - VOLTOOID
- [x] `StorageService.ts` - CRUD voor compositions, library, preferences
- [x] `uuid.ts` - generateId(), generateShareCode(), generateClipId()

---

### Klas-code Systeem Architectuur - VOLTOOID
- [x] Brainstorm: wat is de scope? → Supabase backend
- [x] Plan document gemaakt: `docs/PLAN-KLASCODE-SYSTEEM.md`
- [x] Types: `UserRole`, `ClassInfo`, `UserSession`, `SharedComposition`
- [x] `useUserStore.ts` - basis store voor user sessie
- [ ] Volledige implementatie → GEPARKEERD voor later (zie plan doc)

---

## In Progress 🔄

*Geen actieve taken*

---

## Todo - Geprioriteerd 🎯

**Zie `docs/TODO-IMPLEMENTATIE.md` voor volledige details.**

### 🔴 P1 - Nu aanpakken
| Item | Status | Notities |
|------|--------|----------|
| Stadskaart + nieuwe locaties | ⏳ | Test locatie-switching, samples |
| MP3 Export | ⏳ | Tone.js Offline rendering |

### 🟠 P2 - Daarna
| Item | Status | Notities |
|------|--------|----------|
| Lokaal opslaan (4.1) | ⏳ | StorageService aansluiten, melding toevoegen |
| Composities beheren (4.2) | ⏳ | Nieuw scherm |
| Locatie Editor | ⏳ | Developer tool voor nieuwe locaties |

### 🟡 P3 - Medium
| Item | Status | Notities |
|------|--------|----------|
| Hotspot animaties | ⏳ | CSS/sprites |
| Ambient audio + toggle | ⏳ | Aan/uit in openingsscherm |
| Thema architectuur | ⏳ | URL param, dropdown |
| Delen met link (Supabase) | ⏳ | Na Supabase setup |
| Klas-code systeem | ⏳ | Na Supabase setup |

### ❌ Verwijderd
- Achievements/Badges
- Locked locaties
- Bulk afspelen / CSV export
- Volume slider ambient (alleen aan/uit)

---

## Todo - Medium Prioriteit 🟡

| Item | Status | Notities |
|------|--------|----------|
| Resterende buttons naar `<Button>` | ⏳ | ~9 circulaire buttons custom |
| Alle hardcoded kleuren → CSS vars | ⏳ | Sommige `purple-500` etc nog hardcoded |
| Visuele verificatie alle schermen | ⏳ | Sandbox limitation - user moet testen |

---

## Todo - Lage Prioriteit 🟢

| Item | Status | Notities |
|------|--------|----------|
| Animatie systeem hotspots | ⏳ | Pas bij Fase 5 implementatie |
| Multiplayer/WebSocket | ⏳ | Fase 4.4 |
| Docent locatie editor | ⏳ | Fase 5+ |
| Thema pakketten | ⏳ | Nice-to-have |

---

## Verificatie Checklist

| Test | Status |
|------|--------|
| TypeScript compileert | ✅ |
| Alle tests slagen (11/11) | ✅ |
| App start lokaal | ⏳ User moet verifiëren |
| Visuele check alle schermen | ⏳ User moet verifiëren |

---

## Bestandsstructuur Nieuwe Files

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx      ✅ NEW
│       ├── Card.tsx        ✅ NEW
│       ├── Modal.tsx       ✅ NEW
│       └── index.ts        ✅ NEW
├── stores/
│   └── userStore.ts        ✅ NEW (Fase 4 prep)
├── services/
│   ├── AudioService.ts     ✅ (eerder)
│   └── StorageService.ts   ✅ NEW
├── utils/
│   ├── cn.ts               ✅ NEW
│   ├── uuid.ts             ✅ NEW
│   └── logger.ts           ✅ (eerder)
└── types/
    └── index.ts            ✅ UPDATED
        - SavedComposition (lokale opslag)
        - SharedComposition (server opslag - Supabase)
        - UserRole, UserSession, ClassInfo
        - ClipEffects, CompositionMetadata
```

---

## Notities & Beslissingen

### Styling Approach
- **Besluit**: Component Library (Button, Card, Modal) + CSS Variables
- **Reden**: Consistentie + makkelijk theming aanpassen

### Circulaire Buttons
- **Besluit**: Custom styling behouden voor transport controls
- **Reden**: Te specifieke vormgeving voor generieke Button component

---

## Volgende Sessie
1. Stadskaart implementeren (nieuwe locaties)
2. MP3 Export functionaliteit
3. Lokaal opslaan aansluiten op UI

## Type Documentatie

### SavedComposition vs SharedComposition

| Aspect | SavedComposition | SharedComposition |
|--------|------------------|-------------------|
| **Opslag** | localStorage (lokaal) | Supabase (server) |
| **Toegang** | Alleen deze browser | Iedereen met link/code |
| **Limiet** | Max 10 per browser | Onbeperkt (server) |
| **Gebruik** | Privé opslaan | Delen met klas/docent |
| **Conversie** | → SharedComposition bij delen | N/A |
