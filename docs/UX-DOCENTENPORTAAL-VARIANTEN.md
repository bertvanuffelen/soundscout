# UX-docentenportaal — ronde 2: varianten

**Datum:** 13-10-2026 · **Vervolg op:** [UX-DOCENTENPORTAAL-ONDERZOEK.md](UX-DOCENTENPORTAAL-ONDERZOEK.md) · **Status:** ontwerp, er is nog niets gebouwd

**Klikbare vergelijking:** [`docs/mockups/docentenportaal-varianten.html`](mockups/docentenportaal-varianten.html)
- Open hem vanuit de map `docs/mockups/`. De mappen `oud/` en `nieuw/` met screenshots moeten ernaast blijven staan.
- Per scherm zie je eerst de huidige situatie (screenshots) en daarna 3 of 4 varianten die je kunt aanklikken.
- De tab **Vergelijk & kies** zet alles naast elkaar. Daar kies je zelf een variant en schrijf je notities. Met *Exporteer* haal je dat er als markdown uit.

> **Jouw vraag:** meer dan één voorstel, zodat we de beste kunnen kiezen. Minder stappen, en het klaarzetten van een opdracht als een wizard. Kijk hoe andere tools het doen, en zet de oude situatie ernaast.

---

## 1. Wat ik deze ronde heb gedaan

1. **De echte schermen gefotografeerd.** De huidige app draait lokaal met een nep-database met voorbeelddata: Groep 6b, code 7077, de praatplaat Robotfabriek, 18 inzendingen, 6 leerlingen die nog bezig zijn en 2 eerdere opdrachten.
   - Er is niet ingelogd op een echt account en er staan geen echte leerlingnamen in.
   - Het resultaat is 20 screenshots in [`docs/mockups/oud/`](mockups/oud/), inclusief een volledige klaspagina, digibordformaat (1600×900), een tablet en een telefoon.
   - De testopstelling staat in `.ux-harness/` en is **niet** meegecommit. Zie bijlage A.
2. **Opnieuw onderzocht hoe andere tools een opdracht klaarzetten:** Kahoot, Wayground/Quizizz, Blooket, Google Classroom, Teams, Seesaw, BandLab, Nearpod, Wordwall, Padlet, Classroomscreen en Canva. Zie §2.
3. **Per scherm 3 of 4 varianten ontworpen,** met verschillende archetypen. Ze zijn allemaal aanklikbaar en voor elk zijn de klikken geteld. Van elke variant staat een screenshot in [`docs/mockups/nieuw/`](mockups/nieuw/).

---

## 2. Hoe andere tools een opdracht laten klaarzetten

Het volledige onderzoek per tool, met bronnen, staat in bijlage B. Ik zag vier archetypen:

| Archetype | Tools | Zo werkt het | Past bij SoundScout? |
|---|---|---|---|
| **A. Inhoud eerst, dan "Start nu"** (vork + lobby) | Kahoot (*Host live*), Blooket, Nearpod, Wayground | Je kiest een activiteit en klikt op Start. Je komt direct in een lobby met de code groot in beeld. Instellingen hebben goede standaardwaarden, zijn later te wijzigen en worden onthouden. | **Ja, sterk.** Twee klikken tot de code op het bord, en leerlingen kennen het ritueel van "ga naar… en typ de code" al. |
| **B. Galerij met vormen, dan één instellingenscherm** | Blooket (galerij met spelvormen), Wordwall (sjablonen), Padlet | Je kiest een vorm in een galerij met plaatjes en één zin uitleg. Daarna volgt hooguit één scherm met schakelaars. | **Ja.** De vier vormen worden pas begrijpelijk met een plaatje en een zin. |
| **C. Eén formulier met standaardwaarden in een zijpaneel** | Google Classroom, Teams, BandLab | Alleen een titel is verplicht. De rest staat ingevuld in een zijpaneel. | **Deels.** Voelt als administratie, en "alles tegelijk zien" is wat docenten nu als te druk ervaren. |
| **D. Lineaire stappen** (inhoud → klas → opties → toewijzen) | Seesaw, Canva | Elke stap is een eigen scherm. Je kunt de opdracht vooraf bekijken als leerling. | **Deels.** Duidelijk, maar je moet ook klikken als er niets te kiezen valt. |

