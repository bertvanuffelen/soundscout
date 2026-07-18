# Testplan Masterplan (week 1–5)

Volledig handmatig teststappenplan voor alles wat in de worktree `masterplan-6-weken` is gebouwd. Af te vinken vóór merge naar `main` + deploy.

**Vooraf:**
- Migraties **025 → 026 → 027 → 028 → 029 → 030** zijn in Supabase gedraaid ✅ (bevestigd door Bert, 17-7).
- Lokaal draaien: `cd .claude/worktrees/masterplan-6-weken && npm run dev` → open het getoonde adres.
- Twee browserprofielen/apparaten handig voor de klas- en peer-flows (docent in de één, "leerling" incognito in de ander).
- Automatische gate is al groen: `npx tsc -b --noEmit`, `npm run test:run` (263 tests), `npm run lint` (baseline 31, 0 nieuw).

**Resultaten noteren:** vink af met `- [x]`. Werkt iets niet? Zet er een regel onder met `⚠️` + wat je zag — dan pak ik die daarna gericht op.

---

## 🔁 HERTEST-LIJST DEPLOY-VOORBEREIDINGEN (18-7, vierde blok) — nieuwste eerst

- [ ] **1. YouTube op iPad** (BUG-YOUTUBE): open op een échte iPad de tutorial ("Hoe werkt het?") en de docentengids, start een video — geen zwart vlak meer; je ziet de poster met play-knop of de video start direct. Fix: `playsinline=1` op alle embeds.
- [ ] **2. Touch-targets studio** (op iPad/telefoon): de werkbalkknoppen boven de tijdlijn (label/knip/dupliceer/volume/effecten/verwijder, vlag, gum, ±8, zoom) zijn nu veel makkelijker raakbaar (44px-raakvlak; visueel gelijk). Transportknoppen zijn iets groter. Ook: spoor-volumeknopje en de resize-handle van een geselecteerde clip reageren ruimer.
- [ ] **3. Statistieken-dashboardje**: log in als docent → in de dashboard-header staat (alleen voor jou) een "Statistieken"-knop → grafiekje sessies per dag + tabel per gebeurtenis (vandaag / 7 / 30 dagen). Werkt zodra migratie 025 gedraaid is (al gedaan) en er tellingen zijn. De knop is gekoppeld aan `VITE_ADMIN_EMAILS` in `.env.local` (al ingevuld met jouw adres — bij een productie-build dus ook aanwezig).

---

## 🔁 HERTEST-LIJST R4: KLAS-ALBUM + LESKAART-PAGINA'S (17-7, derde blok) — nieuwste eerst

**Vooraf: migratie 031 draaien** (`supabase/migrations/031_class_album_share.sql`) — zonder geeft de album-deelknop een nette fout, de rest werkt.

- [ ] **1. Album delen (docent)**: klaslokaal → op de actieve opdracht (en op elke historie-rij) staat "Deel album" → modal toont link (`?album=CODE`), kopieerknop en QR; 30 dagen geldig, opnieuw delen verlengt.
- [ ] **2. Album openen (publiek)**: de link in een incognito-venster → klasnaam + opdrachtnaam + composities-teller → "Open het album" (audio-gebaar) → presentatiescherm met alle **ingeleverde** composities als afspeellijst; bij een praatplaat-opdracht het klikbare bord. *(Not-found/verlopen-staten door Claude al geverifieerd.)*
- [ ] **3. Album-code op het startscherm**: de 8-letterige code typen bij "Ik heb een code" → zelfde albumweergave.
- [ ] **4. Leskaart-pagina's**: `localhost:5199/les/robotfabriek/index.html` (en drumbeat/verspringen/vrij-basis) — cover, lesdoel, 4 lesfases, "Open voor je klas" → login/dashboard op de juiste leskaart. *(Door Claude al inhoudelijk geverifieerd; na deploy werkt ook het korte pad `/les/robotfabriek`.)*
- [ ] **5. Landing**: op `/teacher` heeft elke leskaart nu een "Bekijk de leskaart"-link naar zijn eigen pagina.
- [ ] **6. Nieuwe lesfases in de app**: de leskaarten Verspringen / Vrij componeren / Drum beat tonen nu ook lesfases in het dashboard — lees ze even na (door mij geschreven in jouw stijl; pas gerust aan).

---

## 🔁 HERTEST-LIJST OPDRACHTEN-MODEL (17-7, tweede blok) — nieuwste eerst

Herontwerp na de usecases-brainstorm (indeling B + thema-filter, seizoensregel, klas-historie). Alles docent-login:

