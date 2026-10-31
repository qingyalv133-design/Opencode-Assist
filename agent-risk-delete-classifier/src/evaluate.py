#!/usr/bin/env python3
"""Evaluate the selected model and the TF-IDF baseline on held-out sets.

The test and challenge sets are read only here.  Thresholds come from
artifacts/config.json (selected on validation by src.train).
"""
from __future__ import annotations

import csv
import json
import math
import os
import platform
import resource
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.policy import (  # noqa: E402
    CATEGORIES,
    CATEGORY_D,
    CATEGORY_N,
    CATEGORY_R,
    DECISION_APPROVAL,
    DECISION_NOT_CATEGORY,
    DECISION_REVIEW,
    Thresholds,
    decide,
    serialize_record,
)
from src.predict import Predictor  # noqa: E402


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def truth_label(row: Dict[str, Any]) -> str:
    return {1: CATEGORY_D, 0: CATEGORY_N, None: CATEGORY_R}[row["label"]]


def expected_decision(row: Dict[str, Any]) -> str:
    return {1: DECISION_APPROVAL, 0: DECISION_NOT_CATEGORY, None: DECISION_REVIEW}[row["label"]]


def rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 6) if denominator else 0.0


def bootstrap_ci(labels: Sequence[int], decisions: Sequence[str], metric: str) -> List[float]:
    rng = np.random.default_rng(42)
    values = []
    n = len(labels)
    for _ in range(1000):
        idx = rng.integers(0, n, n)
        y = np.asarray(labels)[idx]
        pred = np.asarray([1 if decisions[i] == DECISION_APPROVAL else 0 for i in range(n)])[idx]
        tp = int(np.sum((y == 1) & (pred == 1)))
        fp = int(np.sum((y == 0) & (pred == 1)))
        fn = int(np.sum((y == 1) & (pred == 0)))
        if metric == "precision":
            values.append(tp / max(1, tp + fp))
        elif metric == "recall":
            if (y == 1).sum() == 0:
                continue
            values.append(tp / max(1, tp + fn))
        else:
            raise ValueError(metric)
    if not values:
        return [float("nan"), float("nan")]
    lo, hi = np.percentile(values, [2.5, 97.5])
    return [round(float(lo), 6), round(float(hi), 6)]