**Opvallend:**
- Geen enkele tool vraagt de docent "wat wil je bereiken?". Aanraden loopt overal via filters (leerjaar, thema).
- Kahoot en Nearpod laten instellingen ná het starten aanpassen, en Kahoot en Teams onthouden de laatste keuze.
- Seesaw laat de opdracht vooraf zien zoals een leerling hem ziet ("Preview as Student").

---

## 3. De varianten per scherm

De klikken tel ik vanaf de klaspagina, of het dashboard waar dat logischer is, tot het doel is bereikt.

### 3.1 Opdracht klaarzetten (de wizard) — 4 varianten

**Nu:** 7–8 klikken plus scrollen.
- Je kiest uit vier vaktermen, dan een bron, dan losse instellingen in hetzelfde venster.
- De code staat 8 seconden in een groene balk. Om hem op het bord te zetten ga je terug naar het dashboard.
- Screenshots: `oud-08`, `oud-09`, `oud-10`, `oud-11`.

| | A · Stappen-wizard | B · Lesgalerij + "Start nu" | C · Vraaggestuurd | D · Eén scherm, slimme standaard |
|---|---|---|---|---|
| Beeld | `nieuw-1A` | `nieuw-1B` + `nieuw-1B-lobby` | `nieuw-1C-vraag` + `-advies` | `nieuw-1D` |
| Hoe | 4 stappen met voortgangsbalk: *wat gaan ze doen → kies → controleer → klaar* | Voorgestelde lessen voor de groep, elk met **▶ Start nu** en daarna meteen de lobby. Zelf samenstellen in een strook eronder. Instellingen pas ná het starten | 3 vragen met grote knoppen (tijd · samen/alleen · onderwerp), dan één aanbevolen les + 2 alternatieven | Links kiezen, rechts een **telefoonvoorbeeld van wat de leerling ziet**. Instellingen ingeklapt, één knop *Zet klaar* |
| Klikken tot code op het bord | 4 | **2** | 4–5 | 2–3 |
| Lijkt op | Seesaw, Canva | Kahoot, Blooket, Nearpod | geen tool (nieuw) | Google Classroom, Teams |
| Sterk | Voorspelbaar en controleerbaar | Snelst; de lobby is meteen het startmoment van de les | Geen vaktermen nodig | Je ziet alles in één keer, ook wat de leerling krijgt |
| Zwak | Ook bij een leskaart klik je alle stappen door | Leunt op goede leskaarten; zelf samenstellen voelt als "tweede keus" | Meer klikken en onbewezen; een verkeerd advies frustreert | Druk op een tablet; voelt weinig nieuw |

**Alle vier de varianten eindigen in dezelfde lobby:**
- groot "Ga naar **soundscout.nl** en typ: **7077**";
- welke opdracht er klaarstaat;
- in variant B ook een live teller met de namen van leerlingen die begonnen zijn;
- de knop *Volledig scherm*.

Deze lobby vervangt de groene balk van 8 seconden en de omweg via het dashboard.

**Mijn advies: B als hoofdroute, met het telefoonvoorbeeld van D voor wie zelf samenstelt.**
- Het snelste pad is daarmee 2 klikken: *Start nu* en *Volledig scherm*.
- Instellingen staan op goede standaardwaarden en kun je wijzigen ná het starten.
- C is een mooi idee voor de eerste keer, maar ik zou het pas bouwen na een korte test met 3–5 docenten.

### 3.2 Klaspagina — 3 varianten

**Nu:** één lange pagina met acht blokken (4.393 px hoog op een laptop). Screenshots: `oud-07`, `oud-07b` en `oud-19` (telefoon).

