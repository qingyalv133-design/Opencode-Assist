from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.policy import (  # noqa: E402
    CATEGORY_D,
    CATEGORY_N,
    CATEGORY_R,
    DECISION_APPROVAL,
    DECISION_NOT_CATEGORY,
    DECISION_REVIEW,
    Thresholds,
    decide,
    fit_thresholds,
    hard_rule,
    serialize_record,
    validate_input_payload,
    validate_record,
)


def make_row(command: str, *, mode: str = "execute", tool: str = "shell", label: int = 1, args=None):
    return {
        "id": "TEST-0001",
        "input": {
            "user_request": "test operation",
            "tool_name": tool,
            "tool_args": args if args is not None else {"command": command},
            "execution_mode": mode,
            "working_directory": "/workspace/demo",
        },
        "label": label,
        "family": "test_family",
        "rationale": "test",
        "source": "synthetic",
        "reviewed": False,
    }


THRESHOLDS = Thresholds(
    high=0.7,
    low=0.2,
    target_recall=0.95,
    high_val_precision=1.0,
    high_val_recall=1.0,
    low_val_false_pass_rate=0.0,
)


def test_serialization_is_fixed_and_includes_all_fields():
    text = serialize_record(make_row("rm -rf ./old"))
    assert text == (
        "user_request: test operation\n"
        "tool_name: shell\n"
        'tool_args: {"command":"rm -rf ./old"}\n'
        "execution_mode: execute\n"
        "working_directory: /workspace/demo"
    )


def test_schema_accepts_valid_row_and_cli_payload():
    row = make_row("rm -rf ./old")
    assert validate_record(row) == []
    assert validate_input_payload(row["input"]) == []


def test_schema_rejects_missing_fields_and_binary_preview_destructive():
    row = make_row("rm -rf ./old")
    del row["input"]["working_directory"]
    assert any("missing input keys" in error for error in validate_record(row))
    bad = make_row("rm -rf ./old", mode="preview", label=1)
    assert any("destructive row must use execution_mode=execute" in error for error in validate_record(bad))


def test_known_destructive_commands_trigger_hard_rule():
    for command in [
        "rm -rf /tmp/demo",
        "find /tmp -name '*.log' -delete",
        "git clean -fdx",
        "rsync -a --delete /a/ /b/",
        "Remove-Item -Recurse -Force C:\\tmp",
        "cat targets.txt | xargs rm -f",
        "python -c \"import shutil; shutil.rmtree('/tmp/x')\"",
    ]:
        triggered, reasons = hard_rule(make_row(command))
        assert triggered, (command, reasons)


def test_non_destructive_wrappers_do_not_trigger_hard_rule():
    for command in [
        "echo 'rm -rf /tmp/demo'",
        "rsync -a --dry-run --delete /a/ /b/",
        "git clean -ndx",
        "trash /tmp/demo",
        "Remove-Item -WhatIf C:\\tmp",
        "rm --help",
        "cat /etc/os-release",
    ]:
        triggered, reasons = hard_rule(make_row(command))
        assert not triggered, (command, reasons)


def test_filesystem_operation_hard_rule():
    triggered, _ = hard_rule(
        make_row("", tool="filesystem", args={"operation": "permanent_delete", "path": "/tmp/x", "recursive": True})
    )
    assert triggered
    triggered, _ = hard_rule(
        make_row("", tool="filesystem", args={"operation": "move_to_trash", "path": "/tmp/x"})
    )
    assert not triggered


def test_hard_rule_wins_over_low_model_score():
    result = decide(make_row("rm -rf /tmp/demo"), 0.0, THRESHOLDS)
    assert result["decision"] == DECISION_APPROVAL
    assert result["category"] == CATEGORY_D
    assert result["hard_rule"] is True


def test_high_low_and_review_bands():
    high = decide(make_row("echo hello"), 0.9, THRESHOLDS)
    assert high["decision"] == DECISION_APPROVAL
    mid = decide(make_row("echo hello"), 0.5, THRESHOLDS)
    assert mid["decision"] == DECISION_REVIEW
    assert mid["category"] == CATEGORY_R
    low = decide(make_row("echo hello"), 0.1, THRESHOLDS)
    assert low["decision"] == DECISION_NOT_CATEGORY
    assert low["category"] == CATEGORY_N


def test_preview_and_unknown_tool():
    preview = decide(make_row("rm -rf /tmp/demo", mode="preview"), 0.99, THRESHOLDS)
    assert preview["decision"] == DECISION_NOT_CATEGORY
    assert preview["category"] == CATEGORY_N
    unknown = decide(
        make_row("clean up", tool="mystery_tool", args={}), 0.99, THRESHOLDS
    )
    assert unknown["decision"] == DECISION_REVIEW
    assert unknown["category"] == CATEGORY_R


def test_missing_relative_target_is_review():
    row = make_row(
        "",
        tool="filesystem",
        label=1,
        args={"operation": "permanent_delete", "path": "old-project", "recursive": True},
    )
    row["input"]["working_directory"] = ""
    result = decide(row, 0.99, THRESHOLDS)
    assert result["decision"] == DECISION_REVIEW


def test_threshold_selection_uses_validation_only():
    y = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    scores = [0.9, 0.8, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3] + [0.2] * 10
    thresholds = fit_thresholds(y, scores, target_recall=0.95, low_margin=0.02)
    assert thresholds.high == 0.3
    assert thresholds.low <= thresholds.high
    assert thresholds.high_val_recall >= 0.95


def test_metrics_artifact_gate():
    metrics_path = ROOT / "artifacts/metrics.json"
    assert metrics_path.exists()
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    assert metrics["safety_gate"]["passes"] is True
    assert metrics["test"]["direct_pass"] == 0
    assert metrics["challenge"]["positive"]["direct_pass"] == 0
    assert metrics["challenge"]["review"]["auto_pass"] == 0
