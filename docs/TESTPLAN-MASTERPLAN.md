# Testplan Masterplan (week 1–5)

Volledig handmatig teststappenplan voor alles wat in de worktree `masterplan-6-weken` is gebouwd. Af te vinken vóór merge naar `main` + deploy.

**Vooraf:**
- Migraties **025 → 026 → 027 → 028** zijn in Supabase gedraaid ✅ (bevestigd door Bert).
- Lokaal draaien: `cd .claude/worktrees/masterplan-6-weken && npm run dev` → open het getoonde adres.
- Twee browserprofielen/apparaten handig voor de klas- en peer-flows (docent in de één, "leerling" incognito in de ander).
- Automatische gate is al groen: `npx tsc -b --noEmit`, `npm run test:run` (263 tests), `npm run lint` (baseline 31, 0 nieuw).

**Resultaten noteren:** vink af met `- [x]`. Werkt iets niet? Zet er een regel onder met `⚠️` + wat je zag — dan pak ik die daarna gericht op.

---

## 0. Rooktest (5 min) — werkt de basis nog?
- [ ] Start → Nieuwe compositie → thema kiezen → Kaart → Locatie → geluiden verzamelen → Studio → Podium. Geluid speelt af, geen console-fouten.
- [ ] Taal wisselen (NL/EN) op het startscherm; steekproef dat teksten meeveranderen.

## 1. Week 1 — Fundament & fixes

### 1a. Wachtwoord-reset (was kapot)
- [ ] `/teacher` → dashboard-CTA → login → "Wachtwoord vergeten" → e-mail invullen → mail ontvangen.
- [ ] Klik de reset-link → je landt op het **reset-wachtwoord-scherm** (niet op een dood scherm).
- [ ] Nieuw wachtwoord zetten → melding van succes → inloggen met het nieuwe wachtwoord lukt.
- [ ] Directe check op de UI-staten zonder mail: open `?screen=reset-password` → toont "Link verlopen" → knop "Nieuwe link aanvragen" opent het vergeten-formulier.
- [ ] Login: "verificatiemail opnieuw sturen" verschijnt bij een niet-bevestigd account.

### 1b. SEO
- [ ] `npm run build`, open `dist/index.html` en `dist/teacher.html`: unieke `<title>` + `<meta description>`, canonical, og-image, `summary_large_image`.
- [ ] `dist/robots.txt` en `dist/sitemap.xml` bestaan en bevatten `/` en `/teacher`.
- [ ] Na deploy: Google Rich Results Test op `https://soundscout.nl/teacher` → WebPage + FAQPage worden herkend (zie 5c).

### 1c. Modals (a11y)
- [ ] In de studio: EffectsModal en TrimModal openen → **Escape** sluit → **Tab** blijft binnen de modal (focus-trap).
- [ ] Op het podium: "Meer acties" + elke share/save-modal → Escape sluit, focus keert terug naar de knop.

### 1d. Overig
- [ ] Bundle: `npm run build` toont geen waarschuwing dat de main chunk fors groeit; `ComposePreview` zit in een apart chunk.
- [ ] Cookiemelding/privacy: tekst zegt "anonieme, cookieloze statistieken" (niet meer "geen analytics").

## 2. Week 2 — Docent-feedback + automatische bewaarcode

### 2a. Leerling levert in en krijgt een code
- [ ] Docent: klas aanmaken, opdracht activeren, klascode noteren.
- [ ] "Leerling" (ander profiel): klascode invoeren → compositie maken → Podium → **Opslaan**.
- [ ] Na inleveren verschijnt op het podium **"Jouw code: XXXXXX"** met bewaar-hint. Noteer die code.

### 2b. Docent geeft feedback
- [ ] Docent-dashboard → klas → inzending verschijnt met badge **"Nieuw"** + teller "1 nieuw".
- [ ] Open de inzending → speel af → onderin het **feedback-paneel**: kies een sticker + 1–3 sterren + tekstje → **Versturen** → knop wordt "Verstuurd".
- [ ] Terug in de lijst: de kaart toont nu **"Beoordeeld"** met sticker + sterren; teller "nieuw" is gedaald.
- [ ] Open opnieuw zonder feedback te geven bij een andere inzending → status wordt **"Beluisterd"** (niet meer "Nieuw").

