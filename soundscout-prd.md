# Product Requirements Document: SoundScout

## Een educatief muziekspel geïnspireerd op "Break in the Roads"

**Versie:** 1.0
**Datum:** 31 januari 2025
**Auteur:** B & Claude
**Doelgroep:** Groep 6, 7, 8 basisschool (8-12 jaar)

---

## 1. Executive Summary

### 1.1 Visie
SoundScout is een webgebaseerd educatief muziekspel waarin spelers diverse thematische werelden verkennen (stad, park, spookhuis, school, etc.), omgevingsgeluiden "opnemen" met een virtuele microfoon, en deze samples combineren tot eigen composities in een digitale studio. Het spel stimuleert actief luisteren, creativiteit en begrip van muzikale concepten zoals ritme, timing en arrangement.

### 1.2 Kernprobleem
Het originele Flash-spel "Break in the Roads" is niet meer speelbaar door het uitfaseren van Flash. Er bestaat behoefte aan een moderne, toegankelijke versie die dezelfde educatieve waarde biedt voor hedendaagse leerlingen.

### 1.3 Oplossing
Een volledig nieuwe implementatie gebouwd met moderne webtechnologieën (React, TypeScript, Tone.js) die:
- Werkt in alle moderne browsers zonder plugins
- Responsive is voor verschillende schermformaten
- Uitbreidbaar is met nieuwe locaties en geluiden
- Inzetbaar is binnen Learning Management Systems

---

## 2. Doelgroep & Gebruikersonderzoek

### 2.1 Primaire doelgroep
- **Leeftijd:** 8-12 jaar (groep 6, 7, 8 basisschool)
- **Context:** Klassikaal muziekonderwijs, mediawijsheid, creatieve vakken
- **Technische vaardigheid:** Basis computervaardigheden, bekend met drag-and-drop

### 2.2 Secundaire doelgroep
- **Docenten:** Gebruiken het spel als lesmateriaal
- **Ouders:** Thuisgebruik voor educatieve doeleinden

### 2.3 Gebruikersbehoeften
| Gebruiker | Behoefte | Oplossing |
|-----------|----------|-----------|
| Leerling | Speels leren over geluid en compositie | Gamified interface met directe feedback |
| Leerling | Eigen creaties maken en delen | Export/deel functionaliteit |
| Docent | Inzicht in voortgang leerlingen | Optionele tracking (toekomstig) |
| Docent | Eenvoudige integratie in les | Standalone URL, geen installatie |

---

## 3. Game Design

### 3.1 Core Game Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │          │    │          │    │          │    │          │  │
│  │  STAD    │───▶│ OPNEMEN  │───▶│  STUDIO  │───▶│   CLUB   │  │
│  │ VERKENNEN│    │ (max 6)  │    │ COMPONEREN│   │  DELEN   │  │
│  │          │◀───│          │◀───│          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                               │                         │
│       └───────────────────────────────┘                         │
│              (terug voor meer samples)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Game States

1. **START** - Welkomstscherm met uitleg
2. **CITY_MAP** - Overzicht van beschikbare locaties (toekomstig)
3. **LOCATION** - Actieve verkenning van één locatie
4. **STUDIO** - Compositie-interface
5. **CLUB** - Afspelen en delen van eindresultaat

### 3.3 Gameplay Mechanica

#### 3.3.1 Locatie Verkenning
- Speler ziet een geïllustreerde stadslocatie (volledig scherm)
- Achtergrondgeluiden spelen ambient audio af
- Cursor verandert in microfoon-icoon bij hover over hotspots
- Visuele hint (subtle glow/animatie) bij hotspots
- Klik op hotspot = "opname" van dat geluid
- Sample verschijnt in recorder-balk (max 6 slots)
- Bij 6 samples: prompt "Naar de studio?" of "Nog een locatie?"

#### 3.3.2 Recorder Mechanica
- 6 slots voor samples
- Per slot: 
  - Thumbnail/icoon van geluidsbron
  - Korte naam
  - Preview button (afspelen sample)
  - Eject button (verwijderen)
- Recorder wordt geleegd bij nieuwe opnamesessie
- Samples worden toegevoegd aan permanente bibliotheek

#### 3.3.3 Studio Interface
- **Bibliotheek paneel** (bovenkant):
  - Alle verzamelde samples uit alle sessies
  - Drag-and-drop naar timeline
  - Preview on hover/click
  - Categorisatie per locatie (toekomstig)
  
- **Timeline/Sequencer** (onderkant):
  - 4-6 horizontale tracks
  - Tijdlijn met grid (bijv. 16 beats)
  - Snap-to-grid functionaliteit
  - Samples kunnen geplaatst worden:
    - Horizontaal: na elkaar (sequentie)
    - Verticaal: onder elkaar op verschillende tracks (gelijktijdig)
  - NIET op dezelfde positie op dezelfde track

