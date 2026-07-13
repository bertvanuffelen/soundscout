#!/usr/bin/env python3
"""Genereer een afbeelding via de Higgsfield Cloud API (SECUNDAIR — tweede mening).

  python3 genereer-afbeelding-higgsfield.py --prompt-file p.txt --out raw/x.png

LET OP: Higgsfield ondersteunt géén stijlreferentie-afbeeldingen — gebruik dit script
nooit voor de serie-consistentie van een thema, alleen als losse tweede mening.
Endpoint-vormen kunnen wijzigen; controleer bij eerste gebruik https://cloud.higgsfield.ai
(dit script is bewust experimenteel en meldt duidelijk wat er misgaat).
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _env import require_key  # noqa: E402

API_BASE = "https://platform.higgsfield.ai/v1"
DEFAULT_MODEL = "higgsfield-ai/soul/text-to-image"


def api_call(pad: str, key: str, secret: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"{API_BASE}/{pad}",
        data=json.dumps(body).encode("utf-8") if body else None,
        headers={
            "hf-api-key": key,
            "hf-secret": secret,
            "Content-Type": "application/json",
        },
        method="POST" if body else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit(
            f"FOUT: Higgsfield {e.code} op {pad}: {e.read().decode('utf-8', 'replace')[:800]}\n"
            "Controleer het endpoint-formaat op https://cloud.higgsfield.ai (API-docs) — "
            "dit script is experimenteel."
        )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--aspect", default="16:9")
    args = ap.parse_args()

    key = require_key("HF_API_KEY")
    secret = require_key("HF_API_SECRET")
    prompt = Path(args.prompt_file).read_text(encoding="utf-8")

    job = api_call(f"{args.model}", key, secret, {
        "params": {"prompt": prompt, "aspect_ratio": args.aspect, "quality": "1080p"},
    })
    job_id = job.get("id") or job.get("job_id") or (job.get("jobs") or [{}])[0].get("id")
    if not job_id:
        sys.exit(f"FOUT: geen job-id in antwoord: {json.dumps(job)[:800]}")

    print(f"Job {job_id} gestart, wachten…")
    for _ in range(60):
        time.sleep(5)
        status = api_call(f"jobs/{job_id}", key, secret)
        state = status.get("status") or status.get("state")
        if state in ("completed", "succeeded", "done"):
            results = status.get("results") or status.get("images") or []
            url = None
            if isinstance(results, list) and results:
                first = results[0]
                url = first.get("url") or (first.get("raw") or {}).get("url") if isinstance(first, dict) else first
            if not url:
                sys.exit(f"FOUT: geen result-URL: {json.dumps(status)[:800]}")
            out = Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(url, out)
            print(f"OK: {out} ({out.stat().st_size // 1024} KB)")
            return
        if state in ("failed", "error", "canceled"):
            sys.exit(f"FOUT: job {state}: {json.dumps(status)[:800]}")
    sys.exit("FOUT: time-out na 5 minuten wachten op de job")


if __name__ == "__main__":
    main()
