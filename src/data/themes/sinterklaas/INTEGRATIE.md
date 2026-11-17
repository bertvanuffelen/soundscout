# Integratie — thema Sinterklaas (verborgen, interim-release V1)

Besluit Bert 15-11-2026: het Sinterklaas-thema komt als tussenrelease op V1 `main`
via het bestaande TypeScript-themapad, **verborgen** (`isPublic: false`, geen
datumvenster) tot alle beelden en geluiden goedgekeurd zijn en de
gevoeligheidscheck gedaan is. Doel: live vóór 5 december.

Verborgen testen kan via **`/?theme=sinterklaas`**: dat zet het thema actief
(kaart, locaties, geluiden). Let op: de themakiezer bij "Nieuwe soundscape" toont
alleen publieke thema's, dus daar staat Sinterklaas (terecht) niet tussen. De
hotspots bekijk en verschuif je in `/editor` (dat toont alle thema's, ook
verborgen).

Browsercheck 17-11-2026 (dev, `?theme=sinterklaas`): NL- en EN-kaart tonen 5
markers met de juiste plattegrond; pakjeskamer opent met beeld en 6 hotspots; een
hotspot laadt en neemt zijn toon op; Sinterklaas staat niet in de themakiezer.
De bakkerijmarker stond over het opschrift "De bakkerij"; verschoven van 60,48
naar 61,70 (bij de oven), gecontroleerd op de NL- en EN-kaart, breed en smal.

## Klaar

- Code: `index.ts`, `locations.ts`, `samples.ts`, `map.ts` + registratie in
  `src/data/themes/index.ts`.
- 5 locaties (stoomboot, dak, pakjeskamer, bakkerij, huiskamer), 6 geluiden per
  locatie: 25 effecten en 5 muziekloops.
- Kleuren: primary `#B3261E`, accent `#F2B632`, mapBackground `#FBEFD5`.
- Teksten NL + EN onder `themes.sinterklaas.*`. "Piet/Pieten" alleen voor de
  helperrobots, nooit met een kleurbijvoeglijk naamwoord.
- 11 nieuwe Lucide-iconen in `src/utils/iconMap.tsx`.
- 4 goedgekeurde locatiebeelden (pakjeskamer, dak, bakkerij, huiskamer) en de
  plattegrond NL + EN in `public/images/themes/sinterklaas/`.
- Hotspots geschat uit het thema-studio-logboek en vooraf getoetst aan de
  V2-regels: veilige zone 12–88 %, 44 px onderlinge afstand op een scène van
  373×210. `dak-schoorsteen` is daarvoor verschoven van 72,42 naar 73,43.
- 30 tijdelijke sinustonen (zelfgemaakt) in `public/audio/themes/sinterklaas/<locatie>/`:
  effecten op hun geplande lengte, loops exact 8,0 s.

## Nog te doen

1. **Stoombootbeeld** — Bert keurt het goed; het komt in
   `public/images/themes/sinterklaas/stoomboot.jpg`. Tot dan heeft de locatie
   stoomboot geen achtergrond.
2. **De 30 echte geluiden** — 21 van Freesound, 4 via Higgsfield, 5 Suno-loops van
   8,0 s op 120 BPM. Vervang de mp3's één op één, werk `duration` in `samples.ts`
   bij en leg de bronnen vast in `BRONNEN.md`.
3. **Hotspots fijnafstemmen** — Bert in `/editor`.
4. **Gevoeligheidscheck** — Bert controleert het hele thema, NL en EN
   (harde poort: zonder deze check gaat het thema niet open).
5. **Openzetten** — `isPublic: true`, bouwen, uploaden; na 5 december weer op
   `false`.