- **Transport Controls**:
  - Play / Pause
  - Stop (terug naar begin)
  - Loop toggle
  - BPM aanpassing (toekomstig)
  - Clear all

#### 3.3.4 Club/Presentatie
- Visuele "podium" setting (werktitel: Club)
- Compositie speelt af
- Geanimeerd publiek dat reageert
- **Delen met docent:** link genereren of opslaan naar database
- Compositie naam geven
- Terug naar studio voor aanpassingen

---

## 4. Technische Architectuur

### 4.1 Tech Stack

| Component | Technologie | Reden |
|-----------|-------------|-------|
| Frontend Framework | React 18+ | Component-based, grote community |
| Taal | TypeScript | Type-safety, betere maintainability |
| Audio Engine | Tone.js | Robuuste Web Audio abstractie |
| State Management | Zustand of Context | Lightweight, voldoende voor scope |
| Styling | Tailwind CSS of CSS Modules | Rapid development, scoped styles |
| Build Tool | Vite | Snelle development, optimale builds |
| Drag & Drop | dnd-kit of react-beautiful-dnd | Toegankelijk, performant |

### 4.2 Project Structuur

```
soundscout/
├── public/
│   ├── audio/
│   │   ├── locations/
│   │   │   ├── arcade/
│   │   │   │   ├── ambient.mp3
│   │   │   │   ├── sample-01-pinball.mp3
│   │   │   │   ├── sample-02-coins.mp3
│   │   │   │   └── ...
│   │   │   └── metro/
│   │   │       └── ...
│   │   └── ui/
│   │       ├── click.mp3
│   │       └── success.mp3
│   └── images/
│       ├── locations/
│       │   ├── arcade.png
│       │   └── metro.png
│       ├── ui/
│       └── club/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Cursor.tsx
│   │   │   └── Modal.tsx
│   │   ├── location/
│   │   │   ├── LocationScene.tsx
│   │   │   ├── Hotspot.tsx
│   │   │   └── RecorderBar.tsx
│   │   ├── studio/
│   │   │   ├── StudioView.tsx
│   │   │   ├── SampleLibrary.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Track.tsx
│   │   │   └── TransportControls.tsx
│   │   └── club/
│   │       └── ClubView.tsx
│   ├── hooks/
│   │   ├── useAudioEngine.ts
│   │   ├── useGameState.ts
│   │   └── useDragAndDrop.ts
│   ├── stores/
│   │   ├── gameStore.ts
│   │   ├── audioStore.ts
│   │   └── libraryStore.ts
│   ├── data/
│   │   ├── locations.json
│   │   └── samples.json
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── audio.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 4.3 Data Modellen

```typescript
// types/index.ts

interface Location {
  id: string;
  name: string;
  description: string;
  backgroundImage: string;
  ambientAudio: string;
  hotspots: Hotspot[];
  unlocked: boolean;
}

interface Hotspot {
  id: string;
  x: number;          // percentage (0-100)
  y: number;          // percentage (0-100)
  radius: number;     // pixels of percentage
  sampleId: string;
  visualHint?: 'glow' | 'pulse' | 'none';
  animation?: string; // toekomstig: animatie bij hover
}

interface Sample {
  id: string;
  name: string;
  locationId: string;
  audioUrl: string;
  duration: number;   // in seconds
  icon: string;
  category?: string;
  color?: string;     // voor visuele weergave in timeline
}

interface RecorderState {
  slots: (Sample | null)[];  // max 6
  maxSlots: 6;
}

interface LibraryState {
  samples: Sample[];  // alle verzamelde samples
}

interface TimelineState {
  tracks: Track[];
  bpm: number;
  length: number;     // in beats
  isPlaying: boolean;
  currentPosition: number;
}

interface Track {
  id: string;
  clips: Clip[];
}

interface Clip {
  id: string;
  sampleId: string;
  startPosition: number;  // in beats
  // duration komt van sample
}

interface GameState {
  currentScreen: 'start' | 'map' | 'location' | 'studio' | 'club';
  currentLocationId: string | null;
  recorder: RecorderState;
  library: LibraryState;
  timeline: TimelineState;
  completedCompositions: Composition[];
}

interface Composition {
  id: string;
  name: string;
  createdAt: Date;
  timeline: TimelineState;
}
```

### 4.4 Audio Engine Architectuur

```typescript
// Tone.js setup concept

class AudioEngine {
  private players: Map<string, Tone.Player>;
  private transport: Tone.Transport;
  
  constructor() {
    this.players = new Map();
  }
  
  // Laad sample en cache in players map
  async loadSample(sample: Sample): Promise<void> {
    const player = new Tone.Player(sample.audioUrl).toDestination();
    await player.load(sample.audioUrl);
    this.players.set(sample.id, player);
  }
  
  // Preview single sample
  playSample(sampleId: string): void {
    const player = this.players.get(sampleId);
    if (player) {
      player.start();
    }
  }
  
