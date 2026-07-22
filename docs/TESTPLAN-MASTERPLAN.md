# Testplan SoundScout

Handmatig testplan voor alles wat in de worktree `masterplan-6-weken` is gebouwd.
De actieve testen staan **gegroepeerd per activiteit**; wat je hebt afgetekend en
werkt, staat compact onderaan in **✅ Afgerond**.

**Zo test je:** `- [x]` = werkt · `- [-]` = werkt niet · `- [?]` = twijfel/onduidelijk.
Zet er bij `-`/`?` een regel onder met wat je zag; ik pak die daarna gericht op.

**Lokaal draaien:** `cd .claude/worktrees/masterplan-6-weken && npm run dev`.
Twee browserprofielen zijn handig (docent in de één, "leerling" incognito in de ander).

Automatische gates zijn groen: `npx tsc -b --noEmit` · `npm run test:run` (269 tests) ·
`npm run lint` (baseline 27) · i18n-pariteit NL/EN.

> Volledige rol-doorloop: zie [USECASES-QA.md](USECASES-QA.md).
> Wat je waar aan/uit zet: [HANDLEIDING-BEHEER.md §4b](HANDLEIDING-BEHEER.md).

---

## ⚠️ Eerst dit (acties voor Bert)

- [ ] **Verse build uploaden** naar `soundscout.techindeles.nl`. Belangrijk: een
      paar bevindingen van je vorige ronde (lege montagelijn na bewaarcode,
      Opslaan sluit de modal, aankondiging dimt niets, transportknoppen,
      uniforme prullenbak) zijn **al gefixt sinds 19-7**, maar zaten nog niet in
      de build die jij testte. Ze staan hieronder als "hertest ná deploy".
- [x] **Migratie 034 draaien** in de Supabase SQL Editor:
      `034_praatplaat_theme_update.sql` — laat de docent het thema van een
      praatplaat wijzigen (nodig voor het praatplaat-thema hieronder).
      *(032 en 033 heb je al gedraaid.)*
- [ ] **Verse reset-mail** aanvragen en direct klikken (elke eerder geklikte
      link is verbruikt). De Redirect-URL staat goed sinds testronde 4.

---

## 🚨 Console-fouten meteen na deploy op ss-dev.techindeles.nl (22-7)

Twee dingen gevonden en gefixt, één actie voor jou op de server:

- [ ] **R5-15. YouTube-thumbnails laden weer** (was: CSP blokkeerde
      `img-src`) — de CSP-lijst miste `https://img.youtube.com`, waar de
      video-voorbeeldplaatjes op `/teacher`, de tutorial en de docentengids
      vandaan komen. Toegevoegd aan `.htaccess`. Check na de upload: die
      thumbnails tonen (geen kapotte-afbeelding-icoontjes), geen
      `img-src`-melding meer in de console.
- ✅ **Defensieve fix**: als een animatie-frame (zoals de hero-animatie) om
      welke reden dan ook niet laadt, gooit de app daar nu geen onafgevangen
      fout meer over — de rest van de pagina blijft gewoon werken.
- [ ] **Server-actie (kan ik niet vanuit de code oplossen)**: de browser
      meldde `frame-src 'none'` én blokkeerde daardoor de hero-animatie
      (`Framing '…/animaties/onboarding-4-stappen.html' violates … "frame-src
      'none'"`). Onze `.htaccess` zegt zelf `frame-src 'self' …` — dus die
      `'none'` komt ergens anders vandaan. Check op de server (`ss-dev.techindeles.nl`):
      1. Is dit dezelfde upload/map als `soundscout.techindeles.nl`, of een
         losse dev-omgeving met een eigen, strenger beveiligingsprofiel
         (sommige hosting-panelen zetten standaard een eigen CSP)?
      2. Staat `mod_headers` aan voor die (sub)domein-configuratie? Zonder
         mod_headers wordt onze `Header set Content-Security-Policy`-regel
         in `.htaccess` genegeerd en kan een andere, strengere default
         doorschemeren.
      3. Simpele check: open de site, F12 → Network → klik het hoofddocument
         → tab "Headers" → zoek `content-security-policy` → vergelijk de
         `frame-src`-waarde met wat in `public/.htaccess` staat.
      *(De `searchAnalyzer.js`-foutmelding in je console hoort niet bij
      SoundScout — dat bestand zit niet in de app; vermoedelijk een
      browserextensie. Geen actie nodig.)*

