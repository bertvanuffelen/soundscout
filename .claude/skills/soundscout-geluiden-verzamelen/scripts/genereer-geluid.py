#!/usr/bin/env python3
"""Genereer een geluidseffect via de ElevenLabs Sound Effects API.

  python3 genereer-geluid.py --prompt "happy robot beeping melody" --duur 3.0 --out x.mp3
  python3 genereer-geluid.py --prompt "gentle snow footsteps loop" --duur 8.0 --loop --out y.mp3
  python3 genereer-geluid.py --zelftest   # key-check zonder credits te verbruiken

Duur 0.5-30s; zonder --duur kiest de AI zelf. Output = mp3.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _env import require_key  # noqa: E402

API = "https://api.elevenlabs.io/v1/sound-generation"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt", help="Beschrijving van het geluid (Engels werkt het best)")
    ap.add_argument("--duur", type=float, help="Gewenste duur in seconden (0.5-30)")
    ap.add_argument("--loop", action="store_true", help="Vraag om een naadloze loop")
    ap.add_argument("--out", help="Uitvoerbestand (mp3)")
    ap.add_argument("--zelftest", action="store_true", help="Alleen key-check (geen generatie)")
    args = ap.parse_args()

    key = require_key("ELEVENLABS_API_KEY")

    if args.zelftest:
        req = urllib.request.Request(
            "https://api.elevenlabs.io/v1/user",
            headers={"xi-api-key": key},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            sub = data.get("subscription", {})
            print(f"OK: ELEVENLABS_API_KEY werkt — tier: {sub.get('tier')}, "
                  f"credits: {sub.get('character_count')}/{sub.get('character_limit')}")
        except urllib.error.HTTPError as e:
            sys.exit(f"FOUT: ElevenLabs {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
        return

    if not args.prompt or not args.out:
        ap.error("--prompt en --out zijn verplicht")
    if args.duur is not None and not (0.5 <= args.duur <= 30):
        ap.error("--duur moet tussen 0.5 en 30 seconden liggen")

    body: dict = {"text": args.prompt}
    if args.duur is not None:
        body["duration_seconds"] = args.duur
    if args.loop:
        body["loop"] = True

    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode("utf-8"),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            audio = resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"FOUT: ElevenLabs {e.code}: {e.read().decode('utf-8', 'replace')[:800]}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    print(f"OK: {out} ({len(audio) // 1024} KB)\n    afplay \"{out}\"")


if __name__ == "__main__":
    main()
