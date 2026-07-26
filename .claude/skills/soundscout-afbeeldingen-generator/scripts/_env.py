"""Gedeelde key-loader voor de thema-studio-scripts.

Leesvolgorde: echte omgevingsvariabelen winnen; anders
~/.config/soundscout-thema-studio/.env (KEY=VALUE per regel, # = commentaar).
Keys staan bewust buiten de repo — nooit in git.
"""

import os
import sys
from pathlib import Path

ENV_FILE = Path.home() / ".config" / "soundscout-thema-studio" / ".env"


def _load_env_file() -> dict:
    values = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


_FILE_VALUES = _load_env_file()


def get_key(name: str) -> str | None:
    return os.environ.get(name) or _FILE_VALUES.get(name) or None


def require_key(name: str) -> str:
    value = get_key(name)
    if not value:
        sys.exit(
            f"FOUT: {name} niet gevonden. Zet 'm als omgevingsvariabele of in {ENV_FILE}\n"
            f"Zie reference/api-setup.md voor het aanmaken van keys."
        )
    return value