  // Stop single sample
  stopSample(sampleId: string): void {
    const player = this.players.get(sampleId);
    if (player) {
      player.stop();
    }
  }
  
  // Schedule timeline playback
  scheduleTimeline(timeline: TimelineState): void {
    Tone.Transport.cancel(); // Clear previous schedule
    Tone.Transport.bpm.value = timeline.bpm;
    
    timeline.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const player = this.players.get(clip.sampleId);
        if (player) {
          Tone.Transport.schedule((time) => {
            player.start(time);
          }, `${clip.startPosition}:0:0`);
        }
      });
    });
  }
  
  play(): void {
    Tone.Transport.start();
  }
  
  pause(): void {
    Tone.Transport.pause();
  }
  
  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }
}
```

### 4.5 Hotspot Configuratie Voorbeeld

```json
// data/locations.json
{
  "locations": [
    {
      "id": "park",
      "name": "Het Park",
      "description": "Een levendig stadspark vol natuurgeluiden",
      "backgroundImage": "/images/locations/park.png",
      "ambientAudio": "/audio/locations/park/ambient.mp3",
      "unlocked": true,
      "hotspots": [
        {
          "id": "park-birds",
          "x": 25,
          "y": 20,
          "radius": 8,
          "sampleId": "birds-chirping",
          "visualHint": "glow"
        },
        {
          "id": "park-fountain",
          "x": 60,
          "y": 50,
          "radius": 10,
          "sampleId": "fountain-water",
          "visualHint": "pulse"
        },
        {
          "id": "park-footsteps",
          "x": 45,
          "y": 80,
          "radius": 6,
          "sampleId": "gravel-footsteps",
          "visualHint": "glow"
        }
        // ... meer hotspots
      ]
    },
    {
      "id": "metro",
      "name": "Metrostation",
      "description": "Het drukke ondergrondse station",
      "backgroundImage": "/images/locations/metro.png",
      "ambientAudio": "/audio/locations/metro/ambient.mp3",
      "unlocked": false,
      "hotspots": [
        // ... hotspots voor metro
      ]
    }
  ]
}
```

---

## 5. User Interface Design

### 5.1 Design Principes

1. **Kindvriendelijk**: Grote knoppen, duidelijke iconen, vrolijke kleuren
2. **Intuïtief**: Minimale uitleg nodig, ontdekken door doen
3. **Feedback**: Directe visuele en auditieve feedback op acties
4. **Consistent**: Zelfde patronen door hele applicatie
5. **Toegankelijk**: Keyboard navigatie, voldoende contrast

### 5.2 Scherm Specificaties

#### 5.2.1 Start Scherm
```
┌─────────────────────────────────────────────┐
│                                             │
│            🎵 SOUNDSCOUT 🎵                 │
│                                             │
│     [Geanimeerde stad silhouet]             │
│                                             │
│         ┌─────────────────┐                 │
│         │   START SPEL    │                 │
│         └─────────────────┘                 │
│                                             │
│         ┌─────────────────┐                 │
│         │   HOE WERKT HET │                 │
│         └─────────────────┘                 │
│                                             │
└─────────────────────────────────────────────┘
```

#### 5.2.2 Locatie Scherm
```
┌─────────────────────────────────────────────┐
│ [← Terug]                    [Naar Studio →]│
│                                             │
│                                             │
│         [LOCATIE AFBEELDING]                │
│         [met onzichtbare hotspots]          │
│                                             │
│     (cursor wordt 🎤 bij hotspot)           │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│  RECORDER              [🎤 De Arcade    ]   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ 🔔 │ │ 🪙 │ │    │ │    │ │    │ │    │ │
│  │eject│ │eject│ │    │ │    │ │    │ │    │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

#### 5.2.3 Studio Scherm
```
┌─────────────────────────────────────────────┐
│ [← Terug naar Stad]          [Naar Club →]  │
├─────────────────────────────────────────────┤
│  BIBLIOTHEEK                                │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐ │
│  │ 🔔 │ 🪙 │ 🚪 │ 🚃 │ 👣 │ 📢 │    │    │ │
│  └────┴────┴────┴────┴────┴────┴────┴────┘ │
├─────────────────────────────────────────────┤
│  TIMELINE                    BPM: [120 ▼]  │
│  ┌──────────────────────────────────────┐   │
│  │ Track 1 │ 🔔 │    │ 🪙 │    │    │   │   │
│  │ Track 2 │    │ 🚃 │    │ 🚃 │    │   │   │
│  │ Track 3 │ 👣 │ 👣 │ 👣 │ 👣 │    │   │   │
│  │ Track 4 │    │    │    │    │    │   │   │
│  └──────────────────────────────────────┘   │
│           ▶️  ⏸️  ⏹️  🔁                     │
│  [Clear All]                                │
└─────────────────────────────────────────────┘
```

