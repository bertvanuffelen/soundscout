#!/usr/bin/env python3
"""Valideer alle audio in een map en print de gemeten durations voor samples.ts.

  python3 check-audio.py --map package/public/audio/themes/{themeId}/
  python3 check-audio.py --map … --loops "winkel-beat,winkel-bas" --json

Checks: mp3-extensie, leesbaar, duur 1-10s (loops exact 8.0±0.05s), grootte ~20-300KB.
Harde fouten (niet-mp3/onleesbaar/loop-afwijking) → exit 1. Grootte/duur-randgevallen → waarschuwing.
Vereist ffprobe (brew install ffmpeg).
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def ffprobe_duur(path: Path) -> float | None:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return float(out)
    except (subprocess.CalledProcessError, ValueError):
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--map", dest="map_", required=True, help="Audiomap (recursief)")
    ap.add_argument("--loops", default="", help="Komma-gescheiden sampleIds die exact 8.0s moeten zijn")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    if not shutil.which("ffprobe"):
        sys.exit("FOUT: ffprobe niet gevonden. Installeer met: brew install ffmpeg")

    root = Path(args.map_)
    if not root.is_dir():
        sys.exit(f"FOUT: {root} is geen map")
    loops = {s.strip() for s in args.loops.split(",") if s.strip()}

    bestanden = sorted(p for p in root.rglob("*") if p.is_file() and not p.name.startswith("."))
    resultaten, fouten, waarschuwingen = [], [], []

    for p in bestanden:
        if p.suffix.lower() == ".json":
            continue  # metadata van zoek-geluid.py
        item = {"bestand": str(p.relative_to(root)), "sampleId": p.stem}
        if p.suffix.lower() != ".mp3":
            fouten.append(f"{p.name}: geen .mp3")
            item["fout"] = "geen mp3"
            resultaten.append(item)
            continue
        duur = ffprobe_duur(p)
        if duur is None:
            fouten.append(f"{p.name}: onleesbaar voor ffprobe")
            item["fout"] = "onleesbaar"
            resultaten.append(item)
            continue
        kb = p.stat().st_size // 1024
        item.update({"duur": round(duur, 2), "kb": kb})
        if p.stem in loops:
            if abs(duur - 8.0) > 0.05:
                fouten.append(f"{p.name}: loop is {duur:.2f}s, moet exact 8.0s (verwerk-geluid.py --duur-exact 8.0)")
        else:
            if not (1.0 <= duur <= 10.0):
                waarschuwingen.append(f"{p.name}: {duur:.2f}s valt buiten 1-10s (spec: 2-8s)")
        if not (20 <= kb <= 300):
            waarschuwingen.append(f"{p.name}: {kb} KB valt buiten ~20-300 KB")
        resultaten.append(item)

    if args.json:
        print(json.dumps({"resultaten": resultaten, "fouten": fouten,
                          "waarschuwingen": waarschuwingen}, ensure_ascii=False, indent=2))
    else:
        print(f"— {len(resultaten)} bestanden in {root} —")
        for r in resultaten:
            if "fout" in r:
                print(f"  ✗ {r['bestand']}: {r['fout']}")
            else:
                print(f"  ✓ {r['bestand']}: {r['duur']}s, {r['kb']} KB")
        for w in waarschuwingen:
            print(f"  ⚠ {w}")
        for f in fouten:
            print(f"  ✗ {f}")
        print("\n— durations voor samples.ts —")
        for r in resultaten:
            if "duur" in r:
                print(f"  '{r['sampleId']}': duration: {r['duur']},")

    sys.exit(1 if fouten else 0)


if __name__ == "__main__":
    main()