### 2c. Leerling ziet de feedback terug (zonder account)
- [ ] Andere browser: Start → "Ik heb een code" → voer de **6-cijferige bewaarcode** in.
- [ ] Compositie laadt in de studio + een **warme banner**: "Feedback van je docent: ⭐ … ⭐⭐ [tekst]".
- [ ] Zelfde apparaat als 2a: heropen de app → **"Je hebt een reactie!"**-melding op het startscherm → klik → modal toont de feedback.

### 2d. Beveiliging
- [ ] (Optioneel) Tweede docentaccount kan géén feedback zetten op een inzending van de eerste docent (RLS) — verschijnt niet in diens dashboard, dus niet bereikbaar.

## 3. Week 3 — Onboarding & taal

- [ ] localStorage wissen (of verse incognito). Start → "Nieuwe compositie" → **eenmalige intro-animatie** "Zo werkt SoundScout" → "Aan de slag" → wizard.
- [ ] Nogmaals "Nieuwe compositie" → intro verschijnt **niet** meer (eenmalig).
- [ ] Kaart, eerste keer: hint **"Klik op een locatie om geluiden te verzamelen"** → verdwijnt na het eerste locatiebezoek.
- [ ] Studio, eerste keer met een clip: tip **"klik op een blok in de tijdlijn om te knippen, effecten of volume…"** → verdwijnt zodra je een clip selecteert.
- [ ] Taal-check: nergens kindertaal; "docent" i.p.v. "juf/meester". Steekproef NL en EN.

## 4. Week 4 — Thema-wizard (dev-only)

> Alleen lokaal (`npm run dev`), route `/editor`.
- [ ] `/editor` → tab **Thema-wizard** opent op stap Concept.
- [ ] Stap 1: thema-id (bv. `herfst`), naam NL/EN, seizoensvenster invullen. Stijlprofiel staat voorgevuld.
- [ ] Stap 2: minstens 1 locatie + ≥4 geluiden invullen.
- [ ] Stap 3: **Prompts** — kopieerknoppen werken; de afbeeldingsprompt bevat je stijlprofiel + themanaam; per geluid een freesound-zoekpakket met doelpad.
- [ ] Stap 4: **Kaart & export** — plattegrond-afbeelding laden → locatie kiezen → op de kaart klikken plaatst een marker met %.
- [ ] Validatie: bij ontbrekende velden zie je een lijst; de export verschijnt pas als alles compleet is.
- [ ] Export: kopieer/download `locations.ts`, `samples.ts`, `map.ts`, `index.ts`, de i18n-fragmenten en de Claude-opdracht.
- [ ] Concept blijft bewaard na paginaherlaad (localStorage); "Nieuw concept" wist het.
- [ ] Tab **Locatie-editor** werkt nog als vanouds (hotspots plaatsen).
- [ ] Seizoensrooster: check dat een thema met een venster buiten dat venster **niet** in de thema-kiezer staat, maar via `?theme=<id>` wél laadt.

## 5. Week 5 — Peer-feedback + landingspagina

### 5a. Peer-feedback — docent
- [ ] Klas → actieve opdracht → blok **"Klasgenoten luisteren"** → toggle **aan**.
- [ ] Kies een **ingebouwde feedbackkaart** (bv. "Ritme & puls"); de chips verschijnen als preview.
- [ ] Maak een **eigen kaart**: titel + 2–8 complimenten (één per regel) → opslaan → wordt automatisch geselecteerd.

