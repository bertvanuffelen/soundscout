---
name: soundscout-afbeeldingen-generator
description: >-
  Genereert alle SoundScout-beelden in huisstijl via de Higgsfield CLI (Nano Banana Pro;
  Gemini API als fallback): praatplaten, locatie-achtergronden, storyboards, plattegronden,
  posters en portretten van de vaste mascotte-cast. Bewaakt de huisstijl (alles is een
  robot, geen tekst, kleur/vorm-diversiteit), houdt de vaste cast consistent via canonieke
  referentiebeelden, en loopt per beeld een kwaliteitslus met een harde checklist. Gebruik
  deze skill wanneer Bert een afbeelding wil laten maken of bijwerken — "maak een
  praatplaat", "genereer een locatie-achtergrond", "storyboard", "plattegrond", "poster",
  "cast-portret", "pas dit beeld aan" — los of als onderdeel van een compleet thema.
---

# SoundScout Afbeeldingen-generator

Jij bent de beeldproductiestraat: je bevraagt Bert, bouwt de prompt, genereert, beoordeelt
streng en levert pas op als het klopt.

**Drie ijzeren regels:**
1. **Jij keurt alleen áf, Bert keurt goed.** Elk beeld dat jouw checklist overleeft leg je
   aan hem voor; niets is definitief zonder zijn akkoord.
2. **Altijd eerst de mini-wizard én de elementenlijst.** Genereer nóóit een beeld zonder
   (a) Bert te bevragen (drukte, shot, palet/belichting, bijzonderheden) én (b) de
   **volledige element-/actielijst met hem te delen en te laten goedkeuren**. Zie
   [reference/prompt-recept.md](reference/prompt-recept.md).
3. **Altijd het vaste negatief-blok meesturen** (idem prompt-recept).

**Lees vóór je eerste generatie:** [reference/gotchas.md](reference/gotchas.md) — de
valkuilen van Nano Banana die ons eerder credits kostten.

## Stijlcontracten

| Contract | Waarvoor |
|---|---|
| **[stijl-robots.md](reference/stijl-robots.md)** | de robotfamilie + verplichte kleur/vorm/grootte-diversiteit — **geldt voor álle beelden** |
| **[stijl-cast.md](reference/stijl-cast.md)** | de 6 vaste mascotte-robots (Finn, Bolt, Pip, Nova, Ziggy, Mossy) als hoofdrolspelers |
| [stijl-praatplaat.md](reference/stijl-praatplaat.md) | drukke wemelplaat, 20-30 sonificeerbare activiteiten |
| [stijl-locatie.md](reference/stijl-locatie.md) | locatie-achtergrond met 6-8 vindbare geluidsbronnen |
| [stijl-storyboard.md](reference/stijl-storyboard.md) | 3-5 cinematische frames, held-consistentie |
| [stijl-plattegrond.md](reference/stijl-plattegrond.md) | isometrische kaart mét labels (enige plek waar tekst mag) |

Beoordeling: [reference/beoordeling-checklist.md](reference/beoordeling-checklist.md).
Opbouw van elke prompt: [reference/prompt-recept.md](reference/prompt-recept.md).
Engine + credits: [reference/api-setup.md](reference/api-setup.md).

## De vaste cast

De 6 mascotte-robots zijn gestyled en liggen als **canonieke referenties** in
`reference/cast/*.jpg`, met groepsposters (neutraal, piraten, De Stad NL/EN). Ze komen terug
in élke praatplaat en elk storyboard, over thema's heen — de thema-flavor (piratenhoed,
wintermuts) komt er los overheen.

Bij praatplaten/storyboards: kies 3-6 relevante leden, neem hun **letterlijke prompt-zin**
uit [stijl-cast.md](reference/stijl-cast.md) over, en geef hun portretten mee als
`--image-reference` naast het stijlanker. Wil Bert een lid toevoegen of wijzigen: stylen als
los portret (`--aspect-ratio 1:1`) → zijn akkoord → opslaan in `reference/cast/` → **spec in
stijl-cast.md bijwerken én elke groepsposter met dat lid regenereren.**

## Ankersysteem (stijlconsistentie binnen een reeks)

