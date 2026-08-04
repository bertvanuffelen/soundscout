#!/usr/bin/env python3
"""Verwerk een geluid naar de SoundScout-spec (mp3 128kbps, micro-fades, exacte duur).

  python3 verwerk-geluid.py --in kandidaat.mp3 --out package/.../dorp-bel.mp3 --fade 0.02
  python3 verwerk-geluid.py --in loop.mp3 --out .../winkel-beat.mp3 --duur-exact 8.0 --normaliseer

--duur-exact trimt of padt (stilte) naar precies die duur — verplicht voor loops (8.0s).
Vereist ffmpeg (brew install ffmpeg).
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def ffprobe_duur(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--duur-exact", type=float, help="Exacte einddering in s (bv. 8.0 voor loops)")
    ap.add_argument("--naar-tempo", type=float, metavar="GEMETEN",
                    help="Rek de gemeten lusduur in s naar --duur-exact, met behoud van "
                         "toonhoogte (bv. --naar-tempo 8.13 --duur-exact 8.0)")
    ap.add_argument("--fade", type=float, default=0.02, help="Micro-fade in/uit in s (default 0.02, 0 = uit)")
    ap.add_argument("--normaliseer", action="store_true", help="EBU R128 loudness-normalisatie")
    args = ap.parse_args()

    if args.naar_tempo is not None and not args.duur_exact:
        ap.error("--naar-tempo vereist --duur-exact (het doel om naartoe te rekken)")

    if not shutil.which("ffmpeg"):
        sys.exit("FOUT: ffmpeg niet gevonden. Installeer met: brew install ffmpeg")

    src, dst = Path(args.inp), Path(args.out)
    if not src.exists():
        sys.exit(f"FOUT: {src} bestaat niet")
    dst.parent.mkdir(parents=True, exist_ok=True)

    duur = args.duur_exact or ffprobe_duur(src)
    filters = []
    if args.naar_tempo is not None:
        # Eerst rekken, dan pas trimmen: anders knip je uit het verkeerde tempo.
        # atempo behoudt de toonhoogte (in tegenstelling tot asetrate).
        factor = args.naar_tempo / args.duur_exact
        if not 0.5 <= factor <= 2.0:
            sys.exit(f"FOUT: rekfactor {factor:.3f} valt buiten 0.5-2.0; "
                     f"klopt de gemeten lusduur {args.naar_tempo}s wel?")
        bpm = 960 / args.naar_tempo  # 4 maten 4/4 = 16 tellen
        print(f"Tempo: lus van {args.naar_tempo}s = {bpm:.1f} BPM "
              f"-> rekfactor {factor:.4f} naar {args.duur_exact}s")
        filters.append(f"atempo={factor:.6f}")
    if args.duur_exact:
        filters.append(f"apad=whole_dur={args.duur_exact}")
        filters.append(f"atrim=0:{args.duur_exact}")
    if args.normaliseer:
        filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    if args.fade > 0:
        filters.append(f"afade=t=in:st=0:d={args.fade}")
        filters.append(f"afade=t=out:st={max(duur - args.fade, 0)}:d={args.fade}")

    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src)]
    if filters:
        cmd += ["-af", ",".join(filters)]
    cmd += ["-codec:a", "libmp3lame", "-b:a", "128k", str(dst)]
    subprocess.run(cmd, check=True)

    eind = ffprobe_duur(dst)
    kb = dst.stat().st_size // 1024
    print(f"OK: {dst} ({eind:.2f}s, {kb} KB)")
    if args.duur_exact and abs(eind - args.duur_exact) > 0.05:
        sys.exit(f"FOUT: duur {eind:.2f}s wijkt af van --duur-exact {args.duur_exact}")


if __name__ == "__main__":
    main()