| | A · Tabs volgens de les | B · Les-cockpit | C · Twee kolommen |
|---|---|---|---|
| Hoe | Tabs *Klaarzetten · Tijdens de les · Terugkijken*. De code, *Presenteren* en *Feedback* staan altijd bovenaan | Geen tabs. Een grote statuskaart die per fase verandert (klaarzetten → starten → les bezig → na de les) met één knop **"Volgende stap"**, en daaronder een live wand met namen | Links vast de opdracht, de code en de acties; rechts de live lijst met inzendingen. Op een telefoon worden het tabs |
| Klikken om te meekijken | 1 | 1 | 0–1 |
| Lijkt op | Google Classroom | Kahoot-lobby, Nearpod | Google Classroom, BandLab |
| Sterk | Rustig, bekend patroon | De pagina zegt wat de volgende stap is; ideaal voor beginners | Alles in één blik |
| Zwak | Wat je zoekt kan in een andere tab staan | Ervaren docenten willen soms een stap overslaan (daarvoor is er *Sla over*) | Op een smal scherm valt het terug op tabs |

**Mijn advies: B (les-cockpit) voor een docent die net begint, met de lijst uit C eronder zodra er inzendingen zijn.** Deze variant past het best bij het doel "zonder uitleg binnen 2 minuten een les draaien".

### 3.3 Presenteren — 3 varianten

**Nu:** 5 klikken. Namen staan altijd in beeld, er is een zijpaneel en de knoppen zijn klein. Screenshots: `oud-12` t/m `oud-15`.

| | A · Startscherm + nummerrij | B · Galerijwand | C · Concertmodus |
|---|---|---|---|
| Hoe | Een lobby (met of zonder namen, alles achter elkaar), daarna één compositie tegelijk, met een nummerrij en een brede sleepbalk | Alle composities als genummerde tegels of spots op de plaat; tik er één aan, luister, en terug naar de wand | *Start concert* speelt alles achter elkaar, met een aftelling "Volgende: nummer 4". Knoppen verdwijnen tijdens het spelen. Applausscherm aan het eind |
| Klikken | 2 | 1–2 | 2 |
| Lijkt op | Kahoot, Padlet Slideshow | Padlet-wand, Seesaw | tv- of diavoorstelmodus |
| Sterk | Docent houdt de regie | De klas kiest mee, goed op een touchscreen | Docent kan vrij door de klas lopen |
| Zwak | Je ziet niet alles tegelijk | Onrustiger: iedereen wil "die van mij" | Minder geschikt om tussendoor te bespreken |

**Mijn advies: A als standaard, met de wand van B als tweede weergave (schakelaar *Tegels / Één voor één*).**
- Concertmodus (C) is in A al grotendeels te krijgen met *Alles achter elkaar: aan*.
- De aftelling en het applausscherm uit C kunnen we daar overnemen.
- **In alle drie** staan de namen standaard uit en werkt de sleepbalk met een vinger.

### 3.4 Feedback geven — 3 varianten

**Nu:** 6–7 klikken per leerling, ±115 voor de klas. Screenshots: `oud-16` en `oud-17`.

| | A · Werklijst | B · Snelle kaarten | C · Overzichtstabel |
|---|---|---|---|
| Hoe | Lijst links (*Nog doen*), inzending rechts, *Opslaan & volgende* | Eén grote kaart per leerling; geluid start vanzelf; ster + sticker en hij schuift door | Iedereen in één tabel met stickers en sterren direct in de rij |
| Klikken per leerling | 4 | 2–3 | 2–3 |
| Voor 18 leerlingen | ±72 | ±45 | ±45 |
| Lijkt op | Seesaw Review, Classroom | flashcards / stapel | cijferlijst (Magister) |
| Sterk | Je blijft op je plek; ook rustig thuis | Snelst, en werkt met de duim op een tablet | Alles in één blik |
| Zwak | Op een telefoon wordt het twee schermen | Minder overzicht | Druk en voelt als "beoordelen" |

**Mijn advies: A als basis, met een knop *Snelle ronde* die de kaarten van B opent.** De tabel (C) zou ik niet bouwen: het geluid is de inhoud, en een tabel nodigt uit om te scoren zonder te luisteren.

### 3.5 Dashboard — 3 varianten

**Nu:** per klas alleen naam, code en "28 28 compositie". Screenshots: `oud-01` t/m `oud-05`.

