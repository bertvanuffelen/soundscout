# UX-onderzoek docentenportaal

**Datum:** 13-10-2026 · **Branch:** `claude/teacher-portal-ux-research-389785` · **Status:** onderzoek en ontwerp; er is nog niets gebouwd
**Mockup:** [`docs/mockups/docentenportaal.html`](mockups/docentenportaal.html). Dit is één bestand dat je zonder internet opent. Bij elk scherm staat een notitieveld en met "Exporteer feedback" haal je je notities eruit.

> **Het doel:** een drukke leerkracht zonder muziekachtergrond draait zonder uitleg binnen 2 minuten een les.
> **Wat dit document is:** een onderzoek met een ontwerpvoorstel. Ik heb geen productiecode, migraties of database veranderd. Bouwen doen we pas na de lancering van 27-10 en na jouw akkoord.

---

## 0. Samenvatting

- **Het grootste probleem is de klaspagina.** Die bestaat uit één lange kolom met acht blokken. Wat je tijdens de les nodig hebt (wie heeft ingeleverd?) staat helemaal onderaan, onder de typekaarten en de eerdere opdrachten.
- **Presenteren werkt technisch goed, maar is niet ontworpen voor kinderen voor de klas.** Namen staan altijd in beeld: in de pil, in de aankondiging, in de titelregel en in het zijpaneel. Een anonieme stand bestaat niet. Daarnaast werkt slepen over de tijdlijn niet met een vinger (oorzaak in §5, probleem 3).
- **Feedback geven gaat per inzending via een pop-up:** openen, luisteren, op "Feedback geven" klikken, een sticker en sterren kiezen en weer sluiten. Een knop "volgende" ontbreekt. De knop *Feedback-overzicht* opent bovendien het overzicht van **peer**-feedback en niet jouw eigen feedback.
- **Er staan een paar echte bugs en verkeerde labels tussen.** Ze zijn klein en snel op te lossen:
  - Een praatplaat-inzending krijgt het label "Storyboard".
  - Nieuwe inzendingen worden gesorteerd op het moment van eerste opslaan in plaats van inleveren.
  - De melding "max klassen" loopt vast.
  - De instructietekst onder de inzendingen beschrijft een route die niet meer bestaat.
- **Het voorstel in één zin:** een klaspagina met drie tabbladen die de les volgen (*Klaarzetten · Tijdens de les · Terugkijken*), met de klascode en twee grote knoppen (*Presenteren*, *Feedback geven*) altijd bovenaan. Daarbij een presentatiemodus met startscherm, standaard zonder namen, en een feedbackscherm als werklijst met de knop "Opslaan & volgende".
- **Meeste winst voor het minste werk:** stap 1 en 2 van de bouwvolgorde (§9). Dat zijn de bugfixes en labels, een namen-schakelaar in de presentatie, een knop "Code op het bord" op de klaspagina en de reparatie van het swipen op de tijdlijn. Samen kost dat ongeveer 1,5 dag.

---

## 1. Werkwijze

1. **Code gelezen:** alle docentcomponenten in `src/components/teacher/` (32 bestanden, ±9.000 regels), `src/components/presentation/PresentationSurface.tsx`, de praatplaatviewers, `Playhead.tsx`, `useSubmissions` en `useClasses`, en alle NL-teksten uit `nl.json`.
2. **Bevindingen uit eerdere testrondes meegenomen:** `docs/TODO.md` (o.a. BUG-MAXCLASSES-MODAL en HELP-TOUR), `docs/WOORDENLIJST.md` en de code-commentaren met wensen ("wens Bert 19-7" enzovoort).
3. **Vergelijkbare tools bekeken:** Chrome Music Lab, BandLab for Education, Seesaw, Kahoot, Google Classroom, Padlet en Nearpod (zie §4).
4. **Getoetst** aan de 10 heuristieken van Nielsen, cognitieve belasting en progressive disclosure, en aan de klassituatie: digibord, 30 kinderen, weinig tijd, docent vóór de klas, soms een Chromebook of tablet.

**Beperking:** ik heb het portaal niet met echte docenten getest. De kliktellingen zijn afgeleid uit de code en tellen elke tik of klik op een bedieningselement. Typen en scrollen tel ik apart.

---

## 2. Inventaris

**Frequentie** geeft aan hoe vaak een docent iets nodig heeft:
- **L** = elke les
- **S** = soms (een paar keer per periode)
- **Z** = zelden
- **E** = eenmalig

### 2.1 Dashboard — `TeacherDashboard.tsx`

| Element | Wat het doet | Freq. | Code |
|---|---|---|---|
| Kop "Docenten Dashboard" + "Welkom, {naam}" | Titel | – | `:151` |
| Knop *Statistieken* (alleen beheerder) | Opent `UsageStatsPanel` | Z | `:158` |
| Knop *Handleiding* | Opent de docentenhandleiding (14 secties) | Z | `:167` |
| Knop *Uitloggen* | Uitloggen | Z | `:174` |
| Grote tabs *Mijn klassen (n)* / *Mijn materiaal (n)* / *Leskaarten* | Wisselt tussen de drie werelden | S | `:188` |
| Inklapbaar blok "Zo zet je een klas op" (3 stappen, per tab een andere uitleg) | Uitleg; staat alleen open bij 0 klassen | E | `:217` |
| Link *Bekijk de volledige handleiding* | Opent de handleiding | E | `:235` |
| Knop *+ Nieuwe klas* | Opent `CreateClassModal` | E/S | `:250` |
| Lege staat "Nog geen klassen" + *Eerste Klas Aanmaken* | Eerste start | E | `:281` |
| Klaskaart (zie 2.2), één per klas | – | L | `:305` |
| Tab Mijn materiaal → *Opdrachtkaarten*: lijst, *+ Nieuwe opdrachtkaart*, *Bewerken*, ✕ verwijderen | Eigen instructiekaarten | Z | `:338` |
| Tab Mijn materiaal → *Templates*: lijst `TemplateCard`, *+ Nieuw template* (opent een uitlegmodal) | Eigen templates | Z | `:416` |
| Uitlegmodal *Nieuw template* (3 stappen + *Naar SoundScout*) | Legt uit hoe je een template maakt | Z | `:485` |
| Bevestigingsmodals voor het verwijderen van een klas, template of opdrachtkaart | – | Z | `:520–626` |
| Tab Leskaarten → `LessonCardsTab` (zie 2.6) | – | S | `:467` |

### 2.2 Klaskaart — `ClassCard.tsx`

