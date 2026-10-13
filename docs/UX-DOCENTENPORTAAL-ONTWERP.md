# UX-docentenportaal — ronde 3: het gekozen ontwerp

**Datum:** 13-10-2026 · **Branch:** `claude/teacher-portal-ux-research-389785` · **Status:** ontwerp; er is nog niets gebouwd. Bouwen pas na 27-10, na jouw akkoord.

**Volledige flow, klikbaar:** [`docs/mockups/docentenportaal-flow.html`](mockups/docentenportaal-flow.html)
- Eén bestand, werkt zonder internet.
- Met **Volgende stap →** loop je de les in 19 stappen door. Met **🗺️ Overzicht** spring je naar elk scherm.
- Met **Bekijk als** wissel je tussen laptop, digibord, tablet en telefoon. Het hele portaal past zich aan.
- **Notities:** bij elk scherm staat rechts een notitieveld. Daarnaast hoort bij elk oranje nummer in het scherm een eigen veld. Tik op een nummer om erheen te springen.
- **Exporteer notities** geeft alles als markdown, gegroepeerd per scherm.
- Screenshots van alle stappen staan in [`docs/mockups/flow/`](mockups/flow/).

Eerdere rondes: [onderzoek](UX-DOCENTENPORTAAL-ONDERZOEK.md) · [varianten](UX-DOCENTENPORTAAL-VARIANTEN.md).

---

## 1. Jouw keuzes en hoe ik ze heb verwerkt

| Scherm | Jouw keuze (export 13-10) | Verwerkt als |
|---|---|---|
| Opdracht klaarzetten | Combinatie: **D** als structuur, *Zelf samenstellen* en *Kant-en-klare les* omgedraaid; daarna het wizardgevoel van **A** met een scherm om instellingen aan te passen **vóór** de code; op het codescherm net als **B** instellingen kunnen wijzigen | Wizard in 3 stappen: **1 Kies** (D-indeling, *Zelf samenstellen* eerst, telefoonvoorbeeld rechts) → **2 Controleer & pas aan** (A) → **3 Code op het bord** (B, met knop ⚙ *Instellingen* die een paneel opent) |
| Klaspagina | **A · Tabs volgens de les** | Tabs *1 Klaarzetten · 2 Tijdens de les · 3 Terugkijken*. De kop met code, *Presenteren* en *Feedback geven* staat altijd bovenaan |
| Presenteren | **Zoals nu** ("de afbeelding staat echt centraal; de namenlijst kun je rechtsboven verbergen") | Ongewijzigd nagebouwd in de flow, inclusief de keuze vooraf, het zijpaneel, de montagelijn en de feedbackrij. **Geen ontwerpwijziging** |
| Feedback geven | **A · Werklijst**, met een betere weergave op de telefoon ("feedbackveld onder de aangeklikte kaart") en **afbeeldingen boven de tijdlijn** | Laptop/tablet: lijst links, inzending rechts. Telefoon: het feedbackveld **klapt open onder de aangetikte kaart**. Bovenaan staat het beeld (de plaat met de plek van de leerling, of de scènes bij een storyboard), daaronder een **sleepbare tijdlijn** |
| Dashboard | **B · Vandaag**, en "Open klas" mag een echte (blauwe) knop zijn | Grote kaart "Nu" met **Open klas** als donkerblauwe knop (brand-900), plus *Presenteren* en *Code op het bord*. Daaronder de andere klassen als rijen, elk met een blauwe knop *Open klas* |

---

## 2. De flow in één oogopslag

```
Inloggen ─► Dashboard · Vandaag ─┬─► Open klas ─► Klas (tabs) ─┬─► Presenteren (zoals nu)
                                 │                              ├─► Feedback geven (werklijst)
   (eerste keer: Maak je         ├─► Opdracht kiezen ─┐         └─► Terugkijken ─► Klasgenoten / Delen
    eerste klas) ─► wizard       │                    ▼
                                 └─► Lesideeën ──► Wizard: 1 Kies ─► 2 Controleer ─► 3 Code op het bord ─► Klas · Tijdens de les
```

### Klikken: nu tegenover dit ontwerp