- [ ] **1. "Mijn materiaal"** (voorheen Mijn opdrachten): alleen opdrachtkaarten + templates; badge telt klopt; geen praatplaten- of storyboards-secties meer.
- [ ] **2. Leskaarten-tab = kiesplek**: thema-filterchips (alleen thema's mét kaarten, + "Algemeen") en niveau-chips; buiten-seizoen leskaart toont ⏱-badge "weer beschikbaar in …"; activeren daarvan vraagt één zachte bevestiging (nooit blokkeren).
- [ ] **3. Klaslokaal startkeuze**: bij "Kies/Wijzig opdracht" eerst twee kaarten — "Gebruik een leskaart" (picker: klas staat vast, één klik activeren, klascode groot in beeld, vervang-waarschuwing bij actieve opdracht) / "Stel zelf samen" (klapt de vertrouwde type-kaarten uit).
- [ ] **4. Klas-historie verrijkt**: bij eerdere praatplaat-opdrachten oog/deel/prullenbak-iconen — Bekijken opent het bord mét inzendingen, Delen toont de deelcode, Verwijderen waarschuwt dat inzendingen meegaan en ververst de lijst; "Activeer" werkt nog.
- [ ] **5. "Bewaar als leskaart"**: vanaf een template-kaart in Mijn materiaal én vanuit het succes-scherm van "Opslaan als opdracht" (podium) — editor opent voorgevuld; na opslaan verschijnt de kaart in Leskaarten.
- [ ] **6. Praatplaat-bord nieuw**: docent-viewer én publieke deelviewer (`?pp-share=CODE`) zijn nu het presentatiescherm — plaat groot, klikbare spots (klik = afspelen, nogmaals = pauze, cluster = keuzemenu), zijpaneel met inzendingen (docent), montagelijn-toggle, fullscreen; publieke gesture-gate blijft.
- [ ] **7. Vrije-thema-kiezers docent**: buiten-seizoen thema's zichtbaar mét badge (voorheen verborgen); leerling-kiezers verbergen ze nog steeds.

---

## 🔁 HERTEST-LIJST PRESENTATIESCHERM FASE 2 (17-7) — begin hier

Eén universeel presentatiescherm (mockup-stijl: lichte kaart op donker podium) achter vier ingangen. Overal geldt: fullscreen-knop rechtsboven (of `F`; Escape verlaat éérst fullscreen, sluit pas daarna), en bij beeld-vormen een montagelijn-toggle (tijdlijn uit-/inklappen — beeld wordt lager bij uitklappen).

- [ ] **1. Docent-presentatie (digibord)** — klas met ≥2 inzendingen → "Presenteren":
    - [ ] Zijpaneel: lichte rijen met vorm-icoontje + compositienaam + leerlingnaam; klik = spring naar die inzending.
    - [ ] Zijpaneel in-/uitschuiven: dicht = volledig weg + randknop rechtsmidden met badge "2/8"; randknop opent weer.
    - [ ] **Peer-sterren** per rij (★-totaal; alleen bij inzendingen die peer-feedback ontvingen — migratie 030).
    - [ ] "Feedback-status"-toggle bovenin het paneel: stip per rij (grijs=nieuw · oranje=gezien · groen=beoordeeld), default uit.
    - [ ] Doorspelen, pijltjestoetsen, aankondigingsoverlay en "Feedback geven"-rij werken zoals eerder.
- [ ] **2. Docent-review (inzending openen)** — montagelijn start **uitgeklapt**; metadataregel (datum · tracks · clips · samples) in de kaart; feedbackpaneel via "Feedback geven"; "Beluisterd"-stempel blijft werken.
- [ ] **3. Publieke luisterlink** (bijv. `9XRC6C6M`) — gesture-knop → presentatiescherm; géén zijpaneel/feedback; montagelijn-toggle bij storyboard. *(door Claude al end-to-end geverifieerd)*
- [ ] **4. Peer-luisteren (leerling)** — "Luister naar klasgenoten": nu fullscreen presentatiescherm, anoniem, sterren-rij + versturen-knop onder de kaart; stappenflow (1/3 → klaar) en eerlijke foutmeldingen ongewijzigd.
- [ ] **5. Podium → "Presenteren op het digibord"** — nieuwe knop in Opslaan & Delen (kolom "Voor de klas"): huidige compositie fullscreen, zonder opslaan; sluiten = terug op het podium. *(door Claude al geverifieerd)*
- [ ] **6. Fullscreen op het échte digibord** — knop + `F` + Escape-gedrag; check ook op iPad (Safari) als die er is.

---

## 🔁 HERTEST-LIJST TESTRONDE 3 (16-7, Notion-punten) — nieuwste eerst

Gefixt/gebouwd n.a.v. je Notion-blok "Test-ronde 2":

1. **Storyboard-verlies-bug**: storyboard-compositie → podium → terug → start → "Verder werken" → studio toont het storyboard nog gewoon (oorzaak: navigatie wiste alle context; geldt ook na "Hoe werkt het" of "Mijn composities").
2. **"Opslaan & Delen"**: de primaire podium-knop opent nu de nieuwe gecombineerde modal (drie kolommen: Voor jezelf · Voor de klas · Delen met anderen; docent-rij onderaan). Opslaan zit ín de modal als eerste knop. De losse "Delen & Exporteren"-knop is vervallen.
3. **Studio-terugknop**: heet nu "Terug naar plattegrond" (thema-onafhankelijk).
4. **/teacher CTA**: uitgelogd "Log in of maak een gratis account"; **ingelogd "Ga naar dashboard"** (dat laatste kun jij testen).
5. **/teacher leskaarten**: dashboard-stijl (thumbnails + type-badges); zichtbaarheid is nu gecureerd via een allowlist (nu alle vier).
6. **Registratie**: nieuwe verplichte verklaring "Ik ben docent of onderwijsprofessional…" (zachte drempel tegen leerling-accounts).

Geparkeerd op jouw verzoek: presentatiemodus-vormgeving (aparte sessie), praatplaten-beheer-ontwerp, feedback-/organisatie-tips-content, meer opdrachtkaart-templates — staan als taken in je To Do.

---

## 🔁 HERTEST-LIJST TESTRONDE 2 (16-7) — begin hier

Alles hieronder is gefixt/gebouwd n.a.v. jouw notities; de details staan als ✅-annotaties bij de betreffende punten. Volgorde is de handigste testvolgorde:

1. **1a Reset-mail**: vraag een VERSE reset-mail aan → klik direct → nieuwe-wachtwoord-formulier (twee bugs gefixt: Supabase-config was al gedaan; de app veegde daarnaast het token uit de URL).
2. **2c Bewaarcode**: voer BBD6KD (of een nieuwe code) in → **nieuw keuzescherm "Studio / Podium"** → kies Podium → compositie + feedbackblok + code-badge op het podium. *(Door mij al end-to-end geverifieerd met BBD6KD — zien werken is genoeg.)*
3. **2b Beluisterd/Escape**: inzending openen zonder feedback → badge "Beluisterd"; Escape sluit de weergave.
4. **5b opnieuw (leerling-flow)**: verse incognito → klascode → **nieuw landingsscherm** (titel → grote afbeelding mét storyboard-pijltjes → klascode/klas-labels → opdrachtkaart) → componeren → opslaan → GEEN oude "Jouw code" vooraf, wél je eigen code na inleveren.
5. **5b "Luister naar klasgenoten"**: toont nu het storyboard (meebewegend) of de praatplaat-plek bij het geluid; als versturen door de server geweigerd wordt zie je nu een éérlijke melding (ronde gesloten / max bereikt) i.p.v. nep-confetti.
6. **6d Feedback-overzicht**: eerst checken dat **Peer feedback aan staat** (en de timer niet verlopen is!) vóórdat leerlingen beoordelen — dat was vermoedelijk de oorzaak van jouw lege overzicht (de fout was onzichtbaar; nu niet meer). Daarna: overzicht toont sterren, of een eerlijke foutmelding met retry.
7. **Klasscherm**: "Presenteren" + "Feedback-overzicht" staan nu als grote knoppen bovenaan.
8. **Tips**: verse incognito → kaart en studio tonen de nieuwe Tip-modal (lamp-icoon) i.p.v. het onopvallende balkje.
9. **Nog niet eerder getest**: 6b (tijdslot), 6c (sessie-herstel — werkt nu via het keuzescherm), 6e (presentatiemodus), 6f (iconen), 7 (DAW-ronde) — gewoon volgens de secties hieronder.
10. **docs/WOORDENLIJST.md**: aanzet definitielijst — vul aan/schrap (jouw week-3-wens).

---

## 0. Rooktest (5 min) — werkt de basis nog?
- [x] Start → Nieuwe compositie → thema kiezen → Kaart → Locatie → geluiden verzamelen → Studio → Podium. Geluid speelt af, geen console-fouten.
- [x] Taal wisselen (NL/EN) op het startscherm; steekproef dat teksten meeveranderen.

## 1. Week 1 — Fundament & fixes

### 1a. Wachtwoord-reset (was kapot)
- [x] `/teacher` → dashboard-CTA → login → "Wachtwoord vergeten" → e-mail invullen → mail ontvangen.
- [-] Klik de reset-link → je landt op het **reset-wachtwoord-scherm** (niet op een dood scherm). ==> Kon ik niet testen omdat hij naar https://soundscout.techindeles.nl/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb= ging 
  - 🔧 **Antwoord (testronde 1)**: de app-code is goed (stuurt `redirectTo` = het adres waar je op dat moment draait), maar **localhost staat niet in de Supabase-allowlist** → Supabase valt terug op de Site URL = de oude live-site, die het reset-scherm nog niet heeft. **Bert-actie**: Supabase dashboard → Authentication → URL Configuration → voeg toe aan *Redirect URLs*: `http://localhost:5199/*` en `http://localhost:5173/*` (en bij deploy: `https://soundscout.nl/*`). Daarna een VERSE reset-mail aanvragen (oude links zijn verbruikt/verlopen) en direct klikken. ✅ Gedaan door Bert (16-7).
  - ✅ **Tweede oorzaak gevonden en verholpen (16-7, na "telkens Link verlopen")**: de app veegde bij het opschonen van de URL óók de `#hash` weg — en dáár zit het Supabase-recovery-token in. Omdat de Supabase-client lazy laadt, was het token al weg vóór het verwerkt werd → altijd "Link verlopen". Fix: hash blijft staan bij de URL-opschoning + het scherm wacht nu op de auth-init. **Hertest: vraag een vérse reset-mail aan** (elke eerder geklikte link is verbruikt) en klik direct → je hoort nu het nieuwe-wachtwoord-formulier te zien.
- [?] Nieuw wachtwoord zetten → melding van succes → inloggen met het nieuwe wachtwoord lukt.
- [?] Directe check op de UI-staten zonder mail: open `?screen=reset-password` → toont "Link verlopen" → knop "Nieuwe link aanvragen" opent het vergeten-formulier.
- [?] Login: "verificatiemail opnieuw sturen" verschijnt bij een niet-bevestigd account.

### 1b. SEO
- [x] `npm run build`, open `dist/index.html` en `dist/teacher.html`: unieke `<title>` + `<meta description>`, canonical, og-image, `summary_large_image`. ==> Ik denk goed, maar weet niet precies wat ik moet testen
- [?] `dist/robots.txt` en `dist/sitemap.xml` bestaan en bevatten `/` en `/teacher`. ==> bevat: User-agent: * Allow: / Disallow: /editor Sitemap: https://soundscout.nl/sitemap.xml
- [?] Na deploy: Google Rich Results Test op `https://soundscout.nl/teacher` → WebPage + FAQPage worden herkend (zie 5c). ==> Weet niet wat ik moet testen
  - 🔧 **Antwoord (testronde 1)**: 1b is ✅ — ik heb de dist gecontroleerd: robots.txt + sitemap bevatten `/` en `/teacher`, beide pagina's hebben unieke titles/descriptions. De Rich Results Test kan pas **na deploy**: ga dan naar search.google.com/test/rich-results, plak de URL `https://soundscout.nl/teacher` in en kijk of "FAQ" als gevonden item verschijnt. Nu overslaan.

### 1c. Modals (a11y)
- [-] In de studio: EffectsModal en TrimModal openen → **Escape** sluit → **Tab** blijft binnen de modal (focus-trap). ==> In de TrimModal werkt escape en tab. In de EffectsModal gaat bij tab naar enkele tabs deze verder buiten de modal (op de achtergrond in de studio). Escape werkt wel.
  - ✅ **Verholpen (testronde 1)**: de focus-trap telde disabled knoppen mee als "laatste element" (de Toepassen-knop start disabled) waardoor de wrap nooit vuurde. Selector gefixt in `useModalBehavior` — geldt meteen voor álle modals. Hertest: EffectsModal openen → Tab cyclet nu binnen de modal.
- [?] Op het podium: "Meer acties" + elke share/save-modal → Escape sluit, focus keert terug naar de knop. ==> Er is geen 'meer acties', enkel "Delen & Exporteren". Binnen dat moda werkt wel de escape en de tab. → ✅ klopt: de knop heet "Delen & Exporteren" (testplantekst was verouderd); jouw check dekt dit punt — afgevinkt.

### 1d. Overig
- [?] Bundle: `npm run build` toont geen waarschuwing dat de main chunk fors groeit; `ComposePreview` zit in een apart chunk. ==> Niet gedaan
  - ✅ **(testronde 1, zelf gedraaid)**: main chunk 151,8 kB (doel ~152 kB), `ComposePreview` zit in een eigen chunk — afgevinkt.
- [?] Cookiemelding/privacy: tekst zegt "anonieme, cookieloze statistieken" (niet meer "geen analytics"). ==> Dit staat er "SoundScout gebruikt geen tracking cookies en geen advertenties. We tellen alleen anoniem hoe vaak de app wordt gebruikt (aantallen per dag, zonder persoonsgegevens, zonder cookies en zonder externe partijen); je browser-instelling 'Do Not Track' wordt gerespecteerd. De enige lokale opslag is voor je composities en taalvoorkeur. Er worden geen gegevens gedeeld met derden."
  - ✅ **(testronde 1)**: dit is precies de bedoelde tekst — afgevinkt. De zin over lokale opslag noemt nu ook de **bewaarcode** (antwoord op je AVG-vraag uit Notion: de code is een willekeurig token zonder persoonsgegevens).

## 2. Week 2 — Docent-feedback + automatische bewaarcode

### 2a. Leerling levert in en krijgt een code
- [x] Docent: klas aanmaken, opdracht activeren, klascode noteren.
- [x] "Leerling" (ander profiel): klascode invoeren → compositie maken → Podium → **Opslaan**.
- [x] Na inleveren verschijnt op het podium **"Jouw code: XXXXXX"** met bewaar-hint. Noteer die code.

### 2b. Docent geeft feedback
- [x] Docent-dashboard → klas → inzending verschijnt met badge **"Nieuw"** + teller "1 nieuw".
- [x] Open de inzending → speel af → onderin het **feedback-paneel**: kies een sticker + 1–3 sterren + tekstje → **Versturen** → knop wordt "Verstuurd".
- [x] Terug in de lijst: de kaart toont nu **"Beoordeeld"** met sticker + sterren; teller "nieuw" is gedaald. ==> Let op, om terug te komen werkt de escape niet. 
  - ✅ **Verholpen (testronde 1)**: de inzendings-weergave had geen toetsenbord-handler; Escape sluit nu (plus focus-trap). Hertest: inzending openen → Escape → terug in de lijst.
- [x] Open opnieuw zonder feedback te geven bij een andere inzending → status wordt **"Beluisterd"** (niet meer "Nieuw"). ==> Let op: ik had ook nog een losse opname ingeleverd bij de klascode (zonder actieve storyboard). Na openen door docent verschijnt dan niet 'Beluisterd'. 
  - ✅ **Verholpen (testronde 1)**: de status wérd wel gezet, maar er bestond geen "Beluisterd"-badge in de kaart — bij storyboard-inzendingen verbloemde de type-badge dat, bij jouw vrije compositie zag je niets. Er is nu een grijze badge met koptelefoon-icoon. Hertest: open een nieuwe inzending zonder feedback → kaart toont "Beluisterd".

### 2c. Leerling ziet de feedback terug (zonder account)
- [x] Andere browser: Start → "Ik heb een code" → voer de **6-cijferige bewaarcode** in. ==> MAAR OPENT NIET WANT CODE IS NIET GEVONDEN
  - ✅ **Oorzaak gevonden en gefixt (testronde 1)**: live gereproduceerd met jouw code BBD6KD — de code bestaat gewoon! Migratie 028 introduceerde een typefout in de database-functie (`class_code TEXT` vs kolom `CHAR(4)`), waardoor **elke** bewaarcode-load faalde met een DB-fout die de app als "code niet gevonden" toonde (die maskering is ook opgeheven). **Bert-actie: draai migratie `029_fix_load_saved_composition_class_code.sql`** in de Supabase SQL Editor, hertest daarna dit punt met BBD6KD → hoort gewoon te laden.
- [?] Compositie laadt in de studio + een **warme banner**: "Feedback van je docent: ⭐ … ⭐⭐ [tekst]".
- [?] Zelfde apparaat als 2a: heropen de app → **"Je hebt een reactie!"**-melding op het startscherm → klik → modal toont de feedback.

### 2d. Beveiliging
- [?] (Optioneel) Tweede docentaccount kan géén feedback zetten op een inzending van de eerste docent (RLS) — verschijnt niet in diens dashboard, dus niet bereikbaar. Niet kunnen testen.

## 3. Week 3 — Onboarding & taal

- [x] localStorage wissen (of verse incognito). Start → "Nieuwe compositie" → **eenmalige intro-animatie** "Zo werkt SoundScout" → "Aan de slag" → wizard.
- [x] Nogmaals "Nieuwe compositie" → intro verschijnt **niet** meer (eenmalig).
- [x] Kaart, eerste keer: hint **"Klik op een locatie om geluiden te verzamelen"** → verdwijnt na het eerste locatiebezoek. ==> WERKT, maar misschien kunnen we een Tip-modal maken die we vaker kunnen oproepen. Een klein modal die verschijnt met een duidelijke icon met tip teken en dan de tekst. Die kunnen we op meerdere plekken inzetten. Deze tekst zoals nu valt eigenlijk niet goed op.
  - ✅ **Gebouwd (testronde 2)**: herbruikbare TipModal (lamp-icoon + tekst + "Aan de slag!") — nu ingezet op de kaart én in de studio, zelfde eenmaligheid. Hertest in verse incognito.
- [x] Studio, eerste keer met een clip: tip **"klik op een blok in de tijdlijn om te knippen, effecten of volume…"** → verdwijnt zodra je een clip selecteert. ==> Zie vorige opmerking over de tip-modal.
  - ✅ **Gebouwd (testronde 2)**: zie hierboven — de studio-tip verschijnt nu als TipModal zodra het eerste blokje op de tijdlijn ligt.
- [x] Taal-check: nergens kindertaal; "docent" i.p.v. "juf/meester". Steekproef NL en EN. ==> Moeten we misschien samen een definitie-lijst samen stellen?
  - ✅ **Aanzet klaar (testronde 2)**: `docs/WOORDENLIJST.md` — rollen, codes, opdrachten, studio- en feedbacktermen, plus een lijstje twijfelgevallen voor jou. Vul aan/schrap, dan maken we hem definitief.

## 4. Week 4 — Thema-wizard (dev-only)

> Alleen lokaal (`npm run dev`), route `/editor`.
- [x] `/editor` → tab **Thema-wizard** opent op stap Concept.
- [x] Stap 1: thema-id (bv. `herfst`), naam NL/EN, seizoensvenster invullen. Stijlprofiel staat voorgevuld.
- [x] Stap 2: minstens 1 locatie + ≥4 geluiden invullen.
- [x] Stap 3: **Prompts** — kopieerknoppen werken; de afbeeldingsprompt bevat je stijlprofiel + themanaam; per geluid een freesound-zoekpakket met doelpad.
- [?] Stap 4: **Kaart & export** — plattegrond-afbeelding laden → locatie kiezen → op de kaart klikken plaatst een marker met %.
- [?] Validatie: bij ontbrekende velden zie je een lijst; de export verschijnt pas als alles compleet is.
- [?] Export: kopieer/download `locations.ts`, `samples.ts`, `map.ts`, `index.ts`, de i18n-fragmenten en de Claude-opdracht.
- [?] Concept blijft bewaard na paginaherlaad (localStorage); "Nieuw concept" wist het.
- [?] Tab **Locatie-editor** werkt nog als vanouds (hotspots plaatsen).
- [?] Seizoensrooster: check dat een thema met een venster buiten dat venster **niet** in de thema-kiezer staat, maar via `?theme=<id>` wél laadt.
LET OP:  Ik ben gestopt met testen omdat ik dit op een ander moment wel ga doen. Ik heb niet de juiste materialen hiervoor, waardoor dit wat lastig te testen is. Dus deze parkeer ik even. 

## 5. Week 5 — Peer-feedback + landingspagina

### 5a. Peer-feedback — docent
- [x] Klas → actieve opdracht → blok **"Peer feedback"** (heette t/m testronde 1 "Klasgenoten luisteren") → toggle **aan**.
- [x] Kies een **ingebouwde feedbackkaart** (bv. "Ritme & puls"); de chips verschijnen als preview.
- [x] Maak een **eigen kaart**: titel + 2–8 complimenten (één per regel) → opslaan → wordt automatisch geselecteerd.

### 5b. Peer-feedback — leerling(en)
- [-] Zorg dat **≥2 leerlingen** (twee profielen) hebben ingeleverd in dezelfde klas/opdracht. ==> LET op, Wat me opviel was, toen ik de tweede leerling ging maken, dat er eigenlijk nog, terwijl ik in een incognito venster zat, een code in beeld was, onderaan, van mijn andere venster.
Dus het leek wel alsof, van het andere incognito venster, de leerlingcode, die zes letters, nog op een bepaalde manier toch gekoppeld werd aan de klascode.
Nou ja, het bijzondere was dus dat ik in twee keer een incognito venster zat en ik dus nog de oude code zag. 
Ik ga het nog een keer testen.   ja, en ook bij een derde leerling weer in een incognito venster zie ik, nog voordat ik mijn sound compositie opsla, al een jouw code staan met 6 letters. Als ik dan op opslaan klik, dan krijg ik pas de nieuwe code in beeld.
Dus op een bepaalde manier onthoudt hij van een eerdere leerling de code totdat de nieuwe leerling het opslaat. 
  - ✅ **Verholpen (testronde 2)**: het codeblok las bij het openen de code van de vórige inzending uit localStorage (incognito-vensters delen die, net als gedeelde Chromebooks). De code is nu gekoppeld aan de inzending zelf en een nieuwe klas-start begint schoon. Hertest: verse leerling ziet pas een code ná het eigen opslaan.
- [-] Als leerling na inleveren: knop **"Luister naar klasgenoten"** op het podium. ==> Als ik luister naar klasgenoten, dan kan ik alleen maar de audio luisteren. De opdracht was juist, bijvoorbeeld, de activiteit was een storyboard. Het zou dus eigenlijk een presentatie moeten zijn van een storyboard met de geluiden erbij. Dus, bij "Luister naar klasgenoten" moeten we de presentatieversie hebben, zodat je het storyboard groot ziet, met of het praatplaatstukje, het gekozen stukje uit de praatplaat, of na welke opdracht dan ook, beeld en geluid. We moeten even goed onderzoeken of we dit niet ergens ook hebben geïmplementeerd, zodat we dit eventueel hier kunnen herbruiken. Het gaat dus echt om het presenteren en niet om de feedbackknoppen, want dat werkt wel. 
  - ✅ **Gebouwd (testronde 2)**: de modal toont nu het storyboard gróót en meebewegend met de muziek (zelfde weergave als de presentatiemodus), en bij een praatplaat de plaat met de gekozen plek als pulserende marker. Vrije composities blijven audio-only. Hertest met een storyboard-opdracht.
- [x] Modal laadt tot 3 **anonieme** composities → speel elk af → kies 1–3 chips → "Versturen en volgende" → afsluitend "klaar"-scherm.
- [?] Eigen werk komt **nooit** in de batch voorbij. ==> Niet opgemerkt, maar niet 100 procent zeker.
  - ✅ **Code-geverifieerd (testronde 2)**: de batch-functie sluit de eigen inzending server-side uit (`get_peer_review_batch` filtert op de eigen submission-id) — afgevinkt.
- [-] Ontvanger: laad die inzending via de **bewaarcode** → banner toont **"Complimenten van klasgenoten: … ×N"** (anoniem geaggregeerd). ==> Deze flow voelt dus niet goed, want je verwacht eigenlijk in het podium de feedback te krijgen en de complimenten. Nu ga je dus eigenlijk weer terug naar je hoofdscherm om daar een code in te voeren. Als je die code invoert, kom je eigenlijk gewoon in jouw eigen compositie weer, zo lijkt het. Dus we moeten deze flow echt even opnieuw uitdenken en goed brainstormen. Ik denk dat we moeten nadenken dat alles met betrekking tot feedback gewoon in het podium blijft.Wanneer een leerling toch uit het podium klikt, moeten we misschien op onze hoofdpagina de button laten verschijnen, mits er al iets is ingedacht, om naar het podium te gaan. Zo hoeft een leerling niet elke keer weer helemaal door de andere opties te navigeren. Het podium is altijd voor de feedback. Daar staat ook altijd iets vermeld. Misschien kunnen we ook, als een leerling op een gegeven moment een bewaarcode heeft, die als een kleine button of markering tonen. Zo ziet een leerling altijd wat zijn code is. We moeten dit echt nog even goed uitdenken. 
  - ✅ **Gebouwd volgens jouw ontwerp (testronde 2)**: het podium is nu de feedback-plek. Bewaarcode invoeren → **keuzescherm "Studio / Podium"**; het podium toont een vast feedbackblok (docent-feedback + klasgenoot-sterren, alleen zichtbaar als er iets is) + de code-badge; de "Je hebt een reactie!"-melding op start opent direct het podium; en bij een actieve klas-sessie staat er een "Naar het podium"-knop op start. End-to-end geverifieerd met BBD6KD.
- [x] Uit-zetten: docent zet de toggle uit → nieuwe leerling ziet de knop niet meer.

### 5c. Landingspagina `/teacher`
- [-] Alle secties in volgorde: hero + **trust-strip**, **Waarom SoundScout** (4 kaarten), werkvormen, video's, **feedback-cirkel**, **actuele thema's** (De Stad + Winterspelen, met cover + "x locaties · y geluiden"), zo-zet-je-een-klas-op, leskaarten, **FAQ**, kerndoelen, **privacyband**, workshops, footer. ==> Ik wil eigenlijk twee tabbladen die de scherm veranderen met daarin deze volgorde: 1) Aan de slag met SoundScout: hero - werkvormen - video's - actuele thema's - zo-zet-je-een-klas-op, leskaarten - workshops - footer 2) Waarom SoundScout: hero - waarom soundscout - feedback-cirkel - privacy band (let op gebruik lichtere background kleur, nu nogal donker) - FAQ - kerndoelen - workshops - footer
  - ✅ **Gebouwd (testronde 1)**: twee tabbladen precies in jouw volgorde ("Aan de slag met SoundScout" / "Waarom SoundScout", grote tab-kaarten onder de hero); privacyband is nu een **licht** afgerond paneel (accent-tint i.p.v. donker); de hero-knop "Bekijk de demo" wisselt automatisch naar het juiste tab. Hertest: beide tabs doorlopen.
