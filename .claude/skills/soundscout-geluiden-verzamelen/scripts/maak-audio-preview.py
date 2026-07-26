#!/usr/bin/env python3
"""Bouw een klikbare HTML-audiopreview van de gezochte geluidskandidaten.

Scant {map}/{sampleId}/*.mp3 (+ de .json-metadata die zoek-geluid.py meeschrijft) en
maakt één zelfstandige HTML-pagina: per sample de kandidaten met een play-knop, info
(auteur / duur / licentie) en een keuzerondje "⭐ beste". Onderaan een knop die al je
keuzes als tekst kopieert, zodat je ze aan Claude kunt teruggeven.

  python3 maak-audio-preview.py --map .thema-studio/piraten/kandidaten/audio
  python3 maak-audio-preview.py --map … --titel "Piraten — geluiden" --open
"""

import argparse
import html
import json
import subprocess
from pathlib import Path

PAGE = """<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titel}</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family:-apple-system,system-ui,sans-serif; background:#0f1420; color:#e8ecf4; }}
  header {{ position:sticky; top:0; z-index:10; background:#141b2ecc; backdrop-filter:blur(8px);
            border-bottom:1px solid #26304a; padding:14px 20px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; }}
  header h1 {{ font-size:18px; margin:0; }}
  header .prog {{ color:#9fb0d0; font-size:14px; }}
  button {{ background:#e8a02c; color:#1a1200; border:0; border-radius:10px; padding:9px 16px; font-weight:700; cursor:pointer; font-size:14px; }}
  button.sec {{ background:#26304a; color:#e8ecf4; }}
  main {{ max-width:900px; margin:0 auto; padding:20px; }}
  .sample {{ background:#141b2e; border:1px solid #26304a; border-radius:14px; padding:16px 18px; margin:0 0 18px; }}
  .sample.done {{ border-color:#0e8c8c; }}
  .sample h2 {{ margin:0 0 4px; font-size:16px; }}
  .sample .hint {{ color:#8ea0c0; font-size:13px; margin:0 0 12px; }}
  .cand {{ display:flex; align-items:center; gap:12px; padding:9px 10px; border-radius:10px; }}
  .cand:hover {{ background:#1b2338; }}
  .cand input {{ width:20px; height:20px; accent-color:#e8a02c; flex:none; }}
  .cand audio {{ height:34px; flex:none; }}
  .cand .meta {{ font-size:13px; color:#c3cee4; line-height:1.35; min-width:0; }}
  .cand .meta b {{ color:#fff; }}
  .cand .lic {{ color:#8ea0c0; }}
  .none {{ color:#8ea0c0; font-size:13px; }}
  textarea {{ width:100%; height:160px; margin-top:10px; background:#0b1020; color:#cfe; border:1px solid #26304a;
              border-radius:10px; padding:10px; font-family:ui-monospace,monospace; font-size:13px; display:none; }}
</style></head><body>
<header>
  <h1>🎵 {titel}</h1>
  <span class="prog" id="prog"></span>
  <button onclick="kopieer()">📋 Kopieer mijn keuzes</button>
  <button class="sec" onclick="document.getElementById('uit').style.display='block'">Toon als tekst</button>
</header>
<main>
{cards}
<textarea id="uit" readonly placeholder="Je keuzes verschijnen hier..."></textarea>
</main>
<script>
function refresh() {{
  const secties = document.querySelectorAll('.sample');
  let done = 0;
  secties.forEach(s => {{
    const gekozen = s.querySelector('input:checked');
    if (gekozen) {{ s.classList.add('done'); done++; }} else {{ s.classList.remove('done'); }}
  }});
  document.getElementById('prog').textContent = done + ' / ' + secties.length + ' gekozen';
}}
function kopieer() {{
  const regels = [];
  document.querySelectorAll('.sample').forEach(s => {{
    const id = s.dataset.sample;
    const g = s.querySelector('input:checked');
    regels.push(id + ' -> ' + (g ? g.value : 'GEEN (opnieuw zoeken)'));
  }});
  const tekst = regels.join('\\n');
  const ta = document.getElementById('uit'); ta.value = tekst; ta.style.display='block';
  navigator.clipboard && navigator.clipboard.writeText(tekst);
  alert('Keuzes gekopieerd! Plak ze terug in de chat.');
}}
document.addEventListener('change', e => {{ if (e.target.matches('input[type=radio]')) refresh(); }});
refresh();
</script></body></html>
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--map", required=True, help="Audio-kandidatenmap ({...}/kandidaten/audio)")
    ap.add_argument("--out", help="HTML-uitvoerpad (default: {map}/preview.html)")
    ap.add_argument("--titel", default="Geluidskandidaten")
    ap.add_argument("--open", action="store_true", help="Open de pagina meteen in Safari")
    args = ap.parse_args()

    root = Path(args.map)
    if not root.is_dir():
        raise SystemExit(f"FOUT: {root} is geen map")
    out = Path(args.out) if args.out else root / "preview.html"

    cards = []
    for sub in sorted(p for p in root.iterdir() if p.is_dir()):
        mp3s = sorted(sub.glob("*.mp3"))
        if not mp3s:
            continue
        rows = []
        for mp3 in mp3s:
            meta = {}
            j = mp3.with_suffix(".json")
            if j.exists():
                try:
                    meta = json.loads(j.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    meta = {}
            rel = f"{sub.name}/{mp3.name}"
            naam = html.escape(str(meta.get("naam", mp3.stem)))
            auteur = html.escape(str(meta.get("auteur", "?")))
            duur = meta.get("duur", "?")
            lic = html.escape(str(meta.get("licentie", "")))
            waarde = html.escape(str(meta.get("id", mp3.stem)))
            rows.append(
                f'<label class="cand"><input type="radio" name="pick__{html.escape(sub.name)}" value="{waarde}">'
                f'<audio controls preload="none" src="{html.escape(rel)}"></audio>'
                f'<span class="meta"><b>{naam}</b> · {duur}s · door {auteur}<br>'
                f'<span class="lic">{lic}</span></span></label>'
            )
        rows.append('<label class="cand none"><input type="radio" name="pick__'
                    + html.escape(sub.name) + '" value=""> geen goede — opnieuw zoeken</label>')
        cards.append(
            f'<section class="sample" data-sample="{html.escape(sub.name)}">'
            f'<h2>{html.escape(sub.name)}</h2>'
            f'<p class="hint">Kies je favoriet met het rondje links.</p>'
            + "".join(rows) + "</section>"
        )

    if not cards:
        raise SystemExit(f"Geen kandidaten gevonden in {root} (verwacht submappen met .mp3).")

    out.write_text(PAGE.format(titel=html.escape(args.titel), cards="\n".join(cards)), encoding="utf-8")
    print(f"OK: {out} ({len(cards)} samples)")
    if args.open:
        subprocess.run(["open", "-a", "Safari", str(out)])


if __name__ == "__main__":
    main()
