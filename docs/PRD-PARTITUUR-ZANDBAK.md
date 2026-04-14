# Product Requirements Document: Partituur Zandbak

## Een standalone prototype voor grafische klanknotatie

**Versie:** 1.0
**Datum:** 31 maart 2026
**Auteur:** B & Claude
**Status:** Zandbak / Prototype — losgekoppeld van SoundScout
**Oorsprong:** SoundScout CONCEPT-PARTITUUR-TOOL.md (14 maart 2026)

---

## 1. Doel van dit project

### 1.1 Waarom een zandbak?

SoundScout heeft een uitgewerkt concept voor een visuele partituur-tool (#68), maar het interactiemodel wijkt fundamenteel af van de huidige app. In SoundScout sleep je bestaande geluidssamples naar een tijdlijn. In de partituur-aanpak teken je eerst lege blokken — een grafische score — en koppel je daar pas later geluid aan.

Dit zandbak-project isoleert die kerninteractie zodat we vrij kunnen experimenteren zonder gebonden te zijn aan SoundScout's bestaande architectuur (dnd-kit, Zustand stores, 8-track systeem, Tone.js scheduling). Als het concept werkt, kunnen de componenten en patronen worden overgezet naar SoundScout als nieuwe compose-mode.

### 1.2 Kernvraag

> Hoe voelt het voor een kind (8-12 jaar) om een klankcomposie te **ontwerpen** via grafische notatie, vóórdat er geluid aan te pas komt?

### 1.3 Wat dit project NIET is

- Geen volledige app met auth, opslag, export of docentenfunctionaliteit
- Geen kopie van SoundScout — we bouwen alleen het nieuwe interactiemodel
- Geen productierelease — dit is een experimenteer-omgeving

---

## 2. Pedagogische achtergrond

### 2.1 Het probleem

Bij soundscape-oefeningen in de klas slaan leerlingen vaak de ontwerpfase over. Ze gaan direct geluiden uitproberen zonder na te denken over structuur, timing en opbouw. Het resultaat is een willekeurige opeenstapeling van klanken zonder muzikaal verhaal.

### 2.2 Wat grafische notatie toevoegt

Een visuele partituur dwingt leerlingen om eerst na te denken over vier vragen: wanneer moet een geluid beginnen en stoppen, hoe lang moet het duren, hoeveel geluiden klinken tegelijk, en waar in het verhaal zit spanning, stilte of climax.

Dit is geen traditionele muzieknotatie, maar blokken die tijd en klank visueel representeren. Het is toegankelijk voor kinderen die geen noten lezen, maar traint wel muzikaal denken.

### 2.3 Aansluiting bij leerlijnen

De tool raakt vier muzikale competenties: componeren en improviseren (structuur aanbrengen vóór uitvoering), luisteren (bewust nadenken over "wat hoor ik?" en "wat wil ik horen?"), uitvoeren (de partituur als gids voor live of digitale uitvoering), en sound design (geluiden koppelen aan beelden en verhalen).

---

## 3. Doelgroep

**Primair:** Basisschoolleerlingen groep 6-8 (8-12 jaar). De interface moet touch-first zijn (tablets in de klas), met grote knoppen en visueel duidelijke interacties. Geen tekst-zware UI.

**Secundair:** Docenten muziek/creatieve vakken die het prototype willen uitproberen in de les.

---

## 4. Gebruikersflow

De zandbak heeft drie fasen die de leerling doorloopt:

### Fase 1 — Ontwerpen (de kern)

De leerling ziet een lege tijdlijn met meerdere sporen. Een afbeelding (optioneel) wordt bovenaan getoond als inspiratie. De leerling tekent blokken op de tijdlijn:

- **Klik/tap en sleep** horizontaal om een blok te creëren
- De **breedte** van het blok bepaalt de duur (lang blok = lang geluid)
- De **track-positie** (verticaal) bepaalt het spoor
- Blokken kunnen een **label** krijgen ("wind", "voetstappen", "stilte")
- Blokken krijgen een **kleur** (vrij te kiezen of per categorie)
- Blokken kunnen worden **verplaatst**, **vergroot/verkleind** en **verwijderd**

Het resultaat is een grafische score — een visueel plan van de compositie, zonder geluid.

### Fase 2 — Koppelen

De leerling opent een sample-bibliotheek (een vaste set voorgeladen geluiden). Vervolgens koppelt de leerling een sample aan een blok:

- **Sleep** een sample uit de bibliotheek op een bestaand blok
- Of **selecteer** een blok en kies een sample uit een lijst
- Als het blok langer is dan de sample: de sample loopt (herhaalt)
- Als het blok korter is dan de sample: de sample wordt afgekapt
- Een blok zonder gekoppelde sample is visueel anders (gestippeld/transparant)

### Fase 3 — Afspelen en bijstellen

- **Play/pause** speelt de compositie af volgens de grafische score
- Een **playhead** beweegt over de tijdlijn
- De leerling kan blokken aanpassen, samples wisselen, en opnieuw luisteren
- Geen export — het doel is itereren op het ontwerp

---

## 5. Functionele eisen

### 5.1 Tijdlijn-canvas

| Eis | Prioriteit | Details |
|---|---|---|
| Meerdere sporen (4-6 tracks) | Must | Verticale stapeling, visueel onderscheidbaar |
| Beat-grid achtergrond | Must | Visueel raster dat tijdseenheden toont |
| Horizontaal scrollbaar | Must | Minimaal 32 beats, uitbreidbaar |
| Beat-nummering bovenaan | Should | Elke 4 beats een markering |
| Zoom in/uit | Could | Meer/minder beats zichtbaar |

### 5.2 Blokken tekenen

| Eis | Prioriteit | Details |
|---|---|---|
| Klik-en-sleep om blok te maken | Must | Pointer down → drag → pointer up = nieuw blok |
| Minimale blokgrootte: 1 beat | Must | Voorkomt onzichtbare blokken |
| Snap naar beat-grid (halve beats) | Must | Voorspelbare positionering |
| Blokken verplaatsen (drag) | Must | Binnen en tussen tracks |
| Blokken vergroten/verkleinen | Must | Rechterrand slepen |
| Blokken verwijderen | Must | Selecteer + delete-knop of swipe |
| Visuele feedback tijdens tekenen | Must | Preview van het blok dat ontstaat |
| Collision detection | Should | Blokken mogen niet overlappen |

### 5.3 Blok-eigenschappen

| Eis | Prioriteit | Details |
|---|---|---|
| Kleur per blok | Must | Kleurpalet met 8-10 kindvriendelijke kleuren |
| Label per blok | Should | Kort tekstlabel (max 20 tekens) of icoon |
| Volume per blok | Could | Simpele slider (luid/zacht) |

### 5.4 Sample-bibliotheek

| Eis | Prioriteit | Details |
|---|---|---|
| Voorgeladen set van 15-25 samples | Must | Gevarieerd: natuur, stad, muziek, effecten |
| Samples afluisteren (preview) | Must | Tap op sample = afspelen |
| Sample-naam en categorie | Must | Visueel gegroepeerd |
| Sleep sample naar blok | Must | Drop op bestaand blok koppelt de sample |
| Visuele indicatie gekoppeld/ontkoppeld | Must | Blok verandert van stijl na koppeling |

### 5.5 Audio-playback

| Eis | Prioriteit | Details |
|---|---|---|
| Play / Pause / Stop | Must | Standaard transport controls |
| Visuele playhead | Must | Lijn die meebeweegt met afspelen |
| Blokken zonder sample: stilte | Must | Worden overgeslagen bij playback |
| Loop-mode voor lange blokken | Must | Sample herhaalt als blok > sample-duur |
| Trim voor korte blokken | Should | Sample stopt als blok < sample-duur |

### 5.6 Afbeelding als inspiratie

| Eis | Prioriteit | Details |
|---|---|---|
| Afbeelding bovenaan het scherm | Should | Vaste set van 3-5 afbeeldingen |
| Afbeelding-selector | Should | Dropdown of thumbnails |
| Werkt ook zonder afbeelding | Must | De tool is bruikbaar als losstaand instrument |

---

## 6. Niet-functionele eisen

| Categorie | Eis |
|---|---|
| **Platform** | Moderne browsers (Chrome, Safari, Firefox, Edge) |
| **Touch** | Volledig bruikbaar op iPad/tablet (primair device in klas) |
| **Performance** | Geen merkbare lag bij tekenen/verplaatsen van blokken |
| **Responsief** | Bruikbaar op 1024px+ breed (tablet landscape en desktop) |
| **Toegankelijkheid** | Grote klikgebieden (min 44px), hoog contrast kleuren |
| **Taal** | Nederlands (UI-teksten), geen i18n nodig voor prototype |

---

## 7. Technische opzet

### 7.1 Stack

| Laag | Keuze | Reden |
|---|---|---|
| Framework | React + TypeScript | Zelfde als SoundScout → makkelijke port |
| Build | Vite | Snel, geen config overhead |
| Styling | Tailwind CSS | Consistent met SoundScout |
| State | Zustand | Lichtgewicht, bekend patroon |
| Audio | Tone.js | Zelfde engine als SoundScout |
| Drag/resize | Pointer Events (native) | Blokken tekenen vereist klik-en-sleep; dnd-kit is hier overkill |
| Canvas | HTML/CSS (geen `<canvas>`) | Blokken als DOM-elementen, makkelijker accessible en styleable |

### 7.2 Projectstructuur

```
partituur-zandbak/
├── public/
│   ├── samples/              # 15-25 voorgeladen mp3's
│   └── images/               # 3-5 inspiratie-afbeeldingen
├── src/
│   ├── components/
│   │   ├── Timeline.tsx       # Hoofdcontainer met tracks en grid
│   │   ├── Track.tsx          # Enkel spoor met blokken
│   │   ├── Block.tsx          # Visueel blok (de partituur-eenheid)
│   │   ├── BlockDrawer.tsx    # Tekenen van nieuwe blokken (pointer events)
│   │   ├── Playhead.tsx       # Visuele afspeelpositie
│   │   ├── SampleLibrary.tsx  # Zijpaneel met samples
│   │   ├── SampleCard.tsx     # Enkele sample in de bibliotheek
│   │   ├── TransportBar.tsx   # Play/Pause/Stop controls
│   │   ├── ImageViewer.tsx    # Inspiratie-afbeelding bovenaan
│   │   ├── ColorPicker.tsx    # Kleurkeuze voor blokken
│   │   └── Toolbar.tsx        # Actieknoppen (verwijderen, label, kleur)
│   ├── stores/
│   │   ├── scoreStore.ts      # Blokken, tracks, selectie
│   │   └── audioStore.ts      # Playback state, huidige beat
│   ├── services/
│   │   └── AudioEngine.ts     # Tone.js wrapper (versimpeld)
│   ├── types/
│   │   └── index.ts           # Block, Track, Sample interfaces
│   ├── utils/
│   │   ├── grid.ts            # Beat ↔ pixel conversies, snap-logica
│   │   └── collision.ts       # Overlap-detectie tussen blokken
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

### 7.3 Kerntypen

```typescript
interface Block {
  id: string;
  trackIndex: number;
  startBeat: number;        // positie op tijdlijn
  durationBeats: number;    // breedte van het blok
  color: string;            // hex of preset-naam
  label?: string;           // optioneel tekstlabel
  sampleId?: string;        // null = placeholder, gevuld = gekoppeld
  volume?: number;          // 0-100, default 80
}

interface Track {
  id: string;
  index: number;
  name?: string;            // optioneel ("Track 1")
}

interface Sample {
  id: string;
  name: string;             // "Wind", "Voetstappen"
  category: string;         // "natuur", "stad", "muziek"
  url: string;              // pad naar mp3
  durationSeconds: number;  // voor loop-berekening
  color: string;            // visuele kleur in bibliotheek
}

interface ScoreState {
  blocks: Block[];
  tracks: Track[];
  selectedBlockId: string | null;
  activeColor: string;      // huidige tekenkleur
  totalBeats: number;       // lengte van de score (32 default)
  bpm: number;              // tempo (120 default)
}
```

### 7.4 Kerninteractie: blokken tekenen

Het tekenen van blokken is de belangrijkste nieuwe interactie en verdient extra aandacht:

```
Modus: TEKENEN (default)
─────────────────────────

1. pointerdown op lege plek in track
   → Registreer startBeat (snap naar halve beat)
   → Toon preview-blok (semi-transparant)

2. pointermove (horizontaal)
   → Update breedte van preview-blok
   → Snap eindpositie naar halve beat
   → Minimum breedte = 1 beat

3. pointerup
   → Creëer definitief Block in scoreStore
   → Blok krijgt actieve kleur
   → Blok is meteen geselecteerd

Modus: SELECTEREN
─────────────────

1. pointerdown op bestaand blok
   → Selecteer het blok (toon handles)
   → Korte delay (150ms) onderscheidt tap van drag

2. pointermove na delay
   → Verplaats blok (snap naar grid)

3. pointerup op rechter resize-handle
   → Start resize-modus
```

De twee modi (tekenen vs. selecteren) worden automatisch onderscheiden: klik op lege ruimte = tekenen, klik op blok = selecteren.

---

## 8. Visueel ontwerp

### 8.1 Uitgangspunten

De interface moet kindvriendelijk aanvoelen maar niet kinderachtig zijn. Denk aan: heldere kleuren, afgeronde hoeken, duidelijke iconen, minimale tekst. De grafische score moet eruitzien als een "klankkaart" — abstract maar begrijpelijk.

### 8.2 Kleurenpalet blokken

Een vaste set van 8-10 kleuren die goed van elkaar te onderscheiden zijn, ook voor kinderen met kleurenblindheid. Suggesties: warm rood, oranje, geel, groen, blauw, paars, roze, bruin. Elke kleur heeft een lichte variant (blok) en donkere variant (rand).

### 8.3 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Afbeelding / Inspiratie]                          [Wissel] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Beats: 1   2   3   4 | 5   6   7   8 | 9  10  11  12 | …  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Track 1  [████ wind ███]        [██ tikken ██]       │    │
│  │ Track 2       [█████████ regen █████████]             │    │
│  │ Track 3                    [███]    [███]    [███]    │    │
│  │ Track 4  [░░░░░░░░]                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│        ▲ playhead                                            │
│                                                              │
│  ┌──────────┐  ┌─────────────────────────────────────────┐   │
│  │ ▶ ■ kleur│  │ Sample-bibliotheek                      │   │
│  │ transport │  │ 🌳 Wind  🌧 Regen  🚗 Auto  🎵 Fluit │   │
│  └──────────┘  └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

░░░ = placeholder blok (geen sample gekoppeld)
███ = blok met gekoppelde sample
```

---

## 9. Fasering

### Fase 1 — Skelet (week 1)

Projectopzet (Vite + React + TS + Tailwind + Zustand). Tijdlijn met 4 tracks en beat-grid. Blokken tekenen via pointer events. Blokken verplaatsen en resizen. Selectie en verwijderen.

**Resultaat:** je kunt blokken tekenen en manipuleren, maar er is nog geen geluid.

### Fase 2 — Geluid (week 2)

Tone.js integratie met versimpelde AudioEngine. Sample-bibliotheek met 15-20 voorgeladen geluiden. Koppelen van samples aan blokken (drag of select). Playback met playhead. Loop-mode voor blokken langer dan de sample.

**Resultaat:** een werkend prototype waarbij je eerst tekent en dan geluid koppelt.

### Fase 3 — Polish (week 3)

Labels en kleuren op blokken. Inspiratie-afbeelding bovenaan. Touch-optimalisatie voor iPad. Visuele polish (animaties, feedback). Eerste gebruikerstest met 2-3 kinderen.

**Resultaat:** een testbaar prototype klaar voor feedback.

---

## 10. Succescriteria

Het prototype is geslaagd als:

1. Een kind van 8-12 jaar kan zonder uitleg blokken tekenen op de tijdlijn
2. Het tekenen van blokken voelt intuïtief en responsief (geen lag, duidelijke feedback)
3. De overgang van "ontwerpen" naar "geluid koppelen" is begrijpelijk
4. Een kind kan een compositie van 30 seconden ontwerpen en afspelen binnen 10 minuten
5. De interactiepartronen zijn overdraagbaar naar SoundScout als nieuwe compose-mode

---

## 11. Open vragen voor het prototype

- Is een expliciete moduswissel (tekenen vs. verplaatsen) nodig, of werkt automatische detectie goed genoeg op touch?
- Moeten blokken een minimale hoogte hebben, of vullen ze altijd de volledige track-hoogte?
- Hoe tonen we visueel het verschil tussen "dit blok loopt" en "dit blok kapt af"?
- Moet de sample-bibliotheek een zijpaneel zijn of een overlay/modal?
- Is 4 tracks genoeg voor het prototype, of hebben we er meer nodig om het concept goed te testen?
- Willen we een "wisser" tool naast tekenen, of is selecteren + delete voldoende?

---

## 12. Relatie met SoundScout

Dit project deelt bewust dezelfde tech-stack (React, TypeScript, Vite, Zustand, Tailwind, Tone.js) zodat succesvolle patronen direct kunnen worden overgezet. De componenten die we hier bouwen (BlockDrawer, grid-snapping, pointer-event-based resize) zijn de bouwstenen voor SoundScout's toekomstige partituur-modus (#68).

Specifiek kunnen de volgende zaken na validatie naar SoundScout worden geport:

- Het blok-teken-interactiemodel (BlockDrawer)
- Placeholder-blokken (Block zonder sampleId)
- Sample-koppeling UI (drop sample op blok)
- Loop-visualisatie voor blokken langer dan de sample
- Eventueel: kleuren en labels op clips

---

*Dit document is de basis voor het zandbak-project. Bijwerken naarmate het prototype vordert.*
