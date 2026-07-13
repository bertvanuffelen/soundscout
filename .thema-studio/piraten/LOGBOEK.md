# Logboek — thema Piraten (`piraten`)

Levend ontwikkeldossier. **Elke plaat, elk geluid, elk element — mét de exacte prompt en
herkomst.** Bijwerken na élke generatie, geluidskeuze en beslissing. Het plan zelf staat in
[themaplan.md](themaplan.md); dit logboek legt de *uitvoering + prompts + beslissingen* vast.

- **id / naam**: `piraten` / Piraten (EN: Pirates) — Monkey Island-sfeer
- **Kleuren**: primary `#0E8C8C` (teal) · accent `#E8A02C` (schatgoud) · mapBackground `#F3E1BE` (perkament)
- **Doelgroep / drukte / personages**: groep 3-8 / medium-vol (~25 acties per plaat) / uitsluitend robots
- **Aangemaakt**: 2026-07-13 · **Laatst bijgewerkt**: 2026-07-13

## Beslissingen (thema-specifiek)

| datum | beslissing | reden |
|---|---|---|
| 2026-07-13 | 5 locaties (grogkroeg, haven, schip, jungle, voodoohut) | compleet-maar-behapbaar pakket binnen credits |
| 2026-07-13 | Schatkaart-plattegrond met 7 zones: 5 actief + Scheepswrak-baai & Schedelrots als toekomst | kaart hoeft later niet opnieuw bij uitbreiding |
| 2026-07-13 | Praatplaat = Piratenmarkt (nieuw marktplein), niet schip-dwarsdoorsnede | levendig overzicht, breed geluidsbereik |
| 2026-07-13 | Grogkroeg = ankerbeeld | draagt sfeer + robotfamilie + palet + lantaarnlicht het best |

> Skill-brede beslissingen die tijdens dit thema zijn ontstaan (robots-only, gloeiend
> scherm-gezicht zonder mensenmond, 1920×1080, locaties even vol als praatplaten,
> altijd-wizard + vast negatief-blok) staan in de skill-referenties, niet hier.

## Beelden

### grogkroeg — locatie (ANKER)
- **Status**: ✅ GOEDGEKEURD door Bert als anker (2026-07-13, v1 ongewijzigd). Gekopieerd
  naar `stijlanker/anker-01.jpg` + `package/public/images/themes/piraten/grogkroeg.jpg`.
  Gezichtsregel (scherm/visor, geen mensenmond) geldt vanaf het vólgende beeld.
- **Job-id**: `cb50b6f9-57f1-4492-857e-7360e4b45244` (Higgsfield `nano_banana_pro`, 2 credits)
- **Iteraties**: 1 · **Kandidaat**: `kandidaten/grogkroeg-v1.jpg` (1920×1080)
- **Mini-wizard**: shot=totaalshot interieur · drukte=vol (~25) · belichting=warme lantaarngloed
- **Prompt v1**:
  ```
  Wide horizontal illustration. Wide total-shot interior view of a cozy, very busy, detailed
  wimmelbild pirate grog tavern, packed with clumsy activity and easter eggs.
  Environment: a warm wooden pirate tavern on a Caribbean island in a Monkey-Island mood —
  timber beams, hanging lanterns, barrels and crates, a long bar, round tables, a small stage
  corner, weathered but cozy. Warm lantern and candle glow, golden evening light.
  Activities (~25 clumsy robot mishaps): accordion player with sparks; two robots clinking grog
  mugs with oil sloshing; robot parrot squawking on a beam dropping a bolt; fat robot laughing
  his jaw-plate off; swinging saloon door banging a robot; robot rolling dice into a neighbour's
  mug; robot drumming an empty barrel with fist stuck; robot playing a tin whistle puffing steam;
  barman polishing a mug until it shatters; robot slipping on a spilled oil-latte; robot yanking a
  chandelier with a grappling hook; chibi robot on a wobbling wine rack; peg-leg snagged on a table;
  robot mopping/smearing grog; arm-wrestling a cracking table; cook flinging a pancake stuck to the
  ceiling; robot spilling gold coins; robot bumping a beam fixing his eye-patch panel; robot ship-cat
  chasing a mechanical mouse; robot toppling off a stool; robot uncorking a bottle with his teeth-row;
  waiter balancing a tilting tray of mugs; robot scorching his antenna lighting a lantern; robot
  reading a treasure map upside-down; robot crab snipping a tablecloth.
  Robot standard block (glowing screen/visor faces, no human mouths; color/shape/size diversity;
  pirate flavor rust/seaweed/peg-legs/tricorn hats/eye-patch panels; robot-animals).
  Hidden: tiny robot in an empty barrel; a gold coin on the floor; a mechanical mouse under the bar.
  Style: cartoon line-art, bold outlines, bright but slightly worn colors, wood+parchment palette
  with teal (#0E8C8C) and gold (#E8A02C) accents, cozy lantern glow, 4k.
  Negative: no text/letters/numbers/labels/logos/watermarks; robots only, no humans/real animals;
  no letterbox/borders; fill the 16:9 frame.
  ```
  (Volledige onverkorte prompt: [prompts/grogkroeg-v1.txt](prompts/grogkroeg-v1.txt))