- [x] Hero-knop **"Bekijk de demo"** → pagina scrollt naar de videosectie.
- [x] **FAQ**: elk item klapt open/dicht; de 4 clusters zijn aanwezig; "Wat kost SoundScout?" → "gratis" (géén prijzen/tiers).
- [x] **Actuele thema's**: klik een themakaart → app opent met `?theme=<id>`. ==> de app opent met thema id, maar als ik dan bijv. op vrij componeren klik, dan kan ik alsnog ander thema kiezen
  - ✅ **Verbeterd (testronde 1)**: het meegekomen thema staat nu **vooraan in de thema-kiezer met een "Gekozen thema"-badge** (accent-rand). Keuzevrijheid blijft — bewust: een leerling die via een deeplink binnenkomt mag nog wisselen. Wil je het thema liever hard vastzetten, zeg het dan.
- [x] Privacyband-knop **"Lees hoe we met gegevens omgaan"** → PrivacyModal opent.
- [x] Footer: **Privacy** (modal), **Voor docenten** (→ dashboard), **Contact** (→ feedbackformulier/FeedbackModal).
- [x] Mobiel (smal venster/telefoon): secties stapelen netjes, geen horizontale scroll.
- [?] Startscherm: **seizoenschip** verschijnt alleen als een publiek thema nú in zijn venster valt (met de huidige thema's zonder venster: chip is afwezig — dat is correct). Om te tésten kun je tijdelijk een venster op een thema zetten en herladen. ==> Ik weet niet wat ik moet doen!
  - ✅ **Jij hoeft hier niets (testronde 1)**: de seizoenslogica is volledig gedekt door unit-tests (`season.test.ts` — binnen/buiten venster, jaargrens, halve vensters). Omdat de huidige thema's geen venster hebben, is "geen chip" nu het correcte gedrag. Zodra het eerste seizoensthema (bv. herfst) een venster krijgt, zie je de chip vanzelf verschijnen — afgevinkt.

### 5d. SEO na deploy
- [ ] Google Rich Results Test op `/teacher`: **FAQPage** met 10 vragen wordt herkend, naast WebPage.
- [ ] Lighthouse SEO-score `/teacher` ≥ 95.

---

## 6. Week 5½ — Feedback 2.0, presentatiemodus, iconen (na migratie 028!)

### 6a. Peer-feedback met sterren
- [x] Migratie **028** draaien in de Supabase SQL Editor (ná 027).
- [x] Leerling: "Luister naar klasgenoten" → per criterium van de feedbackkaart een rij met **3 sterren**; zelfde ster nogmaals klikken wist het criterium; versturen kan pas met ≥1 beoordeeld criterium.
- [x] **Maximum 3**: beoordeel 3 klasgenoten (evt. in meerdere sessies) → daarna toont de modal de lege-melding; de server weigert een 4e ("maximum bereikt").
- [?] Ontvanger (via bewaarcode): banner toont per criterium **gemiddelde sterren + aantal** ("Ritme ★★★ (3)").
  - 🔧 **Flow gewijzigd (testronde 2)**: dit zie je nu op het **podium** — bewaarcode invoeren → keuzescherm → Podium → feedbackblok toont docent-feedback én de klasgenoot-sterren per criterium.

### 6b. Toggle + tijdslot (server-side!)
- [ ] Docent: tijdslot instellen (10 min) → aftelling "sluit over X min" zichtbaar; na afloop "Ronde gesloten" + "Opnieuw openen".
- [ ] Leerling ná sluiting: batch is leeg / versturen geeft nette melding ("ronde gesloten").
- [ ] Toggle uit → zelfde server-side weigering (in 027 was dit alleen client-side!). Docent-feedback (sticker/sterren/tekst) blijft altijd werken.

### 6c. Sessie-herstel (bugfix)
- [ ] Inleveren → terug naar start → "Mijn composities" → compositie heropenen → **peer-feedback-knop is er weer** op het podium.
- [ ] Bewaarcode op een ander apparaat/verse browser invoeren → klas-sessie hersteld → knop aanwezig; reeds beoordeelde klasgenoten komen niet opnieuw voorbij (server onthoudt).

### 6d. Docent: feedback-overzicht + top 3
- [-] Klasscherm → "Feedback-overzicht": **top 3 podium** (Trophy/Medal/Award) klopt met de gegeven sterren. ==> Ondanks dat er feedback is gegeven, is het niet zichtbaar in het feedbackoverzicht van de docent wat de leerlingen aan feedback hebben gegeven. De feedback knop staat aan. Kleine aanpassing trouwens bij feedback overzicht, er staat "Zet "Klasgenoten luisteren" aan bij de actieve opdracht.", dat moet natuurlijk zijn " Zet Peer feedback aan".
  - ✅ **Oorzaak gevonden en verholpen (testronde 2)**: er zat een dubbele foutmaskering — als de server een leerling-beoordeling weigerde (bv. omdat de ronde gesloten/verlopen was), zag de leerling tóch het "klaar"-scherm met confetti, en het docent-overzicht toonde bij een leesfout gewoon "leeg". Er werd dus waarschijnlijk nooit iets opgeslagen zonder dat iemand het merkte. Nu: eerlijke meldingen aan beide kanten (leerling ziet "ronde gesloten"/"max bereikt"; docent ziet een foutmelding met retry). Tekstje is ook aangepast ("Zet Peer feedback aan"). **Hertest: zet Peer feedback aan (zonder verlopen timer), laat 2 leerlingen sterren geven en open dan het overzicht.**
- [ ] Tab Ontvangen: uitklappen toont per-criterium gemiddelden + wie-gaf-wat (namen alleen hier).
- [ ] Tab Gegeven: leerlingen met 0 gegeven staan bovenaan.

### 6e. Presentatiemodus (digibord)
- [ ] Klasscherm → "Presenteren": fullscreen met playlist-zijbalk; klik op een item springt ernaartoe.
- [ ] **Doorspelen** aan: na afloop van een compositie start automatisch de volgende, met naam-overlay ("Nu te horen: …").
- [ ] Per vorm: storyboard toont meebewegende beelden · praatplaat toont de plaat met pulserende spot van de spelende inzending · vrij/template toont de meebewegende tijdlijn.
- [ ] Toetsenbord: spatie = play/pauze, ←/→ = wisselen, Esc = sluiten.
- [ ] "Feedback geven"-toggle onderin: sticker + sterren + tekst opslaan werkt tijdens het presenteren.
- [ ] Vanuit het feedback-overzicht: "Presenteer top 3" opent de presentatie met alleen die drie.

### 6f. Lucide-iconen
- [ ] Steekproef: feedback-stickers (dashboard + banner + startscherm-melding), foutschermen, trim-schaartje in de studio, laad-spinner in knoppen, sleepgreep in de bibliotheek — overal strakke lijn-iconen, nergens meer emoji.

## 7. DAW-ronde (week 5¾) — studio-versterking

### 7a. Grijze vlak (BUG-TIMELINE-GRIJS)
- [ ] Studio: onder de sporen is **"spoor toevoegen" de onderste rij** — geen grijs vlak of doorlopende afspeellijn eronder (oorzaak was een playhead-lijn met vaste hoogte van 500px die scrollruimte onder de sporen creëerde).
- [ ] Sleep een sample en laat de auto-scroll je naar beneden duwen: je kunt niet voorbij de "spoor toevoegen"-rij scrollen.
- [ ] Scrollen in de tijdlijn "lekt" niet meer naar de pagina (overscroll-contain), ook op touch.

### 7b. "+8" / "−8" (tijdlijnlengte, 16–64 maten)
- [ ] In de tijdlijn-werkbalk (naast de zoomknoppen): **"−8"** en **"+8"** → "+8": liniaal telt door (36, 40, …) en bestaande clips blijven exact staan.
- [ ] "+8" vier keer → 64 maten → "+8" wordt inactief (maximum); "−8" terug tot 16 maten → "−8" wordt inactief (minimum).
- [ ] **Inhoud-bescherming**: zet een clip op maat 20 → "−8" van 32 naar 24 kan nog, maar verder inkorten tot vóór de clip kan niet (knop inactief). Zelfde geldt voor secties.
- [ ] Clip op maat 40 (na "+8") → speelt af én zit in de MP3-export; opslaan/heropenen behoudt de lengte; een óúde compositie opent nog gewoon op 32 maten.

### 7c. "+ spoor" + solo
- [ ] Onder spoor 8: gestippelde regel **"spoor toevoegen"** → tot 12 sporen; regel verdwijnt op 12.
- [ ] **Cruciaal**: zet een clip op spoor 9 of hoger → **hoorbaar** bij afspelen (de audio-kanalen groeien mee).
- [ ] Spoorkop → volume-icoon → popover: naast mute nu een **koptelefoon (solo)** → aan: alleen dát spoor klinkt, andere sporen dimmen visueel; werkt ook mídden in het afspelen (live).
- [ ] Solo is tijdelijk: "Naar podium" → volledige mix klinkt; heropenen van een compositie → geen solo actief.

### 7d. Sectie-loop + mobiele zoom
- [ ] Maak een sectie (vlag-knop) → tik op de sectie in de sectiebalk → popover heeft **"Loop deze sectie"** → aan: afspelen loopt exact dat stuk (spring je ervóór in, dan speelt hij door tot het einde van de sectie en loopt dan).
- [ ] De transport-loopknop licht op zodra een sectie-loop actief is; loopknop **uit** zetten stopt óók de sectie-loop.
- [ ] Docentengids → "Tips voor de klas": kopje **"Sectie-loop: eerst een sectie maken"** legt uit dat de sectie-loop pas werkt nadat er een sectie is gemaakt (vlag-knop), NL én EN.
- [ ] Smal venster/iPad: **zoom-in/uit-knoppen zichtbaar** in de tijdlijn-werkbalk (fit alleen op desktop).
- [ ] iPad: slepen van samples voelt directer (activatie 200→150 ms).

### 7e. Export-tempo (latente bug gedicht)
- [ ] MP3-export klinkt identiek aan vóór deze ronde (tempo 120 — de fix is onzichtbaar maar de export leest nu het compositie-tempo).

### 7f. Landscape-hint (UX-LANDSCAPE) — **alleen op iPad/telefoon**
> Op desktop verschijnt deze banner bewust nooit (geen touch) — niet testbaar in een smal browservenster.
- [ ] iPad/telefoon **in portret** → ga naar de studio: dunne banner bovenaan met draai-icoon: "Draai je tablet of telefoon een kwartslag…".
- [ ] Draai naar **liggend** → banner verdwijnt; terug naar portret → banner is er weer.
- [ ] Klik het **kruisje** → banner weg; app herladen in portret → blijft weg (eenmalig).
- [ ] Banner verschijnt **niet** op het startscherm en niet in het docent-dashboard (alleen studio/kaart/locatie/podium).
- [ ] Taal: in EN toont de banner de Engelse tekst.

## Regressie-let-op (waar bugs zich kunnen verstoppen)
- Klas-inzending zonder migratie 026 zou terugvallen op de oude RPC (geen bewaarcode) — nu migraties gedraaid zijn: **elke** inzending hoort een code te geven. Als een code ontbreekt: check of 026 echt geslaagd is.
- "In bewerking" vs "Ingeleverd" splitst nu op `submitted_at` (niet meer op de aanwezigheid van een code). Controleer dat een echt ingeleverde compositie onder **Ingeleverd** staat en online-bewaarde-maar-niet-ingeleverde onder **In bewerking**.
- Peer-batch geeft alleen inzendingen met `submitted_at` — een klas met maar 1 inzending toont terecht "nog geen composities om te beluisteren".
