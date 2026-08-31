# Testplan zachte lancering — 1 september 2026

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

**Apparaat en losse eindjes**
- [ ] 9. **O3.** Bewaarcode → podium (bewaar online in Piraten, open de code in
      een ander profiel, kies Podium)
- [ ] 10. **O5.** Touch-targets op tablet/Chromebook, vooral de clip-resizegreep
- [ ] 11. **O6.** Landscape-hint in portret
- [ ] 12. **O4-rest.** Startscherm en podium op 375px
- [ ] 13. **O2-rest.** Tabblad "In bewerking" bij een klas met écht WIP-werk
- [ ] 14. **B1-rest.** Deel-album met inhoud openen — klaar om te proberen met
      code **E4KXCNYQ** ("De Vriendelijke Kraken", 3 composities)

Punten O7 t/m O12 verderop staan bewust als "mag ná de lancering".

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
- [x] **[C] O2. E3. Inzendingen in het klaslokaal** — teller **"4 nieuw"** naast
      "Inzendingen van leerlingen"; per inzending de juiste badges: **Nieuw**,
      **Beoordeeld** (met sticker + sterren) en **Beluisterd** (koptelefoon), plus
      type-tags (Storyboard / Praatplaat / Opdracht).
      → **Restpunt [B]:** het tabblad **"In bewerking"** was in deze klas niet
      zichtbaar — vermoedelijk omdat er geen enkele WIP-inzending is (opgeslagen
      met klascode maar niet ingeleverd). Bevestig met een klas waar dat wél zo is.
- [ ] **[B] O3. R5-7. Bewaarcode → podium.** Bewaar online in Piraten → open de
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
- [ ] **[B] O6. I3. Landscape-hint** in portret: banner met draai-icoon in de
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

**Nieuw gevonden op 31-8, buiten deze fixronde:** drie paren piraten-geluiden
zijn byte-identiek onder verschillende namen — `haven-kraan` == `jungle-slang`,
`grogkroeg-lach` == `voodoohut-raaf`, `grogkroeg-kroezen` == `voodoohut-fluister`.
In elk paar staat dus één verkeerd geluid. Piraten is publiek; besluit aan Bert.

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