| Taak | Nu | Ontwerp |
|---|---|---|
| Eerste keer: klas maken → opdracht → code op het bord | 8 + zoeken | **6**: *Maak je eerste klas* → *Maak klas en kies een opdracht* → vorm → bron → *Volgende* → *Zet klaar*. Het codescherm staat er dan al |
| Les starten met een kant-en-klare les | 5–7 | **5**: *Opdracht kiezen* → tab *Kant-en-klare les* → les → *Volgende* → *Zet klaar* |
| Tijdens de les: wie is klaar? | 1 + ±3 schermen scrollen + verversen | **1**: *Open klas* opent op *Tijdens de les*, en de pagina ververst vanzelf |
| Presenteren | 5 | **4**: *Presenteren* staat nu ook op het dashboard; daarna gaat het zoals nu |
| Feedback × 18 leerlingen | ±115 | **±72**: ▶, sticker, ster, *Opslaan & volgende* |
| Code later opnieuw op het bord | 2 (terug naar het dashboard) | **1**: *⛶ Op het bord* in de kop van elke klaspagina, of *Code op het bord* op de dashboardkaart |

---

## 3. Ontwerp per scherm

De nummers ①②… komen overeen met de oranje nummers in de mockup.

### 3.1 Dashboard · Vandaag
`flow-03` · telefoon: `flow-20` · eerste keer: `flow-02`

1. **Tabs** *Mijn klassen · Lesideeën · Eigen materiaal*. "Leskaarten" heet "Lesideeën"; de inhoud blijft hetzelfde.
2. **Kaart "Nu"**: de laatst gebruikte klas met plaatje, code, actieve opdracht, het aantal inzendingen en "x nieuw".
3. **Knoppen**: **Open klas** (blauw, groot), *▶ Presenteren* (amber) en *⛶ Code op het bord*.
4. **Andere klassen**: rijen met code, opdracht, "x nieuw", ▶ en een blauwe knop *Open klas*. Bij een klas zonder opdracht staat er *Opdracht kiezen*.
5. **Nieuwe klas** met de teller "4 van 8 klassen gebruikt". Bij 8 van 8 staat er een uitleg in plaats van een knop, dus geen melding meer die vastloopt (BUG-MAXCLASSES-MODAL).
- **Eerste keer** (0 klassen): één grote knop *Maak je eerste klas* en drie stappen ter oriëntatie.
- **Telefoon**: de kaart "Nu" komt boven de rijen; het plaatje valt weg.
- **Verplaatst**: *Klas verwijderen* staat niet meer op de klaskaart maar in de klas onder *Meer opties*.

### 3.2 Nieuwe klas
In het dashboard via *＋ Nieuwe klas*.
- Je vult alleen de naam in. De knop **"Maak klas en kies een opdracht →"** opent meteen stap 1 van de wizard voor die klas.
- Nu kom je na het aanmaken terug op het dashboard.

### 3.3 Wizard · 1 Kies
`flow-04`, `flow-05` · telefoon: `flow-21`

1. **Vervangmelding** bovenaan, als er al een opdracht loopt. Die staat dus in de flow zelf en niet meer in een losse bevestiging.
2. **Tabs**: **Zelf samenstellen** eerst (zoals je vroeg), daarna *Kant-en-klare les*.
3. **Zelf samenstellen** gaat in twee keuzes op hetzelfde scherm:
   - eerst een **vorm in gewone taal** met de vakterm als label: *Samen één plaat verklanken* (Praatplaat), *Een verhaal op muziek zetten* (Storyboard), *Een begin afmaken* (Template) en *Vrij componeren*;
   - daarna de **bron** met plaatjes: platen, verhalen, eigen templates of thema's.
4. **Kant-en-klare les**: een lijst met leskaarten (groep, duur, type).
5. **Voorbeeld voor de leerling** (rechts): een telefoon met titel, beeld, de uitlegstapjes en *Starten*. Het past zich aan je keuze aan. Op een telefoon wordt het een regel "Leerlingen zien: … · Bekijk".
6. **Volgende: controleren →** wordt pas actief als er een keuze is.

