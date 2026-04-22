# CONTENT-THEMA.md

Brainstorm- en werkbestand voor alle **inhoudelijke** kant van SoundScout:
thema's, locaties, geluiden, praatplaten, storyboards, en didactische tips.

Dit bestand gaat **niet** over app-features of implementatiewensen —
die horen in [`docs/TODO.md`](TODO.md). Als er tijdens het brainstormen
een technische wens opduikt ("we hebben een sample-editor nodig",
"zou goed zijn als een locatie meer dan 6 hotspots kon hebben", ...)
verhuist die direct naar `TODO.md`.

---

## Leeswijzer

Structuur is hybride:

1. **Backlog per categorie** — snelle ideeën per type content.
   Hier mogen losse kreten staan, 1-regelige prikkels, "wat als..."-gedachten.
2. **Uitgewerkte thema's** — per thema een eigen sectie met locaties,
   geluiden, koppelingen, didactische suggesties. Hier staan zowel
   *live* thema's als thema's die we aan het uitwerken zijn.

## Statuslabels

Plaats achter elk idee of thema een label tussen vierkante haken:

- `[idee]` — losse prikkel, nog niet doordacht
- `[uitgewerkt]` — voldoende uitgewerkt om in te kunnen plannen
- `[live]` — zit al in de app

Voorbeeld: `- Piratenschip [idee]`

## Conventies

- Nederlands.
- Geen emoji's.
- Bij verwijzing naar bestaande techniek: link naar het betreffende
  doc of bestand (bv. `src/data/themes/basis/`).
- Concrete sample-namen altijd in aanhalingstekens
  (bv. "koe die loeit", "schaatsen over ijs").

## Werkwijze nieuwe locatie

Voor elke nieuwe locatie doorlopen we twee stappen. Pas als beide
klaar zijn, is de locatie klaar om de implementatie in te gaan
(volgens `docs/NIEUWE-LOCATIE-THEMA.md`).

1. **Activiteitenlijst (~20 items)** — zichtbare acties/activiteiten
   die op de locatie plaatsvinden. Dit is de input voor de prompt
   waarmee de locatie-afbeelding wordt gegenereerd. Mag ruim zijn;
   niet alle activiteiten hoeven later een geluid te krijgen.
2. **Geluiden koppelen aan activiteiten (minimaal 6, liefst meer)** —
   selecteer uit de activiteitenlijst welke als hotspot met sample
   worden geïmplementeerd. Noteer per geluid:
   - korte naam (label dat leerling ziet)
   - karakter (kort/lang, percussief/continu, pitched/unpitched)
   - muzikale functie (puls, sfeer, accent, textuur, melodisch)
   - eventuele technische aandachtspunten (bv. loopable, reverb werkt goed)

Didactische hook per locatie (welk muzikaal concept lokt deze locatie
uit?) is verplicht — die sturen we later richting de docentenhandleiding.

---

## Backlog — Thema-ideeën

Grote, samenhangende werelden met meerdere locaties.

- _(nog in te vullen)_

## Backlog — Losse locatie-ideeën

Losse locaties die in een bestaand of nieuw thema passen.
Als het duidelijk bij een thema hoort, noteer dat erbij:
`- Kerk (thema: basis) [idee]`.

Gepland voor thema `basis` (zie uitwerking bij het thema zelf):

- Bibliotheek (thema: basis) `[uitgewerkt]` — hook: dynamiek/contrast (stilte vs luid)
- Werkplaats (thema: basis) `[uitgewerkt]` — hook: puls/ritme, loopable geluiden
- Café (thema: basis) `[uitgewerkt]` — hook: soundscape/omgevingsgeluid
- Oplaadpunt (thema: basis) `[uitgewerkt]` — hook: synthetisch contrast tov akoestische locaties

Op de stadsplattegrond zichtbaar maar nu niet ingepland (later misschien):

