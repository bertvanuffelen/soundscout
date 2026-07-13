# API-setup

## Beeld — PRIMAIR: Higgsfield CLI (geen key nodig)

De Higgsfield CLI (`higgsfield`, npm `@higgsfield/cli`) is op deze Mac geïnstalleerd en
**al ingelogd** (credentials in `~/.config/higgsfield/credentials.json`). Elke sessie is
meteen bruikbaar — geen API-key, geen login. Aliassen: `higgs`.

- Model: **`nano_banana_pro`** (Nano Banana Pro) — aspect ratios incl. **16:9**,
  resolutie **1k/2k/4k**, tot **14 image-references** (stijl- én karakterconsistentie).
  Dit is precies de consistentie-engine die we willen; de aparte Gemini-key is dus
  **niet nodig** om te starten.
- **Kosten: 2 credits per beeld.** Account: basic plan met gedeelde credits.
  Check saldo: `higgsfield account status`. **150 credits ≈ 75 generaties ≈ ruwweg
  één compleet thema** (begroot ~50 generaties = 100 credits). Meld Bert bij ~2× budget
  of als het saldo onder ~30 zakt.
- De skill roept dit aan via `scripts/genereer-afbeelding-higgsfield.py` (wrapper om de
  CLI: create → wait → download + manifest-log). Style-refs/edit-bronnen zijn lokale
  paden; de CLI uploadt ze automatisch.

Verifiëren:
```bash
higgsfield account status                                    # bvanuffelen@… — basic plan, N credits
python3 scripts/genereer-afbeelding-higgsfield.py --zelftest # zelfde, via de wrapper
python3 scripts/genereer-afbeelding-higgsfield.py --cost-only --prompt "test"  # 2 credits, genereert niet
```
Bij "Not authenticated": `higgsfield auth login` (opent browser, alleen als token verlopen is).

## Beeld — FALLBACK: Gemini API (optioneel)

Alleen nodig als je Higgsfield-credits wilt sparen of de CLI onbereikbaar is. Zelfde
model (Nano Banana Pro), betaald per beeld i.p.v. per credit.
- https://aistudio.google.com → "Get API key" → project kiezen/aanmaken → key kopiëren.
- Billing activeren voor `gemini-3-pro-image` (~$0,13-0,24/beeld op 2K/4K);
  `gemini-2.5-flash-image` (~$0,04) mag voor drafts.
- Key in `~/.config/soundscout-thema-studio/.env` als `GEMINI_API_KEY`.
- Script: `scripts/genereer-afbeelding.py` (zelfde interface, `--style-ref` i.p.v.
  `--image-reference`).

## Geluid-keys

Alle geluid-scripts lezen keys via `scripts/_env.py`: eerst omgevingsvariabelen, anders
`~/.config/soundscout-thema-studio/.env` (chmod 600, **buiten de repo** — nooit in git
of in `.env.local`).

```bash
mkdir -p ~/.config/soundscout-thema-studio
cat > ~/.config/soundscout-thema-studio/.env <<'EOF'
FREESOUND_API_KEY=...
ELEVENLABS_API_KEY=...
GEMINI_API_KEY=...   # optioneel (beeld-fallback)
EOF
chmod 600 ~/.config/soundscout-thema-studio/.env
```

1. **Freesound** — account op https://freesound.org → https://freesound.org/apiv2/apply
   → token (direct). Token volstaat voor zoeken + mp3-preview-downloads.
2. **ElevenLabs** — https://elevenlabs.io → profiel → API key. Starter volstaat ruim
   (~$0,12 per minuut gegenereerd geluid).

## Kosteninschatting per thema

- **Beeld (Higgsfield)**: ~50 generaties × 2 credits = **~100 credits** (van de 150).
  Eén thema past; voor meer thema's het plan bijladen.
- **Beeld (Gemini-fallback)**: ~50 generaties → $7-12 (pro) of $2-5 (met flash-drafts).
- **Geluid**: ElevenLabs ~30 sfx ≈ $0,30-0,50 · Freesound gratis.

## Sneltest

```bash
python3 scripts/genereer-afbeelding-higgsfield.py --zelftest   # Higgsfield: login + saldo
python3 scripts/zoek-geluid.py --query test --top 1            # Freesound: 1 zoekresultaat
python3 scripts/genereer-geluid.py --zelftest                  # ElevenLabs: key-check (geen credits)
python3 scripts/genereer-afbeelding.py --zelftest              # Gemini-fallback (alleen als key gezet)
```
