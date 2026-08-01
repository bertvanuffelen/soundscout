# Higgsfield-audio (route H) — sfx en stem genereren

De Higgsfield CLI kan naast beeld ook **audio** genereren, met exact hetzelfde
create→wait→get-patroon. Geen API-key nodig: de CLI is op deze Mac ingelogd. Dat maakt dit
de **primaire generatieroute** — ElevenLabs (route E) vereist een key die er nu niet is.

Script: `scripts/genereer-geluid-higgsfield.py`. Output gaat **altijd** daarna door
`verwerk-geluid.py` (micro-fades + normalisatie) en dan langs Berts oren.

## Modellen en kosten

Gemeten met `higgsfield generate cost` (gratis op te vragen, genereert niets):

| Model | Waarvoor | Kosten |
|---|---|---|
| **`mirelo_text_to_audio`** | **sfx** — geluidseffect uit een tekstprompt | **0,25 cr/sec** (4s = 1 cr) |
| **`qwen_audio_tts`** | **stem** — spraak met pitch/tempo-controle, mp3-output | **~0,01 cr** |
| `text2speech_v2` | spraak via een andere engine (`--variant elevenlabs\|minimax\|seed_speech\|vibe_voice\|cozy_voice`) | 0,15 cr |
| `seed_audio` | spraak + **voice-cloning** via `--audio-references` | 0,1 cr |
| `inworld_text_to_speech` | spraak mét **Nederlandse stemmen**: Erik, Katrien, Lennart, Lore | 2 cr |
| `sonilo_music` | muziek | 0,0625 cr/sec (8s = 0,5 cr) |

Het script gebruikt de twee vetgedrukte modellen. De andere zijn direct via de CLI
bruikbaar als je ze nodig hebt (`higgsfield model get <model>` toont de parameters).

> **Muziek loopt niet via deze skill.** `sonilo_music` bestaat en is spotgoedkoop, maar Bert
> maakt de muziekloops in **Suno** — daar heeft hij controle over tempo, toonsoort en
> akkoorden, wat nodig is om loops onderling mixbaar te houden. Muziek = route C.

## Modus sfx

```bash
python3 scripts/genereer-geluid-higgsfield.py \
  --prompt "A mechanical robot parrot squawking twice, metallic servo whirr and small electronic chirps, clean and dry, no music, no reverb" \
  --duur 4 --out kandidaten/audio/{sampleId}/hf-v1.mp3 --manifest <manifest.json>
```

**Promptrecept** (Engels werkt het best):
1. **Wat + hoe vaak**: "squawking twice", "three heavy footsteps" — een aantal noemen
   voorkomt een onbruikbare brij.
2. **Mechanisch maken**: "metallic", "servo whirr", "clockwork", "electronic chirps" — dit
   is de huisstijltoets: **robotdieren, geen echte dieren**. Precies de reden om te
   genereren in plaats van te zoeken; Freesound levert echte dieren.
3. **Droog houden**: "clean and dry, no music, no reverb". Nagalm en muziekbedje maken een
   sample onbruikbaar naast andere samples in de timeline.
4. **Duur**: 2-8s conform de app-spec. Reken op iets meer dan gevraagd (4 gevraagd → 4,02s).

## Modus stem

```bash
python3 scripts/genereer-geluid-higgsfield.py --modus stem \
  --prompt "Aharr! Welkom aan boord, matroos!" \
  --voice-id <id> --pitch 0.8 --tempo 0.9 \
  --instructie "raspy robotic pirate voice, mechanical and gravelly" \
  --out kandidaten/audio/{sampleId}/hf-v1.mp3
```

`--stemmen` toont alle **57 preset-stemmen** met hun id.

**Robotstem-recept** — de knoppen die het werk doen:

| Knop | Effect |
|---|---|
| `--pitch` (`pitch_rate`, 1 = normaal) | **< 1** = lager en zwaarder (grote/logge robot) · **> 1** = hoger en kleiner (chibi-robotje zoals Pip) |
| `--tempo` (`speech_rate`, 1 = normaal) | < 1 = trager en bedachtzamer · > 1 = opgewonden |
| `--instructie` | stijlaanwijzing: "raspy robotic voice", "whispering", "creaky and old" |

Combineer met de cast: Bolt (groot, log) → lage pitch + traag; Pip (klein, energiek) →
hoge pitch + snel; Nova (dromerig) → normaal met een zachte instructie.

**Taalbeperking**: `qwen_audio_tts` ondersteunt officieel zh/en/fr/de/ja/ko/ru/pt/th/id/vi/it/ms
— **Nederlands staat er niet bij**. Nederlandse tekst wordt wel uitgesproken, maar laat Bert
altijd de uitspraak beoordelen. Moet het echt goed Nederlands zijn, gebruik dan
`inworld_text_to_speech` met Erik/Katrien/Lennart/Lore (2 credits, dus bewuster inzetten).

## Wanneer genereren en wanneer zoeken

| Kies | Waarvoor |
|---|---|
| **Zoeken (Freesound)** | alledaagse, opneembare geluiden: deuren, kettingen, water, gereedschap, gejuich |
| **Genereren (route H)** | **dieren en stemmen** — daar is Freesound onder CC0/CC-BY dun, én genereren levert meteen een *robot*versie die bij de huisstijl past |

## Kostenbewaking

- Saldo: `higgsfield account status`. **Gedeeld met de beeld-skill** — een beeld kost 2
  credits, dus audio is verwaarloosbaar naast beeldproductie.
- Reken vooraf door met `--cost-only`; dat kost niets.
- Meld Bert als het saldo onder ~30 credits zakt.
- **Onderbroken download = niet opnieuw genereren**: de job draait al en is betaald. Herstel
  via `higgsfield generate get <job_id>` (zie de gotchas in de beeld-skill — zelfde CLI).

## Harde beperking

**Claude kan het resultaat niet horen.** Een gegenereerd geluid kan technisch perfect zijn
(juiste duur, formaat, grootte) en toch nergens op lijken. `check-audio.py` bewijst alleen
de spec, nooit de klank. Elke generatie gaat via `maak-audio-preview.py` naar Bert voordat
het bestand de app in mag — dat is geen formaliteit maar de enige echte toets.
