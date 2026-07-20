# Testplan SoundScout

Handmatig testplan voor alles wat in de worktree `masterplan-6-weken` is gebouwd.
**Herstructurering 19-7**: de actieve testen staan nu gegroepeerd **per activiteit**,
zodat je per onderdeel in één keer alles kunt nalopen. Wat je al hebt afgetekend
staat compact onderaan in **✅ Afgerond**.

**Zo test je:** `- [x]` = werkt · `- [-]` = werkt niet · `- [?]` = twijfel/onduidelijk.
Zet er bij `-`/`?` een regel onder met wat je zag; ik pak die daarna gericht op.

**Lokaal draaien:** `cd .claude/worktrees/masterplan-6-weken && npm run dev`.
Twee browserprofielen zijn handig (docent in de één, "leerling" incognito in de ander).

Automatische gates zijn groen: `npx tsc -b --noEmit` · `npm run test:run` (266 tests) ·
`npm run lint` (baseline 27) · i18n-pariteit NL/EN.

> Volledige rol-doorloop: zie [USECASES-QA.md](USECASES-QA.md) — 30 leerling- + 26 docent-usecases.
> Wat je waar aan/uit zet: [HANDLEIDING-BEHEER.md §4b](HANDLEIDING-BEHEER.md).

---

## ⚠️ Eerst dit (acties voor Bert)

- [x] **Migraties 032 en 033 draaien** in de Supabase SQL Editor:
      `032_fix_lesson_card_inline_match.sql` (juiste uitlegkaart bij template-leskaarten) ·
      `033_assignment_duration_label.sql` (tijdsduur-veld op een opdracht).
- [x] **Supabase Redirect URLs**: Authentication → URL Configuration → toevoegen:
      `https://soundscout.techindeles.nl/*` (naast localhost). Zónder deze regel
      landt elke wachtwoord-reset-mail op `otp_expired` — dat is wat je zag bij 1a.
- [ ] Daarna **een verse reset-mail** aanvragen en direct klikken (elke eerder
      geklikte link is verbruikt).

---

## 🆕 Hertest testronde 4 (19-7) — begin hier

Gefixt n.a.v. jouw testplan-annotaties en het Notion-blok "Test-ronde 4".

- [x] **1. Album met afspeellijst** (was: geen zijpaneel): open een album-link met
      ≥2 composities → rechts staat nu het zijpaneel met alle composities, plus
      vorige/volgende-knoppen en "Doorspelen". Geen docent-feedbackstatus — dat
      blijft docent-only. *(Antwoord op je vraag: ja, dit ís het universele
      presentatiescherm; de publieke variant miste alleen de lijst.)*
- [X] **2. Albumcode groot**: klaslokaal → "Deel album" → de 8-tekens code staat
      nu groot bovenaan de modal (zelfde formaat als de klascode), met daaronder
      de link + QR.
- [X] **3. Leskaart-pagina opent in een nieuw tabblad**: `/teacher` → een leskaart
      → "Bekijk de leskaart" → nieuw tabblad met de lespagina (niet meer de app).
      *(Antwoord op je vraag "hoe kom ik daar en wat is de functie?": je komt er
      via deze knop op `/teacher`; de pagina is een **lees-/deelpagina** — bedoeld
      om aan een collega te sturen of te laten vinden via Google. Lesgeven doe je
      via "Open voor je klas".)* ==> WERKT GOED. Hoe en waar maken we deze lespagina's aan om beschibaar te stellen voor delen. En hoe kan ik eventuele teksten aanpassen?
- [X] **4. EffectsModal focus-trap**: studio → clip selecteren → effecten →
      **Tab** blijven drukken, ook nadat je pitch/reverb op 0 zet: de focus blijft
      binnen de modal. *(Oorzaak die nog restte: als het gefocuste element
      verdween — de reset-knop verdwijnt bij waarde 0 — sprong de focus naar de
      achtergrond. Nu vangt de trap dat af.)*
