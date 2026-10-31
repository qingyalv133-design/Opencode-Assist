#!/usr/bin/env python3
"""Export flat CSV test/challenge/review sets with true/false annotations."""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> int:
    annotations = {
        (row["dataset"], row["id"]): row
        for row in read_jsonl(ROOT / "data/binary_annotations.jsonl")
    }
    fields = [
        "id", "label", "dangerous", "provisional", "judgment", "label_status",
        "family", "user_request", "tool_name", "tool_args", "execution_mode",
        "working_directory", "reason", "human_signoff",
    ]
    outputs = [
        ("test", ROOT / "data/splits/test_with_true_false.jsonl", ROOT / "data/splits/test.csv"),
        ("challenge", ROOT / "data/challenge_with_true_false.jsonl", ROOT / "data/challenge.csv"),
        ("review", ROOT / "data/splits/review_with_true_false.jsonl", ROOT / "data/splits/review.csv"),
    ]
    for dataset, source, target in outputs:
        rows = read_jsonl(source)
        with target.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            for row in rows:
                ann = annotations[(dataset, row["id"])]
                payload = row["input"]
                writer.writerow({
                    "id": row["id"],
                    "label": "" if row["label"] is None else row["label"],
                    "dangerous": "true" if row["dangerous"] else "false",
                    "provisional": "true" if row["provisional"] else "false",
                    "judgment": ann["judgment"],
                    "label_status": ann["label_status"],
                    "family": row["family"],
                    "user_request": payload["user_request"],
                    "tool_name": payload["tool_name"],
                    "tool_args": json.dumps(payload["tool_args"], ensure_ascii=False, sort_keys=True),
                    "execution_mode": payload["execution_mode"],
                    "working_directory": payload["working_directory"],
                    "reason": ann["reason"],
                    "human_signoff": "false",
                })
        print(f"Wrote {target} ({len(rows)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