| | A · Klaskaarten met status | B · Vandaag | C · Compacte lijst |
|---|---|---|---|
| Hoe | Per klas de actieve opdracht, "4 nieuw" en *Open · Presenteren · Code* | Eén grote kaart voor de klas van nu, de andere klassen compact eronder | Tabel met klas, code, opdracht, nieuw en acties |
| Sterk | Weinig verandering, duidelijk bij 2–6 klassen | Eén knop voor "nu" | Werkt ook bij 8 of meer klassen (vakdocent) |
| Zwak | Wordt een lange muur bij veel klassen | Raadt soms de verkeerde klas | Weinig uitnodigend voor beginners |

**Mijn advies: B.**
- De "nu"-kaart toont de laatst gebruikte klas.
- Vanaf 6 klassen schakelt de lijst eronder over op de compacte vorm van C.

---

## 4. Nieuwe bevindingen uit de screenshots

Ze staan niet in ronde 1, want ze bleken pas uit de echte schermen:

| # | Bevinding | Waar | Ernst |
|---|---|---|---|
| N1 | **"28 28 compositie"** op de klaskaart en "22 compositie" in de kop van de klas: het getal staat er dubbel en het meervoud werkt niet. De vertaalsleutels gebruiken nog `_plural`, terwijl i18next v25 `_one`/`_other` verwacht. | `ClassCard.tsx:63`, `nl.json` → `teacher.classCard.compositionCount_plural`, `teacher.classDetail.compositionCount_plural` | 2 |
| N2 | **Thema-keuzelijst toont het verkeerde thema** bij Robotfabriek. Het thema van de praatplaat is `basis`, maar `basis` staat niet in `getTeacherThemes()` (`isPublic: false`). De lijst toont daarom de eerste optie, "De Stad", terwijl leerlingen `basis`-geluiden krijgen. Raakt `ActivateAssignmentModal` en de actieve opdrachtkaart in `ClassDetail`. **Nog te verifiëren in de echte app.** | `ClassDetail.tsx:678`, `ActivateAssignmentModal.tsx:287` | 2 |
| N3 | **Max-klassen loopt zichtbaar vast:** *Annuleren* is grijs, de knop blijft op "Aanmaken…" staan en de foutmelding staat áchter de overlay (zie `oud-05`). Bevestigt de oorzaak uit ronde 1. | `TeacherDashboard.tsx:97` | 2 |
| N4 | **Stickers in de feedbackrij** zijn icoontjes zonder tekst (ster, noot, luidspreker, mensen, lampje, doel). Zonder hover weet je niet wat "Lekker ritme!" is. | `FeedbackPanel.tsx:70` | 2 |
| N5 | De **praatplaat-spots in de presentatie** zijn luidspreker-icoontjes zonder nummer. Op het bord kun je een spot niet aanwijzen ("nummer 7"), en ook niet koppelen aan de lijst. | `PraatplaatSpot.tsx` | 1 |

---

## 5. Aanbevolen combinatie

Als je mij laat kiezen:

| Scherm | Keuze | Waarom |
|---|---|---|
| Opdracht klaarzetten | **B** (+ voorbeeld uit D) | 2 klikken tot de code op het bord; inhoud eerst; instellingen later |
| Klaspagina | **B** (+ lijst uit C) | De pagina wijst de volgende stap aan |
| Presenteren | **A** (+ wand uit B, aftelling uit C) | Regie en rust; namen standaard uit |
| Feedback | **A** (+ *Snelle ronde* uit B) | Werklijst voor thuis, snelle kaarten voor in de klas |
| Dashboard | **B** (+ lijst uit C vanaf 6 klassen) | Eén knop voor "nu" |

**Klikken voor een hele les, van dashboard tot presentatie:**
- **Nu:** opdracht klaarzetten 7–8, presenteren 5, feedback ±115.
- **Met deze combinatie:** opdracht klaarzetten 2–3, presenteren 2, feedback ±45–72.

