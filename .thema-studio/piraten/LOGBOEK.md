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

### jungle — locatie
- **Status**: ✅ GOEDGEKEURD (2026-07-13, v1). → `package/public/images/themes/piraten/jungle.jpg`.
- **Job-id(s)**: v1 `6dbabf70-3714-424f-9c46-18f2b33ac43d` (gekozen) · edit-poging `9e9c3e8b-…` (geen winst)
- **Mini-wizard**: shot=totaalshot jungle · drukte=extreem druk (32 acties) · belichting=mysterieus/mistig
- **Volledige prompt (v1)**: [prompts/jungle-v1.txt](prompts/jungle-v1.txt)
- **Leerpunt (nu in skill)**: kleurrijke tropische dieren (papegaai/aap/toekan) blijven
  organisch — óók na gerichte edit. Slang/krab/insect lukken wél. → ontwerp eromheen.
  Bert accepteerde de organische papegaaien/apen hier.

### voodoohut — locatie
- **Status**: ✅ GOEDGEKEURD (2026-07-13, v2). → `package/public/images/themes/piraten/voodoohut.jpg`.
- **Job-id(s)**: v1 `20775612-…` · piraten-gear-edit v2 `74632a42-faea-4c00-b04a-7e6314b3fef9` (gekozen)
- **Mini-wizard**: shot=totaalshot interieur · drukte=extreem druk · belichting=spookachtig groen
- **Volledige prompt (v1)**: [prompts/voodoohut-v1.txt](prompts/voodoohut-v1.txt) + gear-edit
- **Leerpunt (nu in skill)**: edit werkt wél goed voor het toevoegen van accessoires
  (piraten-gear). Dieren omzetten niet. → piraten-gear voortaan standaard in de prompt.

> **Mijlpaal: alle 5 locaties compleet** (grogkroeg·haven·schip·jungle·voodoohut). Credits over: 132.

### plattegrond — schatkaart (NL + EN)
- **Status**: ✅ GOEDGEKEURD (2026-07-13). → `package/.../plattegrond.jpg` (NL) +
  `plattegrond-en.jpg` (EN).
- **Job-id(s)**: NL `4c603dfd-8ea4-4b0f-833c-85943ef02e6f` · EN-edit `745539fe-8679-4155-aa59-dc7ce45bee61`
- **Kaartstijl**: platte perkament-schatkaart · 7 zones met banner-labels · kompas met
  robot-schedel-N · legenda-rol · gestippelde route → rode X op Schedelrots.
- **Prompt**: [prompts/plattegrond-v1.txt](prompts/plattegrond-v1.txt) (NL); EN via label-edit.
- **Labels (foutloos gerenderd)**: NL: DE DORSTIGE PAPEGAAI / DE KADE / HET SCHIP / HET
  JUNGLEPAD / DE VOODOO-HUT / SCHEEPSWRAK-BAAI / SCHEDELROTS · EN: THE THIRSTY PARROT / THE
  HARBOR / THE SHIP / THE JUNGLE / THE VOODOO HUT / SHIPWRECK COVE / SKULL ROCK.
- **⚠️ INTEGRATIE-actie**: `MapConfig.backgroundImage` is nu één pad → kleine codewijziging
  nodig om `plattegrond-{lang}.jpg` te kiezen op i18n-taal. (Plattegrond is het enige
  tekst-beeld; leerpunt staat in stijl-plattegrond.md.)

## Geluiden

Nog niet geproduceerd (fase D). Geplande samples + routes: zie [themaplan.md](themaplan.md) §2.
Provenance (bron/licentie/ElevenLabs-prompt/gemeten duur) wordt hier per sample ingevuld
zodra we ze zoeken/genereren.

## Praatplaten

### pp-piratenmarkt — nog te genereren
Activiteitenlijst (~26, met sample-mapping): zie [themaplan.md](themaplan.md) §3. Prompt +
job-id volgen bij generatie.