- [? X ] **5. Historie-acties compleet**: klaslokaal → "Eerdere opdrachten" → élke
      rij heeft nu **oog (bekijk inzendingen)**, **Deel album** en **Activeer**;
      praatplaat-rijen houden hun eigen oog/deel/prullenbak. Het oog opent de
      presentatie met precies de inzendingen van díe opdracht (grijs als er nog
      geen zijn). ==> Werkt maar waarom behandelen we praatplaten anders? Is dit niet gewoon universeel? En waarom staat er bij praatplaten delen met leerlingen als dit eigenlijk gewoon via klascode gaat? Of heeft dit een andere betekenis?
- [X] **6. Presenteren-keuze**: klaslokaal → "Presenteren" → zodra er een
      actieve opdracht is, vraagt hij eerst: **"Actieve opdracht (n)"** of
      **"Alle composities (n)"**. Heeft de actieve opdracht nog geen inzendingen,
      dan staat die optie grijs met "Nog geen inzendingen bij deze opdracht" —
      zo zie je meteen waaróm er niets van die opdracht te presenteren valt.
      (Zonder actieve opdracht opent hij direct alles; dan valt er niets te kiezen.)
- [X] **7. Ververs tijdens presenteren**: in het presentatiescherm staat een
      ververs-knop (ronde pijl) in de kopbalk; nieuwe inzendingen komen daarnaast
      **elke 20 seconden vanzelf** achteraan de lijst, zonder de muziek te storen.
- [X] **8. Montagelijn wit**: presentatiescherm → montagelijn openen → de balk
      achter de sporen is wit (was grijzig).
- [X] **9. Klaslokaal-startkeuze**: "Kies/Wijzig opdracht" toont nu meteen de
      **vier type-kaarten** (geen tussenklik "Stel zelf samen" meer), met daaronder
      één knop **"Of kies een kant-en-klare leskaart"**.
- [X] **10. "Open code"**: startscherm → "Ik heb een code" → de knop heet nu
      **Open code** (was "Beluister"). Ook in EN controleren.
- [X] **11. "Lever in"-knop**: leerling met klascode → podium → Opslaan & Delen →
      kolom "Voor de klas" heeft nu een echte knop **"Lever in"**; de modal sluit
      na het inleveren en de knop is bij een volgende keer gewoon weer beschikbaar.
      **"Presenteren op het digibord" is daar weg voor leerlingen** — die knop is
      alleen nog zichtbaar als jij als docent bent ingelogd.
- [X] **12. Leskaart-covers op /teacher**: het detailpaneel rechts toont nu de
      plaat/cover boven de titel (zoals in het dashboard).

- [ ] **13. Bewaarcode → volle tijdlijn** (was: lege tijdlijn): bewaar een
      compositie online in thema Piraten (of een ander niet-standaard thema),
      open de code op een ánder apparaat → de clips staan er gewoon. *(Oorzaak:
      de tijdlijn zocht samples in het actieve thema i.p.v. in je eigen
      bibliotheek — jouw bevinding bij A3.)*
- [ ] **14. "Opslaan" sluit de modal**: podium → Opslaan & Delen → Opslaan →
      de modal sluit en de bewaar-bevestiging verschijnt.
- [ ] **15. Aankondiging dimt niets meer**: presenteren → volgende compositie →
      "Nu te horen" verschijnt als zwevend kaartje bovenin; de kaart eronder
      (inclusief montagelijn) blijft helder wit. *(Dit was het "grijs bij laden".)*
- [ ] **16. Praatplaat-bord bij presenteren**: klaslokaal met een actieve
      praatplaat-opdracht → Presenteren → "Actieve opdracht" → je krijgt het
      klikbare bord (zoals in het gedeelde album), niet losse visuals.
- [ ] **17. Eén deelknop**: elke opdrachtrij heeft nu één "Delen". Bij een
      praatplaat vraagt hij eerst: het bord (klikbaar) of de composities
      (afspeellijst). Bij andere types opent direct de album-modal.
- [ ] **18. Taalknop overal**: dashboard, klaslokaal én gids hebben de NL/EN-knop
      rechtsboven op dezelfde plek — precies één per scherm.
- [ ] **19. Browsertaal**: verse browser (of gewiste opslag) met Engelse
      taalinstelling → app start in het Engels; Nederlandse browser → Nederlands.
      Zet je zelf de taal om, dan wint die keuze altijd.