De bouwvolgorde uit ronde 1 (§9) blijft gelden. Stap 7 (opdrachtkiezer) wordt dan "lesgalerij + lobby" en schuift naar voren, omdat die het meeste klikwerk scheelt. Stap 3 (klaspagina) wordt de cockpit.

---

## 6. Open vragen (aanvulling op ronde 1)

1. **Welke variant per scherm?** Kies in de mockup onder *Vergelijk & kies*. Combinaties mogen.
2. **"Start nu" zonder controlestap** (variant B): vind je het goed dat een opdracht direct klaarstaat en je de instellingen daarna wijzigt? Of wil je altijd eerst een controlescherm (variant A)?
3. **Voorgestelde lessen per groep:** de lesgalerij leunt op leskaarten met een groep en een seizoen. Heb je genoeg leskaarten om per groep er 3–4 te tonen, of komen er bij?
4. **Vraaggestuurde wizard (C):** wil je die testen met een paar docenten voordat we beslissen?
5. **Les-cockpit:** mag de app de fase zelf bepalen (nog geen opdracht → klaarzetten; opdracht maar geen inzendingen → starten; inzendingen → les bezig; laatste inzending > 1 uur geleden → na de les)?
6. **Galerijwand:** is "de klas kiest mee welke we horen" didactisch wenselijk, of liever de docent in regie?
7. **Bevinding N2 (thema-keuzelijst):** moet `basis` gewoon in de docentenlijst, of krijgt Robotfabriek een ander standaardthema?

---

## Bijlage A — Hoe de screenshots zijn gemaakt

- In `.ux-harness/` staan drie bestanden. Deze map staat in `.git/info/exclude` en wordt dus niet gecommit:
  - `mockSupabase.ts`: een nep-database met de voorbeelddata.
  - `vite.config.ts`: start de echte app, maar vervangt `src/lib/supabase.ts` door de nep-database.
  - `shoot.mjs` en `shoot-varianten.mjs`: sturen de Chrome op de Mac aan (headless, via het DevTools-protocol) en slaan schermafbeeldingen op.
- **Opnieuw draaien:** start de testserver met `npx vite --config .ux-harness/vite.config.ts` (poort 5301) en voer daarna `node .ux-harness/shoot.mjs docs/mockups/oud` uit.
- **Er is geen productiecode gewijzigd.** De nep-database wordt alleen in deze testserver gebruikt.

## Bijlage B — Bronnen: wizards en opdracht-flows

- Kahoot, live hosten: https://support.kahoot.com/hc/articles/360039422694 · spelopties: https://support.kahoot.com/hc/articles/115016055107 · toewijzen: https://support.kahoot.com/hc/articles/360039411334
- Blooket, een spel hosten: https://help.blooket.com/hc/en-us/articles/15984215236503
- Google Classroom, een opdracht maken: https://support.google.com/edu/classroom/answer/6020265
- Microsoft Teams, een opdracht maken: https://support.microsoft.com/en-us/education/create-an-assignment-in-microsoft-teams
- Seesaw, een activiteit toewijzen: https://help.seesaw.me/hc/en-us/articles/17964278341005 · https://help.seesaw.me/hc/en-us/articles/17964702107917
- BandLab for Education, een opdracht maken: https://help.edu.bandlab.com/hc/en-us/articles/900000369323 · vanuit een sjabloon: https://help.edu.bandlab.com/hc/en-us/articles/900001661923
- Padlet, een padlet maken: https://padlet.help/l/en/get-started/how-do-i-create-a-padlet
- Classroomscreen, aan de slag: https://classroomscreen.com/blog/the-ultimate-getting-started-guide
- Wordwall: https://wordwall.net/features
- Secundaire bronnen: Wayground/Quizizz (https://learn.k20center.ou.edu/tech-tool/2444), Nearpod (https://library.csw.org/faculty-pd/technology-driven-learning-environments/nearpod), Canva for Education (https://springfieldpublicschools.teamdynamix.com/TDClient/1908/Portal/KB/ArticleDet?ID=155679)
- De officiële helpcentra van Kahoot en Seesaw waren tijdens het onderzoek niet direct bereikbaar. Die informatie komt uit zoekresultaten van de officiële helppagina's.