#### 5.2.4 Club Scherm
```
┌─────────────────────────────────────────────┐
│ [← Terug naar Studio]                       │
│                                             │
│      ┌─────────────────────────────┐        │
│      │                             │        │
│      │    [PODIUM VISUALISATIE]    │        │
│      │                             │        │
│      │    🎵 ♪ ♫ 🎶 ♪ 🎵           │        │
│      │                             │        │
│      └─────────────────────────────┘        │
│                                             │
│      👏 👏 👏 👏 👏 👏 👏 👏 👏              │
│      [Geanimeerd publiek]                   │
│                                             │
│      ┌─────────────┐  ┌─────────────┐       │
│      │  OPNIEUW    │  │   DELEN     │       │
│      └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────┘
```

### 5.3 Interactie Feedback

| Actie | Visuele Feedback | Audio Feedback |
|-------|------------------|----------------|
| Hover over hotspot | Cursor → microfoon, subtle glow | Geen |
| Klik op hotspot | Flash animatie, sample naar recorder | Sample speelt af |
| Recorder vol | Slots gloeien, modal verschijnt | Succes geluid |
| Drag sample | Sample volgt cursor, ghost op origineel | Geen |
| Drop op timeline | Sample snaps naar grid | Kort klik geluid |
| Play compositie | Playhead beweegt, actieve clips highlighten | Compositie speelt |
| Club applaus | Publiek animeert | Applaus geluid |

---

## 6. Ontwikkelfases

### 6.1 Fase 1: MVP (Minimum Viable Product)
**Doel:** Werkende basis game loop met één locatie
**Status:** ✅ VOLTOOID (31-01-2025)

#### Deliverables:
- [x] Project setup (React, TypeScript, Vite, Tone.js)
- [x] Eén locatie met statische achtergrond
- [x] 8 werkende hotspots met samples (park)
- [x] Visuele hint bij hover (glow/pulse)
- [x] Recorder balk met 6 slots
- [x] Sample preview functionaliteit
- [x] Eject functionaliteit
- [x] Basis studio met bibliotheek
- [x] Timeline met 4 tracks
- [x] Drag-and-drop samples naar timeline
- [x] Play/Stop transport controls
- [x] Loop functionaliteit
- [x] Basis styling met Tailwind CSS

#### Acceptatiecriteria:
- Speler kan samples verzamelen door op hotspots te klikken
- Speler kan samples van recorder naar bibliotheek "bewaren"
- Speler kan samples slepen naar timeline
- Speler kan compositie afspelen met correcte timing
- Meerdere samples spelen gelijktijdig correct af

### 6.2 Fase 2: Core Experience
**Doel:** Volledige game loop, meerdere locaties
**Status:** ✅ VOLTOOID (31-01-2025)

#### Deliverables:
- [x] Tweede locatie (speeltuin - 01-02-2025)
- [x] Stadskaart met locatie selectie (01-02-2025)
- [x] Terug naar stad flow (recorder reset)
- [x] Verbeterde timeline (snap-to-grid)
- [x] Loop functionaliteit
- [x] BPM fixed op 120 (geen aanpassing nodig)
- [x] Club scherm met podium visualisatie
- [x] Verbeterde UI/UX polish
- [x] i18n (NL/EN)

### 6.3 Fase 3: Polish & Features
**Doel:** Gepolijste ervaring, extra features
**Status:** ✅ VOLTOOID (01-02-2025)

#### Deliverables:
- [x] Theme systeem met URL parameter (?theme=x)
- [x] Animaties bij hotspots (pulse animatie)
- [ ] Ambient audio per locatie (gepland)
- [x] Visuele feedback verbeteringen
- [x] Publiek animaties in club
- [x] Tutorial/onboarding flow
- [ ] Compositie opslaan (localStorage) - Fase 4
- [ ] Compositie laden - Fase 4
- [ ] Geluidseffecten UI - Fase 5 (lage prio)

### 6.4 Fase 4: Delen & Integratie
**Doel:** Composities opslaan, beheren en delen met docenten
**Geschatte duur:** 3-4 weken

#### 6.4.1 Compositie Opslaan

**Lokaal opslaan (localStorage):**
- [ ] "Opslaan" knop in Club-scherm
- [ ] Compositie krijgt verplichte naam (gebruiker voert in)
- [ ] Automatisch toegevoegde metadata: datum/tijd, gebruikte samples, duur
- [ ] JSON structuur bevat: naam, timeline state, library samples, timestamps
- [ ] Maximum 10 composities lokaal (daarna oudste overschrijven of waarschuwing)
- [ ] "Opslaan als nieuw" optie voor variaties