| Element | Wat het doet | Freq. | Code |
|---|---|---|---|
| Klasnaam + "Aangemaakt op …" | Herkenning | L | `:35` |
| Klascode als badge | Laat de code zien | L | `:47` |
| Monitor-icoon *Toon op scherm* | Klascode schermvullend (`ClassCodeOverlay`) — **zit alleen hier, niet op de klaspagina** | L | `:50` |
| "Leerlingen typen deze code in om mee te doen." | Uitleg (staat op elke kaart) | E | `:58` |
| "{n} composities" | Teller | S | `:63` |
| *Bekijken* | Opent de klaspagina | L | `:70` |
| Prullenbak | Klas verwijderen (met bevestiging) | Z | `:78` |

**Ontbreekt op de klaskaart:** welke opdracht actief is, of er iets nieuws is, en een directe knop *Presenteren*.

### 2.3 Klaspagina — `ClassDetail.tsx` (1.290 regels)

De volgorde is zoals hij op het scherm staat. Op een laptop is de pagina al snel 4 tot 6 schermhoogtes lang.

| # | Blok / element | Wat het doet | Freq. | Code |
|---|---|---|---|---|
| 1 | Kop: klasnaam, "{n} composities", kruimelpad, ververs-icoon | Handmatig verversen | L | `:427` |
| 2 | Klascode-blok (groot) + "Leerlingen typen…" + `?` | Klascode, maar **geen knop om hem op het bord te zetten** | L | `:453` |
| 3a | **Presenteren (n)** | Opent de keuzemodal "Wat wil je presenteren?" | L | `:475` |
| 3b | **Feedback-overzicht** | Opent het overzicht van **peer**-feedback (sterren van klasgenoten) | S | `:488` |
| 4 | Kopje "Actieve opdracht voor deze klas" + uitleg + `?` | – | – | `:523` |
| 4a | Zonder opdracht: waarschuwing + **4 typekaarten** + *Of kies een kant-en-klare leskaart* | Opdracht kiezen | S | `:555` |
| 4b | Met opdracht: kaart met type-badge, naam, datum en voorbeeldafbeelding | – | L | `:577` |
| 4c | Invoerveld *Tijdsduur (optioneel, zichtbaar voor leerlingen)* | Opslaan bij blur | Z | `:622` |
| 4d | Keuzelijst *Opdrachtkaart (optioneel)* | – | Z | `:647` |
| 4e | Keuzelijst *Geluiden uit dit thema* (alleen bij praatplaat) | – | Z | `:672` |
| 4f | *Open praatplaat* (alleen bij praatplaat) | Opent het klikbare bord. Overlapt met *Presenteren → Actieve opdracht* | S | `:699` |
| 4g | *Delen* | Bij een praatplaat eerst de keuze "bord of composities", anders het album | S | `:712` |
| 4h | *Deactiveren* (rood) | Opdracht stoppen (met bevestiging) | Z | `:721` |
| 4i | `PeerReviewSettings`: schakelaar "Peer feedback", tijdslot, feedbackkaart, verwijderen, *Nieuwe kaart* met mini-editor | – | Z | `:733` |
| 5 | **"Wijzig opdracht"**: nóg een keer de 4 typekaarten + leskaartknop. Staat er altijd, ook midden in een les | – | S | `:738` |
| 6 | "Eerdere opdrachten": per rij 👁 bekijken, ⤴ delen, 🗑 uit de lijst halen en *Activeer* | – | S | `:751` |
| 7 | "Inzendingen van leerlingen" + "{n} nieuw" + link naar de handleiding | – | L | `:846` |
| 7a | AVG-waarschuwing (30 dagen vóór verwijdering) | – | Z | `:871` |
| 7b | Tabs *Ingeleverd (n)* / *In bewerking (n)*; alleen zichtbaar als er werk in bewerking is | – | L | `:884` |
| 7c | `SubmissionCard` per inzending: ▶, titel, badges, "Door: naam", datum, prullenbak | Luisteren en verwijderen | L | `:933` |
| 8 | Instructieblok "Podium → Opslaan → Deel met docent…" — **deze route bestaat niet meer** (het heet nu "Lever in") | – | – | `:967` |

**Modals op de klaspagina:** keuze bij delen, keuze bij presenteren, `ActivateAssignmentModal`, "Opdracht vervangen?", `PraatplaatViewer`, `SharePraatplaatModal`, `ShareAlbumModal`, `LessonCardPickerModal`, opdracht uit de historie halen, deactiveren en compositie verwijderen. Dat zijn **11 modals** op één pagina.

### 2.4 Inzendingkaart — `SubmissionCard.tsx`

| Element | Wat het doet | Opmerking |
|---|---|---|
| ▶ afspelen | Opent `SubmissionPlayer` (pop-up) en zet de stempel "gezien" | – |
| Badge *Nieuw* / *Beluisterd* / *Beoordeeld* | Status | Heet in het presentatie-zijpaneel *Nieuw / Gezien / Beoordeeld* |
| Badge *Storyboard* | Verschijnt als `composition_data.storyboardId` bestaat | **Bug:** een praatplaat-inzending heeft een virtueel storyboard-id `pp-…` en krijgt daardoor ook dit label |
| Badge *Opdracht* | Verschijnt bij `assignment_type === 'template'` | De tekst zegt "Opdracht", maar het betekent "template" |
| Badge *Praatplaat* | Verschijnt bij `assignment_type === 'praatplaat'` | – |
| "Door: naam" + datum | – | Datum staat altijd in `nl-NL`-notatie, ook in de Engelse versie |
| Prullenbak | Verwijderen (met bevestiging) | Staat even prominent als ▶ |

**Volgorde:** `useSubmissions.ts:94` sorteert op `created_at` aflopend. Sinds migratie 026 krijgt elke klasinzending al bij het **eerste opslaan** een rij. `created_at` is dus het moment van eerste opslaan, niet van inleveren. Neem een leerling die om 13:20 begint en om 14:05 inlevert: die zakt onder iemand die om 13:40 begon en om 13:50 inleverde. Dat verklaart "nieuwe inzendingen staan onderaan". Het juiste sorteerveld is `submitted_at ?? created_at`.

### 2.5 Presentatie — `PresentationSurface.tsx` (modus `teacher-present`, `teacher-review`)