- Park (thema: basis) `[idee]` — hook: textuur/lagen (fontein, wind, eenden)
- Bushalte (thema: basis) `[idee]` — hook: aankomst/vertrek als dramaturgische trigger
- Woonhuizen (thema: basis) `[idee]` — hook: huiselijkheid, ritme van de dag

Genoemde alternatieven buiten de kaart (nog niet ingepland):

- Markt (thema: basis) `[idee]` — rijk aan stemmen, munten, roepen van kooplui
- Station (thema: basis) `[idee]` — groter dan bushalte; treinfluit, aankondigingen
- Kerk / klokkentoren (thema: basis) `[idee]` — akoestische galm; werkt goed met reverb (#33)
- Zwembad (thema: basis) `[idee]` — water, echo, fluitje; natte resonante klanken
- Bouwplaats (thema: basis) `[idee]` — puls/zwaar materieel; overlap met werkplaats, mogelijk dubbelop

## Backlog — Praatplaat-ideeën

Enkele afbeeldingen waarop leerlingen geluiden plaatsen
(zie `src/data/praatplaatImages.ts` en `docs/PLAN-72-PRAATPLAAT.md`).
Noteer erbij of het plaatje geschikt is voor `teacher`, `student` of `both`,
en welk geluiden-thema erbij hoort.

- _(nog in te vullen)_

## Backlog — Storyboard-ideeën

Meerdelige beeldverhalen die een muzikale structuur uitlokken
(zie `src/data/storyboards.ts`). Noteer beoogd aantal frames en thema.

- _(nog in te vullen)_

## Backlog — Sample-ideeën

Losse geluiden die nog missen of die een bestaande locatie zouden
versterken. Graag per locatie of thema groeperen.

- _(nog in te vullen)_

## Backlog — Didactische tips

Inzichten, lesideeën, muzikale concepten en werkvormen die we per
thema of opdracht kunnen meeleveren (bv. in de docentenhandleiding).
Onderwerpen om in uit te werken:

- muzikale concepten (herhaling, contrast, dynamiek, tempo, textuur, vorm)
- werkvormen (klassikaal, duo's, individueel, podium-presentatie)
- koppelingen aan leerlijnen muziek in het basisonderwijs
- leeftijdsadviezen per thema of opdrachttype

Ideeën:

- _(nog in te vullen)_

---

# Uitgewerkte thema's

Skeletons per thema. Vul aan waar relevant; laat leeg wat nog niet
besproken is. Statuslabel op themaniveau geeft aan hoe ver het staat.

---

## Thema: basis — "De Stad" `[live]`

**Map:** `src/data/themes/basis/`

### Locaties

Live:

- `boerderij` — De Boerderij `[live]` (naam in kaart: "Kinderboerderij" — zie TODO)
- `speeltuin` — De Speeltuin `[live]`
- `gymzaal` — De Gymzaal `[live]`
- `muziekwinkel` — De Muziekwinkel `[live]` (naam in kaart: "Muzieklokaal" — zie TODO)
- `klaslokaal` — Het Klaslokaal `[live]`

In uitwerking (zie subsecties verderop):

- `bibliotheek` — De Bibliotheek `[uitgewerkt]`
- `werkplaats` — De Werkplaats `[uitgewerkt]`
- `cafe` — Het Café `[uitgewerkt]`
- `oplaadpunt` — Het Oplaadpunt `[uitgewerkt]`

### Samples per locatie

Korte inventaris en gaten. Waar nodig sample-wensen.

- boerderij — _(te beschrijven)_
- speeltuin — _(te beschrijven)_
- gymzaal — _(te beschrijven)_
- muziekwinkel — _(te beschrijven)_
- klaslokaal — _(te beschrijven)_

### Praatplaten gekoppeld aan dit thema

- `pp-koningsdag` — Koningsdag `[live]`
- `pp-robotfabriek` — Robotfabriek `[live]`
- `pp-sportveld` — Sportveld `[live]`

### Storyboards gekoppeld aan dit thema

- `verspringen` — 3 frames `[live]`

### Didactische suggesties

- _(nog in te vullen)_

### Verbeterideeën voor dit thema

- Kaart toont locaties die nog niet bestaan (park, café, oplaadpunt,
  bushalte, werkplaats, bibliotheek, woonhuizen). Zolang die niet
  ingepland staan, overwegen of de kaart aangepast moet worden om
  verwarring te voorkomen.
- Naaminconsistentie i18n ↔ kaart — apart opgenomen in `docs/TODO.md`.

---

### Nieuwe locatie: Bibliotheek `[uitgewerkt]`

**Didactische hook:** dynamiek & contrast. De enige locatie in thema
`basis` waarin stilte en fluisteren kerngeluiden zijn. Leerlingen
leren het verschil tussen zacht/luid bewust inzetten.

**Activiteitenlijst (~20, voor afbeeldings-prompt):**

- _(in te vullen)_

**Geluiden gekoppeld aan activiteiten (min. 6, liefst meer):**

- _(in te vullen)_

**Didactische suggesties:**

- _(in te vullen)_

---

### Nieuwe locatie: Werkplaats `[uitgewerkt]`

**Didactische hook:** puls & ritme. Veel gereedschapsgeluiden zijn
regelmatig en loopable (feature #65). Uitgelezen locatie om te
oefenen met beat, metrum en het laag-leggen van ritmische textuur.
Contrast tussen hoog (slijptol, boor) en laag (moker, hamer) geeft
natuurlijke mogelijkheid tot register-bewustzijn.

**Activiteitenlijst (~20, voor afbeeldings-prompt):**

1. Timmerman slaat spijker in houten plank met hamer
2. Iemand zaagt plank doormidden op werkbank met handzaag
3. Elektrische boormachine gaat door muur, stof dwarrelt
4. Schroevendraaier draait schroef in kast
5. Metalen vijl schuurt over koperen buis in bankschroef
6. Slijptol maakt vonken op een stuk metaal
7. Moker slaat op metalen paal of beitel
8. Schaafmachine trekt krullen van een plank
9. Werkbank met bankschroef die wordt dichtgedraaid
10. IJzeren ketting hangt over werkbank en valt rinkelend neer
11. Gereedschapsbord aan muur met hamers, tangen, sleutels
12. Verfblik dat wordt opengewrikt met schroevendraaier
13. Verfroller over witte muur
14. Kwast wordt in emmer water uitgespoeld
15. Emmer met schroeven die wordt omgestoten
16. Fietspomp wordt ingedrukt (luchtpomp-geluid)
17. Houtkrullen en zaagsel op de vloer
18. Ladder staat tegen stellage
19. Werklamp boven werkbank
20. Iemand veegt de vloer aan met brede bezem

**Geluiden gekoppeld aan activiteiten (8 voorgesteld):**

| Label | Bron-activiteit | Karakter | Muzikale functie | Technisch |
|---|---|---|---|---|
| "Hamer" | #1 hamer op spijker | kort, percussief, unpitched, laag-mid | puls / downbeat | loopable; goed startpunt voor beat |
| "Zaag" | #2 handzaag heen-en-weer | middellang, ruis-achtig, unpitched | puls / textuur | loopable; mooi in 2-beat cyclus |
| "Boormachine" | #3 boormachine | lang, continu, hoogfrequent pitched | sustain / drone | trim belangrijk (kan irritatief worden) |
| "Vijl" | #5 metalen vijl | middellang, schurend, ruis | textuur / accent | goed met reverb voor ruimtelijkheid |
| "Slijpvonken" | #6 slijptol met vonken | lang, schril-pitched, hoog | accent / fel | opvallend — beperken tot sporadisch |
| "Moker" | #7 moker op paal | zeer kort, zwaar, laag | accent / impact | sterk als downbeat; pitch down mogelijk |
| "Ketting" | #10 ketting valt | kort-middel, rinkelend, metallisch | accent / kleur | clust van tikjes; mooi in stereo |
| "Luchtpomp" | #16 fietspomp | kort, gedempt, ademend | puls / off-beat | kan ritmisch met hamer afwisselen |

Dit geeft acht hotspots — twee boven het minimum van zes. Hamer +
luchtpomp vormen al een 2-stemmige beat; moker en slijpvonken geven
accenten; boormachine levert drone-achtige bodem.

**Didactische suggesties:**

- Opdracht "Bouw een werkplaats-beat" — start met hamer op beat 1,
  voeg luchtpomp toe op off-beat, moker op beat 3. Leer daarmee
  downbeat vs off-beat.
- Contrast-oefening — alleen slijpvonken + hamer. Leerling ervaart
  wat "hoog vs laag" doet in een compositie.
- Loop-oefening — gebruik feature #65 (clip-loop) om hamer en zaag
  automatisch te herhalen; leerling focust op wanneer loops starten
  en stoppen.

---

### Nieuwe locatie: Café `[uitgewerkt]`

**Didactische hook:** soundscape & omgevingsgeluid. Veel continue,
zachte klanken die onder elkaar kunnen liggen zonder te botsen.
Minder ritmisch dan werkplaats, meer sfeer — ideaal als tegenhanger
voor een compositie die beide locaties gebruikt.

**Activiteitenlijst (~20, voor afbeeldings-prompt):**

- _(in te vullen)_

**Geluiden gekoppeld aan activiteiten (min. 6, liefst meer):**

- _(in te vullen)_

**Didactische suggesties:**

- _(in te vullen)_

---

### Nieuwe locatie: Oplaadpunt `[uitgewerkt]`

**Didactische hook:** synthetisch vs akoestisch. De enige locatie in
`basis` met elektronische geluiden. Geeft leerlingen toegang tot
muzikale stijlen buiten het akoestische (elektro, experimenteel) en
creëert interessant contrast met boerderij, park of café.

**Activiteitenlijst (~20, voor afbeeldings-prompt):**

- _(in te vullen)_

**Geluiden gekoppeld aan activiteiten (min. 6, liefst meer):**

- _(in te vullen)_

**Didactische suggesties:**

- _(in te vullen)_

---

## Thema: winterspelen — "Winterspelen" `[live]`

**Map:** `src/data/themes/winterspelen/`

### Locaties

- `winterdorp` — Winterdorp `[live]`
- `bobslee` — Bobslee baan `[live]`
- `skipiste` — Skipiste `[live]`
- `ijsarena` — IJsarena `[live]`

### Samples per locatie

- winterdorp — _(te beschrijven)_
- bobslee — _(te beschrijven)_
- skipiste — _(te beschrijven)_
- ijsarena — _(te beschrijven)_

### Praatplaten gekoppeld aan dit thema

- _(nog geen)_

### Storyboards gekoppeld aan dit thema

- _(nog geen)_

### Didactische suggesties

- _(nog in te vullen)_

### Verbeterideeën voor dit thema

- _(nog in te vullen)_

---

<!--
Sjabloon voor een nieuw thema — kopieer dit blok en vul in.

## Thema: {id} — "{Werknaam}" `[idee|uitgewerkt|live]`

**Map:** `src/data/themes/{id}/` (nog niet aangemaakt)

### Concept
Korte beschrijving van sfeer, doelgroep, muzikale mogelijkheden.

### Locaties
- `{id}` — Naam `[idee]`
  - Hotspot-ideeën: ...
  - Sample-ideeën: ...

### Praatplaat-ideeën voor dit thema
- ...

### Storyboard-ideeën voor dit thema
- ...

### Didactische suggesties
- Muzikaal concept dat dit thema uitlokt: ...
- Werkvorm: ...
- Leeftijdsadvies: ...

### Openstaande vragen
- ...
-->
