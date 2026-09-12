# Mixbare muziekstems met Suno (route C — generiek recept)

Muziek maakt Bert in **Suno**; deze skill levert het contract, de prompts en de
verwerking. Alles hier is thema-onafhankelijk. Het uitgewerkte voorbeeld (piraten) staat
in de thema-studio onder `reference/voorbeeld-piraten.md` — leen de redenering, niet de
keuzes.

## Waarom een contract

Leerlingen stapelen loops uit verschillende locaties op één tijdlijn. Dat klinkt alleen
goed als élke loop dezelfde afspraken deelt. Leg daarom per thema vast, **vóór de eerste
Suno-prompt**:

| | Regel | Waarom |
|---|---|---|
| Tempo | **120 BPM**, 4/4 — vast (`DEFAULT_BPM` in `src/constants/config.ts`, niet wijzigbaar) | de app rekent ermee; 4 maten = exact 8,000 s |
| Toonsoort | één per thema, mineur werkt het best voor sfeer | loops uit verschillende locaties botsen anders |
| Harmonie | één statische vamp (bv. i–v, twee maten elk) | zie "Suno negeert akkoordenschema's" hieronder |
| Bezetting | **één instrumentrol per loop**, sparse | een volle mix laat niets meer overheen passen |
| Register | elke rol een eigen frequentiegebied (bas laag · koper laag-midden · akkoorden midden · melodie hoog · percussie breedband) | stapelen blijft helder |
| Altijd | instrumentaal, geen fade in/uit, naadloos loopbaar | |

### Eén tempo, drie feels

Bert wilde loom én energiek op hetzelfde thema. Dat kan op één raster, want *feel* en
*tempo* zijn twee dingen:

| Feel | Klinkt als | Genre-voorbeeld |
|---|---|---|
| half-time | ~60 BPM, loom | reggae, dub |
| straight | 120 BPM, verend | calypso, ska |
| double-time | ~240 BPM, druk | soca, snelle ska, filmische zeeslag |

Alle drie delen de maatstreep, dus ze stapelen. Bouw eerst één feel compleet, dan pas de
volgende.

## Wat Suno wel en niet doet (getoetst)

- **Suno negeert opgegeven akkoordenschema's.** `Dm - C - Bb - F` in de prompt zetten deed
  niets; de groove kwam op een eigen vamp uit. **Werkwijze**: laat Bert de eerste groove
  naspelen en noteer wat Suno *werkelijk* deed — dát wordt het contract. Theorie is
  achtergrond, het materiaal is de waarheid.
- **Wat wél stuurt**: alleen de toonsoort noemen + "modal and static around one tonal
  centre, no chord changes". Hoe minder harmonische beweging een partij heeft, hoe kleiner
  de kans op botsing. Voor de **bas** werkt een simpele grondtoonverplaatsing ("stays on a
  low F for two bars, then moves to C") vaker wél dan een akkoordschema.
- **Upload-route (v5+)**: upload de basisgroove en laat Suno er een laag overheen maken
  (Cover / Remix / audio-upload). De nieuwe partij volgt dan de bestaande harmonie **op
  gehoor**. Dit is de betrouwbaarste weg voor alles met toonhoogte.
- **Toon-neutrale partijen** (percussie, bassdrum, shakers) passen altijd — die kun je
  zorgeloos los genereren.
- **Genre eerst, sfeer tweede, instrumenten derde** in de prompt; BPM als **getal**;
  `seamless loop`, `no fade in or out`; **noem geen game of componist** (slechter
  resultaat én onnodig).
- **Gebruik het `Exclude`-veld**, niet "no drums" in de stijltekst. Exclude vangt ook
  achtergrondgeneurie en meegesmokkelde partijen die een negatieve stijltag mist.
- **`DRY` / minimal reverb** in élke prompt: galm maakt de lusnaad hoorbaar en de
  stapeling modderig. Filmische percussie komt standaard in een badkuip — vraag expliciet
  om droog.
- **Wordless koor** (het enige met stemmen): Instrumental UIT, style-veld vraagt "wordless
  vocals, open vowels, no words", en in het **lyrics-veld alleen klinkers**
  (`Ooooh ooooh / Aaaah`). Suno verzint anders tekst; klinkt het als taal → opnieuw, of
  nóg simpeler klinkers.
- **Sparse houden.** Vraag je een compleet nummer, dan krijg je een muur. Eén rol per loop,
  "no accompaniment of any kind".

## Promptskelet (kopieer en vul in)

```
<genre>, <sfeer>, 120 BPM with a <half-time | driving double-time> feel.
<één instrument(groep)> playing <patroon>, in <toonsoort>, modal and static around one
tonal centre, no chord changes.
<instrument> only, nothing else at all. Dry and close-miked, minimal reverb.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, <alles wat hier NIET in mag>
```

Minimale set voor een thema: **fundament** (bas + drums) · **akkoorden** (skank/strum) ·
**melodie** · **sfeer** (pad/fluit) · **percussie** (toon-neutraal). Daarna per locatie een
eigen kleur.

## Aanleveren en verwerken

1. Bert levert de Suno-downloads (mp3/wav).
2. Zoek een schone lus van 4 maten. Meet die *T* seconden: werkelijk tempo = `960 / T`.
3. Wijkt Suno af van 120: `verwerk-geluid.py --duur-exact 8.0 --naar-tempo T` rekt met
   behoud van toonhoogte (ffmpeg `atempo`). Kleine correcties (<2%) zijn onhoorbaar; grote
   smeren transiënten uit — dan liever opnieuw genereren.
4. `--normaliseer --fade 0.02` zodat alle loops even hard klinken en niet klikken.
5. `check-audio.py`: mp3, exact 8,0 s, 50-200 KB.

**De echte toets**: twee loops over elkaar in de studio. Klinkt de stapeling strak op de
maat en botst de harmonie niet, dan klopt het contract. Claude hoort niets — dit oordeel is
van Bert.

## Valkuil

Ik (Claude) verloor ooit een uur aan het meten van tempo-drift met een klikdetector die
zijn eigen artefacten mat (mp3-padding bij het aan elkaar plakken, uitgesmeerde
transiënten na `atempo`). Les: **`ffprobe`-duur exact 8,000 s + toonhoogte onveranderd is
het bewijs**; ga niet zelf tellen. En: Suno moet gewoon iets op 120 BPM maken — bouw geen
meetopstelling vóórdat er een probleem is.