| Element | Wat het doet | Freq. | Opmerking |
|---|---|---|---|
| Keuzemodal *Actieve opdracht (n)* / *Alle composities (n)* | Komt vóór elke presentatie | L | Een extra klik die bijna altijd hetzelfde antwoord krijgt |
| Pil "Nu te horen: **{leerlingnaam}**" · 3/18 | – | L | Naam altijd zichtbaar |
| Aankondiging (1,2 s): titel + **naam** | – | L | Naam altijd zichtbaar |
| Kopbalk: ververs, montagelijn ⇆, zijpaneel ⇆, volledig scherm, ✕ | – | S | 5 iconen van 40 px zonder tekst |
| Beeld: storyboard, praatplaat-bord met spots of afbeelding | – | L | Goed: `FittedImage` en de spots schalen mee |
| Titelregel "Titel — door **naam**" | – | L | Naam altijd zichtbaar |
| Montagelijn (alleen-lezen tijdlijn met afspeellijn) | Volgen en zoeken | S | Zoeken met touch werkt niet (§5, probleem 3) |
| Transport: ⏮ naar begin, ▶ (56 px) | – | L | Een knop "volgende/vorige" ontbreekt; wisselen kan alleen via het zijpaneel of ←/→ |
| *Doorspelen* (standaard uit) | Automatisch doorgaan naar de volgende | L | – |
| *Feedback geven* | Klapt `FeedbackPanel` uit (stickers, sterren, tekstvak) **op het bord** | S | Een tekstvak dat de hele klas meeleest |
| *Open montage* / *Sluit montage* | Dubbel met de kopbalk | S | Dubbele actie |
| Zijpaneel (288 px): lijst met titel en **naam**, sterren, schakelaar *Feedback-status* | – | L | Neemt breedte van het beeld weg |
| Randknop "3/18" | Haalt het zijpaneel terug | S | – |
| Toetsen: spatie, ←/→, F, Esc | – | L | Goed |

### 2.6 Opdracht kiezen en leskaarten

| Scherm | Elementen (kort) | Klikken om te activeren | Code |
|---|---|---|---|
| `AssignmentTypeCards` | 4 kaarten: Praatplaat "Samen · digibord", Storyboard "Verhaal in scènes", Template van docent "Docent-opzet", Vrije compositie "Puur geluid" | – | `AssignmentTypeCards.tsx` |
| `ActivateAssignmentModal` | Lijst met voorbeeld, bij praatplaat een thema-keuzelijst, opdrachtkaart-keuzelijst, *Activeren* | 3 (4 als er al iets actief is) | – |
| `LessonCardPickerModal` | Lijst met leskaarten. **Eén klik op een rij activeert meteen**, zonder voorbeeld of bevestiging; bij een actieve opdracht alleen een gele balk | 2 | – |
| `LessonCardsTab` (dashboard) | Filters op thema en niveau, details (lesdoel, fases, pdf), *Activeer in klas*, bewerken en verwijderen | 2–3, plus klas kiezen | – |
| `ActivateLessonCardModal` | Klas kiezen of nieuwe klas, *Activeren*, succesmelding met code. **Geen vervangwaarschuwing** | 1–2 | – |
| `LessonCardEditorModal` | 4 onderdelen: type, bron, opdrachtkaart (3 standen), presentatie (titel, niveau, pdf-URL, lesdoel, fases) | – | Z |
| `AssignmentCardEditorModal` | Titel en max 10 punten | – | Z |
| Na activeren | Groene balk "Opdracht is actief! … {code}" die **8 seconden** zichtbaar blijft | – | `ClassDetail:541` |

### 2.7 Feedback

| Scherm | Elementen | Opmerking |
|---|---|---|
| `SubmissionPlayer` (pop-up, `teacher-review`) | Montagelijn open, regel met gegevens (datum, sporen, clips, samples), knop *Feedback geven* | Het feedbackpaneel is **standaard ingeklapt**, dus elke inzending kost een extra klik |
| `FeedbackPanel` | 6 stickers ("Knap gedaan!", "Lekker ritme!", "Mooie opbouw!", "Goed samengewerkt!", "Verrassend geluid!", "Past bij de opdracht!"), 1–3 sterren (zonder betekenis), tekstvak (300 tekens), *Feedback versturen* | Sticker en sterren worden direct opgeslagen, tekst pas na een klik. Geen "volgende" en geen voorbeeldzinnen |
| `PeerFeedbackOverview` (knop "Feedback-overzicht") | Top 3, *Presenteer top 3*, tabs *Ontvangen* / *Gegeven* | Heet "Feedback-overzicht" maar gaat alleen over peer-feedback |
| `PeerReviewSettings` | Schakelaar zonder aan/uit-tekst, tijdslot, feedbackkaart (zonder zichtbaar label), kaart verwijderen (**zonder bevestiging**), mini-editor | Het gekozen tijdslot komt na herladen niet terug |

### 2.8 Delen, account, onboarding en overige schermen

| Scherm | Kern | Opmerking |
|---|---|---|
| `ShareAlbumModal` | Maakt meteen een code bij openen; code, link kopiëren, QR, 30 dagen geldig | – |
| `SharePraatplaatModal` | Leerlinglink + QR, en een tweede blok "Luisterpagina" (op een klik) + QR | Twee keer "Toon QR-code" met hetzelfde label; "Kopieer link" tegenover "Link kopiëren" elders |
| `PraatplaatViewer` | Bord met spots, daarna `PresentationSurface` | Lege staat zegt "opslaan", maar er telt alleen wat is ingeleverd |
| `ClassCodeOverlay` | Code in 200 px, "Druk op ESC om te sluiten" | Bereikbaar vanaf het dashboard en niet vanaf de klaspagina |
| `CreateClassModal` | Naam + *Aanmaken*. Daarna kom je terug op het dashboard, **niet in de klas** | – |
| Max klassen | `useClasses.ts:125` gooit een **hardcoded NL-tekst**. `TeacherDashboard.handleCreateClass` vangt die fout op en gooit hem niet door. Daardoor blijft `CreateClassModal` in `loading=true` hangen met *Annuleren* en ✕ uitgeschakeld, en staat de foutmelding onzichtbaar áchter de overlay. Dit is de oorzaak van BUG-MAXCLASSES-MODAL. `canCreateClass` en `maxClasses` worden nergens in de UI gebruikt | E |
| Inloggen, registreren, wachtwoord vergeten en resetten | Standaardformulieren | Titels in Title Case ("Docenten Login", "Docent Account Aanmaken"), twee terug-links, geen link naar de privacyverklaring bij registreren |
| `TeacherGuideScreen` | 14 secties als accordeon, video's | Geen sectie over presenteren, delen of peer-feedback |
| `TeacherLandingPage` (/teacher) | Hero, "Drie manieren om te componeren", sequencer, video's, thema's, stappen, leskaarten, waarom, FAQ | Zegt "drie manieren" terwijl de app er "vier" heeft |
| Onboarding | Er is geen eerste-keer-ervaring; alleen het inklapbare blok "Zo werkt het" | Zie HELP-TOUR in de TODO |
| `UsageStatsPanel` | Alleen voor beheerders | Valt buiten scope |

---

## 3. Takenanalyse: kliktellingen voor en na

De telling start op het dashboard na het inloggen. Typen en scrollen tel ik apart.

### a) Eerste keer: klas aanmaken en leerlingen laten inloggen

| Nu | Klikken |
|---|---|
| *Eerste Klas Aanmaken* → naam typen → *Aanmaken* | 2 |
| Je landt weer op het dashboard → *Bekijken* | 1 |
| Typekaart → bron kiezen → *Activeren* | 3 |
| De code staat 8 s in een groene balk. Om hem op het bord te zetten: ← *Terug naar overzicht* → monitor-icoon op de klaskaart | 2 |
| **Totaal** | **8** + typen, plus zoeken waar "op het bord" zit |

