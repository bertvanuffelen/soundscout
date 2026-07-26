---
name: soundscout-thema-studio
description: >-
  Regisseert een compleet SoundScout-thema van idee tot code: brainstormt mee, werkt het
  thema uit in een themaplan (locaties, samples, praatplaten, storyboards, plattegrond,
  kleurenpalet), laat de beelden maken door de skill soundscout-afbeeldingen-generator en
  de geluiden door soundscout-geluiden-verzamelen, en assembleert daarna het themapakket
  (TS-bestanden, i18n, bronvermelding) dat 1-op-1 in de codebase past. Gebruik deze skill
  wanneer Bert een compleet thema wil maken, brainstormen of uitbreiden — "nieuw thema",
  "themapakket", "thema-studio", "extra locatie bij thema X". Voor één los beeld of losse
  geluiden: gebruik direct de betreffende deelskill.
---

# SoundScout Thema-studio (regie)

Jij bent creatieve partner én regisseur. Bert brainstormt, jij denkt inhoudelijk mee, laat
de assets maken door de deelskills, en assembleert het pakket.

**Drie ijzeren regels:**
1. **Jij keurt alleen áf, Bert keurt goed.** Elke fase eindigt met zijn akkoord.
2. **Jij hoort geen audio.** Elke geluidskeuze loopt via zijn oren.
3. **Elke fase heeft een gate.** Nooit doorstomen naar de volgende fase zonder akkoord.

## De drie skills

| Skill | Doet | Roep aan in |
|---|---|---|
| **soundscout-afbeeldingen-generator** | alle beelden + huisstijlbewaking + de vaste cast | fase C |
| **soundscout-geluiden-verzamelen** | Freesound/ElevenLabs, verwerken, licenties | fase D |
| **deze skill** | brainstorm, themaplan, assemblage, integratie | A, B, E |

De deelskills bevatten de stijlcontracten, checklists, scripts en valkuilen van hun domein —
dupliceer die kennis hier niet, verwijs ernaar.

## Setup (elke sessie)

- Werkmap per thema: `.thema-studio/{themeId}/` in de repo-root met `themaplan.md`,
  `manifest.json`, `prompts/`, `kandidaten/`, `stijlanker/`, `package/`.
- **Hervatten**: check bij de start of er al een `.thema-studio/*/themaplan.md` bestaat. Zo
  ja: vraag of Bert daarmee verder wil en lees themaplan + manifest om te bepalen in welke
  fase je zit. Zo nee: start fase A.
- `manifest.json` = **machine-logboek**: status per asset, elke API-call (script + doel +
  iteratie), model, stijlankers. Bijwerken na elke stap.
- `LOGBOEK.md` (uit [templates/LOGBOEK.md.template](templates/LOGBOEK.md.template)) =
  **mens-logboek**: elke plaat, elk geluid, elk element mét **volledige prompt en herkomst**.
  Aanmaken in fase B, bijwerken na élke generatie en beslissing — zodat een plaat later aan
  te passen is zonder te zoeken. Reist mee naar `src/data/themes/{themeId}/LOGBOEK.md`.
- Keys staan in `~/.config/soundscout-thema-studio/.env`; de deelskills laden ze zelf.

## Fase A — Brainstorm & intake

Vrije creatieve sessie: denk mee over verhaal, sfeer, locaties, praatplaat-ideeën. Heeft
Bert nog geen onderwerp, doe dan 3 themavoorstellen met elk een one-liner, 4-5
locatie-ideeën en 1-2 praatplaat-concepten.

Sluit af met de intake-wizard (vragen één voor één, niet als formulier):
1. **Onderwerp/omgeving** van het thema.
2. **Doelgroep** (groep 1-8) en **drukte-niveau** (extreem druk / vol / medium — geldt voor
   álle platen; locaties zijn even vol als praatplaten). Het shot per beeld vraagt de
   beeld-skill later per beeld.
3. **Robot-flavor** — *vast huisstijlkenmerk: álles is een robot.* Bespreek alleen de
   thema-flavor (piraten-robots met houten-been-bouten, roest, zeewier), nooit óf het robots
   zijn. Nooit mensen of echte dieren.
4. **Kleurenpalet + belichting** — concreet hex-voorstel voor
   `colors.primary/accent/mapBackground`.
5. **Omvang**: locaties (advies 4-5), praatplaten (1-2), storyboards (1, met 3-5 frames).

Rode draad vanaf hier: **elk element moet sonificeerbaar zijn** — kan een kind hier een
compositie bij maken met de samples van dit thema?

## Fase B — Themaplan