### 3.4 Wizard · 2 Controleer & pas aan
`flow-06`

1. **Gekozen opdracht** met *Wijzig* (terug naar stap 1).
2. **Instellingen**, alle met een standaardwaarde, met de tekst "je kunt dit later nog wijzigen":
   - 📝 *Uitleg voor leerlingen*: de opdrachtkaart; standaard is de standaarduitleg.
   - 🎧 *Geluiden uit thema*: alleen bij een praatplaat; standaard het thema van de plaat.
   - ⏱ *Duur*: zien leerlingen; bij een leskaart vooraf ingevuld.
   - 👂 *Klasgenoten laten luisteren*: peer-feedback; standaard **uit**.
3. **Vervangwaarschuwing** (nog een keer, vlak bij de knop).
4. **✓ Zet klaar**: groot, en de enige primaire knop.

### 3.5 Wizard · 3 Code op het bord
`flow-07`, `flow-08`

1. Een donker scherm met **"Ga naar soundscout.nl en typ: 7077"** in grote letters, plus welke opdracht klaarstaat.
2. **Live namen** van leerlingen die zijn begonnen, met de teller "x leerlingen zijn begonnen".
   - Hiervoor is een kleine uitbreiding nodig: een "begonnen"-signaal van leerlingen. Zie open vraag 3.
3. **Knoppen**: *⛶ Volledig scherm*, **⚙ Instellingen** en *Naar de klas →*.
4. **Instellingenpaneel** (zoals je vroeg): dezelfde vier instellingen als in stap 2. Wijzigingen gelden meteen, ook voor leerlingen die al bezig zijn.
- Dit scherm vervangt de groene balk van 8 seconden ("Opdracht is actief!") en de omweg naar de klaskaart om de code te tonen.

### 3.6 Klaspagina · tabs volgens de les
`flow-09` (tijdens de les), `flow-10` (klaarzetten), `flow-15` (terugkijken) · telefoon: `flow-19` · klas zonder opdracht: open via het dashboard (Groep 5a)

**Altijd zichtbaar:**
- de **klascode** rechtsboven met *⛶ Op het bord*;
- een **kopkaart** met de actieve opdracht, **▶ Presenteren (18)** en **💬 Feedback geven • 4 nieuw**.

**De drie tabs:**
- **Tab 1 · Klaarzetten**
  - De opdracht, *Andere opdracht kiezen* (opent de wizard) en *👁 Zoals leerlingen het zien*.
  - Onder **Meer opties** staat alles wat nu open op de pagina staat:
    - uitleg voor leerlingen, geluiden, duur;
    - klasgenoten laten luisteren (schakelaar, tijdslot, feedbackkaart);
    - *Opdracht stoppen…* (met bevestiging);
    - *Naam wijzigen*, *Klas verwijderen…*.
- **Tab 2 · Tijdens de les** (standaard als er een opdracht loopt)
  - Tellers *18 ingeleverd · 4 nieuw* en *6 nog bezig*.
  - Tegels per leerling, met de nieuwste ingeleverde bovenaan (gesorteerd op `submitted_at`).
  - De pagina ververst vanzelf. Tik op een tegel om in het feedbackscherm te luisteren.
- **Tab 3 · Terugkijken**
  - Alle opdrachten, de actieve inbegrepen, met **Bekijk** en een ⋯-menu: *Delen met ouders (link)*, *Opnieuw gebruiken*, *Uit de lijst halen*.
  - Een blok **Wat klasgenoten ervan vonden** met de top 3 en *Bekijk alles*.

**Klas zonder opdracht:** één grote knop *Kies een opdracht →*, plus de eerlijke uitleg dat leerlingen die nu de code intypen alleen vrij kunnen componeren.

**Telefoon:** de kop wordt gestapeld en de subregels onder de tabs vallen weg.

### 3.7 Presenteren — zoals nu
`flow-11` (keuze), `flow-12`, `flow-22` (digibord)

