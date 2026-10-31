#!/usr/bin/env python3
"""Train the frozen-E5 binary head and the TF-IDF char n-gram baseline.

REVIEW rows are never read here.  The E5 model is frozen; only LogisticRegression
heads and optional feature standardization are fitted.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Sequence, Tuple

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.policy import (  # noqa: E402
    DECISION_APPROVAL,
    DECISION_NOT_CATEGORY,
    DECISION_REVIEW,
    Thresholds,
    choose_high_threshold,
    decide,
    fit_thresholds,
    serialize_record,
)

MODEL_NAME = "intfloat/multilingual-e5-small"
MODEL_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"
WEIGHTS_SHA256 = "1a55775f53449dac10a2bcbc312469fac40b96d53198c407081a831f81c98477"
EMBEDDING_PREFIX = "query: "
SEED = 42


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch

        torch.manual_seed(seed)
    except ImportError:
        pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def text_for_model(record: Dict[str, Any]) -> str:
    # E5 requires the query prefix.  The same prefix is used by predict/evaluate.
    return EMBEDDING_PREFIX + serialize_record(record)


class E5Encoder:
    def __init__(self, model_dir: Path, max_length: int = 512, threads: int = 8) -> None:
        os.environ.setdefault("HF_HOME", str(ROOT / ".hf-cache"))
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
        import torch
        from sentence_transformers import SentenceTransformer

        if threads > 0:
            torch.set_num_threads(threads)
        started = time.perf_counter()
        self.model = SentenceTransformer(
            str(model_dir), device="cpu", local_files_only=True
        )
        self.model.max_seq_length = max_length
        self.load_seconds = time.perf_counter() - started
        self.dimension = int(self.model.get_sentence_embedding_dimension())
        self.parameter_count = int(sum(p.numel() for p in self.model.parameters()))

    def encode(self, texts: Sequence[str], batch_size: int = 16, show_progress: bool = True) -> np.ndarray:
        vectors = self.model.encode(
            list(texts),
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return np.asarray(vectors, dtype=np.float32)


def make_lr(C: float, *, standardize: bool):
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    steps = []
    if standardize:
        steps.append(("scale", StandardScaler()))
    steps.append((
        "clf",
        LogisticRegression(
            C=C,
            solver="liblinear",
            max_iter=5000,
            random_state=SEED,
        ),
    ))
    return Pipeline(steps)


def make_tfidf(C: float):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline

    return Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 5),
            sublinear_tf=True,
            min_df=1,
            max_features=100000,
            lowercase=True,
        )),
        ("clf", LogisticRegression(
            C=C,
            solver="liblinear",
            max_iter=5000,
            random_state=SEED,
        )),
    ])


def labels(rows: Sequence[Dict[str, Any]]) -> np.ndarray:
    return np.asarray([int(row["label"]) for row in rows], dtype=np.int64)


def select_C(
    X: Any,
    y: np.ndarray,
    groups: Sequence[str],
    c_grid: Sequence[float],
    factory: Callable[[float], Any],
    n_splits: int = 7,
) -> Tuple[float, List[Dict[str, float]]]:
    from sklearn.metrics import log_loss
    from sklearn.model_selection import GroupKFold

    splitter = GroupKFold(n_splits=min(n_splits, len(set(groups))))
    results: List[Dict[str, float]] = []
    for C in c_grid:
        losses = []
        for train_idx, val_idx in splitter.split(X, y, groups):
            if len(set(y[train_idx])) < 2 or len(set(y[val_idx])) < 2:
                continue
            model = factory(C)
            if hasattr(X, "shape") and not isinstance(X, list):
                model.fit(X[train_idx], y[train_idx])
                probs = model.predict_proba(X[val_idx])[:, 1]
            else:
                model.fit([X[i] for i in train_idx], y[train_idx])
                probs = model.predict_proba([X[i] for i in val_idx])[:, 1]
            losses.append(float(log_loss(y[val_idx], probs, labels=[0, 1])))
        results.append({
            "C": float(C),
            "mean_log_loss": round(float(np.mean(losses)) if losses else float("inf"), 6),
            "folds": len(losses),
        })
    best = min(results, key=lambda row: (row["mean_log_loss"], row["C"]))
    return float(best["C"]), results


def positive_probs(model: Any, X: Any) -> np.ndarray:
    classes = list(model.classes_)
    return model.predict_proba(X)[:, classes.index(1)]


def summarize_validation(rows: Sequence[Dict[str, Any]], scores: Sequence[float], thresholds: Thresholds) -> Dict[str, Any]:
    decisions = [decide(row, float(score), thresholds) for row, score in zip(rows, scores)]
    tp = sum(1 for row, d in zip(rows, decisions) if row["label"] == 1 and d["decision"] == DECISION_APPROVAL)
    fn = sum(1 for row, d in zip(rows, decisions) if row["label"] == 1 and d["decision"] != DECISION_APPROVAL)
    fp = sum(1 for row, d in zip(rows, decisions) if row["label"] == 0 and d["decision"] == DECISION_APPROVAL)
    tn = sum(1 for row, d in zip(rows, decisions) if row["label"] == 0 and d["decision"] == DECISION_NOT_CATEGORY)
    review = sum(1 for d in decisions if d["decision"] == DECISION_REVIEW)
    return {
        "n": len(rows),
        "confirmation_tp": tp,
        "confirmation_fp": fp,
        "confirmation_fn": fn,
        "not_category_tn": tn,
        "review_count": review,
        "confirmation_rate": round((tp + fp) / max(1, len(rows)), 6),
        "review_rate": round(review / max(1, len(rows)), 6),
        "miss_rate": round(fn / max(1, sum(1 for row in rows if row["label"] == 1)), 6),
    }


def main() -> int:
    set_seed(SEED)
    data_dir = ROOT / "data"
    train_rows = read_jsonl(data_dir / "splits/train.jsonl")
    val_rows = read_jsonl(data_dir / "splits/val.jsonl")
    if any(row["label"] not in (0, 1) for row in train_rows + val_rows):
        raise SystemExit("REVIEW row leaked into binary training or validation")
    if {row["family"] for row in train_rows} & {row["family"] for row in val_rows}:
        raise SystemExit("family leakage between train and validation")
    if len(train_rows) != 224 or len(val_rows) != 48:
        raise SystemExit(f"unexpected split sizes: train={len(train_rows)} val={len(val_rows)}")

    y_train = labels(train_rows)
    y_val = labels(val_rows)
    groups = [row["family"] for row in train_rows]
    c_grid = [0.03, 0.1, 0.3, 1.0, 3.0, 10.0]

    started = time.perf_counter()
    encoder = E5Encoder(ROOT / "artifacts/embedder", max_length=512, threads=8)
    print("Encoding train with frozen E5 ...", flush=True)
    X_train_e5 = encoder.encode([text_for_model(row) for row in train_rows], batch_size=16)
    print("Encoding validation with frozen E5 ...", flush=True)
    X_val_e5 = encoder.encode([text_for_model(row) for row in val_rows], batch_size=16)
    token_lengths = [
        len(encoder.model.tokenizer.encode(text_for_model(row)))
        for row in list(train_rows) + list(val_rows)
    ]
    token_stats = {
        "max_tokens": int(max(token_lengths)),
        "mean_tokens": round(float(np.mean(token_lengths)), 2),
        "over_512": int(sum(1 for value in token_lengths if value > 512)),
        "sample_count": len(token_lengths),
    }
    c_e5, cv_e5 = select_C(X_train_e5, y_train, groups, c_grid, lambda C: make_lr(C, standardize=True), 7)
    e5_head = make_lr(c_e5, standardize=True).fit(X_train_e5, y_train)
    e5_val_scores = positive_probs(e5_head, X_val_e5)

    train_texts = [serialize_record(row) for row in train_rows]
    val_texts = [serialize_record(row) for row in val_rows]
    c_tfidf, cv_tfidf = select_C(train_texts, y_train, groups, c_grid, make_tfidf, 5)
    tfidf_head = make_tfidf(c_tfidf).fit(train_texts, y_train)
    tfidf_val_scores = positive_probs(tfidf_head, val_texts)

    e5_thresholds = fit_thresholds(y_val.tolist(), e5_val_scores.tolist(), target_recall=0.95)
    tfidf_thresholds = fit_thresholds(y_val.tolist(), tfidf_val_scores.tolist(), target_recall=0.95)
    e5_val = summarize_validation(val_rows, e5_val_scores, e5_thresholds)
    tfidf_val = summarize_validation(val_rows, tfidf_val_scores, tfidf_thresholds)

    # Validation-only selection: both models must meet the recall target;
    # if both do, prefer the simpler model unless E5 has materially better
    # validation precision.  Test and challenge are not consulted here.
    e5_ok = e5_val["miss_rate"] <= 0.05
    tfidf_ok = tfidf_val["miss_rate"] <= 0.05
    if e5_ok and tfidf_ok:
        selected = "tfidf" if tfidf_thresholds.high_val_precision >= e5_thresholds.high_val_precision else "e5"
    elif e5_ok:
        selected = "e5"
    else:
        selected = "tfidf"
    artifact_dir = ROOT / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    bundle = {
        "version": "v1",
        "selected_model": selected,
        "serialization": "v1",
        "embedding_prefix": EMBEDDING_PREFIX,
        "embedder_dir": "artifacts/embedder",
        "model_name": MODEL_NAME,
        "model_revision": MODEL_REVISION,
        "weights_sha256": WEIGHTS_SHA256,
        "e5": {
            "head": e5_head,
            "selected_C": c_e5,
            "cv": cv_e5,
            "thresholds": e5_thresholds.to_dict(),
        },
        "tfidf": {
            "head": tfidf_head,
            "selected_C": c_tfidf,
            "cv": cv_tfidf,
            "thresholds": tfidf_thresholds.to_dict(),
        },
        "validation": {"e5": e5_val, "tfidf": tfidf_val},
        "selection_rule": "validation-only: both must meet recall>=95%; otherwise use the one that does; if both pass, choose higher validation precision, preferring the simpler TF-IDF on a tie",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    joblib.dump(bundle, artifact_dir / "classifier.joblib", compress=3)

    config = {
        "model_version": "v1",
        "selected_model": selected,
        "model_name": MODEL_NAME,
        "model_revision": MODEL_REVISION,
        "weights_sha256": WEIGHTS_SHA256,
        "embedding_prefix": EMBEDDING_PREFIX,
        "embedder_dir": "artifacts/embedder",
        "serialization": "v1",
        "thresholds": bundle[selected]["thresholds"],
        "validation": bundle["validation"][selected],
        "selection_rule": bundle["selection_rule"],
        "training": {
            "seed": SEED,
            "train_rows": len(train_rows),
            "val_rows": len(val_rows),
            "review_rows_excluded": 80,
            "selected_C": {"e5": c_e5, "tfidf": c_tfidf},
            "feature": "frozen E5 mean pooling + L2; StandardScaler + LogisticRegression",
            "baseline": "TF-IDF char_wb 2-5 + LogisticRegression",
        },
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "machine": platform.machine(),
        },
        "data_hashes": {
            "train_sha256": sha256(data_dir / "splits/train.jsonl"),
            "val_sha256": sha256(data_dir / "splits/val.jsonl"),
            "generated_sha256": sha256(data_dir / "raw/generated.jsonl"),
            "challenge_sha256": sha256(data_dir / "challenge.jsonl"),
        },
        "token_lengths": token_stats,
        "fit_seconds": round(time.perf_counter() - started, 3),
        "e5_load_seconds": round(encoder.load_seconds, 3),
        "note": "REVIEW rows are excluded from binary fitting. No model was selected or tuned on test/challenge.",
    }
    (artifact_dir / "config.json").write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("\n=== VALIDATION ===")
    print(json.dumps({"e5": e5_val, "tfidf": tfidf_val, "e5_thresholds": e5_thresholds.to_dict(), "tfidf_thresholds": tfidf_thresholds.to_dict()}, ensure_ascii=False, indent=2))
    print(f"\nWrote {artifact_dir / 'classifier.joblib'} and {artifact_dir / 'config.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