---

## 🆕 Hertest ronde 5 (22-7) — begin hier

Gebouwd n.a.v. je testplan-annotaties en het Notion-blok "Test-ronde 5".

- [ ] **R5-1. Sectie-loop herstelt na uit/aan** (was kapot, B2): maak een sectie
      → klik erop → "Loop deze sectie" → afspelen loopt dat stuk, de grote
      loopknop licht op. Zet de grote loopknop **uit** (loop stopt) en dan weer
      **aan** → de **sectie-loop komt terug** én in de sectie staat "Loop deze
      sectie" weer aan. *(Voorheen viel hij terug op een hele-tijdlijn-loop en
      stond de sectie op uit.)*
- [ ] **R5-2. Praatplaat-thema kiest de docent** (was: altijd stad, D2): docent
      → activeer een **piraten-praatplaat** → in de activeer-modal staat nu een
      **thema-keuze**, voorgevuld op *Piraten*. Activeer → leerling voert de
      klascode in → kiest een plek → gaat naar de kaart → verzamelt **piraten**-
      geluiden (niet stad). Kies in de dropdown een ánder thema → dan hoort de
      leerling díe geluiden. Je kunt het thema óók op de **actieve opdracht**
      wijzigen (dropdown naast de opdrachtkaart in het klaslokaal). *(Vergt
      migratie 034 voor het wijzigen achteraf.)*
- [ ] **R5-3. Opdrachtkaart op de actieve opdracht**: klaslokaal → actieve
      opdracht → naast de tijdsduur staat nu een **"Opdrachtkaart"-keuze**. Kies
      een kaart → "Opgeslagen" → de leerling-landing van die klas toont die
      kaart. Zet hem op "Geen eigen kaart" → de leerling ziet weer de standaard.
- [ ] **R5-4. "Presenteren"-knop is geel**: klaslokaal → de grote **Presenteren**-
      knop is nu geel (actie-kleur), niet blauw. "Feedback-overzicht" blijft zoals
      het was.
- [ ] **R5-5. Praatplaat-plek-tekst**: leerling in de praatplaat-plekkiezer → de
      regel bovenaan is nu groter en luidt **"Klik op de plek waar jij een
      soundscape voor gaat maken"**. Ook in EN.
- [ ] **R5-6. Taalknop op de auth-schermen**: log uit → op het login-, registreer-
      en wachtwoord-vergeten-scherm staat nu rechtsboven de **NL/EN-knop**, op
      dezelfde plek als op de andere docentschermen.

### Hertest ná een verse deploy (al gefixt in de code)

Deze stonden nog open uit testronde 4; ze zijn gefixt maar je testte een oudere
build. Even opnieuw op de verse upload:

- [ ] **R5-7. Bewaarcode → volle tijdlijn** (was: lege montagelijn bij A3):
      bewaar online in thema **Piraten** → open de 6-tekens code in een ánder
      browserprofiel → de clips staan er gewoon (niet leeg). *(Oorzaak was dat de
      tijdlijn clips in het actieve thema zocht i.p.v. in je eigen bibliotheek.)*
- [ ] **R5-8. Opslaan sluit de modal + Tab blijft binnen**: podium → Opslaan &
      Delen → **Opslaan** → de modal sluit en de bevestiging verschijnt. Met
      **Tab** door de modal blijft de focus binnen de modal.