**Data structuur opgeslagen compositie:**
```typescript
interface SavedComposition {
  id: string;                    // UUID
  name: string;                  // Door gebruiker ingevoerd
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  timeline: TimelineState;       // Volledige timeline met clips
  samples: Sample[];             // Gebruikte samples (voor offline playback)
  metadata: {
    duration: number;            // Totale lengte in seconden
    trackCount: number;          // Aantal gebruikte tracks
    clipCount: number;           // Totaal aantal clips
    locations: string[];         // Locaties waaruit samples komen
  };
  shareCode?: string;            // Indien gedeeld: unieke code
  sharedAt?: string;             // Timestamp van delen
}
```

#### 6.4.2 Composities Beheren

**Nieuw scherm: "Mijn Composities"**
- [ ] Toegankelijk vanaf startscherm (nieuwe knop)
- [ ] Lijst van alle opgeslagen composities
- [ ] Per compositie tonen: naam, datum, duur, aantal samples
- [ ] Acties per compositie:
  - **Openen**: laadt compositie in studio voor bewerken
  - **Afspelen**: direct afspelen in mini-player
  - **Delen**: genereer deellink (zie 6.4.3)
  - **Dupliceren**: maak kopie om te bewerken
  - **Verwijderen**: met bevestiging
- [ ] Sorteer opties: datum (nieuwste eerst), naam (A-Z), duur
- [ ] Zoekfunctie (bij veel composities)

**UI Wireframe:**
```
┌─────────────────────────────────────────────┐
│ [← Terug]        MIJN COMPOSITIES           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🎵 Mijn eerste beat                 │    │
│  │ 📅 1 feb 2025 • ⏱️ 0:32 • 🎤 6     │    │
│  │ [▶️ Afspelen] [✏️ Bewerken] [🔗 Delen] │ │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🎵 Parkgeluiden remix               │    │
│  │ 📅 31 jan 2025 • ⏱️ 0:48 • 🎤 8    │    │
│  │ [▶️ Afspelen] [✏️ Bewerken] [🔗 Delen] │ │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🎵 Test compositie                  │    │
│  │ 📅 30 jan 2025 • ⏱️ 0:16 • 🎤 3    │    │
│  │ [▶️ Afspelen] [✏️ Bewerken] [🔗 Delen] │ │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

#### 6.4.3 Delen met Docent

**Deellink genereren:**
- [ ] "Delen" knop genereert unieke korte code (bijv. `PARK-7X3K`)
- [ ] Code wordt getoond in modal met kopieer-knop
- [ ] Volledige URL: `https://[domein]/luister/PARK-7X3K`
- [ ] QR-code genereren voor makkelijk delen (optioneel)
- [ ] Link is 30 dagen geldig (configureerbaar)

**Backend vereisten (eenvoudig):**
- [ ] Simpele API endpoint om compositie JSON op te slaan
- [ ] Endpoint om compositie op te halen via code
- [ ] Geen authenticatie nodig voor luisteren
- [ ] Database: SQLite of JSON files (eenvoudig te hosten)
- [ ] Of: Firebase/Supabase voor snelle implementatie

**Luister-pagina (publiek toegankelijk):**
- [ ] Minimale UI: compositie naam, grote play knop, visualisatie
- [ ] Geen edit mogelijkheden
- [ ] "Maak je eigen compositie" link naar hoofdapp
- [ ] Laadt benodigde samples automatisch
- [ ] Werkt zonder account/login

**URL structuur:**
```
/luister/:shareCode    - Publieke luisterpagina
/embed/:shareCode      - Embeddable versie (iframe)
```

#### 6.4.4 Docenten Overzicht

**Klas-code systeem:**
- [ ] Docent maakt een klas-code aan (bijv. `KLAS-5B-2025`)
- [ ] Leerlingen voeren klas-code in bij delen
- [ ] Compositie wordt gekoppeld aan die klas

**Docenten dashboard (apart scherm of aparte route):**
- [ ] Overzicht van alle composities binnen een klas-code
- [ ] Per leerling: naam (optioneel), compositie naam, datum
- [ ] Bulk afspelen: alle composities achter elkaar
- [ ] Exporteer lijst als CSV (voor administratie)
- [ ] Markeer favorieten / geef feedback (optioneel)

**Privacy overwegingen:**
- [ ] Geen echte namen vereist van leerlingen
- [ ] Leerling kan pseudoniem gebruiken
- [ ] Docent ziet alleen wat gedeeld is via klas-code
- [ ] GDPR/AVG compliant: geen persoonsgegevens opslaan

#### 6.4.5 Audio Export

**Exporteren als audio bestand:**
- [ ] "Download als MP3" knop in Club-scherm
- [ ] Gebruikt Tone.js Offline rendering
- [ ] Rendert volledige compositie naar audio buffer
- [ ] Converteert naar MP3 (met lamejs of vergelijkbaar)
- [ ] Download start automatisch
- [ ] Bestandsnaam: `{compositie-naam}.mp3`

