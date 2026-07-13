# API-setup

## Keys-bestand

Alle scripts lezen keys via `scripts/_env.py`: eerst echte omgevingsvariabelen, anders
`~/.config/soundscout-thema-studio/.env` (chmod 600, **buiten de repo** — nooit keys in
git of in `.env.local`).

```bash
mkdir -p ~/.config/soundscout-thema-studio
cat > ~/.config/soundscout-thema-studio/.env <<'EOF'
GEMINI_API_KEY=...
FREESOUND_API_KEY=...
ELEVENLABS_API_KEY=...
HF_API_KEY=...
HF_API_SECRET=...
EOF
chmod 600 ~/.config/soundscout-thema-studio/.env
```

## Keys aanmaken

1. **Gemini (primair — dé consistentie-engine, enige met stijlreferentie-input)**
   - https://aistudio.google.com → "Get API key" → project kiezen/aanmaken → key kopiëren.
   - Billing activeren voor `gemini-3-pro-image` (Nano Banana Pro).
   - Modeladvies: `gemini-3-pro-image` voor ankers en finale beelden (~$0,13-0,24/beeld
     op 2K/4K); `gemini-2.5-flash-image` (~$0,04) mag voor snelle drafts. Binnen één
     thema nooit modellen mixen voor finale beelden.
2. **Freesound** — account op https://freesound.org → https://freesound.org/apiv2/apply
   → token (direct beschikbaar). Token volstaat voor zoeken + mp3-preview-downloads.
3. **ElevenLabs** — https://elevenlabs.io → profiel → API key. Starter-abonnement
   volstaat ruim (~$0,12 per minuut gegenereerd geluid).
4. **Higgsfield (optioneel, secundair)** — https://cloud.higgsfield.ai → API-sectie →
   key + secret. Geen stijlreferentie-input; alleen als tweede mening.

## Kosteninschatting per thema

~20 finale beelden × gemiddeld 2,5 pogingen ≈ 50 generaties → Gemini pro-image $7-12
(met flash-drafts $2-5) · ElevenLabs ~30 sfx ≈ $0,30-0,50 · Freesound gratis.
**Totaal ruwweg $5-15 per thema.** Begroot in fase B; meld Bert bij 2× budget.

## Sneltest per key

```bash
python3 scripts/genereer-afbeelding.py --zelftest        # Gemini: mini-generatie 1:1
python3 scripts/zoek-geluid.py --query test --top 1      # Freesound: 1 zoekresultaat
python3 scripts/genereer-geluid.py --zelftest            # ElevenLabs: key-check (geen credits)
```