- [ ] **R5-9. Aankondiging dimt niets**: presenteren → volgende compositie → "Nu
      te horen" komt als zwevend kaartje bovenin; de kaart eronder (incl.
      montagelijn) blijft helder wit.
- [ ] **R5-10. Praatplaat-bord bij presenteren**: klaslokaal met actieve
      praatplaat → Presenteren → "Actieve opdracht" → je krijgt het klikbare bord
      (zoals het gedeelde album), niet losse visuals.
- [ ] **R5-11. Eén deelknop**: elke opdrachtrij heeft één "Delen". Bij een
      praatplaat vraagt hij eerst: bord (klikbaar) of composities (afspeellijst);
      bij andere types opent direct de album-modal.
- [ ] **R5-12. Transportknoppen in de presentatie**: ⏮ zet de compositie die je
      hoort terug naar het begin (net als in de studio); er is geen ⏭ meer.
      Wisselen doe je in het zijpaneel, met ←/→ of via "Doorspelen".
- [ ] **R5-13. Historie opruimen — overal hetzelfde, nooit destructief**:
      klaslokaal → "Eerdere opdrachten" → élke rij heeft dezelfde acties
      (oog · delen · prullenbak · Activeer). Prullenbak op een storyboard- of
      template-rij → de tekst zegt dat het leerlingwerk bewaard blijft →
      bevestigen → rij weg **en de composities staan nog gewoon bij de
      inzendingen**. *(Voorheen wiste de prullenbak bij een praatplaat de
      inzendingen écht mee.)*
- [ ] **R5-14. Browsertaal**: verse browser (of gewiste opslag) met Engelse
      taalinstelling → app start in het Engels; Nederlandse browser → Nederlands.
      Zet je zelf de taal om, dan wint die keuze altijd.

---

## 💬 Antwoorden op je vragen (uit de vorige ronde)

- **Lespagina's — hoe/waar maak je ze, hoe pas je teksten aan?** (jouw `?` bij
  "Bekijk de leskaart"). De `/les/<key>`-pagina's worden **automatisch
  gegenereerd** bij `npm run build` door `scripts/generate-les-pages.mjs`. Wat
  waar vandaan komt: welke kaarten een pagina krijgen staat in
  `LANDING_LESSON_KEYS` (in `TeacherLandingPage.tsx`); cover/type/pdf in
  `scripts/les-pages-data.json`; de teksten (titel, lesdoel, lesfases) in
  `nl.json`/`en.json` onder `lessonCards.builtin.<key>` (of via de `TEKSTEN.md`-
  workflow). Volledige uitleg met exacte bestandsplekken: **HANDLEIDING-BEHEER §4b**.
- **Waarom worden praatplaten anders behandeld in de historie? En "delen met
  leerlingen"?** (jouw `?` bij historie-acties). De historie is nu **uniform** —
  elke rij heeft dezelfde vier acties (hertest R5-13). De aparte "Delen"-keuze bij
  een praatplaat (bord vs. composities) bestaat omdat een praatplaat óók als
  **publiek klikbaar bord** deelbaar is (via een 8-tekens deelcode, `?pp-share=`).
  Dat is delen **buiten** de klas — bijvoorbeeld naar ouders of een collega — en
  staat los van de klascode waarmee je leerlingen binnenkomen.
- **Taalknop overal + standaardtaal aan de browser gekoppeld?** (A2). De NL/EN-
  knop staat nu op élk docentscherm rechtsboven, ook op de auth-schermen (R5-6).
  En ja: de standaardtaal **volgt de browser** — een Engelse browser start de app
  in het Engels, anders Nederlands; jouw eigen keuze wint daarna altijd.
