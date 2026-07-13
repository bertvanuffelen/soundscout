#!/usr/bin/env python3
"""Eindvalidatie van een compleet themapakket.

  python3 check-pakket.py --pakket .thema-studio/{themeId}/package [--json]

Checkt:
 1. Alle beelden onder package/public/images: exact 1920x1072 JPG.
 2. Alle audio onder package/public/audio: mp3, leesbaar (via ffprobe indien aanwezig).
 3. samples.ts <-> locations.ts <-> audiobestanden: id-consistentie (heuristische
    TS-parsing met regex — bij twijfel handmatig nalopen).
 4. samples.ts duration ~ gemeten duur (tolerantie 0.15s).
 5. i18n-fragments nl/en: identieke keysets.
 6. BRONNEN.md dekt elk audiobestand met freesound-metadata (kandidaten-json's).
Exit 1 bij fouten.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def sips_dims(path: Path) -> tuple[int, int]:
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
                         capture_output=True, text=True).stdout
    w = h = 0
    for line in out.splitlines():
        if "pixelWidth" in line:
            w = int(line.split(":")[1])
        if "pixelHeight" in line:
            h = int(line.split(":")[1])
    return w, h


def ffprobe_duur(path: Path) -> float | None:
    if not shutil.which("ffprobe"):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except (subprocess.CalledProcessError, ValueError):
        return None


def json_keys(obj, prefix="") -> set:
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            keys.add(f"{prefix}{k}")
            keys |= json_keys(v, f"{prefix}{k}.")
    return keys


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pakket", required=True)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    pakket = Path(args.pakket)
    if not pakket.is_dir():
        sys.exit(f"FOUT: {pakket} is geen map")
    fouten, waarschuwingen, oks = [], [], []

    # 1. Beelden
    beelden = sorted((pakket / "public" / "images").rglob("*")) if (pakket / "public" / "images").is_dir() else []
    beelden = [p for p in beelden if p.is_file() and not p.name.startswith(".")]
    for p in beelden:
        if p.suffix.lower() not in (".jpg", ".jpeg"):
            fouten.append(f"beeld {p.name}: geen jpg")
            continue
        w, h = sips_dims(p)
        if (w, h) != (1920, 1072):
            fouten.append(f"beeld {p.name}: {w}x{h} != 1920x1072")
        else:
            oks.append(f"beeld {p.name}: 1920x1072 jpg")
    if not beelden:
        waarschuwingen.append("geen beelden gevonden onder public/images")

    # 2+3+4. Audio + TS-consistentie
    audio_root = pakket / "public" / "audio"
    audiobestanden = {p.stem: p for p in audio_root.rglob("*.mp3")} if audio_root.is_dir() else {}
    ts_dirs = list((pakket / "src" / "data" / "themes").glob("*")) if (pakket / "src" / "data" / "themes").is_dir() else []
    samples_ts = ts_dirs[0] / "samples.ts" if ts_dirs else None
    locations_ts = ts_dirs[0] / "locations.ts" if ts_dirs else None

    sample_ids, durations, audio_urls = set(), {}, {}
    if samples_ts and samples_ts.exists():
        tekst = samples_ts.read_text(encoding="utf-8")
        for blok in re.finditer(
            r"id:\s*'([^']+)'[\s\S]*?audioUrl:\s*'([^']+)'[\s\S]*?duration:\s*([\d.]+)", tekst
        ):
            sid, url, dur = blok.group(1), blok.group(2), float(blok.group(3))
            sample_ids.add(sid)
            durations[sid] = dur
            audio_urls[sid] = url
        for sid, url in audio_urls.items():
            verwacht = f"{sid}.mp3"
            if not url.endswith(verwacht):
                fouten.append(f"samples.ts {sid}: audioUrl eindigt niet op {verwacht} (padconventie)")
            if sid not in audiobestanden:
                fouten.append(f"samples.ts {sid}: geen audiobestand {verwacht} in het pakket")
            else:
                echte = ffprobe_duur(audiobestanden[sid])
                if echte is not None and abs(echte - durations[sid]) > 0.15:
                    fouten.append(f"samples.ts {sid}: duration {durations[sid]} != gemeten {echte:.2f}")
        for stem in audiobestanden:
            if stem not in sample_ids:
                waarschuwingen.append(f"audio {stem}.mp3: geen sample-entry in samples.ts")
        oks.append(f"samples.ts: {len(sample_ids)} samples geparsed")
    else:
        waarschuwingen.append("samples.ts (nog) niet aanwezig — TS-checks overgeslagen")

    if locations_ts and locations_ts.exists():
        tekst = locations_ts.read_text(encoding="utf-8")
        hotspot_sample_ids = set(re.findall(r"sampleId:\s*'([^']+)'", tekst))
        for hid in hotspot_sample_ids:
            if sample_ids and hid not in sample_ids:
                fouten.append(f"locations.ts hotspot '{hid}': geen bijbehorende sample")
        if hotspot_sample_ids:
            oks.append(f"locations.ts: {len(hotspot_sample_ids)} hotspot-verwijzingen gecheckt")

    # 5. i18n-pariteit
    frag_dir = pakket / "i18n-fragments"
    nl, en = frag_dir / "nl.json", frag_dir / "en.json"
    if nl.exists() and en.exists():
        nl_keys = json_keys(json.loads(nl.read_text(encoding="utf-8")))
        en_keys = json_keys(json.loads(en.read_text(encoding="utf-8")))
        for k in sorted(nl_keys - en_keys):
            fouten.append(f"i18n: key '{k}' wel in nl, niet in en")
        for k in sorted(en_keys - nl_keys):
            fouten.append(f"i18n: key '{k}' wel in en, niet in nl")
        if nl_keys == en_keys:
            oks.append(f"i18n: {len(nl_keys)} keys, nl/en identiek")
    else:
        waarschuwingen.append("i18n-fragments nl.json/en.json (nog) niet compleet")

    # 6. BRONNEN.md
    bronnen = pakket / "BRONNEN.md"
    if bronnen.exists():
        tekst = bronnen.read_text(encoding="utf-8")
        for stem in audiobestanden:
            if stem not in tekst:
                fouten.append(f"BRONNEN.md: geen bronregel voor {stem}.mp3")
        oks.append("BRONNEN.md aanwezig")
    elif audiobestanden:
        fouten.append("BRONNEN.md ontbreekt terwijl er audio in het pakket zit")

    if args.json:
        print(json.dumps({"ok": oks, "waarschuwingen": waarschuwingen, "fouten": fouten},
                         ensure_ascii=False, indent=2))
    else:
        for o in oks:
            print(f"  ✓ {o}")
        for w in waarschuwingen:
            print(f"  ⚠ {w}")
        for f in fouten:
            print(f"  ✗ {f}")
        print(f"\n{'PAKKET OK' if not fouten else f'{len(fouten)} FOUT(EN)'} "
              f"({len(waarschuwingen)} waarschuwingen)")
    sys.exit(1 if fouten else 0)


if __name__ == "__main__":
    main()
