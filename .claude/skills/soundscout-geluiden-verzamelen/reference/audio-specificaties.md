# Audio-specificaties

## Technisch (afgedwongen door check-audio.py)

- **Formaat**: mp3, 128 kbps (mono of stereo), ~50-200 KB per bestand.
- **SFX**: 2-8 seconden. Korter dan 1s of langer dan 10s = afkeuren.
- **Muziekloops**: **exact 8.0 s** (tolerantie ±0.05s) = 4 maten @ 120 BPM, het vaste
  tempo van de app. Gebruik `verwerk-geluid.py --duur-exact 8.0`.
- **Bestandsnaam = sampleId**: `/audio/themes/{themeId}/{locationId}/{sampleId}.mp3`.
- `duration` in samples.ts = de door `check-audio.py` **gemeten** waarde (2 decimalen),
  nooit de geplande.
- Micro-fades (5-50 ms) tegen klikken aan begin/eind: `verwerk-geluid.py --fade 0.02`.

## Inhoudelijk

- Kindvriendelijk en duidelijk herkenbaar: het geluid moet in ~1 seconde "gelezen"
  kunnen worden door een kind (een hond is een hond).
- Mix per locatie: streef naar variatie — ritmisch / melodisch / sfeer / stem-achtig —
  zodat er echt mee te componeren valt. Minimaal 1-2 loops per thema
  (muziekwinkel-patroon) is goud waard voor composities.
- Sample-namen kort en concreet (i18n): "Touwtje springen", "Stoeltjeslift".

## Mixbare muziek-stems (één "band" per thema)

Om leerlingen muziek-loops uit verschillende locaties te laten combineren, moeten álle
muzikale loops **onderling mixbaar** zijn. Lock daarom voor het hele thema:
- **Tempo**: 120 BPM (app-vast), 4/4.
- **Eén toonsoort + één akkoordenschema** voor alle muziek (bv. D mineur, `Dm–C–Bb–A`,
  4 maten = 8,0 s = één loop).
- **Elke locatie = één instrument-rol (stem)**: bv. accordeon (melodie) · viool/whistle
  (lead) · bas+mandoline (fundament) · handtrommels (ritme, toon-neutraal) · marimba
  (sfeer). Sparse/solo prompts mixen veel beter dan volle arrangementen.
- Zo stapelt elke combinatie naadloos, en een **instrumentale praatplaat-mix** = gewoon
  alle stems samen.
- **Suno**: zet toonsoort + akkoorden + 120 BPM in elke prompt; Suno gehoorzaamt niet
  altijd exact en levert geen echte losse stems → hou het sparse, controleer achteraf op
  120 BPM (tempo/pitch corrigeren met ffmpeg indien nodig) en regenereer een botsende stem.

## Routes

**F — Freesound** (`zoek-geluid.py`)
- Zoek met `--licentie cc0` als default. `cc-by` mag, maar dan verplichte vermelding in
  BRONNEN.md (auteur + URL + licentie). NC/ND nooit.
- Previews zijn 128kbps hq-mp3 — kwalitatief prima voor SoundScout.
- Het script schrijft per download een `.json` met metadata; die verwerk je in BRONNEN.md.
- Geef Bert per kandidaat een luisterregel:
  `afplay ".thema-studio/{themeId}/kandidaten/audio/{sampleId}/{bestand}.mp3"`

**E — ElevenLabs** (`genereer-geluid.py`)
- Sterk voor: specifieke sfx die moeilijk te vinden zijn ("robot die verdrietig piept"),
  korte jingles, fantasy-geluiden. Zwakker voor: realistische muziekloops.
- Maximaal 2 pogingen per sample, daarna route F of C.

**C — Checklist** (Bert zelf / met de klas)
- Neem op in `zoektermen-checklist.md`: sampleId, doelbestandsnaam, gewenste duur/type,
  3-5 zoektermen (NL + EN), opname-tip.

## BRONNEN.md (verplicht in het pakket)

Elke rij: bestand · bron (Freesound-URL / "ElevenLabs (gegenereerd)" / "Eigen opname") ·
auteur · licentie. `check-pakket.py` weigert Freesound-audio zonder bronregel.

**Licentie & zichtbare credits:** CC0 vraagt géén vermelding; **CC-BY wél** (maker +
licentie + bronlink). Aanpak (bevestigd): **één centrale Colofon-/Credits-pagina voor de
hele app**, vindbaar via een link op de landingspagina (footer). Niet per thema en niet
tijdens het spelen — één vindbare pagina is voldoende voor CC-BY. Per geluid: naam · maker
· bronlink (Freesound) · licentie (met link naar de licentietekst). De pagina groeit per
thema aan en wordt **automatisch samengesteld uit alle `BRONNEN.md`-bestanden** (dev-
registratie blijft `BRONNEN.md`; check-pakket weigert Freesound-audio zonder bronregel).
CC0-geluiden en eigen/ElevenLabs-opnames hoeven niet vermeld. Alternatief om de
verplichting te vermijden: finale keuzes op **CC0** filteren (`--licentie cc0`) — kleinere
keuze.