**Struikelpunten:**
- Na het aanmaken kom je niet in de klas terecht.
- De knop om de code schermvullend te tonen zit niet waar je bent.
- Je moet kiezen uit vier vaktermen (Praatplaat, Storyboard, Template, Vrij) zonder dat je weet wat ze betekenen.
- Het tweede stapje van "Zo werkt het" noemt Vrije compositie niet.

| Na (voorstel) | Klikken |
|---|---|
| *Nieuwe klas* → naam → *Aanmaken*. De opdrachtkiezer opent meteen | 2 |
| Kant-en-klare les aantikken (of een vorm in gewone taal + bron) | 1 (2) |
| Bevestigingsscherm → *Toon code op het bord* | 1 |
| **Totaal** | **4** (5) |

### b) Een les starten met een (nieuwe) opdracht

| Nu | Klikken |
|---|---|
| *Bekijken* → langs code, knoppen en actieve opdracht scrollen naar "Wijzig opdracht" → typekaart → *Kies nieuwe opdracht* → bron → *Activeren* | 5 + scrollen |
| Code op het bord: terug naar het dashboard → monitor | 2 |
| **Totaal** | **7** |

**Struikelpunten:**
- Je moet scrollen langs een opdracht die al loopt.
- De leskaartkiezer vervangt de lopende opdracht zonder te vragen; de typekaarten vragen het wel.

| Na | Klikken |
|---|---|
| *Open klas* → tab *Klaarzetten* → *Andere opdracht kiezen* → les of vorm + bron. De vervangwaarschuwing staat ín de kiezer, dus er is geen aparte modal | 3–4 |
| *Toon code op het bord* (in het bevestigingsscherm) | 1 |
| **Totaal** | **4–5** |

### c) Tijdens de les: meekijken wie heeft ingeleverd

| Nu | Klikken |
|---|---|
| *Bekijken* → scrollen naar "Inzendingen" (onder de opdracht, de typekaarten en de eerdere opdrachten) | 1 + ±3 schermhoogtes |
| Verversen gaat met de hand (icoon in de kop) | 1 per keer |
| Wie is nog bezig: tab *In bewerking* | 1 |
| **Totaal** | **3+**, en elke controle kost opnieuw een klik |

**Struikelpunten:**
- De sortering klopt niet (zie 2.4).
- De kaarten zijn breed en bevatten veel badges, waardoor je ze slecht scant op een tablet.
- Er is geen automatisch verversen buiten de presentatie.

| Na | Klikken |
|---|---|
| *Open klas*: de pagina opent vanzelf op *Tijdens de les*, met tegels en automatisch verversen (20 s, zoals nu al in de presentatie) | **1** |

### d) Einde van de les: presenteren op het digibord

| Nu | Klikken |
|---|---|
| *Bekijken* → *Presenteren* → *Actieve opdracht* → ▶ → volledig scherm | 5 |
| Namen verbergen | **kan niet** |
| Naar de volgende | ←/→, het zijpaneel, of vooraf *Doorspelen* aanzetten |

| Na | Klikken |
|---|---|
| *Presenteren* op de klaskaart of de klaspagina → startscherm (standaard *Zonder namen*) → *Start de eerste* | **2** |
| Volledig scherm | +1 |
| Volgende/vorige | grote ⏮ ⏭-knoppen of de nummerrij |

### e) Na de les: feedback geven en terugkijken

| Nu, per inzending | Klikken |
|---|---|
| ▶ (pop-up) → ▶ afspelen → *Feedback geven* → sticker → ster(ren) → ✕ sluiten → terug in de lijst de volgende zoeken | **6–7** |
| Voor 18 inzendingen | **±115** |

**Struikelpunten:**
- Na elke inzending ben je je plek kwijt.
- De sterren hebben geen betekenis.
- Je moet zelf bedenken wat je wilt zeggen.
- "Feedback-overzicht" blijkt over peer-feedback te gaan.

| Na, per inzending | Klikken |
|---|---|
| ▶ → sticker → ster → *Opslaan & volgende* (luisteren gebeurt in hetzelfde scherm) | **4** |
| Voor 18 inzendingen | **±72** (–37 %) |
| Snelle ronde (alleen een sticker tijdens het presenteren via 👏) | **2** per compositie |

### f) Volgende les: een andere opdracht kiezen

Dit gaat net als b). Wil je een **eerdere** opdracht opnieuw gebruiken:

| Nu | Na |
|---|---|
| Scrollen naar "Eerdere opdrachten" → *Activeer* → bevestigen = **2** + scrollen | Tab *Terugkijken* → ⋯ → *Opnieuw gebruiken* → bevestigen = **3**, zonder scrollen |

Eén klik meer, maar wel achter een menu: in de rij staat dan alleen nog *Bekijk*. Zie open vraag 7.

### Overzicht

| Taak | Nu | Na |
|---|---|---|
| a) Eerste keer | 8 | 4 |
| b) Les starten | 7 | 4–5 |
| c) Meekijken | 3+ (en scrollen) | 1 |
| d) Presenteren | 5 (namen altijd zichtbaar) | 2–3 (standaard anoniem) |
| e) Feedback × 18 | ±115 | ±72 |
| f) Opdracht herhalen | 2 + scrollen | 3 |

---

## 4. Wat andere onderwijstools doen

De volledige lijst met bronnen kan ik apart leveren. Dit zijn de patronen die ik overneem, met de reden:

| Patroon | Bron | Toegepast als |
|---|---|---|
| De code enorm groot op het hostscherm | Kahoot (PIN), Google Classroom (code schermvullend) | Knop *Toon op het bord* op de klaspagina en meteen na het activeren |
| Een lobby vóór de start | Kahoot | Startscherm van de presentatie: wat gaan we horen, met of zonder namen, code voor nakomers |
| Klikbare tellers als ingang | Google Classroom ("Turned in / Assigned"), BandLab (statussen) | Tellers "18 ingeleverd · 6 bezig" bovenaan *Tijdens de les* |
| Werkwachtrij, van boven naar beneden afwerken | Seesaw *Review*, Classroom-pijl "volgende leerling" | Feedbackscherm met filter *Nog doen* en *Opslaan & volgende* |
| Een bank met vaste opmerkingen | Classroom *comment bank* | Tipzinnen onder de stickers |
| Een diavoorstelling met een strook miniaturen | Padlet *Slideshow* | Nummerrij onderaan de presentatie in plaats van een zijpaneel |
| Anoniem projecteren | Nearpod | *Zonder namen* is de standaard |
| Eén vaste code met de actieve opdracht erachter, geen accounts voor leerlingen | Flip, Seesaw, Song Maker | Houden zoals het nu is. Dit is SoundScouts grootste voorsprong op BandLab en Soundtrap |

