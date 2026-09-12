# Voorbeeld: thema Piraten — zo zag een compleet thema eruit

> **Dit is een voorbeeld, geen norm.** Leen de *redenering* en de *volgorde*; leen niet de
> *keuzes*. Een nieuw thema heeft een eigen wereld, eigen palet, eigen muziek. Wat hier
> generiek bleek, staat al in de skills — dit document laat zien hoe die regels er in de
> praktijk uitzagen en welke lessen hier geboren zijn.

## In cijfers (eindstand 2026-09)

| | |
|---|---|
| Locaties | 5 — grogkroeg, haven, schip, jungle, voodoohut |
| Samples / hotspots | 36 / 36, alle posities definitief via `/editor` |
| Beelden | 5 locaties · plattegrond NL + EN · 1 praatplaat · 2 storyboards (4 frames elk) · titel NL + EN · groepsposter |
| Geluiden | 27 echt (Freesound, CC0/CC-BY), 9 in keuze, 4 Suno-fragmenten gepland |
| Muziek | half-time set (7 stemmen) + double-time set (5) — prompts klaar, Bert genereert |
| Credits | ~100 voor het thema, ~60 extra voor de cast + posters |
| Commits | 55 op thema + skills |

## De thema-beslissingen en waarom

| Beslissing | Reden | Generiek of piraten? |
|---|---|---|
| Sfeer: Monkey Island (warme tropen, humor, grog) | Berts referentie; geeft palet, props en muziek één richting | piraten |
| 5 locaties, 7 zones op de kaart (2 als "toekomst") | behapbaar binnen credits, kaart hoeft bij uitbreiding niet opnieuw | **generiek**: reserveer zones |
| Grogkroeg als ankerbeeld | droeg sfeer + robotfamilie + palet + lantaarnlicht het best | **generiek**: kies het beeld dat de sfeer het meest draagt |
| Praatplaat = markt, niet schip-doorsnede | levendig overzicht, breed geluidsbereik | **generiek**: praatplaat = plek waar het meeste gebeurt |
| Age-of-sail props: hout, touw, canvas, houten kraan | periode-echtheid; alleen de robots zijn futuristisch | **generiek**: props volgen de wereld, robots niet |
| Piraten-gear expliciet in elke prompt | anders komen robots "kaal" uit de engine | **generiek**: flavor moet in élke prompt staan |
| Palet teal `#0E8C8C` / goud `#E8A02C` / perkament `#F3E1BE` | tropen + schat + kaart | piraten |
| Muziek: F klein, `Fm-Fm-Cm-Cm`, half-time reggae als basis | **niet bedacht maar afgelezen** uit wat Suno werkelijk speelde | **generiek is de methode**, de vamp is piraten |

## Lessen die híér geboren zijn (nu in de skills)

Ter oriëntatie — zodat je weet waar ze vandaan komen. Details staan in de genoemde
bestanden, niet hier.

- **Hoofdletter-scènenamen worden tekstbordjes** ("THE GROG BAR") · **onomatopee** ("BOOM"
  op het kanon) · **tropische dieren blijven organisch** → `gotchas.md` (beeld)
- **Locaties net zo druk als praatplaten** — ik maakte ze eerst rustiger, Bert corrigeerde
  → `stijl-locatie.md`
- **Mini-verhaaltjes horen bij de hóófd-praatplaat**, niet bij locatieplaten →
  `stijl-praatplaat.md`
- **De cast**: Finn ontstond als piraten-storyboardheld en werd thema-neutraal gemaakt;
  Ziggy werd na drift vrouwelijk + met klusdetails, Mossy kreeg een harde bouwbeschrijving
  → `stijl-cast.md`
- **Compositie-instructies veroorzaken stijldrift** (papegaai werd echt, Bolt verloor zijn
  meter) → `gotchas.md`
- **Dieren zoeken, niet genereren** — de gegenereerde robotpapegaai klonk niet als
  papegaai; herkenbaarheid gaat vóór stijl → `higgsfield-audio.md`
- **Stemmen geparkeerd** — TTS te netjes, NL met Engels accent; richting: kreten/gemompel
  → geluiden `SKILL.md`
- **Suno negeert akkoordenschema's**; lees de vamp af uit het materiaal → `muziek-stems.md`
- **Plattegrond in twee talen** was nergens aangesloten in de app → `datamodel-thema.md`
- **Editor**: renderlus gefixt, afspeelknop per hotspot toegevoegd, export-`audioUrl` klopt
  niet → thema-studio `SKILL.md` fase E

## Wat je van piraten kunt hergebruiken

- **Als stijlreferentie**: alleen als het nieuwe thema dezelfde warme cartoonstijl deelt —
  en dan liever de 3 bestaande basis-praatplaten dan een piratenbeeld, anders sluipt er
  piratenflavor in.
- **De cast-portretten**: altijd (die zijn thema-neutraal).
- **De werkwijze**: ankerbeeld → locaties → kaart NL/EN → praatplaat → storyboards → promo;
  geluiden batchgewijs met één luisterpagina; hotspots door Bert in de editor.
- **Niet**: het palet, de vamp, de props, de rolverdeling. Die zijn van dit thema.

## Waar het staat

- Code: `src/data/themes/piraten/` (+ `BRONNEN.md`, `LOGBOEK.md`)
- Werkmap (deels gitignored): `.thema-studio/piraten/` — `themaplan.md`, `LOGBOEK.md`
  (elke prompt + job-id + akkoord), `MUZIEK-SUNO.md` (alle Suno-prompts), `prompts/`,
  `kandidaten/`
- Assets: `public/images/themes/piraten/`, `public/audio/themes/piraten/`
- Cast + posters: `soundscout-afbeeldingen-generator/reference/cast/`