**Technische implementatie:**
```typescript
// Concept voor offline rendering
const exportToMp3 = async (timeline: TimelineState, samples: Sample[]) => {
  const duration = calculateDuration(timeline);
  
  // Render offline
  const buffer = await Tone.Offline(({ transport }) => {
    // Schedule alle clips
    scheduleTimeline(timeline, samples);
    transport.start();
  }, duration);
  
  // Convert to MP3
  const mp3Blob = await convertToMp3(buffer);
  
  // Trigger download
  downloadBlob(mp3Blob, `${timeline.name}.mp3`);
};
```

#### 6.4.6 Acceptatiecriteria Fase 4

- [ ] Gebruiker kan compositie opslaan met naam
- [ ] Gebruiker ziet lijst van opgeslagen composities
- [ ] Gebruiker kan opgeslagen compositie openen en bewerken
- [ ] Gebruiker kan compositie verwijderen
- [ ] Gebruiker kan deellink genereren
- [ ] Deellink opent luisterpagina zonder login
- [ ] Compositie speelt correct af via deellink
- [ ] Docent kan klas-code aanmaken
- [ ] Leerling kan compositie delen met klas-code
- [ ] Docent ziet alle composities van klas
- [ ] Gebruiker kan compositie downloaden als MP3

### 6.5 Fase 5: Uitbreidingen
**Doel:** Extra content, geavanceerde features en schaalbaarheid
**Tijdlijn:** Doorlopend na Fase 4

#### 6.5.1 Nieuwe Locaties

**Locatie-systeem uitbreiden:**
- [ ] Stadskaart/wereldkaart als hub (nieuwe game state: `'map'`)
- [ ] Locaties kunnen "locked" zijn (unlock door andere te voltooien)
- [ ] Visuele voortgangsindicator per locatie (hoeveel samples verzameld)
- [ ] Elk locatie heeft eigen kleurenpalet en sfeer

**Geplande locaties:**

| Locatie | Thema | Voorbeeldsamples | Prioriteit |
|---------|-------|------------------|------------|
| **Park** | Natuur, rust | Vogels, fontein, wind, kinderen, hond, fiets | ✅ MVP |
| **Metro** | Stedelijk, druk | Trein, omroep, voetstappen, kaartjesautomaat, deuren | Hoog |
| **Bouwplaats** | Industrieel, ritmisch | Hamer, zaag, kraan, vrachtwagen, bevelen roepen | Hoog |
| **Spookhuis** | Mysterieus, eng | Krakende deur, uil, wind, voetstappen, ketting | Medium |
| **School** | Herkenbaar, speels | Bel, kinderen, krijt, bal stuiteren, fluiten | Medium |
| **Strand** | Ontspannen, zomers | Golven, meeuwen, ijscowagen, volleybal | Medium |
| **Markt** | Levendig, divers | Verkopers roepen, kassa, menigte, muzikant | Laag |
| **Ruimtestation** | Futuristisch, sci-fi | Piepjes, decompressie, alarm, robot, ademhaling | Laag |

**Locatie configuratie:**
```typescript
interface LocationConfig {
  id: string;
  name: string;                    // i18n key
  description: string;             // i18n key
  backgroundImage: string;
  ambientAudio?: string;
  ambientVolume?: number;          // 0-1
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';  // Hoe verborgen zijn hotspots
  unlockRequirement?: {
    type: 'samples' | 'compositions' | 'location';
    count?: number;
    locationId?: string;
  };
  hotspots: Hotspot[];
}
```

#### 6.5.2 Ambient Audio

**Achtergrondgeluid per locatie:**
- [ ] Loopende ambient track per locatie
- [ ] Fade in bij betreden locatie
- [ ] Fade out bij verlaten of naar studio
- [ ] Volume aanpasbaar (of uit te zetten)
- [ ] Speelt NIET mee in eindcompositie (puur sfeer)

**Implementatie:**
```typescript
// In LocationScene.tsx
useEffect(() => {
  if (location.ambientAudio) {
    ambientPlayer.current = new Tone.Player({
      url: location.ambientAudio,
      loop: true,
      volume: -12, // Zachter dan samples
    }).toDestination();
    
    ambientPlayer.current.fadeIn = 2; // 2 sec fade in
    ambientPlayer.current.autostart = true;
  }
  
  return () => {
    ambientPlayer.current?.fadeOut = 1;
    ambientPlayer.current?.stop();
  };
}, [location]);
```

#### 6.5.3 Hotspot Animaties

**Dynamische visuele elementen:**
- [ ] Subtiele animatie wanneer sample "actief" is (hover)
- [ ] Animatie gesynchroniseerd met sample (bijv. hamer beweegt op ritme)
- [ ] Sprite sheets of Lottie animaties
- [ ] Performance-vriendelijk (geen zware animaties)

**Animatie types:**
| Type | Beschrijving | Voorbeeld |
|------|--------------|-----------|
| `idle` | Subtiele beweging continu | Vogel wipt |
| `hover` | Animatie bij hover | Hamer gaat omhoog |
| `active` | Animatie tijdens afspelen | Hamer slaat |
| `collected` | Eenmalig na verzamelen | Glinstering |

