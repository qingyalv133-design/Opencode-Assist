#!/usr/bin/env python3
"""Validate raw synthetic data and create family-held-out splits.

REVIEW rows are kept in a separate review split and are never used to fit the
binary classifier.  The 80-row "reviewed" file is deliberately marked
reviewed=false: no human sign-off was available in this run.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List

from src.policy import serialize_record, validate_record

ROOT = Path(__file__).resolve().parents[1]

FAMILY_SPLITS = {
    # train: 14 families
    "linux_workspace_cleanup": "train",
    "windows_powershell_admin": "train",
    "python_automation": "train",
    "node_build_pipeline": "train",
    "ci_deploy_artifacts": "train",
    "log_retention_ops": "train",
    "photo_archive_manager": "train",
    "nas_shared_folders": "train",
    "developer_git_cleanup": "train",
    "docker_host_cleanup": "train",
    "desktop_file_assistant": "train",
    "research_dataset_curation": "train",
    "media_transcoding_temp": "train",
    "package_cache_cleanup": "train",
    # validation: 3 families
    "macos_trash_workflow": "val",
    "database_backup_ops": "val",
    "scheduled_job_crontab": "val",
    # test: 3 families
    "remote_ssh_ops": "test",
    "cloud_cli_local_mount": "test",
    "legal_document_retention": "test",
}


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(row, ensure_ascii=False, sort_keys=True) for row in rows) + "\n",
        encoding="utf-8",
    )


def validate_rows(rows: List[Dict[str, Any]], *, name: str) -> None:
    errors = []
    for row in rows:
        row_errors = validate_record(row)
        if row_errors:
            errors.append((row.get("id"), row_errors))
    if errors:
        raise SystemExit(f"{name}: schema errors:\n" + "\n".join(map(str, errors[:20])))
    duplicates = Counter(serialize_record(row) for row in rows)
    dupes = {text: count for text, count in duplicates.items() if count > 1}
    if dupes:
        raise SystemExit(f"{name}: duplicate serialized inputs: {len(dupes)} groups")
    if len({row["id"] for row in rows}) != len(rows):
        raise SystemExit(f"{name}: duplicate ids")


def select_reviewed(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Select 2 D, 1 N and 1 REVIEW per family: 80 rows, all reviewed=false."""
    selected = []
    for family in FAMILY_SPLITS:
        fam = [row for row in rows if row["family"] == family]
        for label, count in ((1, 2), (0, 1), (None, 1)):
            group = [row for row in fam if row["label"] == label]
            selected.extend(group[:count])
    if len(selected) != 80:
        raise SystemExit(f"expected 80 reviewed rows, got {len(selected)}")
    for row in selected:
        row["reviewed"] = False
    return selected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "data/raw/generated.jsonl")
    parser.add_argument("--challenge", type=Path, default=ROOT / "data/challenge.jsonl")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "data")
    args = parser.parse_args()

    rows = read_jsonl(args.input)
    challenge = read_jsonl(args.challenge)
    validate_rows(rows, name="generated")
    validate_rows(challenge, name="challenge")
    if len(rows) != 400:
        raise SystemExit(f"expected 400 generated rows, got {len(rows)}")
    if len(challenge) != 100:
        raise SystemExit(f"expected 100 challenge rows, got {len(challenge)}")
    labels = Counter(row["label"] for row in rows)
    if labels != {1: 160, 0: 160, None: 80}:
        raise SystemExit(f"unexpected generated label counts: {labels}")
    ch_labels = Counter(row["label"] for row in challenge)
    if ch_labels != {1: 50, 0: 30, None: 20}:
        raise SystemExit(f"unexpected challenge label counts: {ch_labels}")
    families = {row["family"] for row in rows}
    if set(FAMILY_SPLITS) != families:
        raise SystemExit(f"family map mismatch: missing={families - set(FAMILY_SPLITS)}, extra={set(FAMILY_SPLITS) - families}")
    if families & {row["family"] for row in challenge}:
        raise SystemExit("challenge family leaked into synthetic families")

    splits = {"train": [], "val": [], "test": [], "review": []}
    for row in rows:
        if row["label"] is None:
            splits["review"].append(row)
        else:
            splits[FAMILY_SPLITS[row["family"]]].append(row)
    expected = {
        "train": {1: 112, 0: 112},
        "val": {1: 24, 0: 24},
        "test": {1: 24, 0: 24},
    }
    for name in ("train", "val", "test"):
        counts = Counter(row["label"] for row in splits[name])
        if dict(counts) != expected[name]:
            raise SystemExit(f"{name} label counts {counts} != {expected[name]}")
        if any(row["label"] is None for row in splits[name]):
            raise SystemExit(f"REVIEW row leaked into {name}")
    if len(splits["review"]) != 80:
        raise SystemExit(f"expected 80 review rows, got {len(splits['review'])}")
    if any(row["label"] is not None for row in splits["review"]):
        raise SystemExit("non-REVIEW row in review split")

    reviewed = select_reviewed(rows)
    challenge_families = sorted({row["family"] for row in challenge})

    out = args.out_dir
    write_jsonl(out / "splits/train.jsonl", splits["train"])
    write_jsonl(out / "splits/val.jsonl", splits["val"])
    write_jsonl(out / "splits/test.jsonl", splits["test"])
    write_jsonl(out / "splits/review.jsonl", splits["review"])
    write_jsonl(out / "reviewed.jsonl", reviewed)

    stats = {
        "generated_rows": len(rows),
        "challenge_rows": len(challenge),
        "generated_label_counts": {"1": labels[1], "0": labels[0], "null": labels[None]},
        "challenge_label_counts": {"1": ch_labels[1], "0": ch_labels[0], "null": ch_labels[None]},
        "split_counts": {name: len(rows_) for name, rows_ in splits.items()},
        "split_label_counts": {
            name: {str(k): v for k, v in Counter(r["label"] for r in rows_).items()}
            for name, rows_ in splits.items()
        },
        "reviewed_rows": len(reviewed),
        "reviewed_rows_with_human_signoff": 0,
        "reviewed_all_false": all(row["reviewed"] is False for row in reviewed),
        "families": {
            name: sorted({row["family"] for row in rows_}) for name, rows_ in splits.items()
        },
        "challenge_families": challenge_families,
        "execution_modes": dict(Counter(row["input"]["execution_mode"] for row in rows)),
        "tools": dict(Counter(row["input"]["tool_name"] for row in rows)),
        "note": "REVIEW rows are excluded from binary fitting; reviewed.jsonl is a synthetic-only audit queue.",
    }
    (out / "dataset_stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print(f"\nWrote splits and reviewed queue to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
