# API-setup (geluid)

Alle scripts lezen keys via `scripts/_env.py`: eerst omgevingsvariabelen, anders
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

1. **Freesound** — account op https://freesound.org → https://freesound.org/apiv2/apply
   → token (direct beschikbaar). Het token volstaat voor zoeken + mp3-preview-downloads.
   Gratis.
2. **ElevenLabs** — https://elevenlabs.io → profiel → API key. Starter volstaat ruim
   (~$0,12 per minuut gegenereerd geluid; ~30 sfx ≈ $0,30-0,50).

## Sneltest

```bash
python3 scripts/zoek-geluid.py --query test --top 1   # Freesound: 1 zoekresultaat
python3 scripts/genereer-geluid.py --zelftest         # ElevenLabs: key-check (geen credits)
```

## Benodigde tooling

`ffmpeg` en `ffprobe` moeten op het pad staan (verwerken + duur meten). Check:
`ffmpeg -version`. Ontbreekt het: `brew install ffmpeg`.
