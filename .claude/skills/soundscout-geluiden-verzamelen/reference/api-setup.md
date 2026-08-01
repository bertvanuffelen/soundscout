# API-setup (geluid)

## Genereren — Higgsfield CLI (geen key nodig)

De `higgsfield` CLI is op deze Mac geïnstalleerd en **al ingelogd**; audio genereren werkt
dus meteen. Modellen, kosten en recepten:
[higgsfield-audio.md](higgsfield-audio.md). Verifiëren:

```bash
python3 scripts/genereer-geluid-higgsfield.py --zelftest    # login + creditsaldo
python3 scripts/genereer-geluid-higgsfield.py --stemmen     # 57 beschikbare stemmen
```

Credits zijn **gedeeld met de beeld-skill**. Audio is verwaarloosbaar naast beeld: een sfx
van 4s kost 1 credit, een stem ~0,01, terwijl één afbeelding er 2 kost.

## Zoeken en genereren met keys

Deze scripts lezen keys via `scripts/_env.py`: eerst omgevingsvariabelen, anders
`~/.config/soundscout-thema-studio/.env` (chmod 600, **buiten de repo** — nooit in git
of in `.env.local`). Dat pad is gedeeld met de andere SoundScout-skills; laat het staan.

```bash
mkdir -p ~/.config/soundscout-thema-studio
cat > ~/.config/soundscout-thema-studio/.env <<'EOF'
FREESOUND_API_KEY=...
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=...   # optioneel, alleen voor de beeld-skill
EOF
chmod 600 ~/.config/soundscout-thema-studio/.env
```

1. **Freesound** (nodig voor route F) — account op https://freesound.org →
   https://freesound.org/apiv2/apply → token (direct beschikbaar). Het token volstaat voor
   zoeken + mp3-preview-downloads. Gratis. **Status: gevuld.**
2. **ElevenLabs** (optioneel) — https://elevenlabs.io → profiel → API key. Starter volstaat
   (~$0,12 per minuut gegenereerd geluid). **Status: leeg** — route E werkt dus niet, en dat
   is geen probleem: route H (Higgsfield) doet hetzelfde zonder key en zonder abonnement.

Controleer welke keys gevuld zijn zonder ze te tonen:
```bash
python3 - <<'PY'
import pathlib
for line in (pathlib.Path.home()/".config/soundscout-thema-studio/.env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        print(f"  {k:22} {'gevuld' if v.strip() else 'LEEG'}")
PY
```

## Sneltest

```bash
python3 scripts/genereer-geluid-higgsfield.py --zelftest   # Higgsfield: login + saldo
python3 scripts/zoek-geluid.py --query test --top 1        # Freesound: 1 zoekresultaat
python3 scripts/genereer-geluid.py --zelftest              # ElevenLabs (alleen met key)
```

## Benodigde tooling

`ffmpeg` en `ffprobe` moeten op het pad staan (verwerken + duur meten). Check:
`ffmpeg -version`. Ontbreekt het: `brew install ffmpeg`.