**Bewust niet overgenomen:**
- accounts per leerling;
- een cijferboek met statussen als "Graded/Returned";
- feedback op een tijdstip in het nummer (te fijnmazig);
- goedkeuren vóór publicatie (geeft achterstand bij 30 inzendingen);
- ranglijsten en competitie (botst met creatief werk);
- een aparte berichtenstroom.

---

## 5. Top 10 problemen, geordend op ernst

Ernst: **4** = blokkeert of beschadigt het gebruik · **3** = vertraagt vaak · **2** = verwart · **1** = cosmetisch.

| # | Probleem | Ernst | Heuristiek | Bewijs |
|---|---|---|---|---|
| 1 | **De klaspagina is één lange kolom met acht blokken; het meest gebruikte staat onderaan.** Tijdens de les scrol je langs de instellingen van de lopende opdracht, vier typekaarten ("Wijzig opdracht" staat er altijd) en de eerdere opdrachten voordat je ziet wie heeft ingeleverd | 4 | #8 minimalistisch ontwerp, #6 herkennen boven herinneren, cognitieve belasting | `ClassDetail.tsx:520–965` |
| 2 | **In de presentatie zijn namen altijd zichtbaar** (pil, aankondiging, titelregel, zijpaneel) en is er geen anonieme stand. Een kind zit voor de klas te wachten tot zijn naam op het bord verschijnt. Het zijpaneel neemt ±20 % van de breedte in, en de knoppen zijn op het digibord klein (40–56 px, iconen zonder tekst) | 4 | #3 controle en vrijheid, context klaslokaal | `PresentationSurface.tsx:361, 434–435, 551, 750` |
| 3 | **Op touch (tablet, digibord) werkt zoeken en slepen op de tijdlijn niet.** In `Playhead.tsx` staat `touch-none` alleen tíjdens het slepen (`isDragging && 'touch-none'`, regel 157). Een browser beslist over `touch-action` al bij `pointerdown`, dus de eerste swipe wordt een scroll en levert een `pointercancel` op. Daarnaast is alleen het kleine handvat te slepen: de liniaal kent alleen klikken, niet slepen | 4 | #7 flexibiliteit, context tablet en digibord | `Playhead.tsx:54–102, 157` |
| 4 | **Feedback geven kost 6–7 klikken per leerling en heeft geen "volgende".** Het feedbackpaneel is ingeklapt in de pop-up. De sterren hebben geen betekenis en er zijn geen voorbeeldzinnen voor een docent zonder muziekachtergrond | 3 | #7 efficiëntie, #6 herkennen | `FeedbackPanel.tsx`, `PresentationSurface.tsx:149` |
| 5 | **"Feedback-overzicht" opent peer-feedback.** De docent verwacht hier zijn eigen feedbacktaak. Hetzelfde onderwerp heet ook "Peer feedback", "Klasgenoten luisteren" en "complimenten", en de "feedbackkaart" lijkt op de "opdrachtkaart" | 3 | #2 aansluiten bij de echte wereld, #4 consistentie | `ClassDetail.tsx:494`, `PeerReviewSettings` |
| 6 | **Verkeerde volgorde: nieuw werk zakt weg.** Er wordt gesorteerd op `created_at` (eerste keer opslaan), niet op `submitted_at` | 3 | #1 zichtbaarheid van de status | `useSubmissions.ts:94` |
| 7 | **De klascode staat niet op het bord als het nodig is.** *Toon op scherm* zit alleen op de klaskaart in het dashboard. Na het activeren is de code 8 s zichtbaar en in de presentatie staat hij niet | 3 | #6 herkennen, context klaslokaal | `ClassCard.tsx:50`, `ClassDetail.tsx:216` |
| 8 | **Labels die niet kloppen of elkaar tegenspreken:** <br>• een praatplaat-inzending krijgt het label "Storyboard" (`pp-`-id), en een template-inzending het label "Opdracht"; <br>• Storyboard heet ook "Verhaal in beeld" en "Verhaal in scènes"; <br>• "Beluisterd" tegenover "Gezien"; <br>• op de landingspagina "drie manieren", in de app "vier types"; <br>• de instructietekst noemt "Podium → Opslaan → Deel met docent", terwijl de knop nu "Lever in" heet; <br>• "Deactiveren" zegt dat leerlingen niet meer kunnen werken, terwijl de lege staat zegt dat ze dan vrij componeren | 2 | #4 consistentie, #2 echte wereld | `SubmissionCard.tsx:21, 91–101`, `nl.json` |
| 9 | **Opdrachten activeren werkt niet overal hetzelfde.** <br>• De typekaarten vragen "Opdracht vervangen?". <br>• De leskaartkiezer activeert al bij één klik op een rij, vervangt zonder te vragen en toont geen voorbeeld. <br>• `ActivateLessonCardModal` waarschuwt helemaal niet. <br>• De seizoensbevestiging staat wel bij leskaarten, maar niet bij `ActivateAssignmentModal` | 2 | #5 fouten voorkomen, #4 consistentie | `LessonCardPickerModal.tsx:123–159` |
| 10 | **De melding "max klassen" loopt vast** (bug, oorzaak in 2.8). De tekst is hardcoded NL en de docent ziet nergens hoeveel klassen hij nog over heeft | 2 (bug, raakt alleen grootgebruikers) | #9 fouten herstellen, #1 zichtbaarheid | `useClasses.ts:125`, `TeacherDashboard.tsx:97`, `CreateClassModal.tsx:38` |

**Kleinere bevindingen** die niet in de top 10 staan, maar wel in de bouwvolgorde zijn meegenomen:
- 11 modals op één pagina;
- de prullenbak op de klaskaart en op elke inzending is even prominent als ▶;
- dubbele montageknoppen in de presentatie;
- `Open praatplaat` overlapt met *Presenteren → Actieve opdracht*;
- een feedbackkaart verwijderen gebeurt zonder bevestiging;
- het peer-tijdslot komt niet terug na herladen;
- datums staan altijd in `nl-NL`;
- Title Case in de inlogschermen;
- een tekstvak voor feedback op het digibord, dat de hele klas meeleest;
- de tab *Mijn materiaal* (zelden gebruikt) staat vóór *Leskaarten* (vaak gebruikt);
- er is geen eerste-keer-rondleiding.

---

## 6. Ontwerpprincipes