**Data structuur:**
```typescript
interface AnimatedHotspot extends Hotspot {
  animation?: {
    type: 'sprite' | 'lottie' | 'css';
    idle?: string;      // URL of animatie naam
    hover?: string;
    active?: string;
    collected?: string;
  };
}
```

#### 6.5.4 Sample Effecten

**Real-time effecten op clips:**
- [ ] Per-clip volume aanpassing
- [ ] Pitch shift (hoger/lager)
- [ ] Reverb (ruimtelijk effect)
- [ ] Filter (high-pass, low-pass)
- [ ] Pan (links/rechts)

**UI: Effect panel bij geselecteerde clip:**
```
┌─────────────────────────────┐
│ 🎵 Vogels                   │
├─────────────────────────────┤
│ Volume:  ────●───── 80%     │
│ Pitch:   ──●─────── +0      │
│ Reverb:  ─────●──── 40%     │
│ Pan:     ────●───── C       │
│                             │
│ [Reset] [Toepassen]         │
└─────────────────────────────┘
```

**Technische implementatie:**
```typescript
interface ClipEffects {
  volume: number;      // -60 tot +6 dB
  pitch: number;       // -12 tot +12 semitones
  reverb: number;      // 0-100%
  pan: number;         // -1 (L) tot 1 (R)
  filter?: {
    type: 'lowpass' | 'highpass';
    frequency: number;
  };
}

interface EnhancedClip extends Clip {
  effects?: ClipEffects;
}
```

#### 6.5.5 Eigen Samples Opnemen

**Microfoon integratie:**
- [ ] "Opnemen" knop in speciale "Studio" locatie
- [ ] Browser vraagt microfoon permissie
- [ ] Real-time waveform visualisatie tijdens opname
- [ ] Maximum opnameduur: 5 seconden
- [ ] Preview na opname
- [ ] Opslaan of opnieuw proberen
- [ ] Opgenomen sample krijgt automatisch naam en icoon

**Privacy en veiligheid:**
- [ ] Duidelijke indicator wanneer microfoon actief is
- [ ] Audio wordt ALLEEN lokaal verwerkt
- [ ] Niet automatisch gedeeld naar server
- [ ] Optie om eigen samples te verwijderen

**UI Flow:**
1. Klik "Opnemen" → Permissie popup
2. Permissie granted → Countdown 3-2-1
3. Opname start → Waveform + timer (max 5 sec)
4. Klik stop of automatisch na 5 sec
5. Preview → "Opslaan" of "Opnieuw"
6. Bij opslaan → Sample in bibliotheek met 🎤 icoon

#### 6.5.6 Achievements & Badges

**Gamification systeem:**
- [ ] Badges voor milestones
- [ ] Zichtbaar in profiel/startscherm
- [ ] Optionele notificatie bij unlock

**Voorgestelde badges:**

| Badge | Naam | Voorwaarde |
|-------|------|------------|
| 🎤 | Eerste Opname | Eerste sample verzameld |
| 🎵 | Componist | Eerste compositie voltooid |
| 🎧 | Verzamelaar | 20 samples verzameld |
| 🌍 | Ontdekker | Alle locaties bezocht |
| 🔊 | Geluidsjager | 50 samples verzameld |
| ⭐ | Perfectionist | Compositie met 20+ clips |
| 🎹 | Remix Master | 5 composities gemaakt |
| 📢 | Presentator | Compositie gedeeld |
| 👨‍🏫 | Klasgenoot | Compositie gedeeld met klas |
| 🎙️ | Eigen Geluid | Eigen sample opgenomen |

#### 6.5.7 Multiplayer / Collaboratief

**Samen componeren (toekomstvisie):**
- [ ] Real-time synchronisatie van timeline
- [ ] Meerdere cursors zichtbaar
- [ ] Chat of emoji-reacties
- [ ] "Room" systeem met code om te joinen
- [ ] Maximaal 4 deelnemers

**Technische vereisten:**
- WebSocket server voor real-time sync
- Conflict resolution bij gelijktijdige edits
- Latency compensatie

**Dit is een complexe feature - evalueer of dit past bij educatieve context.**

#### 6.5.8 Docent Tools

**Locatie Editor (voor docenten):**
- [ ] Upload eigen achtergrondafbeelding
- [ ] Klik om hotspots te plaatsen
- [ ] Upload eigen samples (MP3)
- [ ] Configureer hotspot grootte en hint type
- [ ] Preview modus
- [ ] Publiceer naar leerlingen via code

**Les-integratie:**
- [ ] Embed code genereren voor LMS (Canvas, Google Classroom)
- [ ] Specifieke locatie direct openen via URL parameter
- [ ] Voortgang rapportage per leerling
- [ ] Tijdslot instellen (alleen beschikbaar tijdens les)

