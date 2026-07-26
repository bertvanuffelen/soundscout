---
name: soundscout-geluiden-verzamelen
description: >-
  Zoekt, genereert en produceert de geluiden voor SoundScout: doorzoekt Freesound op
  bruikbare samples (met licentiefilter), genereert sfx via ElevenLabs, bouwt een klikbare
  HTML-luisterpagina zodat Bert snel kan kiezen, en verwerkt het gekozen geluid naar de
  app-spec (mp3, sfx 2-8s, muziekloops exact 8.0s @ 120 BPM) inclusief bronvermelding en
  licentieregistratie. Gebruik deze skill wanneer Bert geluiden nodig heeft — "zoek een
  geluid voor…", "geluiden bij dit thema", "genereer een sfx", "loop van 8 seconden",
  "welke licentie heeft dit geluid" — los of als onderdeel van een compleet thema.
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

## Drie verwervingsroutes

Bepaal per geluid vooraf de route — dat scheelt zoekwerk:

| Route | Wanneer | Hoe |
|---|---|---|
| **F — Freesound** | alledaagse, opneembare geluiden (deur, meeuw, hamer, gejuich) | zoeken + previews downloaden |
| **E — ElevenLabs** | niet-bestaande of te specifieke geluiden (robotstem, magisch effect) | genereren uit een tekstprompt |
| **C — checklist** | muziek, complexe stems, of alles waar Bert zelf een bron voor heeft | opnemen in `zoektermen-checklist.md` met zoektermen, duur/type en doelbestandsnaam |

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

## Route E — ElevenLabs

```bash
python3 scripts/genereer-geluid.py --prompt "…" --duur … --out …
```
Bert luistert. Maximaal **2 pogingen** — lukt het dan niet, schakel naar route F of C in
plaats van door te blijven genereren.

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

## Mixbare muziek per thema

Wil Bert muziekloops uit verschillende locaties kunnen combineren, dan moeten ze onderling
mixbaar zijn: één tempo (120 BPM, 4/4), één toonsoort + akkoordenschema voor het hele thema,
en per locatie één instrument-rol. Details in
[audio-specificaties.md](reference/audio-specificaties.md).

## Licenties & bronvermelding

- **CC0** — geen verplichting, toch vastleggen.
- **CC-BY** — vermelding verplicht: maker, titel, bron-URL, licentie.
- **NC / ND** — niet gebruiken.

Alles landt in `BRONNEN.md` naast de audio; die reist mee naar
`src/data/themes/{themeId}/BRONNEN.md` en voedt de colofon-pagina van de app.

## Bekende beperkingen (eerlijk benoemen)

- Je hoort niets — je kunt alleen op metadata, duur en beschrijving voorselecteren.
- Freesound-previews zijn mp3 van wisselende kwaliteit; ruis of een lange stilte-aanloop
  zie je niet in de metadata.
- ElevenLabs is sterk in korte sfx, zwak in muziek.

## Onderdeel van een thema?

Werk je aan een compleet thema, gebruik dan **soundscout-thema-studio** — die bepaalt welke
samples er nodig zijn en roept deze skill aan voor de productie.