1. **De les is de structuur.** Klaarzetten → tijdens de les → terugkijken. De pagina opent op de fase waarin je zit.
2. **De klascode staat altijd in beeld, en met één tik groot op het bord.** Ook in de presentatie, voor nakomers.
3. **Wat elke les nodig is, krijgt een grote knop. Wat zelden nodig is, staat achter "Meer opties".** Er verdwijnt niets: het verhuist.
4. **Gewone taal eerst, de vakterm als label.** "Samen één plaat verklanken" met *Praatplaat* eronder. De termen uit `WOORDENLIJST.md` blijven bestaan, zodat de handleiding en de leskaarten blijven kloppen.
5. **Kinderen zijn veilig op het bord.** Standaard zonder namen. Vrije tekst komt nooit op het bord, alleen stickers.
6. **Vingervriendelijk.** Op het bord minimaal 64 px. Alles wat je kunt slepen, kun je ook met een vinger slepen (`touch-action: none` vanaf de eerste aanraking).
7. **Werklijsten in plaats van pop-ups.** Feedback geef je in een lijst met "volgende"; je blijft op je plek.
8. **Eén manier per handeling.** Eén vervangwaarschuwing, één knop "Delen", één montageknop.
9. **Eerlijke status.** Sorteren op het moment van inleveren, automatisch verversen, en een melding in plaats van een vastgelopen modal.
10. **De huisstijl blijft zoals hij is.** Brand-900 als podium, amber als actiekleur, Nunito, robotcast-beelden en NL/EN via i18n.

---

## 7. Het nieuwe ontwerp per scherm

> Alles hieronder kun je aanklikken in [de mockup](mockups/docentenportaal.html). Daar staat bij elk ontwerpbesluit een blauw kader met "Waarom" en een geel notitieveld.

### 7.1 Presenteren (prioriteit 1)

- **Starten:** met één klik vanaf de klaskaart of de klaspagina. De keuzemodal "Actieve opdracht / Alle composities" vervalt: standaard speel je de actieve opdracht af. "Alles" (inclusief eerdere opdrachten) wordt een optie op het startscherm. Het oude gedrag blijft dus bestaan.
- **Startscherm (lobby):**
  - "Groep 6b luistert naar **Robotfabriek** — 18 composities · ongeveer 9 minuten";
  - keuze *Zonder namen* (standaard) of *Met namen*;
  - één grote knop *▶ Start de eerste*;
  - onderaan de klascode voor wie nog moet inleveren.
- **Afspeelscherm:**
  - De plaat zo groot mogelijk. Bij een praatplaat staan er genummerde spots op, en de spot die speelt licht op en pulseert.
  - **Aankondiging:** "3 van 18 · Stoomfluit". De naam staat er alleen bij als *Met namen* aan staat.
  - **Sleepbalk over de hele breedte** met kleurblokjes per spoor: een vereenvoudigde montagelijn die je overal kunt pakken, ook met een vinger.
  - **Transport (64–124 px):** ⏮ vorige · ↺ naar begin · ▶/⏸ · "3 / 18" · ⏭ volgende · 👏 compliment.
  - **Nummerrij** onderaan (1…18) in plaats van het zijpaneel. Al beluisterde nummers worden donkerder. Met namen aan worden het voornamen.
  - **Kopregel:** klas · opdracht · "code **7077**" · *Namen: uit/aan* · *Doorspelen* · ⛶ · ✕.
- **👏 Compliment:** een strook met de 6 stickers. Eén tik slaat de sticker op als docentfeedback, zonder tekstvak op het bord.
- **Wat er met de bestaande onderdelen gebeurt:**
  - De volledige montagelijn (alle sporen) blijft beschikbaar als optie (open vraag 2).
  - Peer-sterren en de schakelaar *Feedback-status* verhuizen naar het feedbackscherm.
  - De toetsen (spatie, ←/→, F) blijven werken.
- **Tablet en telefoon:** dezelfde opbouw. De nummerrij scrolt horizontaal en de sleepbalk werkt met `touch-action: none` en pointer capture.

### 7.2 Feedback-overzicht (prioriteit 2)

- **Een eigen scherm** in plaats van een pop-up, te openen via *Feedback geven* op de klaspagina. Daarbij staat een teller "4 nieuw".
- **Links: de werklijst.** Filters *Nog doen* (standaard), *Nieuw*, *Alles* en *Nog bezig*. Per regel staan naam, titel, "8 min geleden" en de status (*Nieuw* · *Beluisterd* · *Feedback gegeven*), met het nieuwste ingeleverde werk bovenaan.
- **Rechts: de inzending.**
  - Een miniatuur van de plaat met de spot van de leerling.
  - Een ▶-knop en een sleepbalk.
  - **1. Kies een compliment:** de 6 stickers als grote knoppen.
  - **2. Hoe ver is het?** 1–3 sterren met betekenis: *op weg · goed · top*.
  - **3. Een tip (mag leeg blijven):** tipzinnen zoals "Probeer eens een stil moment." en "Begin rustig en bouw op.", plus een tekstvak.
  - **Opslaan & volgende →**
- **Peer-feedback** heet voortaan "Wat klasgenoten ervan vonden" en staat bij *Terugkijken*. *Presenteer top 3* blijft bestaan.
- **De volledige montagelijn** (sporen, clips, samples) zit achter *Open groot*. Dat opent het bestaande `teacher-review`-scherm.

### 7.3 Klaspagina (prioriteit 3)

- **De kop staat altijd in beeld, op elk tabblad:**
  - de actieve opdracht in één regel;
  - **▶ Presenteren (18)** en **Feedback geven • 4 nieuw**;
  - rechts de **klascode** groot, met *⛶ Toon op het bord*.
- **Tab 1 · Klaarzetten:**
  - De actieve opdracht met afbeelding en een uitleg in gewone taal.
  - De knoppen *Andere opdracht kiezen* en *Bekijk zoals leerlingen het zien* (nieuw; open vraag 6).
  - **Meer opties** (ingeklapt) bevat alles wat nu open staat: opdrachtkaart, geluidenthema, tijdsduur, klasgenoten laten luisteren (peer-instellingen), opdracht stoppen, klas hernoemen en klas verwijderen.
- **Tab 2 · Tijdens de les** (standaard als er een opdracht actief is):
  - Tellers *18 ingeleverd* en *6 nog bezig*; een tik op een teller filtert de lijst.
  - Tegels met naam, titel, status en tijd.
  - "Ververst vanzelf" (elke 20 s, zoals de presentatie al doet).
  - Een tik op een tegel opent die inzending in het feedbackscherm.
- **Tab 3 · Terugkijken:**
  - **Eerdere opdrachten:** één knop *Bekijk* per rij, plus een ⋯-menu met *Delen met ouders (link)*, *Opnieuw gebruiken* en *Uit de lijst halen*.
  - Het blok **Wat klasgenoten ervan vonden**.
  - De AVG-waarschuwing (komt hier en, als die actief is, ook in de kop).
- **Wat er verder verandert:**
  - Het instructieblok onderaan vervalt. De uitleg voor leerlingen staat in het codescherm ("Ga naar soundscout.nl en typ: 7077").
  - De dubbele typekaarten vervallen: ze staan alleen nog in de opdrachtkiezer.

