#!/usr/bin/env python3
"""Genereer een geluid via de Higgsfield CLI (PRIMAIRE generatie-engine).

De CLI (`higgsfield`, npm @higgsfield/cli) is op deze Mac geïnstalleerd en ingelogd;
er is GEEN API-key nodig. Twee modi:

  sfx   `mirelo_text_to_audio`  — geluidseffect uit een tekstprompt (0,25 credit/sec)
  stem  `qwen_audio_tts`        — spraak, mp3, mét pitch/tempo-controle (~0,01 credit)

  # geluidseffect (robotpapegaai van 4 seconden)
  python3 genereer-geluid-higgsfield.py --prompt "mechanical robot parrot squawk" \
      --duur 4 --out kandidaten/audio/grogkroeg-papegaai/hf-v1.mp3

  # robotstem: lage pitch + traag = zware robot; hoge pitch = klein robotje
  python3 genereer-geluid-higgsfield.py --modus stem --prompt "Arrr, welkom aan boord!" \
      --voice-id <id> --pitch 0.7 --tempo 0.9 --out kandidaten/audio/stem/hf-v1.mp3

  python3 genereer-geluid-higgsfield.py --stemmen              # beschikbare stemmen tonen
  python3 genereer-geluid-higgsfield.py --cost-only --prompt "test" --duur 4
  python3 genereer-geluid-higgsfield.py --zelftest             # login + saldo

Output = het bronformaat van Higgsfield; daarna ALTIJD door verwerk-geluid.py
(micro-fades + normalisatie), zodat de app-spec gegarandeerd blijft.

LET OP: Claude kan het resultaat niet horen. Elke generatie gaat via Berts oren
(maak-audio-preview.py) voordat het bestand de app in mag.
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

BIN = os.environ.get("HIGGSFIELD_BIN", "higgsfield")
MODELLEN = {"sfx": "mirelo_text_to_audio", "stem": "qwen_audio_tts"}


def run_cli(args: list, capture_json: bool = False):
    cmd = [BIN] + (["--json"] if capture_json else []) + args
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"FOUT: `{' '.join(cmd)}`\n{proc.stderr.strip() or proc.stdout.strip()}")
    if capture_json:
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError:
            sys.exit(f"FOUT: geen JSON van CLI:\n{proc.stdout[:800]}")
    return proc.stdout.strip()


def log_manifest(manifest_path: Path, entry: dict) -> None:
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.setdefault("api_calls", []).append(entry)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def toon_stemmen() -> None:
    data = run_cli(["voices", "list"], capture_json=True)
    stemmen = data if isinstance(data, list) else data.get("items") or data.get("voices") or []
    print(f"{len(stemmen)} stemmen:")
    for s in stemmen:
        print(f"  {s.get('id')}  {s.get('name', '?'):20} ({s.get('voice_type', 'preset')})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--modus", default="sfx", choices=sorted(MODELLEN),
                    help="sfx = geluidseffect (default) · stem = spraak")
    ap.add_argument("--prompt", help="Beschrijving van het geluid (Engels werkt het best) of de uit te spreken tekst")
    ap.add_argument("--prompt-file", help="Bestand met de prompt (alternatief voor --prompt)")
    ap.add_argument("--duur", type=float, help="[sfx] Duur in seconden (app-spec: 2-8 voor sfx)")
    ap.add_argument("--voice-id", help="[stem] Stem-id uit --stemmen")
    ap.add_argument("--voice-type", default="preset", choices=["preset", "element"],
                    help="[stem] preset (ingebouwd) of element (gekloond)")
    ap.add_argument("--pitch", type=float, help="[stem] pitch_rate; 1 = normaal, <1 lager/zwaarder, >1 hoger")
    ap.add_argument("--tempo", type=float, help="[stem] speech_rate; 1 = normaal, <1 trager")
    ap.add_argument("--instructie", help="[stem] Stijlaanwijzing, bv. 'raspy robotic pirate voice'")
    ap.add_argument("--out", help="Uitvoerbestand")
    ap.add_argument("--timeout", default="10m", help="Wachttijd op de job (default 10m)")
    ap.add_argument("--manifest", help="manifest.json om de call in te loggen")
    ap.add_argument("--cost-only", action="store_true", help="Toon alleen de credit-kosten, genereer niet")
    ap.add_argument("--stemmen", action="store_true", help="Toon de beschikbare stemmen en stop")
    ap.add_argument("--zelftest", action="store_true", help="Account status (verifieert login)")
    args = ap.parse_args()

    if args.zelftest:
        print(run_cli(["account", "status"]))
        return
    if args.stemmen:
        toon_stemmen()
        return

    prompt = Path(args.prompt_file).read_text(encoding="utf-8") if args.prompt_file else args.prompt
    if not prompt:
        ap.error("--prompt of --prompt-file is verplicht")

    model = MODELLEN[args.modus]
    base = [model, "--prompt", prompt]

    if args.modus == "sfx":
        if args.duur is None:
            ap.error("--duur is verplicht voor modus sfx")
        base += ["--duration", str(args.duur)]
    else:
        if not args.voice_id:
            ap.error("--voice-id is verplicht voor modus stem (zie --stemmen)")
        base += ["--voice_id", args.voice_id, "--voice_type", args.voice_type,
                 "--format", "mp3", "--sample_rate", "44100"]
        if args.pitch is not None:
            base += ["--pitch_rate", str(args.pitch)]
        if args.tempo is not None:
            base += ["--speech_rate", str(args.tempo)]
        if args.instructie:
            base += ["--instruction", args.instructie]

    if args.cost_only:
        print(run_cli(["generate", "cost"] + base))
        return
    if not args.out:
        ap.error("--out is verplicht")

    # 1. Job aanmaken. `generate create --json` geeft de job-id als JSON-string, soms
    # verpakt in een lijst (["<id>"]) of als dict; vang alle vormen af.
    created = run_cli(["generate", "create"] + base, capture_json=True)
    node = created[0] if isinstance(created, list) and created else created
    if isinstance(node, str):
        job_id = node
    elif isinstance(node, dict):
        job_id = node.get("id") or node.get("job_id")
    else:
        job_id = None
    if not job_id:
        sys.exit(f"FOUT: geen job-id in antwoord: {json.dumps(created)[:800]}")
    print(f"Job {job_id} ({model}) gestart, wachten…")

    # 2. Wachten tot klaar
    run_cli(["generate", "wait", job_id, "--quiet", "--timeout", args.timeout])

    # 3. Resultaat ophalen + downloaden
    result = run_cli(["generate", "get", job_id], capture_json=True)
    result = result[0] if isinstance(result, list) else result
    url = result.get("result_url") or result.get("min_result_url")
    if result.get("status") != "completed" or not url:
        sys.exit(f"FOUT: job niet voltooid ({result.get('status')}): {json.dumps(result)[:800]}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, out)
    print(f"OK: {out} ({out.stat().st_size // 1024} KB, model={model})")
    print("   → nu door verwerk-geluid.py, daarna Bert laten luisteren")

    if args.manifest:
        log_manifest(Path(args.manifest), {
            "tijd": datetime.now().isoformat(timespec="seconds"),
            "script": "genereer-geluid-higgsfield",
            "engine": "higgsfield-cli",
            "modus": args.modus,
            "model": model,
            "job_id": job_id,
            "out": str(out),
            "prompt": prompt[:200],
            "duur": args.duur,
        })


if __name__ == "__main__":
    main()
