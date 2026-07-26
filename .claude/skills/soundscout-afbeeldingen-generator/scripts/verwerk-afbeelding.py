#!/usr/bin/env python3
"""Verwerk een gegenereerd beeld naar de SoundScout-spec: standaard exact 1920x1080 JPG.

  python3 verwerk-afbeelding.py --in raw/anker-01-v1.png --out kandidaten/anker-01-v1.jpg
  python3 verwerk-afbeelding.py --in raw/finn.png --out cast/finn.jpg --formaat vierkant
  python3 verwerk-afbeelding.py --check kandidaten/anker-01-v1.jpg

Formaten: breed 1920x1080 (app-beelden: locaties, praatplaten, storyboards, posters) ·
vierkant 1024x1024 (cast-portretten) · portret 1024x1365.
Werkwijze: schaal (sips) tot beide zijden >= doel, dan center-crop.
--check valideert maat/formaat/bestandsgrootte en geeft exit 1 bij afwijking (geef er
hetzelfde --formaat bij als waarmee je verwerkte).
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# breed = exact 16:9, matcht de app-container (aspect-video + object-cover)
FORMATEN = {
    "breed": (1920, 1080),
    "vierkant": (1024, 1024),
    "portret": (1024, 1365),
}


def sips_dims(path: Path) -> tuple[int, int]:
    out = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    w = h = 0
    for line in out.splitlines():
        if "pixelWidth" in line:
            w = int(line.split(":")[1])
        if "pixelHeight" in line:
            h = int(line.split(":")[1])
    return w, h


def check(path: Path, doel_b: int, doel_h: int) -> None:
    if not path.exists():
        sys.exit(f"FOUT: {path} bestaat niet")
    w, h = sips_dims(path)
    size_kb = path.stat().st_size // 1024
    fmt = subprocess.run(["sips", "-g", "format", str(path)], capture_output=True, text=True).stdout
    is_jpeg = "jpeg" in fmt
    ok = w == doel_b and h == doel_h and is_jpeg
    print(f"{path}: {w}x{h}, {'jpeg' if is_jpeg else 'GEEN jpeg'}, {size_kb} KB "
          f"-> {'OK' if ok else f'FOUT (verwacht {doel_b}x{doel_h} jpeg)'}")
    if size_kb > 1500:
        print(f"  waarschuwing: {size_kb} KB is fors (bestaande assets ~500-1100 KB)")
    sys.exit(0 if ok else 1)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--in", dest="inp", help="Bronbeeld (png/jpg)")
    ap.add_argument("--out", help="Doelbestand (jpg)")
    ap.add_argument("--kwaliteit", type=int, default=80, help="JPEG-kwaliteit (default 80)")
    ap.add_argument("--formaat", default="breed", choices=sorted(FORMATEN),
                    help="breed 1920x1080 (default, app-beelden) · vierkant 1024x1024 "
                         "(cast-portretten) · portret 1024x1365")
    ap.add_argument("--check", help="Valideer een bestaand bestand i.p.v. verwerken")
    args = ap.parse_args()

    DOEL_B, DOEL_H = FORMATEN[args.formaat]

    if args.check:
        check(Path(args.check), DOEL_B, DOEL_H)
        return
    if not args.inp or not args.out:
        ap.error("--in en --out zijn verplicht (of gebruik --check)")

    src, dst = Path(args.inp), Path(args.out)
    if not src.exists():
        sys.exit(f"FOUT: {src} bestaat niet")
    dst.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        werk = Path(td) / "werk.png"
        shutil.copy(src, werk)

        w, h = sips_dims(werk)
        # Schaal zodat beide zijden >= doel (cover), dan center-crop
        schaal = max(DOEL_B / w, DOEL_H / h)
        nieuw_w, nieuw_h = round(w * schaal), round(h * schaal)
        if (nieuw_w, nieuw_h) != (w, h):
            if nieuw_w / DOEL_B >= nieuw_h / DOEL_H:
                subprocess.run(["sips", "--resampleHeight", str(max(nieuw_h, DOEL_H)), str(werk)],
                               capture_output=True, check=True)
            else:
                subprocess.run(["sips", "--resampleWidth", str(max(nieuw_w, DOEL_B)), str(werk)],
                               capture_output=True, check=True)
        subprocess.run(["sips", "--cropToHeightWidth", str(DOEL_H), str(DOEL_B), str(werk)],
                       capture_output=True, check=True)
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(args.kwaliteit),
             str(werk), "--out", str(dst)],
            capture_output=True, check=True,
        )

    w, h = sips_dims(dst)
    print(f"OK: {dst} ({w}x{h}, {dst.stat().st_size // 1024} KB)")
    if (w, h) != (DOEL_B, DOEL_H):
        sys.exit(f"FOUT: eindmaat {w}x{h} != {DOEL_B}x{DOEL_H}")


if __name__ == "__main__":
    main()