### 7.4 Overige docentschermen (prioriteit 4)

- **Dashboard en klaskaart:**
  - De klaskaart laat de actieve opdracht zien (met miniatuur), plus "4 nieuw · 18 ingeleverd · 6 bezig".
  - Knoppen: *Open klas*, *▶ Presenteren* en *Code op bord*. Een klas zonder opdracht krijgt de knop *Opdracht kiezen*.
  - De prullenbak verhuist naar *Meer opties* op de klaspagina.
  - Op de kaart *Nieuwe klas* staat "3 van 8 klassen gebruikt". Bij 8 van 8 is de kaart grijs met uitleg, in plaats van een melding die vastloopt.
- **Tabs:** *Mijn klassen* · *Lesideeën* (nu "Leskaarten"; open vraag 3) · *Eigen materiaal*. Het zelden gebruikte staat achteraan. "Zo werkt het" verschijnt alleen bij 0 klassen.
- **Opdrachtkiezer** (één wizard voor alle ingangen):
  1. **Wat gaan je leerlingen doen?**
     - **Bovenaan kant-en-klare lessen:** 3 voorgestelde kaarten en *Alle lesideeën bekijken →*.
     - **Daaronder 4 vormen in gewone taal:** *Samen één plaat verklanken* (Praatplaat), *Een verhaal op muziek zetten* (Storyboard), *Een begin afmaken* (Template) en *Vrij componeren*.
  2. **Kies** de plaat, het verhaal, de template of het thema, met voorbeeld. Geluidenthema, opdrachtkaart en tijdsduur hebben goede standaardwaarden en zitten later onder *Meer opties*.
  3. **Klaar:** "Robotfabriek staat klaar. Leerlingen typen **7077**", met de knop *⛶ Toon code op het bord*.

  Eén vervangwaarschuwing, die bovenaan in stap 1 staat als er al iets actief is. Dezelfde wizard gebruik je vanaf de klaskaart, de klaspagina en de tab Lesideeën (waar dan stap 0 "voor welke klas?" bij komt).
- **Nieuwe klas:** na *Aanmaken* opent direct de klaspagina met de opdrachtkiezer.
- **Codescherm op het bord:** "Ga naar **soundscout.nl** en typ: **7077**", met eronder klas en opdracht. Een QR-code is een optie (open vraag 5).
- **Account en inloggen:**
  - Title Case naar zinsopbouw: "Inloggen voor docenten", "Account aanmaken".
  - Eén terug-link.
  - Een privacylink bij registreren.
  - De naam en het wachtwoord kunnen wijzigen onder *Account*. Dat bestaat nu niet; zie open vraag 9.
- **Eerste keer:** geen rondleiding met spotlights. Een lege staat die je stap voor stap leidt is genoeg: *Maak je eerste klas* → wizard → codescherm. Dat dekt het doel van de HELP-TOUR met minder bouwwerk.

---

## 8. Wat ik bewust weglaat, verberg of verplaats

Er verdwijnt geen functie. Dit verplaatst of verandert:

| Functie | Nu | Voorstel |
|---|---|---|
| Tijdsduur, opdrachtkaart, geluidenthema | Open op de actieve opdracht | Klaarzetten → *Meer opties* |
| Peer-instellingen (schakelaar, tijdslot, feedbackkaart, editor) | Open op de actieve opdracht | Klaarzetten → *Meer opties* → "Klasgenoten laten luisteren" |
| Deactiveren | Rode knop naast Delen | *Meer opties* → "Opdracht stoppen" |
| Klas verwijderen | Prullenbak op de klaskaart | *Meer opties* op de klaspagina |
| 4 typekaarten + leskaartknop | Twee keer op de klaspagina | Alleen in de opdrachtkiezer |
| *Open praatplaat* | Eigen knop | Gaat op in *Presenteren* (praatplaat = klikbaar bord) |
| Keuzemodal "Actieve opdracht / Alles" | Vóór elke presentatie | Optie op het startscherm; standaard actief |
| Zijpaneel in de presentatie | Rechts, 288 px | Nummerrij onderaan |
| Feedback-tekstvak in de presentatie | Op het bord | Alleen stickers op het bord; tekst in het feedbackscherm |
| Schakelaar *Feedback-status* | Zijpaneel | Statussen in het feedbackscherm (altijd zichtbaar) |
| Montagelijn | Twee knoppen | Sleepbalk standaard + *Montagelijn* als optie |
| Knop "Feedback-overzicht" (peer) | Bovenaan de klaspagina | Terugkijken → "Wat klasgenoten ervan vonden" |
| Handmatig verversen | Icoon in de kop | Automatisch; het icoon mag blijven |
| Instructieblok onderaan | Verouderde tekst | Vervalt; de tekst gaat naar het codescherm |
| Gegevensregel (sporen, clips, samples) | In de review-pop-up | Achter *Open groot* |

**Wat ik buiten de scope laat:** de inhoud van de leskaart-editor en van de handleiding, de statistieken en de landingspagina. Daarvoor noteer ik alleen de tekstinconsistenties.

---

## 9. Bouwvolgorde na de lancering

Kleine, losse stappen die elk apart te testen zijn. De schattingen gaan uit van Claude Code samen met jouw testronde, inclusief tsc/tests, maar **exclusief** jouw handmatige test.

| Stap | Wat | Schatting | Winst | Migratie? |
|---|---|---|---|---|
| **1** | **Snelle reparaties:** <br>• BUG-MAXCLASSES-MODAL (fout doorgooien, i18n, "x van 8" + kaart uitgeschakeld); <br>• label "Storyboard" niet bij een `pp-`-id; <br>• "Opdracht" wordt "Template"; <br>• "Beluisterd/Gezien" gelijktrekken; <br>• instructietekst bijwerken; <br>• sorteren op `submitted_at ?? created_at`; <br>• dezelfde vervangbevestiging in de leskaartkiezer | 0,5 dag | ★★★ | nee |
| **2** | **Presentatie-basis:** <br>• schakelaar *Namen* (standaard uit) in `PresentationSurface`; <br>• knoppen ⏮/⏭ in het transport; <br>• *Toon code op het bord* op de klaspagina en in de groene activeerbalk; <br>• swipen op de tijdlijn repareren (`touch-action:none` altijd op de liniaal en het handvat, slepen over de hele liniaal, seek throttlen) | 1 dag + iPad/digibord-test | ★★★ | nee |
| 3 | **Klaspagina in drie tabs** + *Meer opties* (alleen herschikken: bestaande componenten verhuizen) + automatisch verversen in *Tijdens de les* | 1,5–2 dagen | ★★★ | nee |
| 4 | **Feedbackscherm als werklijst:** <br>• nieuw scherm `ClassFeedbackView` dat `FeedbackPanel` hergebruikt; <br>• filters; <br>• *Opslaan & volgende*; <br>• tipzinnen (i18n); <br>• betekenis bij de sterren | 2 dagen | ★★☆ | nee |
| 5 | **Presentatie: startscherm + nummerrij + grotere knoppen** + 👏-stickerstrook + vereenvoudigde sleepbalk | 2–3 dagen | ★★☆ | nee |
| 6 | **Klaskaart met status** (actieve opdracht en "x nieuw"). Kan met de bestaande tabellen via een extra query per klas; een batch-RPC is netter maar niet nodig | 1 dag | ★★☆ | optioneel |
| 7 | **Opdrachtkiezer-wizard** (één flow voor de klaspagina, de klaskaart en Lesideeën; gewone-taaltitels; bevestigingsscherm met code) | 2 dagen | ★★☆ | nee |
| 8 | **Tekst en terminologie** (landingspagina "vier manieren", Title Case in de inlogschermen, Kopieer/Link kopiëren, `WOORDENLIJST` bijwerken met "Lesideeën" en "Klasgenoten laten luisteren") | 0,5 dag | ★☆☆ | nee |
| 9 | Optioneel: QR op het codescherm, *Bekijk zoals leerlingen het zien*, pagina *Account* | 1–2 dagen | ★☆☆ | nee |