#### 6.5.9 Thema Pakketten

**Seizoensgebonden content:**
- [ ] Kerst: sneeuw geluiden, kerstmarkt, kerstliedjes samples
- [ ] Halloween: extra spookhuis content
- [ ] Zomer: strand uitbreiding
- [ ] Carnaval: feest geluiden

**Culturele pakketten:**
- [ ] Nederland: molen, koeien, Koningsdag
- [ ] Wereld: instrumenten en geluiden uit andere landen
- [ ] Natuur: bos, jungle, oceaan

#### 6.5.10 Acceptatiecriteria Fase 5

Per sub-feature worden aparte acceptatiecriteria opgesteld bij implementatie. Algemeen:

- [ ] Nieuwe locaties laden correct met eigen samples en ambient
- [ ] Stadskaart navigatie werkt intuïtief
- [ ] Animaties draaien smooth (60fps) op doeldevices
- [ ] Effecten hoorbaar en visueel duidelijk
- [ ] Eigen opnames werken op desktop en tablet
- [ ] Badges worden correct toegekend
- [ ] Docent kan eigen locatie maken en delen

---

## 7. Niet-functionele Eisen

### 7.1 Performance
- Initiële laadtijd: < 3 seconden (exclusief assets)
- Audio latency: < 50ms
- Smooth animations: 60fps
- Werkt op apparaten vanaf 2018

### 7.2 Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 7.3 Toegankelijkheid
- Keyboard navigatie voor alle interacties
- Screen reader support voor kernfunctionaliteit
- Minimum contrast ratio 4.5:1
- Focus indicators zichtbaar
- Geen seizure-inducing animaties

### 7.4 Privacy & Security
- Geen persoonlijke gegevens verzamelen (tenzij opt-in tracking)
- Alle data lokaal in browser (localStorage)
- Geen externe tracking scripts
- HTTPS only
- CSP headers configured

### 7.5 Internationalisatie
- UI teksten in aparte bestanden (i18n ready)
- Initieel Nederlands
- Engelse vertaling voorbereid

---

## 8. Risico's & Mitigatie

| Risico | Impact | Kans | Mitigatie |
|--------|--------|------|-----------|
| Web Audio niet supported | Hoog | Laag | Feature detection, fallback bericht |
| Performance issues bij veel samples | Medium | Medium | Lazy loading, sample cleanup |
| Drag-and-drop moeilijk op touch | Medium | Medium | Touch-first library kiezen |
| Hotspot positionering lastig | Laag | Hoog | Editor tool bouwen voor plaatsing |
| Scope creep | Hoog | Hoog | Strikte MVP focus, backlog discipline |

---

## 9. Success Metrics

### 9.1 Kwantitatief
- Spelers voltooien minimaal 1 compositie: > 70%
- Gemiddelde sessieduur: > 10 minuten
- Terugkerende spelers (indien tracking): > 30%

### 9.2 Kwalitatief
- Positieve feedback van docenten
- Leerlingen begrijpen basis van sampling/compositie
- Spel wordt ingezet in minimaal 3 klassen pilot

---

## 10. Open Vragen (Beantwoord)

| Vraag | Antwoord |
|-------|----------|
| **Samples** | Beschikbaar. Worden in `/public/audio/` geplaatst. Start met 6-8 samples voor MVP-locatie. |
| **Artwork** | Start met bestaande park-afbeelding. Definitieve art style wordt later bepaald. |
| **Hosting** | Standalone op eigen domein/server. Niet embedded in LMS. |
| **Analytics** | Nog te bepalen. |
| **Feedback** | Nog te bepalen tijdens pilots. |

---

## 11. Appendix

### 11.1 Referenties
- Origineel spel: Break in the Roads (Flash, niet meer beschikbaar)
- Tone.js documentatie: https://tonejs.github.io/
- dnd-kit documentatie: https://dndkit.com/

### 11.2 Glossary
- **Hotspot:** Klikbaar gebied in locatie-afbeelding gekoppeld aan sample
- **Sample:** Audio fragment dat opgenomen/gebruikt kan worden
- **Timeline:** Horizontale weergave waarop samples gerangschikt worden
- **Track:** Horizontale lijn in timeline waarop clips geplaatst worden
- **Clip:** Instance van sample geplaatst op specifieke positie in timeline
- **Transport:** Play/pause/stop controls

---

## 12. Versiegeschiedenis

| Versie | Datum | Auteur | Wijzigingen |
|--------|-------|--------|-------------|
| 1.0 | 31-01-2025 | B & Claude | Initiële versie |
| 1.1 | 01-02-2025 | B & Claude | Fase 4 & 5 gedetailleerd uitgewerkt |
| 1.2 | 01-02-2025 | B & Claude | Fase 1-3 voltooid, thema systeem, stadskaart, speeltuin locatie |

---

*Dit document is een levend document en zal worden bijgewerkt naarmate het project vordert.*
