# Concept: Visuele Partituur-Tool

**Status:** Conceptfase · **Oorsprong:** PRD Soundscape Storyboard App + brainstorm 2026-03-14

---

## 1. Het kernidee

Kinderen kijken naar een beeld (of video) en tekenen eerst een **visuele partituur** — een grafische indeling van hoe het moet gaan klinken. Pas daarna zoeken ze samples die bij hun ontwerp passen.

Dit is de **omgekeerde workflow** van het huidige SoundScout:

| | Huidige SoundScout | Partituur-aanpak |
|---|---|---|
| **Stap 1** | Samples verzamelen op locaties | Beeld bekijken en bespreken |
| **Stap 2** | Samples op tijdlijn plaatsen | Blokken tekenen: lang/kort, veel/weinig |
| **Stap 3** | Afspelen en bijstellen | Samples zoeken die passen bij de blokken |
| **Stap 4** | — | Afspelen, bijstellen, uitvoeren |

---

## 2. Waarom dit pedagogisch sterk is

### Het probleem dat het oplost

Bij live soundscape-oefeningen in de klas (en bij SoundScout) slaan leerlingen vaak de **ontwerpfase** over. Ze gaan meteen uitproberen met geluiden, zonder na te denken over structuur, timing en opbouw. Het resultaat: een willekeurige opeenstapeling van klanken zonder muzikaal verhaal.

### Wat notatie toevoegt

Een visuele partituur dwingt leerlingen om **eerst na te denken**:

- **Wanneer** moet een geluid beginnen en stoppen?
- **Hoe lang** moet het duren?
- **Hoeveel** geluiden klinken tegelijk?
- **Waar** in het verhaal zit spanning, stilte, climax?

Dit is grafische notatie — geen traditionele muzieknotatie, maar blokken die tijd en klank visueel representeren. Het is toegankelijk voor kinderen die geen noten lezen, maar het traint wel hetzelfde muzikale denken.

### Aansluiting bij leerlijnen

- **Componeren & improviseren**: structuur aanbrengen vóór uitvoering
- **Luisteren**: bewust nadenken over "wat hoor ik?" en "wat wil ik horen?"
- **Uitvoeren**: de partituur als gids voor live of digitale uitvoering
- **Sound design**: geluiden koppelen aan beelden en verhalen

---

## 3. Hoe het eruit zou zien — de gebruikersflow

### Fase 1: Bekijken en bespreken

De docent kiest een beeld of storyboard (dit hebben we al). Klassikaal of in groepjes bespreken de leerlingen:

> "Wat zie je gebeuren? Welke geluiden horen hierbij? Wanneer begint het, wanneer stopt het?"

### Fase 2: Partituur tekenen

De leerling opent de **partituur-modus** in de studio. De tijdlijn is leeg. In plaats van samples te slepen, **tekent** het kind blokken:

- **Klik en sleep** op de tijdlijn om een blok te maken
- **Breedte** = duur (lang blok = lang geluid, kort blok = kort geluid)
- **Track-positie** = laag (meerdere sporen = meerdere gelijktijdige geluiden)
- Optioneel: **label** of **icoon** op het blok ("wind", "voetstappen", 🌊)
- Optioneel: **kleur** per blok (categorie of performer)

Het resultaat is een **grafische score** — een visueel plan van de compositie.

### Fase 3: Samples koppelen

Nu gaat de leerling op zoek naar geluiden die passen:

- Bezoek locaties en verzamel samples (bestaande SoundScout-flow)
- Of kies uit een voorgeselecteerde bibliotheek (template van docent)
- **Koppel** een sample aan een blok: sleep de sample op het blok, of selecteer het blok en kies een sample

**Cruciale interactie: loop-mode**

Als het blok langer is dan de sample → de sample herhaalt (loopt) tot het blok eindigt. Als het blok korter is dan de sample → de sample wordt afgekapt (trimming, al geïmplementeerd). De leerling kan het trim-punt van de loop verfijnen: welk stukje van de sample wordt herhaald?

### Fase 4: Verfijnen en uitvoeren

- Afspelen en luisteren: past het bij het beeld?
- Bijstellen: blokken verlengen/verkorten, samples wisselen
- Exporteren als MP3/video (bestaande functionaliteit)
- Of: de partituur gebruiken als gids voor een **live uitvoering** (de partituur als grafische score op het scherm)

---

## 4. Technische haalbaarheid

### Wat er al is in SoundScout

