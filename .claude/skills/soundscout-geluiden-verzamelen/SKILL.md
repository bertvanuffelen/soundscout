---
name: soundscout-geluiden-verzamelen
description: >-
  Zoekt, genereert en produceert de geluiden voor SoundScout: doorzoekt Freesound op
  bruikbare samples (met licentiefilter), genereert geluidseffecten en robotstemmen via de
  Higgsfield CLI, bouwt een klikbare HTML-luisterpagina zodat Bert snel kan kiezen, en
  verwerkt het gekozen geluid naar de app-spec (mp3, sfx 2-8s, muziekloops exact 8.0s @ 120
  BPM) inclusief bronvermelding en licentieregistratie. Gebruik deze skill wanneer Bert
  geluiden nodig heeft — "zoek een geluid voor…", "geluiden bij dit thema", "genereer een
  sfx", "maak een robotstem", "loop van 8 seconden", "welke licentie heeft dit geluid" —
  los of als onderdeel van een compleet thema.
---

# SoundScout Geluiden-verzamelen

Jij zoekt en produceert de klank; Bert beslist wat goed klinkt.

**Twee ijzeren regels:**
1. **Jij hoort geen audio.** Je kunt geluid niet beoordelen — nooit doen alsof. Elke keuze
   loopt via Berts oren. Zorg dat luisteren hem één klik kost (zie de luisterpagina).
2. **Geen geluid het pakket in zonder bron + licentie.** Alles wat je downloadt krijgt zijn
   herkomst vastgelegd, meteen — achteraf reconstrueren lukt niet.

Specificaties (hard, afgedwongen door `check-audio.py`):
[reference/audio-specificaties.md](reference/audio-specificaties.md).
Keys en tooling: [reference/api-setup.md](reference/api-setup.md).

## Verwervingsroutes

Bepaal per geluid vooraf de route — dat scheelt zoekwerk:

| Route | Wanneer | Hoe |
|---|---|---|
| **F — Freesound** | alledaagse, opneembare geluiden **én dieren** (deur, ketting, water, hamer, gejuich, papegaai, aap) | zoeken + previews downloaden |
| **H — Higgsfield** | geluiden die **niet bestaan**: machines, magische effecten, abstracte sfeer | genereren uit een tekstprompt |
| **C — checklist** | **muziek** (Suno) en alles waar Bert zelf een bron voor heeft | opnemen in `zoektermen-checklist.md` met zoektermen, duur/type en doelbestandsnaam |
| **E — ElevenLabs** | alternatief voor H | alleen bruikbaar als `ELEVENLABS_API_KEY` gevuld is — **die is nu leeg** |

**Vuistregel F vs H**: bestaat het geluid in het echt → **zoeken**, ook als het een dier is.
Herkenbaarheid gaat vóór stijl: een kind moet in één seconde horen wát het is, en daar is
een echte opname beter in dan een gegenereerde. De robot-flavor komt er eventueel achteraf
overheen als licht effect — niet door het dier van de grond af te genereren. Bestaat het
geluid níét (machine, magie, abstracte sfeer) → genereren.
Onderbouwing en testresultaten: [reference/higgsfield-audio.md](reference/higgsfield-audio.md).

**Stemmen staan geparkeerd** (2026-08-01): TTS klinkt te verzorgd voor robotpiraten en
spreekt Nederlands met een Engels accent. Richting voor later: kreten, gemompel en grommen
in plaats van volzinnen. Niet zelf oppakken zonder Berts akkoord.

## Route F — Freesound

```bash
python3 scripts/zoek-geluid.py --query "…" --min-duur 2 --max-duur 8 \
  --licentie cc0 --top 5 --download-map kandidaten/audio/{sampleId}/
```
- **Zoek voor álle samples in één batch** — niet één voor één; dat is voor Bert veel
  efficiënter luisteren.
- Weinig treffers? Bredere/Engelse zoekterm + `--licentie alles-behalve-nc` (CC-BY is
  prima, mits vermeld). **NC en ND zijn uitgesloten** — de app is publiek toegankelijk.
- Bij elk gedownload bestand schrijft het script een licentie-JSON; die is de basis voor
  `BRONNEN.md`. Gooi die bestanden niet weg.

**Laten kiezen** (de plek waar Bert het werk doet — maak het klikbaar, niet talig):
```bash
python3 scripts/maak-audio-preview.py --map kandidaten/audio --titel "…" --open
```
Eén HTML-pagina met per sample een play-knop en keuzerondjes; Bert klikt "Kopieer mijn
keuzes" en plakt ze terug in de chat. Terminal-`afplay` is de fallback.

## Route H — Higgsfield (genereren)

Volledig recept, modellen en kosten: [reference/higgsfield-audio.md](reference/higgsfield-audio.md).
Geen API-key nodig — de CLI is ingelogd.