- **Hoe ziet een leerling dagen later zijn feedback terug?** (C2/C3). Op
  **hetzelfde apparaat/dezelfde browser** verschijnt "Je hebt een reactie!" op het
  startscherm en laadt zijn werk automatisch terug (bewaard in de browser). Op een
  **ander of leeggemaakt apparaat** (of een gedeelde Chromebook) is de
  **bewaarcode** (6 tekens) de weg terug: die voert de leerling in en ziet dan zijn
  compositie + feedback op het podium. Een inzending die alleen via de klascode
  ging en waarvan de leerling géén bewaarcode noteerde, kan hij op een vreemd
  apparaat niet zelf terughalen — dat is een bewuste privacykeuze (we vragen geen
  leerling-mailadres). Wil je dit later anders, dan is het een apart ontwerp-
  besluit (bv. de docent deelt de feedback terug via het digibord of een album).

---

## 🎛️ B. Studio — nog te testen

- [ ] **Zoomknoppen op smal venster/iPad**: zoomknoppen zichtbaar in de werkbalk
      (de "fit"-knop alleen op desktop).
- [ ] **Effecten**: pitch/reverb/fade toepassen → hoorbaar bij afspelen én in de
      MP3-export.

## 🎤 C. Podium, opslaan en delen — nog te testen

- [ ] **C4. MP3-export**: klinkt zoals in de app (tempo klopt), ook met effecten.
- [ ] **C5. Video-export** (storyboard): mp4 met beeldwissels en geluid.

## 🏫 D. Klascode en peer-feedback (leerling) — nog te testen

- [ ] **D6. Luister naar klasgenoten**: fullscreen presentatiescherm, anoniem,
      sterren-rij + versturen; eigen werk komt nooit voorbij; na 3 beoordelingen
      nette lege-melding.
- [ ] **D7. Ronde gesloten**: docent zet peer-feedback uit of laat de timer
      verlopen → leerling krijgt een eerlijke melding (geen nep-confetti).

## 👩‍🏫 E. Klaslokaal (docent) — nog te testen

- [ ] **E3. Inzendingen**: nieuw-teller, "Beluisterd"-badge, tab "In bewerking".
- [ ] **E5. Peer-feedback instellen**: toggle aan, feedbackkaart kiezen, eigen
      kaart maken, **tijdslot** (10 min) → aftelling → "Ronde gesloten" +
      "Opnieuw openen". *(Server-side check: uitzetten moet ook echt weigeren.)*
- [ ] **E6. Feedback-overzicht**: top 3 klopt met de sterren; tab Ontvangen toont
      per-criterium gemiddelden + wie-gaf-wat; tab Gegeven zet 0-gevers bovenaan.

## 🧰 F. Materiaal en leskaarten (docent) — nog te testen

- [ ] **F7. Vrije-thema-kiezers**: buiten-seizoen thema's zichtbaar mét badge voor
      de docent; leerling-kiezers verbergen ze nog steeds.

## 📽️ G. Presentatiescherm (digibord) — nog te testen

- [ ] **G1. Docent-presentatie**: klas met ≥2 inzendingen → zijpaneel met rijen,
      klik = springen, in-/uitschuiven met randknop + badge "2/8".
- [ ] **G2. Peer-sterren per rij** (★-totaal; alleen bij inzendingen die
      peer-feedback kregen — migratie 030).
- [ ] **G3. Doorspelen** + pijltjestoetsen + aankondiging (~1,2s) + feedbackrij.
- [ ] **G4. Per vorm**: storyboard beweegt mee · praatplaat toont pulserende spot ·
      vrij/template toont de meebewegende tijdlijn.
- [ ] **G5. Fullscreen**: knop, `F`, Escape verlaat eerst fullscreen; ook op iPad.
- [ ] **G6. Praatplaat-bord**: docent-viewer én publieke deelviewer (`?pp-share=`)
      — plaat groot, klikbare spots (klik = spelen, nogmaals = pauze, cluster =
      keuzemenu), montagelijn-toggle.

## 🌐 H. Landing, lespagina's en SEO — nog te testen