- Ongewijzigd: de keuze *Actieve opdracht / Alle composities*, "Nu te horen: naam · 1/18" en de grote plaat met klikbare 🔊-plekken.
- Rechtsboven: verversen · montagelijn · afspeellijst in/uit · volledig scherm · sluiten.
- De zijlijst heeft sterren van klasgenoten en een schakelaar *Feedback-status*.
- Onderaan: naar het begin · ▶ · *Doorspelen* · *Feedback geven* · *Open montage*.
- **Alleen nieuw** zijn de extra ingangen naar de presentatie: *▶ Presenteren* op de dashboardkaart en in de kop van de klaspagina.
- **Los van het ontwerp, wel een bug:** slepen over de tijdlijn werkt niet met een vinger (zie onderzoek ronde 1, probleem 3). In de mockup werkt het al, om te laten zien hoe het moet voelen. Die reparatie verandert niets aan het ontwerp.

### 3.8 Feedback geven · werklijst
`flow-13` (laptop) · `flow-14` (telefoon)

1. **Filters**: *Nog doen* (standaard) · *Nieuw* · *Alles*, plus een **opdrachtkeuze**, zodat je ook eerdere opdrachten kunt nabespreken (Verspringen).
2. **Werklijst** met naam, titel, "x min geleden" en de status *Nieuw / Beluisterd / ✓ Feedback*, met het nieuwste bovenaan. Openen telt als *Beluisterd*.
3. **Beeld boven de tijdlijn** (zoals je vroeg):
   - bij een praatplaat: de plaat met een gele stip op de plek van de leerling;
   - bij een storyboard: de scènes naast elkaar, en de scène die nu klinkt licht op.
   - bij vrij of template: geen beeld (de tijdlijn ís dan het beeld).
4. **Tijdlijn (montagelijn)** met blokjes per spoor en een rode afspeellijn. Je kunt **overal slepen**, ook met een vinger.
5. **Compliment**: 6 stickers mét tekst ("⭐ Knap gedaan!", "🥁 Lekker ritme!" …).
6. **Sterren met betekenis**: *op weg · goed · top*.
7. **Tip**: 5 voorbeeldzinnen (één tik zet de zin in het tekstvak) en een vrij tekstvak.
8. **Opslaan & volgende →** springt naar de volgende in de lijst.
- **Telefoon:** de lijst blijft één kolom. Tik op een kaart en **het feedbackveld (3–8) klapt open eronder**, met dezelfde opbouw. *Opslaan & volgende* sluit de kaart, opent de volgende en scrolt ernaartoe. Tik nog een keer op een open kaart om hem dicht te klappen.

### 3.9 Wat klasgenoten ervan vonden
`flow-16`

- Het huidige "Feedback-overzicht", met een naam die zegt wat het is.
- Top 3 met *Presenteer top 3* (gaat naar de presentatie zoals nu), en de tabs *Ontvangen / Gegeven*.

### 3.10 Lesideeën en Eigen materiaal
`flow-17`, `flow-18`

- **Lesideeën**: filters op groep, een lijst en details (lesdoel, fases). Eén knop: kies een klas en **"Zet klaar voor deze klas →"**. Die opent **wizard stap 2** met de les al ingevuld, dus de controle en de code op het bord komen er vanzelf achteraan.
- **Eigen materiaal**: *Uitleg voor leerlingen* (dat zijn de opdrachtkaarten) en *Templates* met *Maak er een les van*. Inhoud als nu.

---

## 4. Wat er verdwijnt, verhuist of verandert

Er verdwijnt geen functie.