```bash
# geluidseffect (0,25 credit/sec, dus 4s = 1 credit)
python3 scripts/genereer-geluid-higgsfield.py \
  --prompt "A heavy wooden crane winch turning three times, creaking rope under load, clean and dry, no music, no reverb" \
  --duur 4 --out kandidaten/audio/{sampleId}/hf-v1.mp3 --manifest <manifest.json>

# stem — GEPARKEERD, alleen op Berts verzoek gebruiken
python3 scripts/genereer-geluid-higgsfield.py --modus stem --prompt "…" \
  --voice-id <id> --pitch 0.8 --tempo 0.9 --instructie "raspy robotic voice" --out …
python3 scripts/genereer-geluid-higgsfield.py --stemmen    # 57 stemmen met hun id
```

Drie dingen die het verschil maken in de prompt: **noem een aantal** ("turning three times"),
**beschrijf het materiaal en de beweging** ("heavy wooden", "creaking rope under load") en
**houd het droog** ("no music, no reverb"). Maximaal **2-3 pogingen** per geluid; lukt het
dan niet, schakel naar route F of C — dat is geen nederlaag maar de goedkoopste uitkomst.

## Route E — ElevenLabs (alternatief, nu niet bruikbaar)

```bash
python3 scripts/genereer-geluid.py --prompt "…" --duur … --out …
```
Werkt alleen met een gevulde `ELEVENLABS_API_KEY`; die is er nu niet, en de key kost geld.
**Gebruik route H** tenzij Bert expliciet ElevenLabs wil. Wil hij ElevenLabs-kwaliteit
zonder eigen key: `higgsfield generate create text2speech_v2 --variant elevenlabs …` loopt
via Higgsfield-credits (0,15 credit).

## Verwerken (altijd, ongeacht route)

```bash
python3 scripts/verwerk-geluid.py --in … --out … [--duur-exact 8.0] [--fade 0.02]
```
- **Muziekloops: exact 8.0 s** (= 4 maten @ 120 BPM, het vaste app-tempo). Korter materiaal
  wordt gelust, langer wordt getrimd.
- Micro-fades (5-50 ms) tegen klikken aan begin en eind.
- Normaliseren zodat samples onderling even hard klinken.

Afsluiten:
```bash
python3 scripts/check-audio.py --map <audio-map>
```
→ gebruik de **gemeten** durations (nooit de geplande) als je ze in code opneemt.

→ **Gate: Bert heeft alles gehoord en goedgekeurd.**

## Mixbare muziek per thema — route C (Suno)

**Muziek maakt Bert zelf in Suno**, niet met deze skill. Reden: loops uit verschillende
locaties moeten onderling mixbaar zijn, en dat vraagt controle over tempo, toonsoort en
akkoorden. Leg per thema vast: één tempo (120 BPM, 4/4), één toonsoort + akkoordenschema,
en per locatie één instrument-rol. Details in
[audio-specificaties.md](reference/audio-specificaties.md).

Jouw rol: de specificatie opschrijven in `zoektermen-checklist.md` en het aangeleverde
bestand door `verwerk-geluid.py --duur-exact 8.0` halen.

> Higgsfield kán muziek genereren (`sonilo_music`, 0,5 credit per 8s) — bewust niet
> ingebouwd. Noem het hooguit als Bert er zelf naar vraagt.

## Licenties & bronvermelding

- **CC0** — geen verplichting, toch vastleggen.
- **CC-BY** — vermelding verplicht: maker, titel, bron-URL, licentie.
- **NC / ND** — niet gebruiken.

Alles landt in `BRONNEN.md` naast de audio; die reist mee naar
`src/data/themes/{themeId}/BRONNEN.md` en voedt de colofon-pagina van de app.

## Bekende beperkingen (eerlijk benoemen)

- Je hoort niets — je kunt alleen op metadata, duur en beschrijving voorselecteren. Een
  gegenereerd geluid kan technisch perfect zijn (juiste duur, formaat, grootte) en toch
  nergens op lijken; `check-audio.py` bewijst de spec, nooit de klank.
- Freesound-previews zijn mp3 van wisselende kwaliteit; ruis of een lange stilte-aanloop
  zie je niet in de metadata.
- Genereren is sterk in korte sfx en stemmen, zwak in muziek — daarom blijft muziek Suno.
- `qwen_audio_tts` heeft **geen Nederlands** in zijn talenlijst; laat Bert de uitspraak
  beoordelen of gebruik `inworld_text_to_speech` (NL-stemmen, 2 credits).
- ElevenLabs (route E) is nu niet bruikbaar: de key is leeg.

## Onderdeel van een thema?

Werk je aan een compleet thema, gebruik dan **soundscout-thema-studio** — die bepaalt welke
samples er nodig zijn en roept deze skill aan voor de productie.
