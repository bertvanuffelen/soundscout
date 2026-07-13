---
name: soundscout-thema-studio
description: >-
  Complete AI-ondersteunde thema-creatie-pipeline voor SoundScout: brainstorm een nieuw
  thema, werk het inhoudelijk uit (locaties, samples, praatplaten, storyboards), genereer
  de afbeeldingen via de Higgsfield CLI (Nano Banana Pro; Gemini API als fallback) met
  stijlbewaking, zoek of genereer de geluiden (Freesound / ElevenLabs / checklist), en
  lever een compleet themapakket dat 1-op-1 in de codebase past. Gebruik deze skill
  wanneer Bert een nieuw thema wil maken of brainstormen ("nieuw thema", "themapakket",
  "thema-studio"), een praatplaat wil maken/genereren, een locatie-achtergrond of
  plattegrond nodig heeft, een storyboard voor SoundScout wil, of themageluiden wil
  zoeken/genereren. Ook voor het uitbreiden van een bestaand thema met extra praatplaten,
  storyboards of locaties.
---

# SoundScout Thema-studio

Jij bent creatieve partner én productiestraat. Bert brainstormt, jij denkt inhoudelijk mee,
genereert de assets, bewaakt stijl en eisen, en assembleert het pakket.

**Twee ijzeren regels:**
1. **Jij keurt alleen áf, Bert keurt goed.** Elk beeld dat jouw checklist overleeft leg je
   aan Bert voor; niets gaat naar `package/` zonder zijn akkoord.
2. **Jij hoort geen audio.** Elke geluidskeuze loopt via Berts oren — geef kant-en-klare
   `afplay`-commando's zodat hij snel kan luisteren.

## Setup (elke sessie)

- Werkmap per thema: `.thema-studio/{themeId}/` in de repo-root (gitignored) met
  `themaplan.md`, `manifest.json`, `prompts/`, `kandidaten/`, `stijlanker/`, `package/`.
- **Hervatten**: check bij de start of er al een `.thema-studio/*/themaplan.md` bestaat.
  Zo ja: vraag of Bert daarmee verder wil en lees themaplan + manifest om te bepalen in
  welke fase je zit. Zo nee: start fase A.
- API-keys staan in `~/.config/soundscout-thema-studio/.env` (zie
  [reference/api-setup.md](reference/api-setup.md)). Scripts laden die zelf via `_env.py`.
- `manifest.json` is jouw logboek: status per asset, elke API-call (script + doel +
  iteratie), gekozen model, gebruikte stijlankers. Werk het na elke stap bij.

## Fase A — Brainstorm & intake

Vrije creatieve sessie: denk mee over verhaal, sfeer, locaties, praatplaat-ideeën. Heeft
Bert nog geen onderwerp, doe dan 3 themavoorstellen met elk een one-liner, 4-5
locatie-ideeën en 1-2 praatplaat-concepten.

Sluit af met de intake-wizard (stel de vragen één voor één, niet als formulier):
1. **Onderwerp/omgeving** van het thema.
2. **Doelgroep** (groep 1-8) en **drukte-niveau** (extreem druk vs. rustiger).
3. **Robot-flavor** — *vast huisstijlkenmerk: álles is een robot.* Piraten, bewoners,
   dieren, monsters — allemaal robot-versies (robot-papegaai, robot-aap, robot-piraat).
   Bespreek alleen de thema-*flavor* van de robots (bv. piraten-robots met
   houten-been-bouten, roest, zeewier), nooit óf het robots zijn. Nooit mensen of echte
   dieren.
4. **Kleurenpalet + belichting** — doe een concreet hex-voorstel voor
   `colors.primary/accent/mapBackground`.
5. **Omvang**: aantal locaties (advies 4-5), praatplaten (1-2), storyboards (1, met 3-5
   frames).

Rode draad vanaf hier: **elk element moet sonificeerbaar zijn** — kan een kind hier een
compositie bij maken met de samples van dit thema?

