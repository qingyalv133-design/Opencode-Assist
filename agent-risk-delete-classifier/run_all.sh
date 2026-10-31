#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PY="${PY:-.venv/bin/python}"
"$PY" -m src.prepare_data --input data/raw/generated.jsonl
"$PY" -m src.train
"$PY" -m src.evaluate
"$PY" -m pytest -q
