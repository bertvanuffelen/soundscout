#!/usr/bin/env python3
"""Genereer een afbeelding via de Gemini API (Nano Banana).

Voorbeelden:
  python3 genereer-afbeelding.py --prompt-file prompts/anker-01-v1.txt --out raw/anker-01-v1.png
  python3 genereer-afbeelding.py --prompt-file p.txt --out raw/b.png \
      --style-ref stijlanker/anker-01.jpg --style-ref package/public/images/themes/x/loc.jpg
  python3 genereer-afbeelding.py --prompt-file edit.txt --out raw/b-v2.png \
      --edit-van raw/b.png --edit-prompt "verwijder de tekst op het bord rechtsboven"
  python3 genereer-afbeelding.py --zelftest

Output is PNG (of wat Gemini teruggeeft); daarna altijd door verwerk-afbeelding.py halen.
Elke call wordt gelogd in het manifest (--manifest, default: geen log).
"""

import argparse
import base64
import json
import mimetypes
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _env import require_key  # noqa: E402

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_MODEL = "gemini-3-pro-image"


def image_part(path: Path) -> dict:
    mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return {"inline_data": {"mime_type": mime, "data": data}}


def call_gemini(model: str, parts: list, aspect: str, resolutie: str, api_key: str) -> bytes:
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": aspect, "imageSize": resolutie},
        },
    }
    req = urllib.request.Request(
        f"{API_BASE}/{model}:generateContent",
        data=json.dumps(body).encode("utf-8"),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:2000]
        # imageSize wordt niet door elk model ondersteund — probeer zonder
        if e.code == 400 and "imageSize" in detail:
            body["generationConfig"]["imageConfig"].pop("imageSize", None)
            req2 = urllib.request.Request(
                f"{API_BASE}/{model}:generateContent",
                data=json.dumps(body).encode("utf-8"),
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req2, timeout=300) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        else:
            sys.exit(f"FOUT: Gemini API {e.code}: {detail}")

    for cand in payload.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    text = json.dumps(payload)[:1500]
    sys.exit(f"FOUT: geen afbeelding in het antwoord. Respons (ingekort): {text}")


def log_manifest(manifest_path: Path, entry: dict) -> None:
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.setdefault("api_calls", []).append(entry)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prompt-file", help="Bestand met de volledige prompt")
    ap.add_argument("--out", help="Uitvoerbestand (png)")
    ap.add_argument("--style-ref", action="append", default=[], help="Stijlreferentie-afbeelding (max 3)")
    ap.add_argument("--edit-van", help="Bronbeeld voor multi-turn edit")
    ap.add_argument("--edit-prompt", help="Edit-instructie (vervangt --prompt-file bij edits)")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"Model (default {DEFAULT_MODEL})")
    ap.add_argument("--aspect", default="16:9", help="Aspect ratio (default 16:9)")
    ap.add_argument("--resolutie", default="2K", choices=["1K", "2K", "4K"], help="Resolutie-tier")
    ap.add_argument("--manifest", help="manifest.json om de call in te loggen")
    ap.add_argument("--zelftest", action="store_true", help="Minimale key-test (kleine 1:1 generatie)")
    args = ap.parse_args()

    api_key = require_key("GEMINI_API_KEY")

    if args.zelftest:
        png = call_gemini("gemini-2.5-flash-image", [{"text": "A single yellow music note on white"}], "1:1", "1K", api_key)
        out = Path("/tmp/thema-studio-zelftest.png")
        out.write_bytes(png)
        print(f"OK: GEMINI_API_KEY werkt — testbeeld: {out} ({len(png)} bytes)")
        return

    if not args.out or (not args.prompt_file and not args.edit_prompt):
        ap.error("--out en (--prompt-file of --edit-prompt) zijn verplicht")
    if len(args.style_ref) > 3:
        ap.error("maximaal 3 --style-ref afbeeldingen")

    parts: list = []
    if args.edit_van:
        parts.append(image_part(Path(args.edit_van)))
    for ref in args.style_ref:
        parts.append(image_part(Path(ref)))

    if args.edit_prompt:
        prompt = args.edit_prompt
    else:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8")
    if args.style_ref and not args.edit_van:
        prompt = (
            "Use the attached image(s) strictly as STYLE REFERENCE (line work, palette, "
            "level of detail). Do not copy their content.\n\n" + prompt
        )
    parts.append({"text": prompt})

    image_bytes = call_gemini(args.model, parts, args.aspect, args.resolutie, api_key)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(image_bytes)
    print(f"OK: {out} ({len(image_bytes)} bytes, model={args.model}, aspect={args.aspect})")

    if args.manifest:
        log_manifest(Path(args.manifest), {
            "tijd": datetime.now().isoformat(timespec="seconds"),
            "script": "genereer-afbeelding",
            "model": args.model,
            "out": str(out),
            "prompt_file": args.prompt_file,
            "edit": bool(args.edit_van),
            "style_refs": args.style_ref,
        })


if __name__ == "__main__":
    main()