- [ ] **20. Transportknoppen in de presentatie**: ⏮ zet de compositie die je
      hoort terug naar het begin (net als in de studio); er is geen ⏭ meer.
      Wisselen van compositie doe je in het zijpaneel, met ←/→ of via
      "Doorspelen". *(Jouw punt: hetzelfde icoon moest overal hetzelfde doen.)*

- [ ] **21. Historie opruimen — overal hetzelfde, nooit destructief**: klaslokaal
      → "Eerdere opdrachten" → élke rij heeft nu dezelfde vier acties (oog ·
      delen · prullenbak · Activeer). Klik de prullenbak bij een storyboard- of
      template-rij → de tekst zegt dat het leerlingwerk bewaard blijft →
      bevestigen → de rij is weg **en de composities staan nog gewoon bij de
      inzendingen**. Dat laatste is het punt: voorheen wiste de prullenbak bij
      een praatplaat de inzendingen écht mee.

---

## 🎒 A. Leerling — basisflow

- [X] **A1. Rooktest**: Start → Nieuwe compositie → thema → Kaart → Locatie →
      geluiden verzamelen → Studio → Podium. Geluid speelt, geen console-fouten.
- [? X ] **A2. Taal**: NL/EN wisselen op het startscherm én op `/teacher` en in het
      dashboard; steekproef dat teksten meeveranderen (ook nieuwe knoppen uit
      testronde 4: "Open code", "Lever in", "Bekijk inzendingen"). ==> WERKT maar zou er altijd in alle teacher en dashboard schermen die kleine toggle EN/NE helemaal rechtsboven kunnen staan? Het zou mooi zijn als we een universele plek hebben die altijd snel te vinden is in je scherm. En is de standaard taalkeuze altijd gekoppeld aan de browser instelling?
- [-] **A3. Composities hervatten**: "Mijn composities" → een opgeslagen werk
      heropenen → studio en podium kloppen. ==> Opslaan werkt. Kan je n de modal "Opslaan & Delen" als je op de knop "Opslaan" klikt na het opslaan de modal laten sluiten? En kan je de tab-functie in deze modal ook aanzetten? Ik had overigens geklikt op "Bewaar online" en wilde de code openen in een andere browser. Hij vond de code maar de tijd-/montagelijn was leeg. Wordt de tijdlijn montagelijn wel opgeslagen voordat het online wordt bewaard?
- [X] **A4. Tutorial**: "Hoe werkt het?" → video's spelen (op iPad: geen zwart vlak).

## 🎛️ B. Studio (DAW-ronde) — nog niet getest

### B1. Tijdlijn en sporen
- [X] Onder de sporen is **"spoor toevoegen" de onderste rij** — geen grijs vlak
      of doorlopende afspeellijn eronder.
- [X] Sleep een sample zodat de auto-scroll je omlaag duwt: je kunt niet voorbij
      de "spoor toevoegen"-rij scrollen; scrollen "lekt" niet naar de pagina.
- [X] **"+8" / "−8"**: liniaal telt door (36, 40, …), clips blijven exact staan;
      vier keer "+8" → 64 maten → knop inactief; "−8" tot 16 maten → inactief.
- [X] **Inhoud-bescherming**: clip op maat 20 → "−8" kan tot 24, niet verder
      (knop inactief). Zelfde voor secties.
- [X] Clip op maat 40 speelt af **én** zit in de MP3-export; opslaan/heropenen
      behoudt de lengte; een oude compositie opent gewoon op 32 maten.
- [X] **"+ spoor"**: tot 12 sporen; regel verdwijnt op 12. **Cruciaal**: een clip
      op spoor 9+ is hoorbaar.
- [X] **Solo**: spoorkop → volume-icoon → koptelefoon → alleen dat spoor klinkt,
      ook midden in het afspelen. Solo is tijdelijk: "Naar podium" → volle mix.

### B2. Secties, zoom, clips
- [ ] **Markeer deel** (vlag): grijs met tooltip zolang de afspeellijn op 0 staat;
      na afspelen/klikken actief.
- [ ] **Sectie-loop**: sectie maken → tik erop → "Loop deze sectie" → afspelen
      loopt exact dat stuk; de transport-loopknop licht op; loopknop uit stopt
      ook de sectie-loop.