## Fase B — Themaplan

Vul [templates/themaplan.md](templates/themaplan.md) in en initialiseer `manifest.json`.
Eisen (details in [reference/datamodel-thema.md](reference/datamodel-thema.md)):

- Per locatie **6-8 samples**: id, NL/EN-naam, geluidsbeschrijving, type (`loop-8.0s` of
  `sfx-2-8s`), Lucide-icon, hex-kleur, verwervingsroute **F**=Freesound / **E**=ElevenLabs
  / **C**=checklist (Bert zelf).
- Per locatie een achtergrondbeschrijving waarin de 6-8 geluidsbronnen zichtbaar zijn.
- Per praatplaat: category, availableFor, **20-30 activiteiten elk gemapt op ≥1
  sample-id** (dekkingseis: elke sample van de gekoppelde locaties minstens 1× als
  activiteit) + 3-5 verborgen zoekdetails + shot-keuze (straatscène / dwarsdoorsnede /
  overzicht).
- Storyboard: 3-5 frames met per frame de handeling + i18n-labels.
- Map: lay-outbeschrijving + voorlopige `locationPositions`.
- Concept-prompts voor álle beelden (opbouw per beeldtype: zie `reference/stijl-*.md`).

→ **Gate: Bert keurt het themaplan goed voordat er één beeld gegenereerd wordt.**

## Fase C — Beeldproductie

Stijlcontracten: [stijl-praatplaat](reference/stijl-praatplaat.md) ·
[stijl-locatie](reference/stijl-locatie.md) · [stijl-storyboard](reference/stijl-storyboard.md) ·
[stijl-plattegrond](reference/stijl-plattegrond.md). Checklist:
[beoordeling-checklist.md](reference/beoordeling-checklist.md).

**Ankersysteem:**
- Thema in de bestaande basis-stijl → gebruik de 3 bestaande praatplaten
  (`public/images/praatplaten/*.jpg`) als referenties.
- Nieuw thema → genereer eerst één **ankerbeeld** (het beeld dat de sfeer het best
  draagt, meestal een locatie of praatplaat) zónder anker, puur op het stijlcontract.
  Na Berts goedkeuring: kopieer naar `stijlanker/anker-01.jpg`. Daarna gaat het anker
  **verplicht** mee als `--image-reference` in elke generatie (vul aan met het meest
  verwante goedgekeurde beeld; `nano_banana_pro` accepteert tot 14 referenties, maar 2-3
  gerichte volstaat meestal).
- Storyboards: frame 1 goedgekeurd → frames 2-5 met frame 1 als extra referentie
  (character consistency).
- **Eén model per thema** voor finale beelden (`nano_banana_pro`; lichtere modellen mogen
  voor drafts, nooit mixen in het eindresultaat).

**Kwaliteitslus per beeld** (primaire engine = Higgsfield CLI, `nano_banana_pro`, 2
credits/beeld — geen key nodig; zie [reference/api-setup.md](reference/api-setup.md)):
1. Schrijf de prompt naar `prompts/{beeld-id}-v{n}.txt`.
2. `python3 scripts/genereer-afbeelding-higgsfield.py --prompt-file … --out …
   --image-reference stijlanker/anker-01.jpg --manifest .thema-studio/{id}/manifest.json`
   (Gemini-fallback: `scripts/genereer-afbeelding.py … --style-ref …`, alleen als de
   `GEMINI_API_KEY` gezet is / je Higgsfield-credits wilt sparen.)
3. `python3 scripts/verwerk-afbeelding.py --in … --out kandidaten/{beeld-id}-v{n}.jpg`
4. **Read** het jpg en loop de checklist af: per criterium ✓/✗ met één regel toelichting;
   log het resultaat in manifest.json.
