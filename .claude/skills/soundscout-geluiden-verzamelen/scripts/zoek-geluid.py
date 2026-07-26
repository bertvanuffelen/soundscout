#!/usr/bin/env python3
"""Zoek geluiden op Freesound en download mp3-previews (hq, 128kbps).

  python3 zoek-geluid.py --query "goat bleat" --min-duur 2 --max-duur 8 --licentie cc0 --top 5
  python3 zoek-geluid.py --query "sleigh bells loop" --licentie alles-behalve-nc \
      --download-map .thema-studio/x/kandidaten/audio/dorp-bel/

Per download wordt een .json met metadata (auteur, url, licentie) meegeschreven
voor BRONNEN.md. Token-auth volstaat voor previews (geen OAuth nodig).
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _env import require_key  # noqa: E402

API = "https://freesound.org/apiv2/search/text/"

LICENTIE_FILTERS = {
    "cc0": 'license:"Creative Commons 0"',
    "cc-by": '(license:"Creative Commons 0" OR license:"Attribution")',
    "alles-behalve-nc": '(license:"Creative Commons 0" OR license:"Attribution")',
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--query", required=True)
    ap.add_argument("--min-duur", type=float, default=1.0)
    ap.add_argument("--max-duur", type=float, default=10.0)
    ap.add_argument("--licentie", default="cc0", choices=sorted(LICENTIE_FILTERS))
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--download-map", help="Map om previews + metadata naartoe te schrijven")
    ap.add_argument("--json", action="store_true", help="Machine-leesbare output")
    args = ap.parse_args()

    token = require_key("FREESOUND_API_KEY")
    filt = f"duration:[{args.min_duur} TO {args.max_duur}] {LICENTIE_FILTERS[args.licentie]}"
    params = urllib.parse.urlencode({
        "query": args.query,
        "filter": filt,
        "fields": "id,name,duration,license,username,url,previews,avg_rating,num_downloads",
        "sort": "score",
        "page_size": args.top,
        "token": token,
    })
    try:
        with urllib.request.urlopen(f"{API}?{params}", timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit(f"FOUT: Freesound API {e.code}: {e.read().decode('utf-8', 'replace')[:500]}")

    results = data.get("results", [])
    if not results:
        print(f"Geen resultaten voor '{args.query}' (filter: {filt}). Probeer bredere zoektermen of --licentie alles-behalve-nc.")
        return

    kandidaten = []
    for r in results:
        item = {
            "id": r["id"],
            "naam": r["name"],
            "duur": round(r["duration"], 2),
            "licentie": r["license"],
            "auteur": r["username"],
            "url": r["url"],
            "rating": r.get("avg_rating"),
            "downloads": r.get("num_downloads"),
        }
        if args.download_map:
            map_ = Path(args.download_map)
            map_.mkdir(parents=True, exist_ok=True)
            bestand = map_ / f"{r['id']}-{slug(r['name'])}.mp3"
            preview_url = r["previews"]["preview-hq-mp3"]
            urllib.request.urlretrieve(preview_url, bestand)
            bestand.with_suffix(".json").write_text(
                json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
            item["bestand"] = str(bestand)
            item["afplay"] = f'afplay "{bestand}"'
        kandidaten.append(item)

    if args.json:
        print(json.dumps(kandidaten, ensure_ascii=False, indent=2))
    else:
        for k in kandidaten:
            regel = f"[{k['id']}] {k['naam']} — {k['duur']}s — {k['licentie']} — door {k['auteur']}"
            if "afplay" in k:
                regel += f"\n    {k['afplay']}"
            print(regel)


if __name__ == "__main__":
    main()
