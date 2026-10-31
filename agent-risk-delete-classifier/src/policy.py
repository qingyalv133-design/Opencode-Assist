"""Schema validation, fixed serialization, deterministic delete rules, and policy.

This module deliberately has no model or filesystem dependency.  It is safe to
import and test without loading E5.  It never executes any command or resolves
any real path.
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

CATEGORY_D = "DESTRUCTIVE_DELETE"
CATEGORY_N = "NOT_DESTRUCTIVE_DELETE"
CATEGORY_R = "REVIEW"
CATEGORIES = [CATEGORY_D, CATEGORY_N, CATEGORY_R]

DECISION_APPROVAL = "REQUIRE_APPROVAL"
DECISION_REVIEW = "REVIEW"
DECISION_NOT_CATEGORY = "NOT_THIS_CATEGORY"

EXECUTION_MODES = {"execute", "preview", "explain"}
KNOWN_TOOLS = {
    "shell", "powershell", "cmd", "python", "filesystem", "nas", "ci",
    "docker", "ssh", "cloud", "device", "database", "editor", "blender", "ui",
}
INPUT_KEYS = {"user_request", "tool_name", "tool_args", "execution_mode", "working_directory"}
TOP_KEYS = {"id", "input", "label", "family", "rationale", "source", "reviewed"}


def normalize_tool_name(tool_name: str) -> str:
    return str(tool_name or "").split(".", 1)[0].strip().lower()


def payload_of(record: Dict[str, Any]) -> Dict[str, Any]:
    """Accept either a full data row or the five-field CLI input object."""
    if isinstance(record, dict) and isinstance(record.get("input"), dict):
        return record["input"]
    return record if isinstance(record, dict) else {}


def serialize_record(record: Dict[str, Any]) -> str:
    """The single canonical text template used for training and inference."""
    payload = payload_of(record)
    args = json.dumps(
        payload.get("tool_args") or {}, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    cwd = payload.get("working_directory") or "<unknown>"
    return (
        f"user_request: {str(payload.get('user_request', '')).strip()}\n"
        f"tool_name: {str(payload.get('tool_name', '')).strip()}\n"
        f"tool_args: {args}\n"
        f"execution_mode: {str(payload.get('execution_mode', '')).strip()}\n"
        f"working_directory: {cwd}"
    )


def validate_input_payload(record: Dict[str, Any]) -> List[str]:
    """Validate only the inference input object (no labels or family needed)."""
    errors: List[str] = []
    payload = payload_of(record)
    if not isinstance(payload, dict):
        return ["input must be an object"]
    missing_input = INPUT_KEYS - set(payload)
    if missing_input:
        errors.append(f"missing input keys: {sorted(missing_input)}")
    if not isinstance(payload.get("user_request"), str) or not payload.get("user_request", "").strip():
        errors.append("input.user_request must be a non-empty string")
    if not isinstance(payload.get("tool_name"), str):
        errors.append("input.tool_name must be a string")
    if not isinstance(payload.get("tool_args"), dict):
        errors.append("input.tool_args must be an object")
    if payload.get("execution_mode") not in EXECUTION_MODES:
        errors.append("input.execution_mode must be execute, preview, or explain")
    if not isinstance(payload.get("working_directory"), str):
        errors.append("input.working_directory must be a string")
    return errors


def validate_record(record: Dict[str, Any]) -> List[str]:
    """Validate a full training/evaluation row."""
    errors: List[str] = []
    if not isinstance(record, dict):
        return ["record must be an object"]
    missing = TOP_KEYS - set(record)
    if missing:
        errors.append(f"missing top-level keys: {sorted(missing)}")
    if not isinstance(record.get("id"), str) or not record.get("id", "").strip():
        errors.append("id must be a non-empty string")
    if record.get("label") not in (0, 1, None) or type(record.get("label")) is bool:
        errors.append("label must be 0, 1, or null")
    for key in ("family", "rationale", "source"):
        if not isinstance(record.get(key), str) or not record.get(key, "").strip():
            errors.append(f"{key} must be a non-empty string")
    if not isinstance(record.get("reviewed"), bool):
        errors.append("reviewed must be a boolean")
    errors.extend(validate_input_payload(record))
    payload = payload_of(record)
    if record.get("label") in (0, 1):
        tool = normalize_tool_name(payload.get("tool_name", ""))
        if tool not in KNOWN_TOOLS:
            errors.append(f"binary row has unknown tool: {payload.get('tool_name')!r}")
        if record.get("label") == 1 and payload.get("execution_mode") != "execute":
            errors.append("destructive row must use execution_mode=execute")
    return errors

def _args(record: Dict[str, Any]) -> Dict[str, Any]:
    return payload_of(record).get("tool_args") or {}


def infer_operation(record: Dict[str, Any]) -> str:
    """Infer an operation from a namespaced tool name when args omit it."""
    payload = payload_of(record)
    args = _args(record)
    operation = str(args.get("operation") or args.get("action") or "").strip().lower()
    if operation:
        return operation
    raw = str(payload.get("tool_name", "")).strip().lower()
    suffix = raw.split(".", 1)[1] if "." in raw else ""
    mapping = {
        "delete": "permanent_delete",
        "permanent_delete": "permanent_delete",
        "delete_artifacts": "delete_artifacts",
        "delete_prefix": "delete_prefix",
        "rm": "permanent_delete",
        "rmtree": "rmtree",
        "empty_trash": "empty_trash",
    }
    return mapping.get(suffix, "")


def missing_argument_issues(record: Dict[str, Any]) -> List[str]:
    """Missing critical arguments make an execute request REVIEW."""
    payload = payload_of(record)
    if payload.get("execution_mode") != "execute":
        return []
    tool = normalize_tool_name(payload.get("tool_name", ""))
    args = _args(record)
    issues: List[str] = []
    if tool in {"shell", "powershell", "cmd", "ssh"}:
        if not str(args.get("command", "")).strip():
            issues.append(f"{tool} command is empty")
    elif tool == "python":
        if not str(args.get("code", "")).strip():
            issues.append("python code is empty")
    elif tool == "filesystem":
        op = infer_operation(record)
        if not op:
            issues.append("filesystem operation is missing")
        if op in {
            "permanent_delete", "delete", "delete_glob", "rmtree", "move_to_trash",
            "move", "copy", "archive", "read", "list",
        } and not any(args.get(k) for k in ("path", "paths", "source")):
            issues.append("filesystem target path is missing")
    elif tool == "docker":
        if not (args.get("action") or args.get("command")):
            issues.append("docker action/command is missing")
    elif tool == "cloud":
        if not (infer_operation(record) or args.get("command")):
            issues.append("cloud operation is missing")
        if not args.get("bucket"):
            issues.append("cloud bucket is missing")
    elif tool in {"nas", "device", "database", "editor", "blender", "ui", "ci"}:
        if not (infer_operation(record) or args.get("command")):
            issues.append(f"{tool} operation is missing")
    else:
        issues.append(f"unknown tool semantics: {payload.get('tool_name')!r}")
    # A relative target without a working directory has an unknown consequence.
    cwd = str(payload.get("working_directory", "")).strip()
    if not cwd:
        command = str(args.get("command", "")) + " " + str(args.get("code", ""))
        paths = [str(args.get(k, "")) for k in ("path", "source", "destination")]
        paths += [str(x) for x in args.get("paths", [])] if isinstance(args.get("paths"), list) else []
        for target in paths + re.findall(r"(?:\.{1,2}/[^\s'\"]+)", command):
            if target and not (target.startswith(("/", "~")) or re.match(r"^[A-Za-z]:[\\/]", target)):
                issues.append(f"relative target without working_directory: {target}")
                break
    return issues


def _segments(text: str) -> List[str]:
    return [seg.strip() for seg in re.split(r"&&|\|\||\||[;\n]", text) if seg.strip()]


def _skip_segment(segment: str) -> bool:
    lowered = segment.lower()
    if any(token in lowered for token in (
        "--dry-run", "--dryrun", "--whatif", "--what-if", "-whatif",
        "git clean -ndx", "rm --help", "rm --version", "trash", "send2trash",
        "recyclebin", "echo ", "printf ", "write-output", "cat ", "less ", "man ",
        "print(",
    )):
        return True
    return False


SHELL_DELETE_PATTERNS = [
    re.compile(r"(?:^|[\s;&|])rm\s+(?!--help\b|--version\b)", re.I),
    re.compile(r"\bunlink\s+", re.I),
    re.compile(r"\bshred\s+", re.I),
    re.compile(r"\bsrm\s+", re.I),
    re.compile(r"\brmdir\s+", re.I),
    re.compile(r"\bfind\b[^\n]*\s-delete\b", re.I),
    re.compile(r"\bgit\s+clean\s+-[a-z]*[fd]", re.I),
    re.compile(r"\brsync\b[^\n]*(?:--delete|--remove-source-files)", re.I),
    re.compile(r"\bshutil\.rmtree\s*\(", re.I),
    re.compile(r"\bos\.remove\s*\(", re.I),
    re.compile(r"\.unlink\s*\(", re.I),
    re.compile(r"\bfs\.(?:rmSync|rm)\s*\(", re.I),
    re.compile(r"\bRemove-Item\b", re.I),
    re.compile(r"\bClear-RecycleBin\b", re.I),
    re.compile(r"\b(?:rd|rmdir)\s+/s\b", re.I),
    re.compile(r"\bdel\s+/[fs]\b", re.I),
    re.compile(r"\btrash-empty\b", re.I),
    re.compile(r"\bdocker\s+system\s+prune\b[^\n]*--volumes\b", re.I),
    re.compile(r"\bdocker\s+volume\s+rm\b", re.I),
    re.compile(r"\baws\s+s3\s+rm\b[^\n]*--recursive\b", re.I),
    re.compile(r"\bgsutil\b[^\n]*\brm\b", re.I),
    re.compile(r"\brclone\s+purge\b", re.I),
    re.compile(r"\baz\s+storage\s+blob\s+delete-batch\b", re.I),
    re.compile(r"\btar\b[^\n]*--remove-files\b", re.I),
]


def hard_rule(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Independent known-danger rule.  Never depends on the model score."""
    payload = payload_of(record)
    if payload.get("execution_mode") != "execute":
        return False, []
    tool = normalize_tool_name(payload.get("tool_name", ""))
    args = _args(record)
    reasons: List[str] = []

    command = str(args.get("command") or args.get("code") or "")
    if command:
        for segment in _segments(command):
            if _skip_segment(segment):
                continue
            if any(pattern.search(segment) for pattern in SHELL_DELETE_PATTERNS):
                reasons.append(f"known destructive command: {segment[:120]}")

    operation = infer_operation(record) or str(args.get("command") or "").strip().lower()
    if tool == "filesystem" and operation in {
        "permanent_delete", "delete", "delete_glob", "rmtree", "empty_trash",
    }:
        reasons.append(f"filesystem operation: {operation}")
    if tool == "cloud" and operation in {
        "delete", "delete_prefix", "rm", "purge", "permanent_delete",
    }:
        reasons.append(f"cloud operation: {operation}")
    if tool == "docker" and (
        operation == "volume_remove" or (operation == "prune" and args.get("volumes"))
    ):
        reasons.append(f"docker destructive action: {operation}")
    if tool == "device" and operation in {"permanent_delete", "empty_trash"}:
        reasons.append(f"device operation: {operation}")
    if tool == "ci" and operation == "delete_artifacts":
        reasons.append("CI artifact deletion")
    if tool == "nas" and operation in {"permanent_delete", "delete"}:
        reasons.append(f"NAS operation: {operation}")

    # Remove duplicate reasons while preserving order.
    return bool(reasons), list(dict.fromkeys(reasons))