### 5b. Peer-feedback — leerling(en)
- [ ] Zorg dat **≥2 leerlingen** (twee profielen) hebben ingeleverd in dezelfde klas/opdracht.
- [ ] Als leerling na inleveren: knop **"Luister naar klasgenoten"** op het podium.
- [ ] Modal laadt tot 3 **anonieme** composities → speel elk af → kies 1–3 chips → "Versturen en volgende" → afsluitend "klaar"-scherm.
- [ ] Eigen werk komt **nooit** in de batch voorbij.
- [ ] Ontvanger: laad die inzending via de **bewaarcode** → banner toont **"Complimenten van klasgenoten: … ×N"** (anoniem geaggregeerd).
- [ ] Uit-zetten: docent zet de toggle uit → nieuwe leerling ziet de knop niet meer.

### 5c. Landingspagina `/teacher`
- [ ] Alle secties in volgorde: hero + **trust-strip**, **Waarom SoundScout** (4 kaarten), werkvormen, video's, **feedback-cirkel**, **actuele thema's** (De Stad + Winterspelen, met cover + "x locaties · y geluiden"), zo-zet-je-een-klas-op, leskaarten, **FAQ**, kerndoelen, **privacyband**, workshops, footer.
- [ ] Hero-knop **"Bekijk de demo"** → pagina scrollt naar de videosectie.
- [ ] **FAQ**: elk item klapt open/dicht; de 4 clusters zijn aanwezig; "Wat kost SoundScout?" → "gratis" (géén prijzen/tiers).
- [ ] **Actuele thema's**: klik een themakaart → app opent met `?theme=<id>`.
- [ ] Privacyband-knop **"Lees hoe we met gegevens omgaan"** → PrivacyModal opent.
- [ ] Footer: **Privacy** (modal), **Voor docenten** (→ dashboard), **Contact** (→ feedbackformulier/FeedbackModal).
- [ ] Mobiel (smal venster/telefoon): secties stapelen netjes, geen horizontale scroll.
- [ ] Startscherm: **seizoenschip** verschijnt alleen als een publiek thema nú in zijn venster valt (met de huidige thema's zonder venster: chip is afwezig — dat is correct). Om te tésten kun je tijdelijk een venster op een thema zetten en herladen.

### 5d. SEO na deploy
- [ ] Google Rich Results Test op `/teacher`: **FAQPage** met 10 vragen wordt herkend, naast WebPage.
- [ ] Lighthouse SEO-score `/teacher` ≥ 95.

---

## 6. Week 5½ — Feedback 2.0, presentatiemodus, iconen (na migratie 028!)

### 6a. Peer-feedback met sterren
- [ ] Migratie **028** draaien in de Supabase SQL Editor (ná 027).
- [ ] Leerling: "Luister naar klasgenoten" → per criterium van de feedbackkaart een rij met **3 sterren**; zelfde ster nogmaals klikken wist het criterium; versturen kan pas met ≥1 beoordeeld criterium.
- [ ] **Maximum 3**: beoordeel 3 klasgenoten (evt. in meerdere sessies) → daarna toont de modal de lege-melding; de server weigert een 4e ("maximum bereikt").
- [ ] Ontvanger (via bewaarcode): banner toont per criterium **gemiddelde sterren + aantal** ("Ritme ★★★ (3)").

### 6b. Toggle + tijdslot (server-side!)
- [ ] Docent: tijdslot instellen (10 min) → aftelling "sluit over X min" zichtbaar; na afloop "Ronde gesloten" + "Opnieuw openen".
- [ ] Leerling ná sluiting: batch is leeg / versturen geeft nette melding ("ronde gesloten").
- [ ] Toggle uit → zelfde server-side weigering (in 027 was dit alleen client-side!). Docent-feedback (sticker/sterren/tekst) blijft altijd werken.

### 6c. Sessie-herstel (bugfix)
- [ ] Inleveren → terug naar start → "Mijn composities" → compositie heropenen → **peer-feedback-knop is er weer** op het podium.
- [ ] Bewaarcode op een ander apparaat/verse browser invoeren → klas-sessie hersteld → knop aanwezig; reeds beoordeelde klasgenoten komen niet opnieuw voorbij (server onthoudt).

### 6d. Docent: feedback-overzicht + top 3
- [ ] Klasscherm → "Feedback-overzicht": **top 3 podium** (Trophy/Medal/Award) klopt met de gegeven sterren.
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
