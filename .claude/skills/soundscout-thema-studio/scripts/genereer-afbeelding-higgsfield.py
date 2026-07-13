#!/usr/bin/env python3
"""Genereer een afbeelding via de Higgsfield CLI (PRIMAIRE engine — Nano Banana Pro).

De CLI (`higgsfield`, npm @higgsfield/cli) is op deze Mac geïnstalleerd en ingelogd;
er is GEEN API-key nodig. Model `nano_banana_pro` = Nano Banana Pro: 16:9, 2k/4k, tot
14 stijl-/karakterreferenties, 2 credits per beeld.

  python3 genereer-afbeelding-higgsfield.py --prompt-file prompts/anker-01-v1.txt --out raw/anker-01-v1.png
  python3 genereer-afbeelding-higgsfield.py --prompt-file p.txt --out raw/b.png \
      --image-reference stijlanker/anker-01.jpg --image-reference package/.../loc.jpg
  # multi-turn edit = het vorige beeld als referentie + een edit-prompt:
  python3 genereer-afbeelding-higgsfield.py --edit-van raw/b.png \
      --prompt "verwijder de tekst op het bord rechtsboven, houd de rest identiek" --out raw/b-v2.png
  python3 genereer-afbeelding-higgsfield.py --cost-only --prompt "test"   # credits, geen generatie
  python3 genereer-afbeelding-higgsfield.py --zelftest                    # account status

Output = het bronformaat van Higgsfield (png/webp); daarna altijd door verwerk-afbeelding.py.
Style-refs en het edit-bronbeeld worden lokaal meegegeven; de CLI uploadt ze automatisch.
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
DEFAULT_MODEL = "nano_banana_pro"


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


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt-file", help="Bestand met de volledige prompt")
    ap.add_argument("--prompt", help="Prompt-tekst (alternatief voor --prompt-file)")
    ap.add_argument("--out", help="Uitvoerbestand")
    ap.add_argument("--image-reference", action="append", default=[],
                    help="Stijl-/karakterreferentie (lokaal pad of upload-id); herhaalbaar, max 14")
    ap.add_argument("--edit-van", help="Bronbeeld voor multi-turn edit (wordt als referentie meegegeven)")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"Higgsfield-model (default {DEFAULT_MODEL})")
    ap.add_argument("--aspect-ratio", default="16:9")
    ap.add_argument("--resolution", default="2k", choices=["1k", "2k", "4k"])
    ap.add_argument("--timeout", default="10m", help="Wachttijd op de job (default 10m)")
    ap.add_argument("--manifest", help="manifest.json om de call in te loggen")
    ap.add_argument("--cost-only", action="store_true", help="Toon alleen de credit-kosten, genereer niet")
    ap.add_argument("--zelftest", action="store_true", help="Account status (verifieert login)")
    args = ap.parse_args()

    if args.zelftest:
        print(run_cli(["account", "status"]))
        return

    prompt = None
    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8")
    elif args.prompt:
        prompt = args.prompt

    refs = list(args.image_reference)
    if args.edit_van:
        refs.insert(0, args.edit_van)
    if len(refs) > 14:
        ap.error("maximaal 14 referentie-afbeeldingen")

    base = [args.model]
    if prompt:
        base += ["--prompt", prompt]
    base += ["--aspect-ratio", args.aspect_ratio, "--resolution", args.resolution]
    for r in refs:
        base += ["--image-references", r]

    if args.cost_only:
        print(run_cli(["generate", "cost"] + base))
        return

    if not prompt and not refs:
        ap.error("een prompt (--prompt/--prompt-file) of ten minste één --image-reference is verplicht")
    if not args.out:
        ap.error("--out is verplicht")

    # 1. Job aanmaken. `generate create --json` geeft de job-id als JSON-string terug
    # (soms een dict/lijst); vang alle vormen af.
    created = run_cli(["generate", "create"] + base, capture_json=True)
    if isinstance(created, str):
        job_id = created
    else:
        job = created[0] if isinstance(created, list) else created
        job_id = job.get("id") or job.get("job_id") if isinstance(job, dict) else None
    if not job_id:
        sys.exit(f"FOUT: geen job-id in antwoord: {json.dumps(created)[:800]}")
    print(f"Job {job_id} ({args.model}) gestart, wachten…")

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
    print(f"OK: {out} ({out.stat().st_size // 1024} KB, model={args.model}, aspect={args.aspect_ratio})")

    if args.manifest:
        log_manifest(Path(args.manifest), {
            "tijd": datetime.now().isoformat(timespec="seconds"),
            "script": "genereer-afbeelding-higgsfield",
            "engine": "higgsfield-cli",
            "model": args.model,
            "job_id": job_id,
            "out": str(out),
            "prompt_file": args.prompt_file,
            "edit": bool(args.edit_van),
            "image_references": refs,
        })


if __name__ == "__main__":
    main()
