# Testplan zachte lancering — 1 september 2026 (verschoven naar 27 oktober)

## Stand 06-10 — de kortste lijst vóór de lancering van 27-10

> **Waarom deze sectie.** De lancering is vier à vijf keer verschoven omdat de
> testronde te groot was om in één blok af te maken. Op 06-10 is alles hieronder
> tegen de code, de testsuite (409 tests) en de database gelegd. Wat Claude al
> heeft geverifieerd of wat door automatische tests gedekt is, staat niet meer in
> Tier 1. **Lanceerdomein: soundscout.nl** (besluit Bert 06-10). Gecontroleerd op
> 06-10: soundscout.nl draait al de build van `main` van 05-10 (dezelfde
> bundelhashes als de lokale `dist/`), en de CSP uit `.htaccess` komt mee in de
> response-header. Alleen het verbergen van piraten (06-10) vraagt nog één nieuwe
> build en upload.
> Het oude telpunt "21 punten" uit de takenlijst is nergens in dit plan terug te
> vinden en vervalt.

### Tier 1: lanceerblokker (±75 min, allemaal Bert, op soundscout.nl)

| # | Test | Min | Wat breekt er als het faalt |
|---|---|---|---|
| 1 | Zodra de piraten-verberging op `main` staat: verse `npm run build` en `dist/` uploaden, **inclusief de verborgen `.htaccess`** (3239 bytes). *De build van 05-10 met CSP staat er al.* | 10 | Zonder `.htaccess` vallen pitch-bake, het export-vangnet en de limiter stil uit (de valkuil van 13-8). |
| 2 | Incognito met de console open: geen CSP- of WebAssembly-meldingen. Speel een gepitchte clip: `Master-limiter actief`, géén `Pitch-bake niet beschikbaar` (`HANDLEIDING-BEHEER.md` §bovenaan). Open ook `/over`. | 5 | Exports met glitches, of een 404 op de contactpagina. Dit is alleen op de server te zien. |
| 3 | **SSDEMO**: maak het eerst aan (database-check 06-10: het demo-account op hello@soundscout.nl en de code bestaan nog **niet**). Open daarna uitgelogd `soundscout.nl/?pp-share=SSDEMO` op een laptop en een telefoon; de spots spelen af. | 10 | Dit ís de uitnodiging. |
| 4 | `/teacher` uitgelogd: de knoppen bovenaan op desktop en op 375 px, plus de tekst van de stappen-sectie (N6-rest). | 5 | Dit is de eerste pagina die elke uitgenodigde docent ziet. |
| 5 | Eén gecombineerde export: vrije compositie met pitch +12, reverb en een sequence-clip. Dupliceer de clip, pas het patroon aan (alle kopieën moeten meeveranderen), **Download MP3** en luister. Dekt N1-rest, N2-rest en de kern van N3. | 15 | Kapotte export of een vals "geluid ontbreekt". |
| 6 | Rookproef klascode: leerling in incognito, praatplaat-opdracht, inleveren, en terugzien in de klasweergave. | 10 | De allereerste klasproef van een docent mislukt. |
| 7 | O1 resetmail: vraag een verse aan en klik hem meteen. **Laat de Site URL staan** (`soundscout.nl`): `auth.ts` stuurt zelf `redirectTo` met het huidige domein mee, en de redirect-lijst is al ingesteld (`HANDLEIDING-BEHEER.md` §Auth). | 5 | Docenten zitten buitengesloten. |
| 8 | **Nieuw:** een vers docentaccount registreren, van begin tot eind, inclusief de bevestigingsmail. Aanmelden geeft géén `emailRedirectTo` mee (`src/lib/auth.ts:41-49`), dus de link gaat naar de Site URL. Die klopt pas ná stap 1. | 10 | Nieuwe docenten komen nooit binnen. Dit stond in geen enkel testplan (alleen USECASES D4 ⏳). |
| 9 | Eén testmail naar hello@soundscout.nl. | 3 | Antwoorden van de eerste groep gaan verloren. |