| Functie | Nu | In dit ontwerp |
|---|---|---|
| 4 typekaarten + "Of kies een leskaart" | Twee keer op de klaspagina | Alleen in wizard stap 1 |
| "Opdracht vervangen?"-venster | Losse bevestiging | Een melding in stap 1 en stap 2 van de wizard |
| Groene balk "Opdracht is actief!" (8 s) | Op de klaspagina | Vervangen door het codescherm (stap 3) |
| Code schermvullend | Alleen via het monitor-icoon op de klaskaart | Wizard stap 3, de kop van de klaspagina en de dashboardkaart |
| Tijdsduur, opdrachtkaart, thema, peer-instellingen | Open op de actieve opdracht | Wizard stap 2, het paneel op het codescherm en *Meer opties* in tab 1 |
| Deactiveren | Rode knop naast Delen | *Meer opties → Opdracht stoppen…* |
| Klas verwijderen | Prullenbak op de klaskaart | *Meer opties → Klas verwijderen…* |
| *Open praatplaat* (klikbaar bord) | Eigen knop op de actieve opdracht | Via *Presenteren* (de keuze "actieve opdracht" toont het bord). Zie open vraag 5 |
| "Feedback-overzicht" | Knop bovenaan de klaspagina | *Terugkijken → Wat klasgenoten ervan vonden* |
| Feedback per inzending | Pop-up met ingeklapte feedbackrij | Feedbackscherm (werklijst). In de presentatie blijft de feedbackrij zoals nu |
| Delen (bord/album) | Knop op de actieve opdracht + iconen per rij | ⋯ → *Delen met ouders* (dezelfde keuze bord/composities) |
| Instructietekst "Podium → Opslaan → Deel met docent" | Onderaan de klaspagina, verouderd | Vervalt; de uitleg staat op het codescherm |
| Handmatig verversen | Icoon in de kop | Automatisch (in de presentatie blijft het icoon, zoals nu) |
| "Leskaarten" / "Mijn materiaal" / "Opdrachtkaart" | Tabnamen en termen | "Lesideeën" / "Eigen materiaal" / "Uitleg voor leerlingen" (open vraag 1) |

---

## 5. Correcties op eerdere rondes

- **Bevinding N2 (thema-keuzelijst) klopt niet.** Het thema `basis` heet in de app **"De Stad"** (`themes.basis.name`), dus de keuzelijst toont bij Robotfabriek het juiste thema. Ik heb dit uitgezocht in `src/data/themes/basis/index.ts` en `nl.json`. N2 vervalt.
- **"De Fabriek"** in de eerdere mockups was een verzonnen themanaam. De flow-mockup gebruikt de echte thema's: **De Stad** en **Winterspelen**.
- **N1 blijft staan:** "28 28 compositie", door het dubbele getal en de oude `_plural`-sleutels onder i18next v25.

---

## 6. Bouwvolgorde (na 27-10)

Elke stap is een losse, testbare PR zonder migratie, tenzij anders vermeld. De schattingen zijn inclusief tsc en tests, maar zonder jouw handmatige test.

| # | Stap | Schatting | Opmerking |
|---|---|---|---|
| 1 | **Snelle reparaties**: <br>• max-klassen-melding plus teller "x van 8"; <br>• "28 28 compositie" (plural-sleutels naar `_one/_other`); <br>• het label "Storyboard" niet meer bij praatplaat-inzendingen; <br>• sorteren op `submitted_at`; <br>• de verouderde instructietekst weg | 0,5 dag | Raakt alleen labels en logica |
| 2 | **Slepen over de tijdlijn met touch** (`Playhead`: `touch-action:none` vanaf het begin, slepen over de hele liniaal) | 0,5 dag + iPad-test | Bugfix; de presentatie blijft zoals nu |
| 3 | **Wizard (3 stappen)** als vervanging van type-kaarten + `ActivateAssignmentModal` + `LessonCardPickerModal` + vervangbevestiging. Hergebruikt de bestaande RPC's (`activate_assignment`, `activate_praatplaat_from_catalog`, `activate_lesson_card`) | 2–3 dagen | De grootste winst voor docenten |
| 4 | **Codescherm** (stap 3) met instellingenpaneel. Eerst **zonder** live namen | 1 dag | Live namen: zie open vraag 3 |
| 5 | **Klaspagina in 3 tabs** + *Meer opties* + automatisch verversen (20 s) in *Tijdens de les* | 1,5–2 dagen | Vooral bestaande onderdelen herschikken |
| 6 | **Feedbackscherm (werklijst)**: beeld boven de tijdlijn, uitklappen op de telefoon, stickers met tekst, sterren met betekenis, tipzinnen | 2–2,5 dagen | Hergebruikt `FeedbackPanel`-logica, `Timeline` (readOnly) en `StoryboardViewer` |
| 7 | **Dashboard · Vandaag** (kaart "Nu" + rijen) + nieuwe klas die direct de wizard opent | 1–1,5 dag | "x nieuw" per klas: één extra query per klas, of later een batch-RPC (migratie) |
| 8 | **Namen en termen**: "Lesideeën", "Eigen materiaal", "Uitleg voor leerlingen", "Wat klasgenoten ervan vonden"; WOORDENLIJST en handleiding bijwerken | 0,5–1 dag | Na jouw besluit (open vraag 1) |
| 9 | Optioneel: **live namen op het codescherm** | 1–1,5 dag | Waarschijnlijk een migratie (zie open vraag 3) |