- [ ] **H3. SEO na deploy**: open
      [search.google.com/test/rich-results](https://search.google.com/test/rich-results),
      plak `https://soundscout.techindeles.nl/teacher`, klik "URL testen". Je wilt
      **WebPage** en **FAQPage** in de lijst, zonder rode fouten. Daarna in Chrome:
      F12 → Lighthouse → alleen "SEO" → rapport → score ≥ 95.
- [ ] **H4. robots/sitemap na deploy**: `…/robots.txt` en `…/sitemap.xml` openen —
      beide moeten laden en `/` en `/teacher` noemen.

## 📱 I. Apparaten — nog te testen

- [ ] **I1. iPad — video's**: tutorial en docentengids, geen zwart vlak.
- [ ] **I2. iPad — touch-targets**: werkbalkknoppen boven de tijdlijn, spoor-volume
      en de clip-resizegreep zijn makkelijk te raken.
- [ ] **I3. Landscape-hint** (iPad/telefoon in portret): banner met draai-icoon
      in de studio → verdwijnt liggend → kruisje = voorgoed weg; niet op het
      startscherm of dashboard; EN-tekst klopt.
- [ ] **I4. Telefoon (375px)**: startscherm, landing en podium stapelen netjes,
      geen horizontale scroll.
- [ ] **I5. Statistieken-dashboardje**: ingelogd als beheerder (`VITE_ADMIN_EMAILS`)
      → knop "Statistieken" in de dashboard-header → grafiek + tabel.

---

## Regressie-let-op (waar bugs zich kunnen verstoppen)

- Elke klas-inzending hoort een bewaarcode te geven (migratie 026). Ontbreekt er
  één, controleer of 026 echt geslaagd is.
- "In bewerking" vs "Ingeleverd" splitst op `submitted_at`, niet op het bestaan
  van een code.
- De peer-batch geeft alleen inzendingen met `submitted_at` — een klas met één
  inzending toont terecht "nog geen composities om te beluisteren".
- De presentatie-playlist ververst elke 20s. Zie je iets raars tijdens het
  presenteren (item springt), noteer wélke lijst je koos (actieve opdracht of alles).
- Praatplaat-thema (nieuw): het thema komt van de docent-keuze bij activeren. Een
  onbekend thema valt terug op 'stad' — dat is bewust, geen bug.

---

# ✅ Afgerond

Alles hieronder is door jou getest en akkoord bevonden (of in een eerdere ronde
afgesloten). Bewaard als regressie-referentie — niet opnieuw nodig, tenzij er iets
in dat gebied verandert.

### Testronde 5 (22-7) — getest en akkoord
*(verplaats hierheen zodra je de R5-punten hierboven hebt afgevinkt)*

### Leerling-basisflow
- ✅ **A1. Rooktest**: Start → thema → kaart → locatie → geluiden → studio → podium;
  geluid speelt, geen console-fouten.
- ✅ **A2. Taal**: NL/EN wisselen op start, `/teacher` en dashboard; teksten
  veranderen mee (ook "Open code", "Lever in", "Bekijk inzendingen"). *(Taalknop nu
  ook op de auth-schermen — R5-6; standaardtaal volgt de browser.)*
- ✅ **A4. Tutorial**: "Hoe werkt het?" → video's spelen (op iPad geen zwart vlak).

### Studio
- ✅ **B1. Tijdlijn en sporen**: "spoor toevoegen" is de onderste rij (geen grijs
  vlak/doorlopende afspeellijn); auto-scroll lekt niet naar de pagina;
  "+8"/"−8" telt door (max 64, min 16) met inhoud-bescherming; clip op maat 40
  speelt + zit in de MP3-export; "+ spoor" tot 12 (clip op spoor 9+ hoorbaar);
  solo isoleert één spoor, ook tijdens afspelen, en is tijdelijk.
- ✅ **B2. Markeer deel** (vlag): grijs met tooltip op beat 0, actief na afspelen.
- ✅ **B2. Clip-loop**: resize-greep naar rechts → clip loopt door, stopt vóór de
  volgende clip (geen overlap).
- ✅ **B3. Iconen**: overal lijn-iconen, nergens emoji.

### Podium, opslaan en delen
- ✅ **C1. Bewaarcode → keuzescherm**: code op ander apparaat → keuze Studio/Podium
  → Podium toont compositie + feedbackblok + code-badge; naam is voorgevuld;
  "Nieuwe compositie" wist naam + bewaarcontext.
- ✅ **C6. Deel-link**: link maken → in ander venster openen → luisterpagina werkt.
- ✅ **C7. Online bewaren**: code + QR verschijnen; op ander apparaat invoeren laadt
  de compositie.
- ✅ **14. "Opslaan" sluit de modal** (testronde 4). *(Empty-timeline + tab-focus
  opnieuw te bevestigen op de verse build — R5-7/R5-8.)*

### Klascode, praatplaat en peer (leerling)
- ✅ **D1. Klascode-landing**: 4 cijfers → landingsscherm met titel, beeld,
  opdrachtkaart en tijdsduur (033) → "Starten".
- ✅ **D3. Storyboard-opdracht**: beelden in de studio, pijltjes werken, opslaan.
- ✅ **D4. Vrije opdracht**: thema staat vast, verder vrij componeren.
- ✅ **D5. Route C** (geen actieve opdracht): herstelopties ("Vrij componeren" /
  "Andere code").

### Klaslokaal (docent)
- ✅ **E1. Klas + opdracht**: klas aanmaken → opdracht activeren (elk van de vier
  types) → klascode groot → vervang-waarschuwing bij een actieve opdracht.
- ✅ **E2. Tijdsduur** (033): "bijv. 2 lessen" → Enter → groene "Opgeslagen" →
  zichtbaar op de leerling-landing.
- ✅ **E4. Feedback geven**: sticker + sterren slaan direct op, tekst via Versturen;
  status in de lijst klopt.
- ✅ **E7. Historie**: heractiveren, bekijken, verwijderen. *(Uniforme,
  niet-destructieve prullenbak opnieuw te bevestigen op de verse build — R5-13.)*
- ✅ **E8. Album delen**: op de actieve opdracht én op elke historie-rij.

### Materiaal en leskaarten (docent)
- ✅ **F1. Mijn materiaal**: "Mijn opdrachtkaarten" + "Mijn templates"; tellers kloppen.
- ✅ **F2. Opdrachtkaart maken** en koppelen aan een opdracht. *(Nieuw: kaart ook op
  de actieve opdracht wijzigbaar — R5-3.)*
- ✅ **F3. Bewaar als opdracht** (podium, docent) → verschijnt bij Mijn templates.
- ✅ **F4. Bewaar als leskaart**: vanaf een template-kaart én vanuit het
  succes-scherm → editor voorgevuld → na opslaan bij Leskaarten.
- ✅ **F5. Leskaarten-tab**: groepen "Standaard"/"Mijn leskaarten"; thema- en
  niveaufilters (Groep 1-2 … 7-8); buiten-seizoen kaart met badge + zachte bevestiging.
- ✅ **F6. Leskaart activeren** vanuit de picker → klascode groot in beeld.

### Landing en lespagina's
- ✅ **H1. `/teacher` doorlopen**: tabbladen in de juiste volgorde; hero-animatie
  (nu tweetalig); "Drie manieren" met preview; leskaarten met cover.
- ✅ **H2. Lespagina's**: `/les/robotfabriek/index.html` (+ drumbeat / verspringen /
  vrij-basis) — cover, lesdoel, 4 lesfases, "Open voor je klas" → login/dashboard.

