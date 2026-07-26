# API-setup (beeld)

## PRIMAIR: Higgsfield CLI (geen key nodig)

De Higgsfield CLI (`higgsfield`, npm `@higgsfield/cli`) is op deze Mac geïnstalleerd en
**al ingelogd** (credentials in `~/.config/higgsfield/credentials.json`). Elke sessie is
meteen bruikbaar — geen API-key, geen login. Alias: `higgs`.

- Model: **`nano_banana_pro`** (Nano Banana Pro) — aspect ratios incl. **16:9** en **1:1**,
  resolutie **1k/2k/4k**, tot **14 image-references** (stijl- én karakterconsistentie).
  Dit is de consistentie-engine waar alles op leunt.
- **Kosten: 2 credits per beeld.** Account: basic plan met gedeelde credits.
  Check saldo: `higgsfield account status`. **150 credits ≈ 75 generaties ≈ ruwweg
  één compleet thema** (begroot ~50 generaties = 100 credits). Meld Bert bij ~2× budget
  of als het saldo onder ~30 zakt.
- De skill roept dit aan via `scripts/genereer-afbeelding-higgsfield.py` (wrapper om de
  CLI: create → wait → download + manifest-log). Referenties en edit-bronnen zijn lokale
  paden; de CLI uploadt ze automatisch.

Verifiëren:
```bash
higgsfield account status                                    # bvanuffelen@… — basic plan, N credits
python3 scripts/genereer-afbeelding-higgsfield.py --zelftest # zelfde, via de wrapper
python3 scripts/genereer-afbeelding-higgsfield.py --cost-only --prompt "test"  # 2 credits, genereert niet
```
Bij "Not authenticated": `higgsfield auth login` (opent browser, alleen als token verlopen is).

### Herstel bij onderbroken generatie (geen dubbele credits!)

Als een generatie een job aanmaakt (2 credits weg) maar de download/afhandeling hapert,
genereer dan **niet opnieuw** — de job draait al. Herstel 'm:
```bash
higgsfield generate list --json | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])"  # nieuwste job-id
higgsfield generate wait <job_id> --timeout 8m
higgsfield generate get <job_id> --json   # lees result_url → download met curl → verwerk-afbeelding.py
```
`generate create --json` geeft de job-id terug als JSON-string, soms als `["<id>"]` of dict;
de wrapper vangt alle vormen af.

## FALLBACK: Gemini API (optioneel)

Alleen nodig als je Higgsfield-credits wilt sparen of de CLI onbereikbaar is. Zelfde
model (Nano Banana Pro), betaald per beeld i.p.v. per credit.
- https://aistudio.google.com → "Get API key" → project kiezen/aanmaken → key kopiëren.
- Billing activeren voor `gemini-3-pro-image` (~$0,13-0,24/beeld op 2K/4K);
  `gemini-2.5-flash-image` (~$0,04) mag voor drafts.
- Key als `GEMINI_API_KEY` in `~/.config/soundscout-thema-studio/.env` (chmod 600, **buiten
  de repo**). `scripts/_env.py` leest eerst omgevingsvariabelen, dan dat bestand.
- Script: `scripts/genereer-afbeelding.py` (zelfde interface, `--style-ref` i.p.v.
  `--image-reference`).

## Kosteninschatting

- **Compleet thema (Higgsfield)**: ~50 generaties × 2 credits = **~100 credits**.
- **Los beeld** (poster, extra praatplaat): 2 credits per poging, reken op 2-3 pogingen.
- **Gemini-fallback**: ~50 generaties → $7-12 (pro) of $2-5 (met flash-drafts).

## Sneltest

```bash
python3 scripts/genereer-afbeelding-higgsfield.py --zelftest   # Higgsfield: login + saldo
python3 scripts/genereer-afbeelding.py --zelftest              # Gemini-fallback (alleen als key gezet)
```