@dataclass
class Thresholds:
    high: float
    low: float
    target_recall: float
    high_val_precision: float
    high_val_recall: float
    low_val_false_pass_rate: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def choose_high_threshold(
    y_true: Sequence[int], scores: Sequence[float], target_recall: float = 0.95
) -> Tuple[float, Dict[str, float]]:
    y = list(y_true)
    p = list(scores)
    positives = [score for label, score in zip(y, p) if label == 1]
    if not positives:
        raise ValueError("no positive validation rows")
    candidates = sorted(set(round(v, 6) for v in p), reverse=True)
    selected = 0.0
    for threshold in candidates:
        pred = [score >= threshold for score in p]
        tp = sum(1 for label, hit in zip(y, pred) if label == 1 and hit)
        fn = sum(1 for label, hit in zip(y, pred) if label == 1 and not hit)
        recall = tp / max(1, tp + fn)
        if recall + 1e-12 >= target_recall:
            selected = float(threshold)
            break
    pred = [score >= selected for score in p]
    tp = sum(1 for label, hit in zip(y, pred) if label == 1 and hit)
    fp = sum(1 for label, hit in zip(y, pred) if label == 0 and hit)
    fn = sum(1 for label, hit in zip(y, pred) if label == 1 and not hit)
    return selected, {
        "precision": tp / max(1, tp + fp),
        "recall": tp / max(1, tp + fn),
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def fit_thresholds(
    y_val: Sequence[int],
    scores: Sequence[float],
    *,
    target_recall: float = 0.95,
    low_margin: float = 0.02,
) -> Thresholds:
    high, stats = choose_high_threshold(y_val, scores, target_recall)
    positives = [score for label, score in zip(y_val, scores) if label == 1]
    negatives = [score for label, score in zip(y_val, scores) if label == 0]
    min_positive = min(positives)
    low = max(0.0, min(high - 0.01, min_positive - low_margin))
    # Ensure the middle band is non-empty even in degenerate validation samples.
    low = min(low, max(0.0, high - 0.01))
    false_pass = sum(1 for score in negatives if score <= low)
    return Thresholds(
        high=round(float(high), 6),
        low=round(float(low), 6),
        target_recall=float(target_recall),
        high_val_precision=round(float(stats["precision"]), 6),
        high_val_recall=round(float(stats["recall"]), 6),
        low_val_false_pass_rate=round(false_pass / max(1, len(negatives)), 6),
    )


def decide(
    record: Dict[str, Any], score: Optional[float], thresholds: Thresholds
) -> Dict[str, Any]:
    """Apply validation schema, mode, deterministic rules, then the two thresholds."""
    errors = validate_input_payload(record)
    payload = payload_of(record)
    mode = payload.get("execution_mode")
    base = {
        "model_version": "v1",
        "score": None if score is None else round(float(score), 6),
        "thresholds": thresholds.to_dict(),
        "hard_rule": False,
        "hard_rule_reasons": [],
        "input_errors": errors,
    }
    if errors:
        return {
            **base,
            "category": CATEGORY_R,
            "decision": DECISION_REVIEW,
            "reason": "input validation failed",
        }
    if mode != "execute":
        return {
            **base,
            "category": CATEGORY_N,
            "decision": DECISION_NOT_CATEGORY,
            "reason": f"execution_mode={mode}; not an executed operation",
        }
    issues = missing_argument_issues(record)
    if issues:
        return {
            **base,
            "input_errors": issues,
            "category": CATEGORY_R,
            "decision": DECISION_REVIEW,
            "reason": "missing or ambiguous execution context",
        }
    triggered, reasons = hard_rule(record)
    base["hard_rule"] = triggered
    base["hard_rule_reasons"] = reasons
    if triggered:
        return {
            **base,
            "category": CATEGORY_D,
            "decision": DECISION_APPROVAL,
            "reason": "independent known-danger rule requires confirmation",
        }
    if score is None:
        return {
            **base,
            "category": CATEGORY_R,
            "decision": DECISION_REVIEW,
            "reason": "model score unavailable",
        }
    if score >= thresholds.high:
        return {
            **base,
            "category": CATEGORY_D,
            "decision": DECISION_APPROVAL,
            "reason": "score >= high threshold",
        }
    if score <= thresholds.low:
        return {
            **base,
            "category": CATEGORY_N,
            "decision": DECISION_NOT_CATEGORY,
            "reason": "score <= low threshold",
        }
    return {
        **base,
        "category": CATEGORY_R,
        "decision": DECISION_REVIEW,
        "reason": "score is in the review band",
    }