**De meeste winst voor het minste werk is stap 1 + 2: ±1,5 dag.**
- Dit lost drie van de vier ernst-4-problemen gedeeltelijk of helemaal op: namen op het bord, swipen op touch en de code op het bord. Daarnaast de bug die echt vastloopt en de sortering.
- Alles kan zonder migratie en zonder herschikking van de klaspagina.
- **Overweeg deze twee stappen nog vóór 27-10**, als de testplanning dat toelaat. Stap 2 is klein en zichtbaar, maar raakt wel de presentatie, en dat is een lanceerdemo. Dat is jouw afweging (open vraag 1).

Daarna geeft **stap 3** de grootste structurele winst. Stap 4 en 5 maken het af.

---

## 10. Open vragen voor jou

1. **Timing:** wil je stap 1 (alleen bugs en labels) en eventueel stap 2 nog vóór de lancering, of houden we alles tot na 27-10 zoals afgesproken?
2. **Montagelijn in de presentatie:** is de vereenvoudigde sleepbalk standaard genoeg, of wil je bij een vrije compositie of template (waar de tijdlijn het beeld *is*) de volledige montagelijn standaard tonen?
3. **Naamgeving:** "Leskaarten" wordt "Lesideeën"? En "Peer feedback" wordt "Klasgenoten laten luisteren"? Beide raken de woordenlijst, de handleiding en de landingspagina.
4. **"Wie heeft nog niet ingeleverd?"** SoundScout kent de klaslijst niet, want leerlingen typen zelf hun naam. Daarom laat de mockup alleen *ingeleverd* en *bezig* zien. Wil je ooit een optionele klaslijst (alleen voornamen, bij de docent) zodat je "nog niet begonnen" kunt tonen? Dat raakt de AVG en vraagt een migratie.
5. **QR-code op het codescherm:** handig voor tablets, maar leerlingen moeten daarna nog steeds hun naam typen. Wil je die erbij?
6. **"Bekijk zoals leerlingen het zien":** een voorbeeld van de opdrachtlanding (`AssignmentLandingScreen`) zonder in te leveren. Nuttig of overbodig?
7. **"Opnieuw gebruiken"** zit in de mockup achter ⋯. Gebruiken docenten dat zo vaak dat het een zichtbare knop moet blijven?
8. **Compliment op het bord (👏):** mag een sticker die je op het bord geeft meteen als docentfeedback bij de leerling verschijnen (op het Podium), of wil je dat pas na een controle in het feedbackscherm?
9. **Account-pagina:** naam en wachtwoord wijzigen kan nu alleen via "wachtwoord vergeten". Moet daar een eigen pagina voor komen, of is dit niet nodig?
10. **Sterren met betekenis:** zijn *op weg · goed · top* de woorden die bij jouw didactiek passen, of liever iets als *begin · groei · sterk*?
11. **Doorspelen:** in de mockup staat het standaard **uit**, zoals je in testronde 6 besloot. Nu er een startscherm komt: wil je daar een keuze "Speel alles achter elkaar" (dan wordt het een bewuste keuze per presentatie), of houden we het bij de schakelaar?
12. **Klaskaart "x nieuw":** is één extra query per klas op het dashboard goed, of wil je een batch-RPC (migratie)?

---

## Bijlage A — Gebruik van de mockup

- **Openen:** dubbelklik op `docs/mockups/docentenportaal.html`. Alles zit in het bestand, inclusief de afbeelding van de Robotfabriek; je hebt geen internet nodig.
- **Navigeren:** de zwarte balk bovenaan gaat naar de vier schermen. In de schermen werken de knoppen ook: tabs, opdrachtkiezer, codescherm, presentatie en feedback-werklijst.
- **Presentatie:**
  - *Start de eerste* begint de rij af te spelen.
  - Je kunt over de onderste balk slepen, met muis of vinger.
  - De toetsen spatie, ← en → werken.
  - ⛶ zet het bord op volledig scherm.
- **Notities:**
  - Tik in een geel veld. Wat je typt wordt in deze browser bewaard (localStorage).
  - *Exporteer feedback* kopieert alles als markdown naar het klembord en downloadt `feedback-docentenportaal.md`.
  - *Notities verbergen* toont de schermen zonder gele velden en blauwe "Waarom"-kaders.
- **Let op:** in een voorbeeldweergave die het bestand als `data:`-URL laadt, kan de browser localStorage blokkeren. Open het bestand dan gewoon in Chrome of Safari.

## Bijlage B — Bronnen vergelijkbare tools (selectie)

- BandLab, voortgang leerlingen: https://help.edu.bandlab.com/hc/en-us/articles/900000382266-How-do-I-check-students-progress
- Seesaw, werk beoordelen (Review): https://help.seesaw.me/hc/en-us/articles/27160258738957
- Seesaw, inloggen met klascode of QR: https://help.seesaw.me/hc/nl/articles/203495019
- Google Classroom, overzicht leerlingwerk: https://support.google.com/edu/classroom/answer/6020294
- Google Classroom, comment bank: https://support.google.com/edu/classroom/answer/9093530
- Padlet Slideshow: https://padlet.help/l/en/padlet-features/slideshow
- Kahoot, game-PIN: https://www.digitalcitizen.life/what-is-the-kahoot-game-pin/ (secundaire bron; de officiële helppagina was niet bereikbaar)
- Chrome Music Lab Song Maker: https://blog.google/products-and-platforms/products/education/simple-music-making-everyone/