- [ ] Smal venster/iPad: **zoomknoppen zichtbaar** in de werkbalk (fit alleen op desktop).
- [ ] **Clip-loop**: sleep de resize-greep van een clip naar rechts → hij loopt
      door; hij stopt netjes vóór de volgende clip (geen overlap).
- [ ] **Effecten**: pitch/reverb/fade toepassen → hoorbaar bij afspelen én in de
      MP3-export.

### B3. Iconen
- [ ] Steekproef: feedback-stickers, foutschermen, trim-schaartje, laad-spinners,
      sleepgreep — overal lijn-iconen, nergens emoji.

## 🎤 C. Podium, opslaan en delen

- [ ] **C1. Bewaarcode → keuzescherm**: code invoeren op een ander apparaat →
      keuze "Studio / Podium" → Podium toont compositie + feedbackblok + code-badge.
      *(Dit is punt 3 uit het vorige blok waar je vroeg wat ik bedoelde: bij het
      openen via een bewaarcode hoort de **compositienaam al ingevuld** te staan
      op het podium — vroeger was dat veld leeg. En als je daarna "Nieuwe
      compositie" kiest, moet die naam én de bewaarcontext echt weg zijn, zodat
      je nieuwe werk niet stilletjes over het oude heen wordt opgeslagen.)*
- [ ] **C2. Docent-feedback zien**: compositie met feedback openen → banner met
      sticker/sterren/tekst; "Je hebt een reactie!" op het startscherm opent het podium.
- [ ] **C3. Klasgenoot-sterren zien**: ontvanger ziet per criterium gemiddelde
      sterren + aantal ("Ritme ★★★ (3)").
- [ ] **C4. MP3-export**: klinkt zoals in de app (tempo klopt), ook met effecten.
- [ ] **C5. Video-export** (storyboard): mp4 met beeldwissels en geluid.
- [ ] **C6. Deel-link**: link maken → in een ander venster openen → luisterpagina werkt.
- [ ] **C7. Online bewaren**: code + QR verschijnen; op een ander apparaat invoeren
      laadt de compositie.

## 🏫 D. Klascode, praatplaat en peer-feedback (leerling)

- [ ] **D1. Klascode-landing**: 4 cijfers → landingsscherm met titel, beeld,
      opdrachtkaart en (na migratie 033) de tijdsduur → "Starten".
- [ ] **D2. Praatplaat**: klascode van een praatplaat-opdracht → plek kiezen →
      componeren → opslaan → succesmelding; "Kies een nieuwe plek" werkt.
- [ ] **D3. Storyboard-opdracht**: beelden in de studio, pijltjes werken, opslaan.
- [ ] **D4. Vrije opdracht**: thema staat vast, verder vrij componeren.
- [ ] **D5. Route C** (geen actieve opdracht): code invoeren → herstelopties
      ("Vrij componeren" / "Andere code").
- [ ] **D6. Luister naar klasgenoten**: fullscreen presentatiescherm, anoniem,
      sterren-rij + versturen; eigen werk komt nooit voorbij; na 3 beoordelingen
      nette lege-melding.
- [ ] **D7. Ronde gesloten**: docent zet peer-feedback uit of laat de timer
      verlopen → leerling krijgt een eerlijke melding (geen nep-confetti).

## 👩‍🏫 E. Klaslokaal (docent)

- [ ] **E1. Klas + opdracht**: klas aanmaken → opdracht activeren (elk van de vier
      types) → klascode groot in beeld → vervang-waarschuwing bij een actieve opdracht.
- [ ] **E2. Tijdsduur** (na 033): "bijv. 2 lessen" invullen → Enter → groene
      "Opgeslagen" → zichtbaar op de leerling-landing.
- [ ] **E3. Inzendingen**: nieuw-teller, "Beluisterd"-badge, tab "In bewerking".
- [ ] **E4. Feedback geven**: sticker + sterren slaan direct op ("Opgeslagen"),
      tekst via Versturen; status in de lijst klopt.
- [ ] **E5. Peer-feedback instellen**: toggle aan, feedbackkaart kiezen, eigen
      kaart maken, **tijdslot** (10 min) → aftelling → "Ronde gesloten" +
      "Opnieuw openen". *(Server-side check: uitzetten moet ook echt weigeren.)*
- [ ] **E6. Feedback-overzicht**: top 3 klopt met de sterren; tab Ontvangen toont
      per-criterium gemiddelden + wie-gaf-wat; tab Gegeven zet 0-gevers bovenaan.