### Hertest testronde 4 (19-7) — akkoord
- ✅ **1. Album met afspeellijst** (zijpaneel + vorige/volgende/doorspelen).
- ✅ **2. Albumcode groot** in de deel-modal.
- ✅ **3. Leskaart-pagina opent in nieuw tabblad**. *(Hoe je ze maakt/bewerkt: zie
  "Antwoorden op je vragen".)*
- ✅ **4. EffectsModal focus-trap** blijft binnen de modal.
- ✅ **5. Historie-acties compleet** (oog · deel · activeer op elke rij). *(Waarom
  praatplaat "delen" apart is: zie "Antwoorden op je vragen".)*
- ✅ **6. Presenteren-keuze** (actieve opdracht / alle composities).
- ✅ **7. Ververs tijdens presenteren** + auto-refresh elke 20s.
- ✅ **8. Montagelijn wit** bij laden.
- ✅ **9. Klaslokaal-startkeuze**: vier type-kaarten + "Of kies een leskaart".
- ✅ **10. "Open code"** (was "Beluister").
- ✅ **11. "Lever in"-knop** + digibord alleen voor de docent.
- ✅ **12. Leskaart-covers op /teacher**.

### Eerdere rondes (samengevat)
- ✅ **Rooktest + week 1**: start→podium; wachtwoord-reset-mail aanvragen; SEO-build
  (titles/descriptions/canonical/og/robots/sitemap); TrimModal + podium-modals
  Escape/focus-trap; bundel ~152 kB; privacytekst.
