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

**Drie ijzeren regels:**
1. **Jij keurt alleen áf, Bert keurt goed.** Elk beeld dat jouw checklist overleeft leg je
   aan Bert voor; niets gaat naar `package/` zonder zijn akkoord.
2. **Jij hoort geen audio.** Elke geluidskeuze loopt via Berts oren — geef kant-en-klare
   `afplay`-commando's zodat hij snel kan luisteren.
3. **Altijd eerst de wizard én de elementenlijst.** Genereer nóóit een beeld zonder
   (a) Bert te bevragen (drukte, shot, palet/belichting, bijzonderheden) én (b) de
   **volledige element-/actielijst met hem te delen en te laten goedkeuren** — pas ná zijn
   akkoord gaat de prompt naar Higgsfield. Zie de mini-wizard in
   [reference/prompt-recept.md](reference/prompt-recept.md). En stuur bij élke prompt het
   **vaste negatief-blok** mee (idem).

## Setup (elke sessie)

- Werkmap per thema: `.thema-studio/{themeId}/` in de repo-root (gitignored) met
  `themaplan.md`, `manifest.json`, `prompts/`, `kandidaten/`, `stijlanker/`, `package/`.
- **Hervatten**: check bij de start of er al een `.thema-studio/*/themaplan.md` bestaat.
  Zo ja: vraag of Bert daarmee verder wil en lees themaplan + manifest om te bepalen in
  welke fase je zit. Zo nee: start fase A.
- API-keys staan in `~/.config/soundscout-thema-studio/.env` (zie
  [reference/api-setup.md](reference/api-setup.md)). Scripts laden die zelf via `_env.py`.
- `manifest.json` is het **machine-logboek**: status per asset, elke API-call (script +
  doel + iteratie), model, stijlankers. Werk het na elke stap bij.
- `LOGBOEK.md` (uit [templates/LOGBOEK.md.template](templates/LOGBOEK.md.template)) is het
  **mens-logboek** van het thema: elke plaat, elk geluid, elk element mét de **volledige
  prompt en herkomst**. Maak het aan in fase B en werk het bij na élke generatie,
  geluidskeuze en beslissing — zodat een plaat later aan te passen is zonder te zoeken. Het
  reist bij integratie mee naar `src/data/themes/{themeId}/LOGBOEK.md` (durabel/versioned;
  de tekst-records in `.thema-studio/` worden ook getrackt, alleen de zware beelden niet).

## Fase A — Brainstorm & intake

Vrije creatieve sessie: denk mee over verhaal, sfeer, locaties, praatplaat-ideeën. Heeft
Bert nog geen onderwerp, doe dan 3 themavoorstellen met elk een one-liner, 4-5
locatie-ideeën en 1-2 praatplaat-concepten.

Sluit af met de intake-wizard (stel de vragen één voor één, niet als formulier):
1. **Onderwerp/omgeving** van het thema.
2. **Doelgroep** (groep 1-8) en **drukte-niveau** (extreem druk / vol / medium — geldt voor
   álle platen; locaties zijn even vol als praatplaten). Het **shot** per beeld (close-up /
   medium / totaalshot / dwarsdoorsnede) vraag je later per beeld in de fase-C mini-wizard.
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

- Per locatie **6-8 samples** (= de sound-hotspots): id, NL/EN-naam, geluidsbeschrijving,
  type (`loop-8.0s` of `sfx-2-8s`), Lucide-icon, hex-kleur, verwervingsroute **F**=Freesound
  / **E**=ElevenLabs / **C**=checklist (Bert zelf).
- Elke locatieplaat is een **vólle wemelscène (~20-30 acties, net zo druk als een
  praatplaat)**: de 6-8 samples zijn de duidelijk herkenbare sound-hotspots, aangevuld met
  ~15-20 extra on-theme klungel-gags (die geen eigen sample hebben). Schrijf per locatie
  die actielijst uit (sound-sources gemarkeerd).
- Per praatplaat: category, availableFor, **20-30 activiteiten, elk sonificeerbaar met
  ≥1 sample uit het thema** (richting: activiteit → sample). Streef naar spreiding over
  alle locatie-klankwerelden; niet elke sample hoeft afgebeeld (een thema met 30+ samples
  past niet op één plaat). + 3-5 verborgen zoekdetails + shot-keuze (straatscène /
  dwarsdoorsnede / overzicht).
- Storyboard: 3-5 frames met per frame de handeling + i18n-labels.
- Map: lay-outbeschrijving + voorlopige `locationPositions`.
- Concept-prompts voor álle beelden (opbouw per beeldtype: zie `reference/stijl-*.md`).

→ **Gate: Bert keurt het themaplan goed voordat er één beeld gegenereerd wordt.**

## Fase C — Beeldproductie

Stijlcontracten: **[stijl-robots](reference/stijl-robots.md) (de robotfamilie + verplichte
kleur/vorm/grootte-diversiteit — geldt voor álle beelden)** ·
[stijl-praatplaat](reference/stijl-praatplaat.md) ·
[stijl-locatie](reference/stijl-locatie.md) · [stijl-storyboard](reference/stijl-storyboard.md) ·
[stijl-plattegrond](reference/stijl-plattegrond.md). Checklist:
[beoordeling-checklist.md](reference/beoordeling-checklist.md). Neem in élke beeldprompt
het robot-standaardblok uit stijl-robots.md op.

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
0. **Mini-wizard**: bevraag Bert eerst (drukte, shot, palet/belichting, bijzonderheden).
0b. **Elementenlijst-gate**: stel de volledige actielijst op (aantal past bij de drukte:
   extreem druk ≥30 · vol ~25 · medium ~18), met de sound-hotspots gemarkeerd, en **toon 'm
   aan Bert. Genereer pas na zijn goedkeuring.** Props/omgeving passen bij de wereld/periode
   van het thema (alleen de robots zijn futuristisch).
1. Bouw de prompt via het gem-skelet + vaste negatief-blok uit
   [reference/prompt-recept.md](reference/prompt-recept.md); schrijf 'm naar
   `prompts/{beeld-id}-v{n}.txt`.
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
   stijlanker; **noteer de volledige prompt + job-id + Bert-akkoord in `LOGBOEK.md`.**

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
  maakt er altijd 1920×1080 JPG van (exact 16:9).
- Higgsfield-credits zijn eindig (2/beeld, gedeeld saldo) — bewaak het saldo en schakel
  desnoods naar de Gemini-fallback als de credits opraken.