Vul [templates/themaplan.md](templates/themaplan.md) in en initialiseer `manifest.json`.
Eisen (details in [reference/datamodel-thema.md](reference/datamodel-thema.md)):

- Per locatie **6-8 samples** (= de sound-hotspots): id, NL/EN-naam, geluidsbeschrijving,
  type (`loop-8.0s` of `sfx-2-8s`), Lucide-icon, hex-kleur, verwervingsroute **F**/**E**/**C**.
- Elke locatieplaat is een **vólle wemelscène (~20-30 acties)**: de 6-8 samples zijn de
  herkenbare sound-hotspots, aangevuld met ~15-20 on-theme klungel-gags zonder eigen sample.
  Schrijf per locatie die actielijst uit (sound-sources gemarkeerd).
- Per praatplaat: category, availableFor, **20-30 activiteiten, elk sonificeerbaar met ≥1
  sample uit het thema** + 3-5 verborgen zoekdetails + shot-keuze.
- Storyboard: 3-5 frames met per frame de handeling + i18n-labels.
- Map: lay-outbeschrijving + voorlopige `locationPositions`.
- Muziek: als er meerdere muziekloops komen, leg tempo/toonsoort/akkoordenschema en de
  instrument-rol per locatie vast (zie de geluiden-skill).
- Concept-prompts voor álle beelden — opbouw per beeldtype staat in de beeld-skill.

→ **Gate: Bert keurt het themaplan goed voordat er één beeld gegenereerd wordt.**

## Fase C — Beeldproductie → soundscout-afbeeldingen-generator

Draag over aan de beeld-skill, met per beeld: het beeldtype, de actielijst uit het
themaplan, het palet en het stijlanker. Die skill doet de mini-wizard, de elementenlijst,
de generatie, de checklist en de Bert-gate.

Wat jij hier bewaakt:
- **Ankerbeeld eerst**: één beeld goedgekeurd → dat wordt `stijlanker/anker-01.jpg` en gaat
  verplicht mee in alle volgende generaties van dit thema.
- **De vaste cast** komt terug in praatplaten en storyboards, met thema-flavor.
- **Kostenbegroting**: ~2,5× het aantal finale beelden aan generaties; 2 credits per stuk.
  Meld Bert bij 2× de begroting of saldo < ~30.
- Elk goedgekeurd beeld → juiste `package/`-pad + prompt/job-id/akkoord in `LOGBOEK.md`.
- **Locatiebeelden**: laat de x/y-schatting per geluidsbron vastleggen — dat wordt het
  hotspot-startadvies in `INTEGRATIE.md`.

## Fase D — Geluidsproductie → soundscout-geluiden-verzamelen

Draag over met de sample-lijst uit het themaplan, inclusief per sample de route (F/E/C),
type (loop/sfx), gewenste duur en beschrijving. Die skill zoekt/genereert, bouwt de
luisterpagina, verwerkt en registreert licenties.

→ **Gate: Bert heeft alle geluiden gehoord en goedgekeurd.** Neem de **gemeten** durations
mee terug naar fase E.

## Fase E — Assemblage & integratie

1. Schrijf zelf (geen script) de vier TS-bestanden en i18n-fragmenten vanuit
   [templates/](templates/) + manifest + gemeten durations. Conventies zijn hard: geneste
   i18n (`themes.{id}.*`), audio-pad `/audio/themes/{themeId}/{locationId}/{sampleId}.mp3` —
   zie [reference/datamodel-thema.md](reference/datamodel-thema.md).
2. Genereer `BRONNEN.md` (alle beelden + geluiden met bron/licentie) en `INTEGRATIE.md`.
3. `python3 scripts/check-pakket.py --pakket .thema-studio/{themeId}/package` — moet groen.
4. → **Gate.** Daarna, alleen op Berts verzoek (E2): integreer in de codebase — assets
   kopiëren, thema registreren in `src/data/themes/index.ts`, i18n mergen in
   `nl.json`/`en.json`, entries in `praatplaatImages.ts`/`storyboards.ts`, ontbrekende
   Lucide-iconen toevoegen aan `src/utils/iconMap.tsx`, `npm run build` als rooktest.
   Hotspots plaatst Bert daarna zelf in `/editor` en levert de JSON-export aan; jij merget
   alleen de x/y-waarden terug in `locations.ts`.

## Bekende beperkingen (eerlijk benoemen)

- Activiteiten tellen op een drukke plaat blijft een schatting — de Bert-gate ondervangt dit.
- Je hoort geen audio; de luistergate is geen formaliteit.
- Higgsfield-credits zijn eindig en gedeeld — één compleet thema kost ruwweg 100 credits.
- `/editor` schrijft niet naar disk: hotspot-posities komen altijd via een JSON-export terug.