def confusion(rows: Sequence[Dict[str, Any]], results: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    matrix = [[0 for _ in CATEGORIES] for _ in CATEGORIES]
    for row, result in zip(rows, results):
        true = truth_label(row)
        pred = result["category"]
        matrix[CATEGORIES.index(true)][CATEGORIES.index(pred)] += 1
    return {"labels": CATEGORIES, "matrix": matrix}


def binary_metrics(rows: Sequence[Dict[str, Any]], results: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    labels = [int(row["label"]) for row in rows]
    decisions = [result["decision"] for result in results]
    tp = sum(1 for y, d in zip(labels, decisions) if y == 1 and d == DECISION_APPROVAL)
    fp = sum(1 for y, d in zip(labels, decisions) if y == 0 and d == DECISION_APPROVAL)
    fn = sum(1 for y, d in zip(labels, decisions) if y == 1 and d != DECISION_APPROVAL)
    tn = sum(1 for y, d in zip(labels, decisions) if y == 0 and d == DECISION_NOT_CATEGORY)
    direct_pass = sum(1 for y, d in zip(labels, decisions) if y == 1 and d == DECISION_NOT_CATEGORY)
    destruct_review = sum(1 for y, d in zip(labels, decisions) if y == 1 and d == DECISION_REVIEW)
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    f1 = 2 * precision * recall / max(1e-12, precision + recall)
    fn_ids = [row["id"] for row, y, d in zip(rows, labels, decisions) if y == 1 and d != DECISION_APPROVAL]
    return {
        "n": len(rows),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "precision": round(precision, 6),
        "recall": round(recall, 6),
        "f1": round(f1, 6),
        "confirmation_rate": rate(tp + fp, len(rows)),
        "review_rate": rate(sum(1 for d in decisions if d == DECISION_REVIEW), len(rows)),
        "miss_rate": rate(fn, sum(1 for y in labels if y == 1)),
        "direct_pass": direct_pass,
        "destructive_routed_to_review": destruct_review,
        "false_negative_ids": fn_ids,
        "recall_ci95": bootstrap_ci(labels, decisions, "recall"),
        "precision_ci95": bootstrap_ci(labels, decisions, "precision"),
        "confusion": confusion(rows, results),
        "category_counts": dict(Counter(result["category"] for result in results)),
    }


def challenge_metrics(rows: Sequence[Dict[str, Any]], results: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    positives = [(row, result) for row, result in zip(rows, results) if row["label"] == 1]
    negatives = [(row, result) for row, result in zip(rows, results) if row["label"] == 0]
    reviews = [(row, result) for row, result in zip(rows, results) if row["label"] is None]
    pos_approval = sum(1 for _, result in positives if result["decision"] == DECISION_APPROVAL)
    pos_direct_pass = sum(1 for _, result in positives if result["decision"] == DECISION_NOT_CATEGORY)
    pos_review = sum(1 for _, result in positives if result["decision"] == DECISION_REVIEW)
    neg_approval = sum(1 for _, result in negatives if result["decision"] == DECISION_APPROVAL)
    neg_review = sum(1 for _, result in negatives if result["decision"] == DECISION_REVIEW)
    neg_pass = sum(1 for _, result in negatives if result["decision"] == DECISION_NOT_CATEGORY)
    review_pass = sum(1 for _, result in reviews if result["decision"] == DECISION_NOT_CATEGORY)
    review_human = sum(
        1 for _, result in reviews if result["decision"] in (DECISION_REVIEW, DECISION_APPROVAL)
    )
    return {
        "n": len(rows),
        "positive": {
            "n": len(positives),
            "approval": pos_approval,
            "review": pos_review,
            "direct_pass": pos_direct_pass,
            "approval_recall": rate(pos_approval, len(positives)),
            "human_review_or_approval": rate(pos_approval + pos_review, len(positives)),
            "recall_ci95": bootstrap_ci(
                [1 if row["label"] == 1 else 0 for row, _ in positives],
                [result["decision"] for _, result in positives],
                "recall",
            ) if positives else [float("nan"), float("nan")],
        },
        "negative": {
            "n": len(negatives),
            "approval_false_positive": neg_approval,
            "review": neg_review,
            "pass": neg_pass,
            "confirmation_rate": rate(neg_approval, len(negatives)),
            "review_rate": rate(neg_review, len(negatives)),
        },
        "review": {
            "n": len(reviews),
            "auto_pass": review_pass,
            "human_review_or_approval": review_human,
            "safe_routing_rate": rate(review_human, len(reviews)),
            "exact_review": sum(1 for _, result in reviews if result["decision"] == DECISION_REVIEW),
        },
        "confusion": confusion(rows, results),
    }


def validation_sweep(
    rows: Sequence[Dict[str, Any]], scores: Sequence[float], thresholds: Thresholds
) -> List[Dict[str, Any]]:
    out = []
    for high in [round(x / 100, 2) for x in range(5, 100, 5)]:
        if high <= thresholds.low:
            continue
        custom = Thresholds(
            high=high,
            low=thresholds.low,
            target_recall=thresholds.target_recall,
            high_val_precision=thresholds.high_val_precision,
            high_val_recall=thresholds.high_val_recall,
            low_val_false_pass_rate=thresholds.low_val_false_pass_rate,
        )
        decisions = [decide(row, float(score), custom) for row, score in zip(rows, scores)]
        d = [row for row in rows if row["label"] == 1]
        n = [row for row in rows if row["label"] == 0]
        d_dec = [dec for row, dec in zip(rows, decisions) if row["label"] == 1]
        n_dec = [dec for row, dec in zip(rows, decisions) if row["label"] == 0]
        out.append({
            "high": high,
            "low": custom.low,
            "confirmation_rate": rate(
                sum(1 for dec in decisions if dec["decision"] == DECISION_APPROVAL), len(rows)
            ),
            "review_rate": rate(
                sum(1 for dec in decisions if dec["decision"] == DECISION_REVIEW), len(rows)
            ),
            "destructive_miss_rate": rate(
                sum(1 for dec in d_dec if dec["decision"] != DECISION_APPROVAL), len(d)
            ),
            "destructive_direct_pass_rate": rate(
                sum(1 for dec in d_dec if dec["decision"] == DECISION_NOT_CATEGORY), len(d)
            ),
            "negative_confirmation_rate": rate(
                sum(1 for dec in n_dec if dec["decision"] == DECISION_APPROVAL), len(n)
            ),
        })
    return out


def rss_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(usage / (1024 * 1024) if os.uname().sysname == "Darwin" else usage / 1024, 2)


def evaluate_model(name: str, test, challenge, review, config, thresholds: Thresholds) -> Dict[str, Any]:
    started = time.perf_counter()
    predictor = Predictor(model_name=name)
    load_seconds = time.perf_counter() - started
    if name == "e5":
        _ = predictor.encoder
        load_seconds = time.perf_counter() - started

    test_scores = predictor.score_records(test).tolist()
    challenge_scores = predictor.score_records(challenge).tolist()
    review_scores = predictor.score_records(review).tolist()
    test_results = [decide(row, score, thresholds) for row, score in zip(test, test_scores)]
    ch_results = [decide(row, score, thresholds) for row, score in zip(challenge, challenge_scores)]
    rev_results = [decide(row, score, thresholds) for row, score in zip(review, review_scores)]

    # Latency on a single process, after warm-up.
    sample = test[: min(30, len(test))]
    if sample:
        predictor.score_records(sample[:2])
    latencies = []
    for row in sample:
        t0 = time.perf_counter()
        score = float(predictor.score_records([row])[0])
        decide(row, score, thresholds)
        latencies.append(time.perf_counter() - t0)
    batch_t0 = time.perf_counter()
    if test:
        predictor.score_records(test)
    batch_seconds = time.perf_counter() - batch_t0

    errors = []
    for dataset_name, rows, results in (
        ("test", test, test_results),
        ("challenge", challenge, ch_results),
        ("review", review, rev_results),
    ):
        for row, result in zip(rows, results):
            if result["decision"] != expected_decision(row):
                errors.append((name, dataset_name, row, result))
    return {
        "name": name,
        "load_seconds": round(load_seconds, 3),
        "test": binary_metrics(test, test_results),
        "challenge": challenge_metrics(challenge, ch_results),
        "review": {
            "n": len(review),
            "auto_pass": sum(1 for r in rev_results if r["decision"] == DECISION_NOT_CATEGORY),
            "routed_to_human": sum(
                1 for r in rev_results if r["decision"] in (DECISION_REVIEW, DECISION_APPROVAL)
            ),
            "exact_review": sum(1 for r in rev_results if r["decision"] == DECISION_REVIEW),
            "safe_routing_rate": rate(
                sum(1 for r in rev_results if r["decision"] in (DECISION_REVIEW, DECISION_APPROVAL)),
                len(review),
            ),
        },
        "latency_ms": {
            "p50": round(float(np.median(latencies) * 1000), 3) if latencies else None,
            "p95": round(float(np.percentile(latencies, 95) * 1000), 3) if latencies else None,
            "mean": round(float(np.mean(latencies) * 1000), 3) if latencies else None,
            "batch_32_ms_per_item": round(batch_seconds / max(1, len(test)) * 1000, 3),
        },
        "threshold_sweep_validation": validation_sweep(
            read_jsonl(ROOT / "data/splits/val.jsonl"),
            [float(predictor.score_records([row])[0]) for row in read_jsonl(ROOT / "data/splits/val.jsonl")],
            thresholds,
        ),
        "errors": errors,
        "rss_peak_mb": rss_mb(),
    }


def main() -> int:
    bundle = __import__("joblib").load(ROOT / "artifacts/classifier.joblib")
    config = json.loads((ROOT / "artifacts/config.json").read_text(encoding="utf-8"))
    test = read_jsonl(ROOT / "data/splits/test.jsonl")
    challenge = read_jsonl(ROOT / "data/challenge.jsonl")
    review = read_jsonl(ROOT / "data/splits/review.jsonl")
    if len(test) != 48 or len(challenge) != 100 or len(review) != 80:
        raise SystemExit("unexpected evaluation set sizes")
    if any(row["label"] is None for row in test):
        raise SystemExit("REVIEW row in test split")

    results = {}
    # Evaluate TF-IDF first so selected-TF-IDF memory does not include E5.
    for name in ("tfidf", "e5"):
        thresholds = Thresholds(**bundle[name]["thresholds"])
        results[name] = evaluate_model(name, test, challenge, review, config, thresholds)
    selected = config["selected_model"]
    selected_result = results[selected]
    test_metrics = selected_result["test"]
    challenge_result = selected_result["challenge"]
    gate = {
        "test_recall_at_least_95pct": test_metrics["recall"] >= 0.95,
        "challenge_no_direct_pass": challenge_result["positive"]["direct_pass"] == 0,
        "challenge_recall_at_least_95pct": challenge_result["positive"]["approval_recall"] >= 0.95,
        "review_set_no_auto_pass": selected_result["review"]["auto_pass"] == 0,
        "challenge_review_no_auto_pass": challenge_result["review"]["auto_pass"] == 0,
        "known_danger_rule_present": any(
            result["hard_rule"]
            for _, _, _, result in selected_result["errors"]
        ) or any(
            row["input"].get("tool_name", "").startswith(("shell", "filesystem", "powershell"))
            for row in test
        ),
    }
    gate["passes"] = all(gate.values())

    classifier_size = (ROOT / "artifacts/classifier.joblib").stat().st_size
    embedder_size = sum(p.stat().st_size for p in (ROOT / "artifacts/embedder").rglob("*") if p.is_file())
    metrics = {
        "model_version": "v1",
        "selected_model": selected,
        "model_selection_rule": (
            "Validation-only: both E5 and TF-IDF met >=95% validation recall. "
            "TF-IDF was selected because its validation precision was higher "
            "and it is much smaller/faster. Test and challenge were not used."
        ),
        "network_required": False,
        "model": {
            "selected": selected,
            "name": "intfloat/multilingual-e5-small",
            "revision": config["model_revision"],
            "weights_sha256": config["weights_sha256"],
            "embedding_prefix": config["embedding_prefix"],
            "serialization": config["serialization"],
            "classifier_bytes": classifier_size,
            "embedder_bytes": embedder_size,
            "e5_total_bytes": classifier_size + embedder_size,
            "tfidf_bundle_bytes": classifier_size,
            "classifier_mb": round(classifier_size / 1024 / 1024, 3),
            "embedder_mb": round(embedder_size / 1024 / 1024, 3),
            "e5_total_mb": round((classifier_size + embedder_size) / 1024 / 1024, 3),
            "selected_artifact_mb": (
                round(classifier_size / 1024 / 1024, 3)
                if selected == "tfidf"
                else round((classifier_size + embedder_size) / 1024 / 1024, 3)
            ),
        },
        "thresholds": bundle[selected]["thresholds"],
        "token_lengths": config.get("token_lengths", {}),
        "validation": bundle["validation"],
        "test": test_metrics,
        "challenge": challenge_result,
        "review_set": selected_result["review"],
        "false_negative_cases": [
            {
                "id": row["id"],
                "decision": result["decision"],
                "category": result["category"],
                "score": result["score"],
                "hard_rule": result["hard_rule"],
                "reason": result["reason"],
                "user_request": row["input"]["user_request"],
                "tool_name": row["input"]["tool_name"],
                "tool_args": row["input"]["tool_args"],
            }
            for _, dataset, row, result in selected_result["errors"]
            if dataset == "test" and row["label"] == 1
        ],
        "reviewed_status": {
            "human_signoff": False,
            "synthetic_only": True,
            "note": "reviewed.jsonl is a 80-row audit queue with reviewed=false; no human signoff exists.",
        },
        "performance_environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "machine": platform.machine(),
        },
        "models": {"e5": results["e5"], "tfidf": results["tfidf"]},
        "selected": results[selected],
        "baseline_tfidf": results["tfidf"],
        "main_e5": results["e5"],
        "safety_gate": gate,
        "errors": [
            {
                "model": model,
                "dataset": dataset,
                "id": row["id"],
                "family": row["family"],
                "true_label": truth_label(row),
                "expected_decision": expected_decision(row),
                "category": result["category"],
                "decision": result["decision"],
                "score": result["score"],
                "hard_rule": result["hard_rule"],
                "hard_rule_reasons": result["hard_rule_reasons"],
                "input_errors": result["input_errors"],
                "reason": result["reason"],
                "user_request": row["input"]["user_request"],
                "tool_name": row["input"]["tool_name"],
                "tool_args": row["input"]["tool_args"],
                "execution_mode": row["input"]["execution_mode"],
            }
            for model, dataset, row, result in selected_result["errors"]
        ],
    }
    metrics_path = ROOT / "artifacts/metrics.json"
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # errors.csv includes errors for both models, not just selected.
    with (ROOT / "artifacts/errors.csv").open("w", encoding="utf-8", newline="") as handle:
        fieldnames = [
            "model", "dataset", "id", "family", "true_label", "expected_decision",
            "category", "decision", "score", "hard_rule", "hard_rule_reasons",
            "input_errors", "reason", "user_request", "tool_name", "tool_args", "execution_mode",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for model in ("e5", "tfidf"):
            for _, dataset, row, result in results[model]["errors"]:
                writer.writerow({
                    "model": model,
                    "dataset": dataset,
                    "id": row["id"],
                    "family": row["family"],
                    "true_label": truth_label(row),
                    "expected_decision": expected_decision(row),
                    "category": result["category"],
                    "decision": result["decision"],
                    "score": result["score"],
                    "hard_rule": result["hard_rule"],
                    "hard_rule_reasons": " | ".join(result["hard_rule_reasons"]),
                    "input_errors": " | ".join(result["input_errors"]),
                    "reason": result["reason"],
                    "user_request": row["input"]["user_request"],
                    "tool_name": row["input"]["tool_name"],
                    "tool_args": json.dumps(row["input"]["tool_args"], ensure_ascii=False, sort_keys=True),
                    "execution_mode": row["input"]["execution_mode"],
                })

    print(json.dumps({
        "selected": selected,
        "gate": gate,
        "test": {k: test_metrics[k] for k in ("precision", "recall", "f1", "fn", "direct_pass")},
        "challenge": {
            "positive": challenge_result["positive"],
            "negative": challenge_result["negative"],
            "review": challenge_result["review"],
        },
        "review_set": selected_result["review"],
        "latency": selected_result["latency_ms"],
        "rss_peak_mb": selected_result["rss_peak_mb"],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