- ✅ **Week 2**: klas + opdracht + klascode; leerling levert in ("Jouw code");
  docent ziet "Nieuw" + feedback; Escape sluit inzendings-weergave; "Beluisterd"-
  badge; bewaarcode laadt (migratie 029).
- ✅ **Week 3**: eenmalige intro-animatie; kaart-/studio-tips (TipModal); geen
  kindertaal ("docent"); woordenlijst-aanzet.
- ✅ **Week 5**: peer-feedback docent (toggle, kaart, eigen kaart); leerling 3
  anonieme composities + max 3; eigen werk nooit in de batch; codeblok toont niet
  meer een vórige code; "Luister naar klasgenoten" toont beeld groot; feedback-flow
  op het podium; `/teacher` twee tabbladen + FAQ + thema-deeplink + privacy +
  mobiele stapeling; seizoenschip (unit-tests).
- ✅ **Testronde 3**: storyboard-verlies-bug; "Opslaan & Delen"-modal; "Terug naar
  plattegrond"; `/teacher`-CTA kent inlogstatus; leskaarten in dashboard-stijl;
  docent-verklaring bij registratie.
- ✅ **Presentatiescherm fase 2**: zijpaneel + badge; feedback-status-toggle;
  doorspelen/pijltjes/aankondiging/feedbackrij; docent-review (montagelijn,
  metadataregel, gezien-stempel); fullscreen (knop, `F`, Escape).
- ✅ **Opdrachten-model**: "Mijn materiaal" opgeschoond; leskaarten-tab met filters
  + seizoensbadge; startkeuze/klas-historie (heringedeeld in testronde 4).
- ✅ **R4 — album + lespagina's**: album delen (link + QR, 30 dagen); album-code op
  het startscherm; lesfases nagelezen; albumviewer/code-grootte/leskaart-link.
- ✅ **Restpunten 18-7**: juiste uitlegkaart per type (032); "Markeer deel" grijs op
  beat 0; leskaarten gegroepeerd + niveau-buckets; "Mijn opdrachtkaarten"/"Mijn
  templates"; hero-animatie + drie-manieren-layout; presentatiescherm-verfijningen
  (aankondiging 1,2s, Open montage, direct opslaan sticker/sterren); tijdsduur
  (033); dashboard-uitleg per tab; gids-secties feedback + klas-organisatie.
- ✅ **Hero-animatie tweetalig** (22-7): `/teacher`-hero, tutorial en first-run
  intro tonen de 4-stappen-animatie in de taal van de app.

### Week 4 — thema-wizard
- ⏸️ **Door jou geparkeerd** (18-7): "ik heb hier niet de juiste materialen voor,
  dit test ik op een ander moment." Stappen 1-3 waren toen groen.