5. Alles ✓ → toon aan Bert (pad + samenvatting). Bert keurt goed of stuurt bij.
6. Bij ✗: kleine/lokale fout → gerichte edit (`--edit-van vorige.png --edit-prompt "…"`);
   structurele fout (compositie/stijl/drukte) → regenereer met aangescherpte prompt.
7. **Max 3 iteraties** per beeld. Daarna: stop, leg de beste 2-3 kandidaten met analyse
   aan Bert voor (opties: zijn aanwijzing, Higgsfield als tweede mening, prompt herzien
   in het themaplan).
8. Goedgekeurd → verplaats naar het juiste `package/`-pad; overweeg promotie tot
   stijlanker.

**Kostenbewaking**: begroot in fase B het aantal generaties (~2,5× het aantal finale
beelden). Higgsfield rekent **2 credits per beeld** — check het saldo met
`higgsfield account status` (start 150 ≈ ~75 generaties ≈ ~1 thema). Meld Bert zodra je
op 2× de begroting zit of het saldo onder ~30 credits zakt.

## Fase D — Geluidsproductie

Specificaties: [reference/audio-specificaties.md](reference/audio-specificaties.md).
Per sample, volgens de route uit het themaplan:

- **F (Freesound)**: `python3 scripts/zoek-geluid.py --query "…" --min-duur 2 --max-duur 8
  --licentie cc0 --top 5 --download-map kandidaten/audio/{sampleId}/` → geef Bert per
  kandidaat een `afplay`-regel → Bert kiest → `verwerk-geluid.py` (loops naar exact
  8.0s) → licentie-JSON wordt automatisch meegeschreven voor BRONNEN.md.
- **E (ElevenLabs)**: `python3 scripts/genereer-geluid.py --prompt "…" --duur …
  --out …` → Bert luistert → maximaal 2e poging, daarna route F of C.
- **C (checklist)**: neem het geluid op in `zoektermen-checklist.md` in het pakket, met
  zoektermen, gewenste duur/type en de doelbestandsnaam.

Afsluiter: `python3 scripts/check-audio.py --map package/public/audio/themes/{themeId}/`
→ gebruik de **gemeten** durations voor `samples.ts` (nooit de geplande).
→ **Gate: Bert heeft alle geluiden gehoord en goedgekeurd.**

## Fase E — Assemblage & integratie

1. Schrijf zelf (geen script) de vier TS-bestanden en i18n-fragmenten vanuit
   [templates/](templates/) + manifest + gemeten durations. Conventies zijn hard:
   geneste i18n (`themes.{id}.*`), audio-pad
   `/audio/themes/{themeId}/{locationId}/{sampleId}.mp3` — zie
   [reference/datamodel-thema.md](reference/datamodel-thema.md).
2. Genereer `BRONNEN.md` (alle beelden + geluiden met bron/licentie) en `INTEGRATIE.md`
   (uit de templates).
3. `python3 scripts/check-pakket.py --pakket .thema-studio/{themeId}/package` — moet
   groen zijn.
4. → **Gate.** Daarna, alleen op Berts verzoek (E2): integreer direct in de codebase —
   assets kopiëren, thema registreren in `src/data/themes/index.ts`, i18n mergen in
   `nl.json`/`en.json`, entries in `praatplaatImages.ts`/`storyboards.ts`,
   `npm run build` als rooktest. Hotspots plaatst Bert daarna in `/editor`
   (INTEGRATIE.md bevat jouw x/y-startadvies per geluidsbron uit de beeldbeoordeling).

## Bekende beperkingen (eerlijk benoemen)

- Activiteiten tellen op een drukke praatplaat is een schatting; de Bert-gate ondervangt dit.
- De beeld-engine levert geen exacte pixelmaat (resolutie-tiers); `verwerk-afbeelding.py`
  maakt er altijd 1920×1072 JPG van.
- Higgsfield-credits zijn eindig (2/beeld, gedeeld saldo) — bewaak het saldo en schakel
  desnoods naar de Gemini-fallback als de credits opraken.