**Let bij SSDEMO op:**
- 6 tekens wordt in "Ik heb een code" alleen als bewaarcode gezocht (`ShareCodeInput.tsx:82-105`). **Deel daarom altijd de link `?pp-share=SSDEMO`, nooit de losse code.**
- `share_expires_at` moet op NULL, anders verloopt de code na 30 dagen en wist de nachtelijke opruiming hem.
- Druk daarna nooit meer op "Deel link" bij die praatplaat: dat zet de vervaldatum terug op +30 dagen.
- Er geldt een limiet van 30 keer openen per minuut **per code, voor alle bezoekers samen**. Stuur de uitnodiging dus niet in één keer naar een grote groep.

### Tier 2: belangrijk, geen blokker (±60 min)

- **Video-export van een storyboard (10 min).** De videocode is niet meer veranderd sinds de geslaagde luistertest van 24-7.
- **MP3 van een template en van een praatplaat (10 min).** Dezelfde offline render als Tier 1 #5.
- **O5 touch op een echte tablet (10 min).** De uitkomst is al bekend: `Clip.tsx:258` geeft `w-4 sm:w-2`, dus tablets krijgen de grijpzone van 8 px. De fix staat in `docs/TODO.md` (TOUCH-GRIP).
- **Een echte school-Chromebook (10 min):** autoplay en clips slepen (TODO #16).
- **iPhone/Android snelle check (10 min)** (TODO #MOBILE-AUDIT-BLOKKER).
- **E13: fullscreen op het digibord (2 min).**

### Tier 3: na de lancering, of vervalt

- **Vervalt (al geverifieerd):** O3, O6, O4-rest, O2-rest, B1, B1-rest, B2 (`744281a`), N5, N7.
- **Na de lancering:** O7–O12, blok 4 (SEO, de mobiele matrix, de thema-wizard), het restant van de export-audit (#9–#11, #16, M4a, C4) en de footer die op 375 px afbreekt.
- **De volledige matrix "4 vormen × MP3 en video"** wordt vervangen door Tier 1 #5 plus Tier 2.
- **Piraten:** sinds 06-10 verborgen (`isPublic: false`, plus de kiezers voor storyboards, afbeeldingen en praatplaten) tot de 12 dummy-tonen vervangen zijn. De "byte-identieke paren" hieronder zijn allemaal dummy's; er staat dus geen verkeerd echt geluid live.

---

## Het oorspronkelijke plan (31-8)

Dit plan vervangt `TESTPLAN-MASTERPLAN.md` voor deze ronde. Dat document is niet
fout, maar het is geschreven voor de worktree `masterplan-6-weken` (gemerged op
30-7) en dekt niets van wat daarna is gebouwd: de CSP/AudioWorklet-fix, `/over`,
de sequencer zonder dev-vlag, de kosten-teksten en de nieuwe CTA-hiërarchie op
`/teacher`. Het oude plan blijft staan als regressie-referentie.

**Zo test je:** `- [x]` werkt · `- [-]` werkt niet · `- [?]` twijfel/onbegrepen.
Zet bij `-` en `?` een regel eronder met wat je zag.

**Waar:** `ss-dev.techindeles.nl` (niet `soundscout.techindeles.nl` — die bestaat
niet). Twee browserprofielen: docent in de één, leerling in incognito.

> **Bijgewerkt 24-8 na een geautomatiseerde doorloop in de browser** (lokale
> dev-server, Berts eigen Chrome, ingelogd als docent). Punten met **[C]** zijn
> door Claude geverifieerd; punten met **[B]** vragen Bert (geluid, e-mail,
> apparaat, uitgelogde staat, server-upload). Waar een punt deels is gedekt,
> staat dat er expliciet bij.

---

## Checklist: wat er nog te doen is (14 punten, 31-8)

Alles wat Claude kon nakijken is afgevinkt. Dit is wat overblijft. De nummers
verwijzen naar de uitgewerkte punten verderop.

**Eerst op de server — zonder dit is de rest zinloos**
- [ ] 1. Verse `dist/` geüpload, **inclusief de verborgen `.htaccess`** (blok 0)
- [ ] 2. Console leeg bij openen: geen CSP-melding over `script-src`,
      `connect-src` of `blob:`, geen WebAssembly-fout (blok 0)

**Je oren — het grootste blok**
- [ ] 3. **N3.** Alle exports, alle vier de vormen (vrij · template · storyboard ·
      praatplaat), elk als MP3 én video; minstens één met pitch +12 en reverb
- [ ] 4. **N2-rest.** Compositie mét sequence exporteren, MP3 én video: geen
      "geluid ontbreekt"-melding, patroon hoorbaar in het bestand
- [ ] 5. **N1-rest.** Hoor je het sequencer-patroon, en veranderen álle geplaatste
      kopieën mee als je het patroon later bewerkt?

**Mail en de uitgelogde staat**
- [ ] 6. **O1.** Verse wachtwoord-reset aanvragen en meteen klikken; vooraf de
      Site URL op het testdomein zetten
- [ ] 7. **N4-rest.** `/over` op de server (rewrite werkt alleen mét `.htaccess`)
      + één testmail naar hello@soundscout.nl
- [ ] 8. **N6-rest.** De **uitgelogde** CTA's op `/teacher`, desktop én mobiel,
      plus de stappensectie-tekst

**Apparaat en losse eindjes — 31-8 door Claude nagelopen**
- [x] 9. **[C] O3. Bewaarcode → podium — reproduceert NIET.** Compositie gemaakt
      in Piraten, online bewaard (code `7UMTPY`), code geopend in een apart
      browserprofiel → "Gevonden! Waar wil je heen?" → **Podium**: het podium
      opent schoon, de compositie is geladen (1 clip) en de naam
      "Testcompositie O3" staat in het naamveld. **Geen enkele modal**
      (`document.querySelectorAll('[role=dialog]')` leeg). De bewaar-modal die
      je vorige keer zag, komt hier niet terug.
- [ ] 10. **[B] O5. Touch-targets — Bert test zelf op een echt apparaat.**
      Claude heeft alleen gemeten; het oordeel is aan de vinger. Metingen: op
      tabletbreedte (768px) is **24 van de 30** klikbare elementen in de studio
      kleiner dan 44px. Het spoor-volume is **23 × 16 px** (het kleinste), de
      werkbalkknoppen boven de tijdlijn zijn **32 × 32**, de afspeelpositie-greep
      **44 × 16**. De clip-resizegreep is **8 × 39 px**.
      → **Echte bevinding:** die greep is `w-4 sm:w-2` — 16px onder de
      `sm`-breakpoint (640px), 8px erboven. Een tablet of Chromebook is bréder
      dan 640px en krijgt dus juist de **smalle** variant, terwijl dat de
      apparaten zijn waar je met een vinger werkt. Beter zou zijn te schakelen
      op `@media (pointer: coarse)` in plaats van op schermbreedte.
      → **Rest [B]:** of het met een échte vinger werkt, blijft jouw oordeel.
- [x] 11. **[C] O6. Landscape-hint — werkt volledig.** Verschijnt in portret op
      map/locatie/studio/podium (`WIDE_SCREENS`), alleen op touch-apparaten;
      verdwijnt liggend puur via CSS (`landscape:hidden`, gemeten
      `display: none`); het kruisje zet `soundscout:first-run:landscape-hint` en
      is daarmee voorgoed weg; komt niet op start of dashboard.
- [x] 12. **[C] O4-rest. 375px — in orde.** Startscherm én podium: geen
      horizontale scroll (`scrollWidth` = 375), knoppen op volle breedte, tekst
      leesbaar. *Kleinigheid:* in de voettekst breekt "Gemaakt door Bert van
      Uffelen" over vier regels naast de sociale icoontjes. Niet stuk, wel rommelig.
- [x] 13. **[C] O2-rest. "In bewerking" — bestaat en werkt.** Klas-Test had
      simpelweg geen WIP-werk. In **Test klas (8257)** staan beide tabs:
      "Ingeleverd (1)" en "In bewerking (1)", met uitleg, blauwe badge en
      "Laatst bewerkt: 22 apr, 21:08". Twee klassen hebben WIP-werk: Test klas
      en Klas 3R.
- [x] 14. **[C] B1-rest. Deel-album — werkt vanaf een vers profiel.** Code
      **E4KXCNYQ** in een browser zonder login: "Album van Klas-Test — De
      Vriendelijke Kraken — 3 composities", gesture-poort, afspelen start
      (knop wordt "Pauzeren"), geen console-fouten. Dit album is een
      **storyboard**, waarmee meteen de storyboard-variant van de
      fullscreen-fix is bevestigd (`bg-brand-900`, witte titel, zijpaneel
      klapt in).

Punten O7 t/m O12 verderop staan bewust als "mag ná de lancering".

### Doorloop voor Bert — stap voor stap

Volgorde gekozen zodat je zo min mogelijk wisselt tussen apparaat en inlogstaat.

**A. Server (punt 1, 2 en de helft van 7) — doe dit eerst, 10 min**
1. Upload de **hele** inhoud van `dist/` naar `ss-dev.techindeles.nl`, inclusief
   het verborgen bestand **`.htaccess`**. Controleer na afloop in je FTP-client
   dat `.htaccess` er écht staat (3239 bytes).
2. Open `https://ss-dev.techindeles.nl` met de console open (F12 → Console).
   **Goed** = geen rode regels; specifiek géén melding over `script-src`,
   `connect-src`, `blob:` of `WebAssembly`. Zie je die wél, dan is de
   `.htaccess` niet meegekomen — dan is de rest van deze lijst zinloos.
3. Ga naar `https://ss-dev.techindeles.nl/over` (zonder `.html`). De pagina moet
   laden; wisselt de taalknop naar EN, dan hoort de tekst mee te veranderen.

**B. Je oren (punt 3, 4 en 5) — koptelefoon op, ingelogd, desktop, 45 min**
4. **Vrij componeren.** Nieuwe compositie → Vrij componeren → Piraten → een
   locatie → 3 geluiden verzamelen → Naar Studio → sleep 3 clips op de tijdlijn.
   Selecteer één clip → Effecten → **pitch +12** en **reverb ±60%** → sluiten.
   Naar Podium → Opslaan & Delen → **Download MP3**. Luister het bestand af:
   let op klikken, kraken of een vervormde inzet.
5. **Sequencer erbij (punt 4 en 5).** Terug in diezelfde studio: klik de
   gestippelde chip **"+ Sequence toevoegen"**, kies per spoor een geluid en
   klik vakjes aan. Speel af — hoor je het patroon rondlopen? Sleep de gele chip
   naar de tijdlijn, **dupliceer hem** zodat er twee kopieën staan. Bewerk nu het
   patroon (vakje aan/uit) en controleer of **beide** kopieën mee veranderen.
   Exporteer daarna opnieuw als MP3: er mag géén melding "geluid ontbreekt"
   komen, en het patroon moet in het bestand te horen zijn.
6. **Storyboard + video.** Nieuwe compositie → Bij een storyboard → kies er een →
   maak per scène wat geluid → Podium → Opslaan & Delen → **Download MP3** én
   **Download video**. Bekijk de video: beeldwissels op de juiste momenten, geluid
   in sync, geen stilte aan het eind.
7. **Praatplaat.** Via een klascode van een klas met een actieve praatplaat:
   plek kiezen → componeren → Podium → **Download MP3**.
8. **Template.** Activeer in een testklas een template-opdracht, open de klascode
   als leerling, maak hem af → Podium → **Download MP3**.

**C. Mail en uitgelogde staat (punt 6, 7-rest en 8) — 15 min**
9. Zet in Supabase de **Site URL** op het domein dat je test. Vraag daarna een
   verse wachtwoord-reset aan en klik de link **meteen**: je moet op hetzelfde
   domein op het resetscherm landen.
10. Stuur één testmail naar **hello@soundscout.nl** en controleer of hij aankomt.
11. Log uit. Open `/teacher` op desktop én op 375px. Controleer de CTA's in
    uitgelogde staat en lees de stappensectie na op fouten.

**D. Tablet of Chromebook (punt 10) — 10 min**
12. Open de studio met een compositie waar minstens één clip op staat.
    Probeer met je **vinger**: (a) de knoppen in de werkbalk boven de tijdlijn
    (32 × 32 px), (b) het **spoor-volume** links van elk spoor (23 × 16 px —
    de kleinste), en (c) de **resizegreep** rechts op een geselecteerde clip
    (8 × 39 px op een tablet). Noteer per onderdeel of het in één poging lukt.

**E. Onderweg, gratis meegenomen**
13. Zit je toch in een presentatie met een praatplaat of storyboard: druk één
    keer op de **fullscreen-knop**. Verwacht: alleen het beeld op een donkere
    achtergrond, geen witte balken links en rechts.

---

## 0. Voorwaarden — zonder dit is de rest zinloos

- [ ] **[B] Verse build vanaf `main`** en de **hele inhoud van `dist/`** geüpload,
      inclusief de verborgen **`.htaccess`**. Zonder die nieuwe `.htaccess` is de
      AudioWorklet-fix (commit `d9ac841` + `a452f06`) niet actief en test je een
      server waarop pitch-bake, exportvangnet en master-limiter stilzwijgend
      uitstaan. Dat is precies de val van 13 augustus.
      *Inhoud van `main/public/.htaccess` is 24-8 geverifieerd: `blob:` +
      `'wasm-unsafe-eval'` in `script-src`, `blob:` in `connect-src`,
      `frame-src 'self' …`, en de `/over`-rewrite. Die inhoud komt na de build
      1-op-1 in `dist/.htaccess`.*
- [ ] **[B] Console leeg bij het openen** van de app op de server: geen
      CSP-melding over `script-src`, `connect-src` of `blob:`, geen
      `WebAssembly`-fout. Doe hem eerst.
      *Lokaal 24-8: geen console-fouten op start, `/over` en `/teacher`.*
- [x] **[C] Piraten staat op `isPublic: true`** — staat in de themakiezer naast
      De Stad en Winterspelen. Blijft zo (besluit 25-8).

---

## 1. Twee bugs die sinds 23 juli openstaan

- [x] **[C] B1. "Open montage" in de deelweergave** — **geen bug.** De knop staat
      er gewoon: in het presentatiescherm (ook publieke/deelweergave) staat
      onderin "Open montage", naast Doorspelen en Feedback geven.
      **Wat je vorige keer zag was correct gedrag:** de actieve opdracht
      *De schattenjacht* heeft **0 inzendingen**. De keuzemodal toont dat ook
      eerlijk: "Actieve opdracht (0) — Nog geen inzendingen bij deze opdracht"
      (grijs) tegenover "Alle composities (13)". Een album van díe opdracht is
      dus terecht leeg.
      → **Restpunt [B]:** wil je een deel-album met inhoud testen, deel dan een
      opdracht waar écht op is **ingeleverd** (niet alleen opgeslagen).
- [x] **[C] B2. Fullscreen toont alleen het beeld** — **GEFIXT 31-8** (commit
      `744281a`). Nieuwe afgeleide vlag `immersive` (fullscreen + beeld-vorm +
      montagelijn dicht) maakt inhoudskaart, beeldzone, titelregel en het
      laad-/foutblok donker; alleen het beeld licht nog op. Geverifieerd op
      viewport 3440: kaart en beeldzone `rgb(15,23,42)`, geen witte balken,
      markers op hun plek. Montagelijn openklappen zet de kaart weer licht;
      vrij/template en de vensterweergave zijn ongewijzigd.
      *Oorspronkelijke bevinding:* **bug bevestigd en gemeten.**
      Montagelijn dicht ✅ en zijpaneel ingeklapt ✅, maar de plaat staat in een
      **witte kaart** met brede witte balken links en rechts.
      Meting (ultrabreed scherm, 3440px): afbeelding **2082px** breed in een
      beeldzone/kaart van **3416px** → ±1334px wit verdeeld over beide zijden.
      Beeldzone-achtergrond `bg-neutral-50` (249,250,251), kaart
      `bg-bg-surface` (255,255,255).
      In vensterweergave valt het niet op omdat de kaart dan bijna helemaal
      gevuld is; in fullscreen wordt de kaart veel breder dan het beeld.
      **Oorzaak:** niet het beeld (dat schaalt correct), maar de *container*
      blijft licht in fullscreen. Fix-richting: beeldzone + inhoudskaart donker
      maken zolang `isFullscreen`, zodat alleen het beeld oplicht.
      Let op bij de fix: de wrapper moet exact om het zichtbare beeld blijven
      vallen, anders verspringen de praatplaat-spots/markers.

---

## 2. Nieuw sinds 30 juli — nog nooit getest

- [x] **[C] N1. Sequencer zoals een docent hem ziet** — werkt, **zonder**
      `?dev=true`. Geverifieerde klikroute: studio → gestippelde chip
      "+ Sequence toevoegen" → eerste-keer-tip verschijnt → tab "Sequence 1 ✕"
      naast TIJDLIJN → geluidkiezer toont per geluid duur én bereik
      ("2.0 sec · ±4 vakjes") → vakjes aanklikken → **duur-arcering** (gestreepte
      vakjes) klopt → afspelen loopt rond met actieve loop-knop → buiten klikken
      sluit de tab → chip naar de tijdlijn slepen geeft een clip met
      **blokjespatroon** → clip verplaatsen werkt → clip selecteren toont
      "Sequence 1 · 8,0s" met **patroon bewerken** i.p.v. trim/effecten.
      **Uitrekken (= patroon herhalen) door Bert bevestigd.**
      → **Restpunt [B]:** hoor je het patroon, en veranderen álle geplaatste
      kopieën mee als je het patroon later bewerkt?
- [x] **[C] N2. Sequence overleeft opslaan** — opslaan (lokaal) → herladen →
      compositie heropenen: chip, clip én patroon staan er nog. De
      Opslaan-bevestiging sluit netjes (regressie R5-8 ook bevestigd).
      → **Restpunt [B]:** MP3 én video exporteren — geen "geluid ontbreekt"-
      melding en het patroon hoorbaar in het bestand.
- [ ] **[B] N3. Alle exports, alle vier de vormen.** Vrij · template · storyboard ·
      praatplaat, elk als MP3 én video, via de Opslaan & Delen-modal. Neem in
      minstens één compositie **pitch +12 en reverb** mee. Luister of het schoon
      is, niet alleen of het bestand verschijnt.
      *De modal zelf is 24-8 geverifieerd: drie kolommen kloppen — Voor jezelf
      (Opslaan / Bewaar online / Download MP3; video verschijnt alleen bij een
      storyboard), Voor de klas (Presenteren op het digibord — docent-only),
      Delen met anderen (Deel link), plus de docent-rij "Opslaan als opdracht"
      met slotje.*
- [x] **[C] N4. `/over` bestaat en klopt** — pagina laadt op `/over` (zonder
      `.html`), eigen SEO-titel, NL én EN via de taalknop. Bevat: wie het maakt,
      waarom het bestaat, "Hoe het begon", **Wat het kost**, contact
      **hello@soundscout.nl**, colofon (UFB Productions, KvK 55237029),
      privacy-link en **"Geluiden en bronnen"** met de CC-BY-vermelding
      (Freesound, uitklapbaar "Thema Piraten — 24 geluiden"). Het startscherm
      linkt via "Over deze app" naar `/over` (geen modal meer).
      → **Restpunt [B]:** dezelfde check op de server (de rewrite werkt alleen
      met de meegeüploade `.htaccess`) + één testmail naar `hello@soundscout.nl`.
- [x] **[C] N5. Sequencer-uitleg op `/teacher`** — blok "De sequencer" staat ná
      "Drie manieren om te componeren", met de looping animatie. De knop
      **"Lees het hoofdstuk in de handleiding"** opent het juiste
      handleidinghoofdstuk. De FAQ-vraag **"Wat is de sequencer?"** staat er.
      → **Tekstfout GEFIXT 31-8** (commit `e8ec721`): de alinea *"Let op: de
      sequencer is nog in ontwikkeling en staat standaard uit…"* is uit NL én EN
      verwijderd. Het hoofdstuk sluit nu af met "Je hoeft dus niets apart te
      bewaren." — in de browser gecontroleerd in beide talen.
- [x] **[C] N6. De nieuwe CTA-route op `/teacher`** — ingelogd desktop én mobiel
      (375px) geverifieerd: "Ga naar dashboard" geel, "Bekijk de demo" wit, géén
      "Inloggen" rechtsboven, géén tekstlink eronder; mobiel staan de knoppen op
      volle breedte zonder tweede knop ernaast.
      → **Restpunt [B]:** de **uitgelogde** toestanden (desktop + mobiel) en de
      stappensectie-tekst; vergt uitloggen uit je sessie.
- [x] **[C] N7. Kosten-teksten kloppen.** FAQ "Wat kost SoundScout?" en `/over`
      zeggen hetzelfde, in NL én EN:
      NL "De basis blijft gratis. … Komt er later een aanvullende, betaalde vorm
      bij, dan blijft alles wat je nu gebruikt beschikbaar."
      EN "The basics stay free. … If a paid addition arrives later, everything
      you use today remains available."

---

## 3. Nooit afgevinkt in het oude plan

### Moet vóór 1 september

- [ ] **[B] O1. Verse reset-mail.** Vraag een nieuwe wachtwoord-reset aan en klik
      hem meteen. Je moet op hetzelfde domein op het resetscherm landen. Zet
      vooraf Site URL op het domein dat je test.
      → *06-10: Site URL **niet** omzetten; `redirectTo` regelt het domein (zie Tier 1 #7).*
- [x] **[C] O2. E3. Inzendingen in het klaslokaal** — teller **"4 nieuw"** naast
      "Inzendingen van leerlingen"; per inzending de juiste badges: **Nieuw**,
      **Beoordeeld** (met sticker + sterren) en **Beluisterd** (koptelefoon), plus
      type-tags (Storyboard / Praatplaat / Opdracht).
      → **Restpunt [B]:** het tabblad **"In bewerking"** was in deze klas niet
      zichtbaar — vermoedelijk omdat er geen enkele WIP-inzending is (opgeslagen
      met klascode maar niet ingeleverd). Bevestig met een klas waar dat wél zo is.
- [x] **[B] O3. R5-7. Bewaarcode → podium.** *(06-10: afgedaan volgens checklist #9 van 31-8 — reproduceert niet.)* Bewaar online in Piraten → open de
      code in een ander profiel → kies Podium. Vorige keer kreeg je daar meteen
      de "bewaar compositie"-modal terwijl je alleen wilde presenteren. Kijk of
      dat nog zo is; zo ja, dan is dat een ontwerpkeuze die we moeten maken,
      geen bug om vrijdag te fixen.
- [x] **[C] O4. I4. Telefoon (375px)** — `/teacher` en de FAQ stapelen netjes,
      geen horizontale scroll; hero-animatie schaalt mee en is tweetalig.
      → **Restpunt [B]:** startscherm en podium op 375px.
- [ ] **[B] O5. I2. Touch-targets op tablet/Chromebook**: werkbalkknoppen boven de
      tijdlijn, spoor-volume en de clip-resizegreep zijn te raken met een vinger.
      *(De resizegreep is smal — met een muis al lastig te pakken; op touch
      expliciet checken.)*
- [x] **[B] O6. I3. Landscape-hint** *(06-10: afgedaan volgens checklist #11 van 31-8.)* in portret: banner met draai-icoon in de
      studio, verdwijnt liggend, kruisje = voorgoed weg, niet op start of dashboard.

### Mag ná de zachte lancering

- [ ] **O7. D6/D7. Peer-feedback leerling** · [ ] **O8. E5/E6. Peer-feedback docent**
- [ ] **O9. G2. Peer-sterren per rij** (vergt migratie 030)
- [ ] **O10. F7. Vrije-thema-kiezers** (buiten-seizoen zichtbaar mét badge voor de
      docent, verborgen voor de leerling)
- [ ] **O11. I1. iPad-video's** · [ ] **O12. I5. Statistieken-dashboardje**

---

## 4. Bewust apart — niet vrijdag

- **SEO en robots/sitemap** — losse grote test, tegen `soundscout.nl` als
  hoofddomein, ná de deploy naar productie.
- **Mobiele testmatrix iPhone/Android** afmaken (iPad is groen).
- **Thema-wizard week 4** — geparkeerd op 18-7.

---

## Bevindingen uit de doorloop van 24-8

1. ~~**Fullscreen-praatplaat: witte balken** (B2)~~ — **opgelost 31-8**, `744281a`.
2. ~~**Verouderde tekst in de docentenhandleiding**, hoofdstuk "De sequencer"~~ —
   **opgelost 31-8**, `e8ec721` (NL + EN).
3. ~~**B1 was geen bug** maar een lege opdracht~~ — **waarschuwing gebouwd 31-8**,
   `56aca76`: bij 0 ingeleverde composities mint de deelmodal geen code meer en
   legt hij het verschil tussen opgeslagen en ingeleverd werk uit.

**Nieuw gevonden op 31-8 bij het nalopen van 9 t/m 14:** de clip-resizegreep
schakelt op schermbreedte (`w-4 sm:w-2`) in plaats van op pointer-type, zodat
tablets en Chromebooks de smalle 8px-variant krijgen — precies de apparaten waar
je met een vinger sleept. Zie punt 10 hierboven.

**Nieuw gevonden op 31-8, buiten deze fixronde:** drie paren piraten-geluiden
zijn byte-identiek onder verschillende namen — `haven-kraan` == `jungle-slang`,
`grogkroeg-lach` == `voodoohut-raaf`, `grogkroeg-kroezen` == `voodoohut-fluister`.
In elk paar staat dus één verkeerd geluid. Piraten is publiek; besluit aan Bert.
→ *06-10: alle zes zijn dummy-tonen (16-07, d6c85be), niet verkeerd gekoppelde
echte geluiden. Piraten is sinds 06-10 verborgen tot de geluiden af zijn.*

---

## Regressie-let-op

- Elke klas-inzending hoort een bewaarcode te geven (migratie 026).
- "In bewerking" vs "Ingeleverd" splitst op `submitted_at`, niet op het bestaan
  van een code.
- De peer-batch geeft alleen inzendingen met `submitted_at`.
- De presentatie-playlist ververst elke 20s; springt er iets, noteer wélke lijst
  je koos.
- Praatplaat met onbekend thema valt terug op 'stad' — bewust, geen bug.

---

## Tijdsinschatting, eerlijk

Van de 16 "moet vóór 1 september"-punten zijn er 24-8 **negen afgevinkt** door de
geautomatiseerde doorloop. Wat overblijft voor jou is vooral **oor, e-mail,
apparaat en de server**: N3 (exports beluisteren), N2-rest (export met sequence),
O1 (reset-mail), O3 (bewaarcode→podium), O5/O6 (touch + landscape), N6-uitgelogd,
plus blok 0 (upload + console-check). Dat past ruim in de gereserveerde tijd.