## Praatplaten

### pp-piratenmarkt — hoofd-praatplaat
- **Status**: ✅ GOEDGEKEURD (2026-07-13, v3). → `package/public/images/praatplaten/piratenmarkt.jpg`.
- **Job-id(s)**: v1 `fcae0093` (goede markt, bewaard als backup) → v2 `45bbd60d`
  (hergroepeerd tot ~25 mini-verhaaltjes) → v3-edit `636de33f-8ea0-4bdc-afaf-4fdd7755bb72`
  (tekstbordjes → picture-bordjes; taal-neutraal, geen aparte EN nodig).
- **Mini-wizard**: overzicht straatscène · 40+/extreem druk · avond-festival met lampionnen.
- **Volledige prompt (v2)**: [prompts/pp-piratenmarkt-v2.txt](prompts/pp-piratenmarkt-v2.txt)
  (v1: [pp-piratenmarkt-v1.txt](prompts/pp-piratenmarkt-v1.txt))
- **Leerpunten (nu in skill)**: (1) hoofd-praatplaat = 20-30 mini-verhaaltjes/soundscape-
  vignetten (≠ locatieplaat met 6-8 hotspots); (2) scène-namen NIET in caps in de prompt
  (worden tekstbordjes); (3) picture-bordjes = taal-neutraal.

## Storyboards

### kraken (De Vriendelijke Kraken) — ✅ COMPLEET (4 frames)
- **Status**: goedgekeurd. → `package/public/images/storyboards/kraken/kraken-1..4.jpg`. Cover = frame 2.
- **Kraken** (consistent via referentie frame 2): reuze robot-kraken, teal-paarse metalen
  panelen, ronde gloeiende ogen, gelede tentakels.
- **Frames**: 1 Schrik (alleen ronde gloeiende ogen in stormwater) · 2 Vlucht (enge reveal,
  rode ogen + gekartelde grijns) · 3 Cadeaus (bemanning geeft ingepakte cadeaus, kraken
  verbaasd) · 4 Feest (kraken maakt muziek met de uitgepakte instrumenten, iedereen danst).
- **Verhaalboog**: eng → verrast → feest; motivatie = de cadeaus met instrumenten.
- **Iteraties/leerpunten**: pose+expressie per frame variëren (ook tentakels/crew); referentie
  = ontwerp, prompt = pose/expressie (eng vs. vriendelijk); frame 1 opnieuw met frame 2 als
  ref zodat crew + kraken-ogen matchen.
- **Prompts**: prompts/sb-kraken-{1-v4,2-v2,3-v4,4-v1}.txt

### schattenjacht — ✅ COMPLEET (4 frames)
- **Status**: goedgekeurd. → `package/public/images/storyboards/schattenjacht/schattenjacht-1..4.jpg`. Cover = frame 4.
- **Held** (consistent via referentie frame 1): koperkleurige robot-piraat, metalen driekante
  hoed, cyaan visor-gezicht, mechanisch robot-papegaaitje op de schouder, houten been.
- **Frames**: 1 Kaart (kade/zonsondergang) · 2 Jungle (hakken door mist) · 3 Graven (X op
  strand) · 4 Schat = **gouden badeendje** (anticlimax-gag; papegaai kijkt sceptisch).
- **Jobs**: 1 `c587254d` · 2 `f6539cd0` · 3 `e1cb087b` · 4 `de96e4b6` (edit van oliekan-versie `093489f7`).
- **Prompts**: prompts/sb-schattenjacht-{1,2,3,4-*}.txt
- **Bonus bewaard**: frame 4 **oliekan**-variant (`kandidaten/sb-schattenjacht-4-oliekan-v1.jpg`).
- **Leerpunt**: karakterconsistentie via referentiebeeld (frame 1) werkt uitstekend voor
  storyboards; objecten verwisselen via edit (oliekan↔eendje) = zuivere A/B-varianten.