- **Beoordeling**: sterk. ✓ robotfamilie, ✓ Monkey Island-sfeer, ✓ vol + klungel-humor,
  ✓ verborgen details (robot-kat/muis/krab, munt, robot-in-vat), ✓ geen tekst, ✓ palet.
  Aandachtspunten: barman + accordeonist hadden een té menselijke mond met tanden (→
  aanleiding voor de skill-brede gezichtsregel); iets grijs-lastig; 6/8 sound-hotspots
  duidelijk (tinfluit + vat-drum minder). Doodshoofdrobot goedgekeurd door Bert.
- **Wijzigingen per versie**: (v2 volgt als Bert een edit-ronde wil — gezichten barman/
  accordeonist naar scherm/visor, gloed consistenter, wat meer kleur.)

### haven — locatie
- **Status**: ✅ GOEDGEKEURD door Bert (2026-07-13, v2). Gekopieerd naar
  `package/public/images/themes/piraten/haven.jpg`.
- **Job-id(s)**: v1 `e8b33bf6-…` (verworpen: dieren organisch), v2 `ff55f38d-27b3-4c30-b3f2-b689d3a383e6` · **Iteraties**: 2
- **Stijlref**: `stijlanker/anker-01.jpg` (grogkroeg)
- **Mini-wizard**: shot=totaalshot kade · drukte=extreem druk (32 acties) · belichting=heldere middagzon
- **Volledige prompt (v2)**: [prompts/haven-v2.txt](prompts/haven-v2.txt) — goedgekeurde
  32-actielijst, houten derrick (geen stalen kraan), mechanische robot-dieren.
- **Leerpunten die v2 opleverde (nu in de skill)**: elementenlijst eerst tonen; drukte-target
  ≥30 + crowding-instructie; periode-echtheid (age-of-sail props); robot-dieren nadrukkelijk
  mechanisch forceren. Restpunt: meeuwen nog iets vogelachtig; belboei niet zichtbaar (klein).

### schip — locatie
- **Status**: ✅ GOEDGEKEURD (2026-07-13, v2). → `package/public/images/themes/piraten/schip.jpg`.
- **Job-id(s)**: v1 `320a90f4-…` (verworpen: "BOOM"-tekst in beeld), v2 `8f485e30-71dd-4daa-98ac-94b37bfabbe1` · **Iteraties**: 2
- **Mini-wizard**: shot=totaalshot dek · drukte=extreem druk (32 acties) · belichting=heldere winderige dag
- **Volledige prompt (v2)**: [prompts/schip-v2.txt](prompts/schip-v2.txt)
- **Leerpunt (nu in skill)**: onomatopee/geluidswoorden (BOOM) expliciet verbieden in het
  negatief-blok. Restpunt: papegaaien/aap bleven organisch (koppig; door Bert geaccepteerd).

## Geluiden

Nog niet geproduceerd (fase D). Geplande samples + routes: zie [themaplan.md](themaplan.md) §2.
Provenance (bron/licentie/ElevenLabs-prompt/gemeten duur) wordt hier per sample ingevuld
zodra we ze zoeken/genereren.

## Praatplaten

### pp-piratenmarkt — nog te genereren
Activiteitenlijst (~26, met sample-mapping): zie [themaplan.md](themaplan.md) §3. Prompt +
job-id volgen bij generatie.

## Storyboards

### schattenjacht — nog te genereren
Held-beschrijving + 4 frames: zie [themaplan.md](themaplan.md) §4. Per-frame prompt + job-id
volgen bij generatie.
