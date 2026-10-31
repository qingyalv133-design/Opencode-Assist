#!/usr/bin/env python3
"""Offline CLI for the MVP.  It scores text and returns a policy decision.

The CLI never executes, deletes, or opens a path.  The model score is advisory;
the deterministic policy and the hard-rule layer can require review even when
the model score is low.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.policy import Thresholds, decide, serialize_record, validate_input_payload  # noqa: E402
from src.train import E5Encoder, make_tfidf, text_for_model  # noqa: E402


class Predictor:
    def __init__(self, model_name: Optional[str] = None, threads: int = 8) -> None:
        self.artifact_path = ROOT / "artifacts/classifier.joblib"
        self.config_path = ROOT / "artifacts/config.json"
        if not self.artifact_path.exists() or not self.config_path.exists():
            raise FileNotFoundError("artifacts/classifier.joblib or config.json is missing; run src.train first")
        self.bundle = joblib.load(self.artifact_path)
        self.config = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.model_name = model_name or self.config.get("selected_model", "e5")
        if self.model_name not in {"e5", "tfidf"}:
            raise ValueError("model must be e5 or tfidf")
        self.thresholds = Thresholds(**self.bundle[self.model_name]["thresholds"])
        self._encoder: Optional[E5Encoder] = None
        self._tfidf = self.bundle["tfidf"]["head"]
        self.threads = threads

    @property
    def encoder(self) -> E5Encoder:
        if self._encoder is None:
            self._encoder = E5Encoder(ROOT / self.bundle["embedder_dir"], max_length=512, threads=self.threads)
        return self._encoder

    def score_records(self, records: List[Dict[str, Any]]) -> np.ndarray:
        if self.model_name == "e5":
            texts = [text_for_model(record) for record in records]
            vectors = self.encoder.encode(texts, batch_size=16, show_progress=False)
            head = self.bundle["e5"]["head"]
            return head.predict_proba(vectors)[:, 1]
        texts = [serialize_record(record) for record in records]
        return self._tfidf.predict_proba(texts)[:, 1]

    def predict(self, record: Dict[str, Any]) -> Dict[str, Any]:
        errors = validate_input_payload(record)
        if errors:
            result = decide(record, None, self.thresholds)
            result["model_name"] = self.model_name
            return result
        if record.get("execution_mode") != "execute" and "input" not in record:
            result = decide(record, None, self.thresholds)
            result["model_name"] = self.model_name
            return result
        if isinstance(record.get("input"), dict) and record["input"].get("execution_mode") != "execute":
            result = decide(record, None, self.thresholds)
            result["model_name"] = self.model_name
            return result
        score = float(self.score_records([record])[0])
        result = decide(record, score, self.thresholds)
        result["model_name"] = self.model_name
        return result


def _error_result(message: str) -> Dict[str, Any]:
    return {
        "category": "REVIEW",
        "score": None,
        "decision": "REVIEW",
        "model_version": "v1",
        "reason": message,
        "hard_rule": False,
        "hard_rule_reasons": [],
        "input_errors": [message],
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-json", type=str, help="JSON object with the five input fields.")
    parser.add_argument("--input-file", type=Path, help="Read one JSON object from a file.")
    parser.add_argument("--model", choices=["e5", "tfidf"], default=None)
    args = parser.parse_args(argv)

    raw = args.input_json
    if args.input_file:
        raw = args.input_file.read_text(encoding="utf-8")
    if raw is None:
        raw = sys.stdin.read()
    try:
        record = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps(_error_result(f"invalid JSON: {exc}"), ensure_ascii=False, indent=2))
        return 0
    try:
        predictor = Predictor(model_name=args.model)
        result = predictor.predict(record)
    except Exception as exc:  # load/runtime errors must fail closed
        print(json.dumps(_error_result(f"model/runtime failure: {exc}"), ensure_ascii=False, indent=2))
        return 0
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