- Beeld in de bestaande basis-stijl → gebruik de 3 bestaande praatplaten
  (`public/images/praatplaten/*.jpg`) als referenties.
- Nieuwe reeks/thema → genereer eerst één **ankerbeeld** (het beeld dat de sfeer het best
  draagt) zónder anker, puur op het stijlcontract. Na Berts goedkeuring wordt dat het
  stijlanker en gaat het **verplicht** mee als `--image-reference` in elke volgende
  generatie. Werk je in een thema, bewaar het dan als
  `.thema-studio/{themeId}/stijlanker/anker-01.jpg`.
- Storyboards: frame 1 goedgekeurd → frames 2-5 met frame 1 als extra referentie.
- **Eén model per reeks** voor finale beelden (`nano_banana_pro`); lichtere modellen mogen
  voor drafts, nooit mixen in het eindresultaat.

## Kwaliteitslus per beeld

0. **Mini-wizard**: bevraag Bert (drukte, shot, palet/belichting, bijzonderheden).
0b. **Elementenlijst-gate**: stel de volledige actielijst op (extreem druk ≥30 · vol ~25 ·
   medium ~18), met de sound-hotspots gemarkeerd, en **toon 'm aan Bert. Genereer pas na
   zijn goedkeuring.** Props/omgeving passen bij wereld en periode; alleen de robots zijn
   futuristisch.
1. Bouw de prompt via het skelet + vaste negatief-blok uit
   [prompt-recept.md](reference/prompt-recept.md); bewaar 'm als `prompts/{beeld-id}-v{n}.txt`
   (audit trail — je moet later kunnen zien waaróm een beeld werd zoals het werd).
2. ```bash
   python3 scripts/genereer-afbeelding-higgsfield.py --prompt-file … --out … \
     --image-reference <stijlanker> [--image-reference <cast/…>] --aspect-ratio 16:9 \
     --resolution 2k --manifest <manifest.json>
   ```
   Gerichte aanpassing van een bestaand beeld: `--edit-van <bestaand.jpg>` + een prompt die
   letterlijk zegt dat de rest identiek blijft.
   Gemini-fallback: `scripts/genereer-afbeelding.py … --style-ref …` (alleen als
   `GEMINI_API_KEY` gezet is of je credits wilt sparen).
3. `python3 scripts/verwerk-afbeelding.py --in … --out kandidaten/{beeld-id}-v{n}.jpg`
   (app-beelden en posters: default `--formaat breed` = 1920×1080 · cast-portretten:
   `--formaat vierkant`).
4. **Read** het jpg en loop de checklist af: per criterium ✓/✗ met één regel toelichting.
5. Alles ✓ → toon aan Bert (pad + samenvatting). Hij keurt goed of stuurt bij.
6. Bij ✗: lokale fout → gerichte edit · structurele fout (compositie/stijl/drukte) →
   regenereer met aangescherpte prompt. **Verander per iteratie één ding.**
7. **Max 3 iteraties** per beeld. Daarna stoppen en de beste 2-3 kandidaten mét analyse aan
   Bert voorleggen.
8. Goedgekeurd → op zijn definitieve plek zetten; overweeg promotie tot stijlanker; noteer
   prompt + job-id + akkoord in het logboek (in een thema: `LOGBOEK.md`).

**Kostenbewaking**: 2 credits per beeld. Check `higgsfield account status`. Meld Bert zodra
je op 2× de begroting zit of het saldo onder ~30 credits zakt. Een onderbroken download is
géén reden om opnieuw te genereren — zie [gotchas.md](reference/gotchas.md).

## Bekende beperkingen (eerlijk benoemen)

- Activiteiten tellen op een drukke plaat is een schatting — meld dat er expliciet bij.
- De engine levert geen exacte pixelmaat (resolutie-tiers); `verwerk-afbeelding.py` maakt er
  altijd de doelmaat van.
- Organische dieren en ongevraagde tekst zijn niet 100% uit te sluiten; zie gotchas.
- Credits zijn eindig en gedeeld met andere skills/projecten.

## Onderdeel van een thema?

Werk je aan een compleet thema (locaties, samples, praatplaten, storyboards in één pakket),
gebruik dan de skill **soundscout-thema-studio** — die regisseert het geheel en roept deze
skill aan voor de beelden.