**Totaal ±10–13 werkdagen. De meeste winst per uur zit in stap 1, 3 en 6.**

---

## 7. Open vragen

1. **Namen:** akkoord met *Lesideeën*, *Eigen materiaal*, *Uitleg voor leerlingen* en *Wat klasgenoten ervan vonden*? Dit raakt de handleiding, de landingspagina en de woordenlijst.
2. **Kaart "Nu" op het dashboard:** is "de laatst gebruikte klas" goed genoeg, of wil je (later) een eenvoudig rooster per klas ("maandag 13:15")?
3. **Live namen op het codescherm:** nu weet de server pas van een leerling als die iets opslaat. Voor "Yara is begonnen" is een klein signaal nodig wanneer een leerling op *Starten* tikt, met naam, en dus een migratie en een privacy-check. Wil je dat, of volstaat het codescherm zonder namen?
4. **Peer-feedback standaard uit** in de wizard (nu staat het aan zodra je het instelt). Akkoord?
5. **Het klikbare praatplaat-bord** zit in dit ontwerp alleen nog in *Presenteren* (via "actieve opdracht"). Is een losse knop *Open praatplaat* nog nodig, bijvoorbeeld om het bord vóór de les te tonen zonder af te spelen?
6. **Presenteren zoals nu:** de naam van de leerling blijft in de pil linksboven en in de titelregel staan, ook als de lijst rechts dicht is. Is dat goed, of wil je daar later een schakelaar *Namen tonen* voor? Het ontwerp blijft verder hetzelfde.
7. **Feedback-tipzinnen:** wil je zelf de vaste set bepalen (nu: 5 zinnen), of mag een docent eigen zinnen toevoegen?

---

## Bijlage — Screenshots van de flow (`docs/mockups/flow/`)

| Bestand | Scherm |
|---|---|
| `flow-00-overzicht` | Overzicht van alle schermen |
| `flow-01-inloggen` | Inloggen |
| `flow-02-dashboard-eerste-keer` | Dashboard bij 0 klassen |
| `flow-03-dashboard-vandaag` · `flow-20-dashboard-telefoon` | Dashboard · Vandaag |
| `flow-04-wizard1-kies` · `flow-05-wizard1-gekozen` · `flow-21-wizard-telefoon` | Wizard 1 · Kies |
| `flow-06-wizard2-controleer` | Wizard 2 · Controleer & pas aan |
| `flow-07-wizard3-code` · `flow-08-wizard3-instellingen` | Wizard 3 · Code op het bord (+ paneel) |
| `flow-09-klas-tijdens-de-les` · `flow-19-klas-telefoon` | Klas · Tijdens de les |
| `flow-10-klas-klaarzetten` | Klas · Klaarzetten |
| `flow-15-klas-terugkijken` | Klas · Terugkijken |
| `flow-11-presenteren-keuze` · `flow-12-presenteren` · `flow-22-presenteren-digibord` | Presenteren (zoals nu) |
| `flow-13-feedback-werklijst` · `flow-14-feedback-telefoon` | Feedback geven |
| `flow-16-klasgenoten` | Wat klasgenoten ervan vonden |
| `flow-17-lesideeen` · `flow-18-eigen-materiaal` | Lesideeën · Eigen materiaal |

De screenshots zijn gemaakt met de testopstelling in `.ux-harness/` (niet gecommit); `shoot-flow.mjs` maakt ze opnieuw. De bron van de mockup (zonder ingesloten beelden) staat daar ook, in `flow.src.html`.