| Component | Status | Hergebruik |
|---|---|---|
| Tijdlijn met tracks en blokken | ✅ Volledig | Clips = blokken |
| Storyboard-viewer (beeld bovenaan) | ✅ Volledig | Zelfde component |
| Drag-and-drop op tijdlijn | ✅ Volledig | Zelfde interactie |
| Clip trimming (trimStart/trimEnd) | ✅ Volledig | Bepaalt loop-segment |
| Secties op tijdlijn | ✅ Volledig | Structuur van de partituur |
| Template-systeem voor docenten | ✅ Volledig | Docent maakt opdracht |
| Sample-bibliotheek | ✅ Volledig | Koppeling blok → sample |
| Audio scheduling (Tone.js) | ✅ Volledig | Playback van gekoppelde samples |
| ClipEffects (volume, mute) | ✅ Actief | Per-blok volume |
| ClipEffects (pitch, reverb, pan) | 🔶 Types klaar | Nog geen audio-nodes |
| Export (MP3, video) | ✅ Volledig | Exporteer het eindresultaat |

### Wat nieuw gebouwd moet worden

| Feature | Complexiteit | Beschrijving |
|---|---|---|
| **Clip-loop** | Medium | `loop: boolean` + `loopEnd` op Clip; Tone.js `player.loop = true` in scheduling |
| **Blok tekenen** | Medium-Hoog | Nieuw interactiemodel: klik-en-sleep om blok te creëren (i.p.v. sample slepen) |
| **Placeholder-blokken** | Medium | Clips zonder `sampleId` — visueel blok, geen audio tot sample gekoppeld |
| **Sample koppelen aan blok** | Medium | UI: sleep sample op bestaand blok, of selecteer + kies |
| **Blok-labels/iconen** | Laag | Optioneel `label` veld op Clip interface |
| **Partituur-modus** | Medium | Nieuwe compose mode met aangepaste studio-UI |
| **Live performance view** | Laag-Medium | Fullscreen partituur met playhead, zonder studio-controls |

---

## 5. Elementen direct toepasbaar op huidige SoundScout

Ongeacht of de volledige partituur-tool in SoundScout komt, zijn deze features zelfstandig waardevol:

### 5a. Clip-loop (prioriteit: hoog)

**Wat**: een clip kan herhalen binnen zijn positie op de tijdlijn. De sample speelt opnieuw af tot de clip-duur verstreken is.

**Waarom waardevol nu**: korte samples (bijv. een tikje van 0.3s) worden bruikbaarder. Een leerling kan een ritmisch patroon creëren door één sample te loopen over 4 beats. Gecombineerd met trimming: loop alleen het stukje dat je wilt.

**Technisch**: voeg `loop?: boolean` toe aan Clip interface. In AudioService scheduling: `player.loop = true; player.loopStart = trimStart; player.loopEnd = trimEnd; player.start(time, trimStart, totalClipDuration);`

### 5b. Clip-labels (prioriteit: laag)

**Wat**: optioneel kort label op een clip ("wind", "tikken", "achtergrond").

**Waarom waardevol nu**: maakt de tijdlijn leesbaarder, vooral bij composities met veel clips van dezelfde kleur. Helpt leerlingen bij het organiseren en bespreken van hun werk.

**Technisch**: voeg `label?: string` toe aan Clip interface. Toon in Clip component als tooltip of inline tekst.

### 5c. Track-kleuren (prioriteit: laag)

**Wat**: optionele kleur per track, naast de bestaande sample-kleuren.

**Waarom waardevol nu**: visuele groepering. "Blauwe track = achtergrondgeluiden, rode track = korte effecten." Maakt de tijdlijn meer als een partituur leesbaar.

**Technisch**: voeg `color?: string` toe aan Track interface. Toon als zijbalk-kleur.

---

## 6. Open vragen

- **Moet dit een aparte app worden of een modus in SoundScout?** De technische overlap is groot (80%+ hergebruik), maar de UX-focus verschilt. Een aparte modus is het meest pragmatisch.
- **Hoe zit het met samenwerking?** De PRD beschrijft groepjes van 4-5 leerlingen. SoundScout is nu single-user. Samenwerking (meerdere leerlingen aan één partituur) is een grote uitbreiding (#42/#63 in TODO).
- **Is er een markt voor een standalone grafische-notatie-tool?** Los van SoundScout zou dit als eigen product kunnen bestaan, gericht op de bredere muziekonderwijs-markt.
- **Video-ondersteuning**: de PRD noemt video naast afbeeldingen. SoundScout heeft #48 (Video-Storyboard) al als toekomstig item.

---

## 7. Mogelijke fasering

### Fase A — Loop-functie (standalone waardevol)
Voeg clip-loop toe aan SoundScout. Geen afhankelijkheid van de partituur-tool.

### Fase B — Partituur-modus (prototype)
Nieuwe compose mode: "ontwerp". Lege tijdlijn waar je blokken tekent. Blokken zijn placeholder-clips zonder sample. Storyboard-viewer toont het beeld.

### Fase C — Sample-koppeling
Koppel samples aan placeholder-blokken. Loop-mode zorgt dat korte samples lange blokken vullen.

### Fase D — Verfijning
Labels, iconen, track-kleuren, live performance view.

---

*Dit document is een levend concept. Bijwerken naarmate het idee rijpt.*