- [ ] **E7. Historie**: heractiveren, bekijken, praatplaat verwijderen (waarschuwt
      dat inzendingen meegaan).
- [ ] **E8. Album delen**: op de actieve opdracht én op elke historie-rij.

## 🧰 F. Materiaal en leskaarten (docent)

- [ ] **F1. Mijn materiaal**: "Mijn opdrachtkaarten" + "Mijn templates"; tellers kloppen.
- [ ] **F2. Opdrachtkaart maken** en koppelen aan een opdracht.
- [ ] **F3. Bewaar als opdracht** (podium, docent) → verschijnt bij Mijn templates.
- [ ] **F4. Bewaar als leskaart**: vanaf een template-kaart én vanuit het
      succes-scherm van "Opslaan als opdracht" → editor opent voorgevuld → na
      opslaan staat de kaart bij Leskaarten.
- [ ] **F5. Leskaarten-tab**: groepen "Standaard" / "Mijn leskaarten";
      thema- en niveaufilters (Groep 1-2 … 7-8); buiten-seizoen kaart toont
      ⏱-badge en vraagt één zachte bevestiging.
- [ ] **F6. Leskaart activeren** vanuit de picker → klascode groot in beeld.
- [ ] **F7. Vrije-thema-kiezers**: buiten-seizoen thema's zichtbaar mét badge voor
      de docent; leerling-kiezers verbergen ze nog steeds.

## 📽️ G. Presentatiescherm (digibord)

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

## 🌐 H. Landing, lespagina's en SEO

- [ ] **H1. `/teacher` doorlopen**: beide tabbladen in de juiste volgorde; hero-
      animatie; "Drie manieren" met meebewegende preview; leskaarten met cover.
- [ ] **H2. Lespagina's**: `/les/robotfabriek/index.html` (en drumbeat /
      verspringen / vrij-basis) — cover, lesdoel, 4 lesfases, "Open voor je klas"
      → login/dashboard op de juiste leskaart.
