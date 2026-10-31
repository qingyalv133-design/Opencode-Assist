#!/usr/bin/env python3
"""Add explicit boolean `dangerous` annotations without changing evaluation labels.

The original test/challenge/review files stay untouched.  New derived files and
a canonical annotation table are written for downstream use.
"""
from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(row, ensure_ascii=False, sort_keys=True) for row in rows) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    review = {
        row["id"]: row
        for row in csv.DictReader((ROOT / "reports/human_review_plain.csv").open(encoding="utf-8"))
    }
    test = read_jsonl(ROOT / "data/splits/test.jsonl")
    challenge = read_jsonl(ROOT / "data/challenge.jsonl")
    review_rows = read_jsonl(ROOT / "data/splits/review.jsonl")

    annotations: List[Dict[str, Any]] = []

    def existing(row: Dict[str, Any], dataset: str) -> Dict[str, Any]:
        dangerous = row["label"] == 1
        return {
            "dataset": dataset,
            "id": row["id"],
            "family": row["family"],
            "dangerous": bool(dangerous),
            "provisional": False,
            "judgment": "危险" if dangerous else "不危险",
            "label_status": "existing_binary_label",
            "source_label": row["label"],
            "human_signoff": False,
            "reason": "原始二分类标签：1=危险删除，0=非该类风险。",
            "input": row["input"],
        }

    def from_review(row: Dict[str, Any], dataset: str) -> Dict[str, Any]:
        r = review[row["id"]]
        dangerous = r["dangerous"].strip().lower() == "true"
        provisional = r["provisional"].strip().lower() == "true"
        return {
            "dataset": dataset,
            "id": row["id"],
            "family": row["family"],
            "dangerous": dangerous,
            "provisional": provisional,
            "judgment": r["judgment"],
            "label_status": r["label_status"],
            "source_label": row.get("label"),
            "human_signoff": False,
            "reason": r["reason"],
            "input": row["input"],
        }

    for row in test:
        annotations.append(existing(row, "test"))
    for row in challenge:
        if row["label"] is None:
            annotations.append(from_review(row, "challenge"))
        else:
            annotations.append(existing(row, "challenge"))
    for row in review_rows:
        annotations.append(from_review(row, "review"))

    # Canonical annotation table.
    write_jsonl(ROOT / "data/binary_annotations.jsonl", annotations)
    with (ROOT / "data/binary_annotations.csv").open("w", encoding="utf-8", newline="") as handle:
        fields = [
            "dataset", "id", "family", "dangerous", "provisional", "judgment",
            "label_status", "source_label", "human_signoff", "reason",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in annotations:
            writer.writerow({
                **{key: row[key] for key in fields if key != "dangerous" and key != "provisional" and key != "human_signoff"},
                "dangerous": "true" if row["dangerous"] else "false",
                "provisional": "true" if row["provisional"] else "false",
                "human_signoff": "false",
            })

    # Derived copies: original labels are preserved, boolean field is added.
    for source_name, dataset, out_name in (
        ("splits/test.jsonl", "test", "splits/test_with_true_false.jsonl"),
        ("challenge.jsonl", "challenge", "challenge_with_true_false.jsonl"),
        ("splits/review.jsonl", "review", "splits/review_with_true_false.jsonl"),
    ):
        by_id = {row["id"]: row for row in annotations if row["dataset"] == dataset}
        out = []
        for row in read_jsonl(ROOT / "data" / source_name):
            ann = by_id[row["id"]]
            out.append({
                **row,
                "dangerous": ann["dangerous"],
                "provisional": ann["provisional"],
                "judgment": ann["judgment"],
                "label_status": ann["label_status"],
                "annotation_note": ann["reason"],
            })
        write_jsonl(ROOT / "data" / out_name, out)

    stats = {}
    for dataset in ("test", "challenge", "review"):
        rows = [r for r in annotations if r["dataset"] == dataset]
        stats[dataset] = {
            "rows": len(rows),
            "true": sum(1 for r in rows if r["dangerous"]),
            "false": sum(1 for r in rows if not r["dangerous"]),
            "provisional_true": sum(1 for r in rows if r["dangerous"] and r["provisional"]),
            "human_signed": sum(1 for r in rows if r["human_signoff"]),
        }
    stats["total"] = {
        "rows": len(annotations),
        "true": sum(1 for r in annotations if r["dangerous"]),
        "false": sum(1 for r in annotations if not r["dangerous"]),
        "provisional_true": sum(1 for r in annotations if r["dangerous"] and r["provisional"]),
        "human_signed": 0,
    }
    stats["note"] = (
        "dangerous=true 包含危险和“无法判断、按危险处理”；provisional=true 表示后者。"
        "原 test/challenge/review 文件未被修改；派生文件只添加字段，不改原 label。"
    )
    (ROOT / "data/binary_annotation_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print("Wrote data/binary_annotations.jsonl")
    print("Wrote data/binary_annotations.csv")
    print("Wrote data/splits/test_with_true_false.jsonl")
    print("Wrote data/challenge_with_true_false.jsonl")
    print("Wrote data/splits/review_with_true_false.jsonl")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