- [ ] **H3. SEO na deploy** — *concreet wat je doet*: open
      [search.google.com/test/rich-results](https://search.google.com/test/rich-results),
      plak `https://soundscout.techindeles.nl/teacher`, klik "URL testen". Je wilt
      zien: **WebPage** en **FAQPage** in de lijst met gevonden items, zonder
      rode fouten. Daarna in Chrome: F12 → Lighthouse → alleen "SEO" aanvinken →
      rapport genereren → score ≥ 95.
- [ ] **H4. robots/sitemap na deploy**: `…/robots.txt` en `…/sitemap.xml` openen
      in de browser — beide moeten laden en `/` en `/teacher` noemen.

## 📱 I. Apparaten

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
- Nieuw sinds testronde 4: de presentatie-playlist ververst elke 20s. Als je iets
  raars ziet tijdens het presenteren (item springt), noteer wélke lijst je koos
  (actieve opdracht of alles).

---

# ✅ Afgerond

Alles hieronder is door jou getest en akkoord bevonden. Bewaard als
regressie-referentie — niet opnieuw nodig, tenzij er iets in dat gebied verandert.

### Rooktest en basis
- ✅ Start → kaart → locatie → studio → podium; taalwissel NL/EN op het startscherm.

### Week 1 — fundament
- ✅ Wachtwoord-reset: mail aanvragen werkt (het klikken zelf hangt nog op de
  Supabase Redirect URL — zie "Eerst dit").
- ✅ SEO-build: unieke titles/descriptions, canonical, og-image, robots + sitemap
  bevatten `/` en `/teacher` (door mij in de dist gecontroleerd).
- ✅ TrimModal: Escape + focus-trap. Podium-modals: Escape sluit, focus keert terug.
- ✅ Bundle: main chunk ~152 kB, `ComposePreview` in een eigen chunk.
- ✅ Privacytekst: "anonieme, cookieloze statistieken" incl. uitleg over de bewaarcode.

### Week 2 — inleveren en feedback
- ✅ Klas aanmaken, opdracht activeren, klascode noteren.
- ✅ Leerling levert in → "Jouw code: XXXXXX" op het podium.
- ✅ Docent ziet "Nieuw" + teller; feedback geven → kaart toont "Beoordeeld".
- ✅ Escape sluit de inzendings-weergave (was kapot, gefixt).
- ✅ "Beluisterd"-badge bij openen zonder feedback (was onzichtbaar, gefixt).
- ✅ Bewaarcode laadt weer (migratie 029 — de code-niet-gevonden-bug).

### Week 3 — onboarding en taal
- ✅ Eenmalige intro-animatie; verschijnt daarna niet meer.
- ✅ Kaart- en studio-tips als TipModal (lamp-icoon).
- ✅ Geen kindertaal; "docent" i.p.v. "juf/meester". Woordenlijst-aanzet:
  `docs/WOORDENLIJST.md` (vul aan wanneer je wilt).

### Week 4 — thema-wizard
- ⏸️ **Door jou geparkeerd** (18-7): "ik heb hier niet de juiste materialen voor,
  dit test ik op een ander moment." Stappen 1-3 waren toen groen.

### Week 5 — peer-feedback en landing
- ✅ Peer-feedback docent: toggle, ingebouwde feedbackkaart, eigen kaart maken.
- ✅ Leerling: 3 anonieme composities, chips, "klaar"-scherm; maximum 3 werkt.
- ✅ Eigen werk komt nooit in de batch (server-side uitgesloten).
- ✅ Codeblok toont niet meer de code van een vórige leerling (localStorage-bug).
- ✅ "Luister naar klasgenoten" toont het storyboard/de praatplaat groot.
- ✅ Feedback-flow verhuisd naar het podium (keuzescherm Studio/Podium, feedbackblok,
  code-badge, "Naar het podium"-knop).
- ✅ `/teacher` als twee tabbladen in jouw volgorde; lichte privacyband; demo-knop.
- ✅ FAQ, thema-kaarten met `?theme=`-deeplink (thema staat vooraan met badge),
  privacymodal, footer-links, mobiele stapeling.
- ✅ Seizoenschip: gedekt door unit-tests; "geen chip" is correct zolang geen
  thema een venster heeft.

### Testronde 3 (16-7)
- ✅ Storyboard-verlies-bug; "Opslaan & Delen"-modal; "Terug naar plattegrond";
  `/teacher`-CTA kent inlogstatus; leskaarten in dashboard-stijl; docent-verklaring
  bij registratie.

### Presentatiescherm fase 2 (17-7)
- ✅ Zijpaneel met rijen + in-/uitschuiven met badge; feedback-status-toggle;
  doorspelen, pijltjes, aankondiging, feedbackrij.
- ✅ Docent-review: montagelijn uitgeklapt, metadataregel, "Beluisterd"-stempel.
- ✅ Podium → "Presenteren op het digibord" (nu docent-only, zie testronde 4).
- ✅ Fullscreen: knop, `F`, Escape.

### Opdrachten-model (17-7)
- ✅ "Mijn materiaal" opgeschoond; leskaarten-tab als kiesplek met filters en
  seizoensbadge.
- ✅ Startkeuze en klas-historie: werkten, maar zijn op jouw verzoek heringedeeld —
  zie testronde 4, punten 5 en 9.

### R4 — klas-album en lespagina's (17-7)
- ✅ Album delen vanaf de actieve opdracht en elke historie-rij (link + QR, 30 dagen).
- ✅ Album-code op het startscherm; lesfases van Verspringen / Vrij componeren /
  Drum beat nagelezen.
- ✅ Albumviewer, code-grootte en de lespagina-link: aangepast in testronde 4
  (punten 1, 2, 3).

### Restpunten + dashboard/landing (18-7)
- ✅ Juiste uitlegkaart per opdrachttype (migratie 032).
- ✅ "Markeer deel" grijs op beat 0; leskaarten gegroepeerd + niveau-buckets;
  "Mijn opdrachtkaarten"/"Mijn templates"; hero-animatie + drie-manieren-layout.
- ✅ Presentatiescherm: aankondiging 1,2s, "Open montage"-knop, direct opslaan van
  sticker/sterren.
- ✅ Album-gate-tekst; tijdsduur-vermelding (033); dashboard-uitleg per tab;
  gids-secties "Tips voor feedback geven" en uitgebreide "Tips voor de klas".
