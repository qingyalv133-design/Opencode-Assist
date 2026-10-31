#!/usr/bin/env python3
"""Print the type and fitted hyperparameters of artifacts/classifier.joblib."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, np.ndarray):
        return {"shape": list(value.shape), "min": float(value.min()), "max": float(value.max())}
    if isinstance(value, type):
        return value.__name__
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def inspect_head(name: str, data: dict[str, Any]) -> dict[str, Any]:
    pipeline = data["head"]
    out: dict[str, Any] = {
        "pipeline_type": type(pipeline).__name__,
        "steps": [{"name": step_name, "type": type(step).__name__} for step_name, step in pipeline.steps],
        "selected_C": data.get("selected_C"),
        "thresholds": data.get("thresholds"),
        "components": {},
        "learned_parameters": {},
    }
    for step_name, step in pipeline.named_steps.items():
        component: dict[str, Any] = {
            "type": type(step).__name__,
            "params": clean(step.get_params(deep=False)),
        }
        for attr in ("n_features_in_", "coef_", "intercept_", "classes_", "vocabulary_", "idf_"):
            if not hasattr(step, attr):
                continue
            value = getattr(step, attr)
            if attr == "vocabulary_":
                component["vocabulary_size"] = len(value)
            elif attr == "idf_":
                component["idf"] = clean(value)
            elif attr in ("coef_", "intercept_"):
                array = np.asarray(value)
                component[attr] = {
                    "shape": list(array.shape),
                    "values": array.ravel()[:8].tolist(),
                    "note": "first 8 values only" if array.size > 8 else "all values",
                }
                out["learned_parameters"][f"{step_name}.{attr}"] = int(array.size)
            else:
                component[attr] = clean(value)
        out["components"][step_name] = component
    if not out["learned_parameters"]:
        for step_name, step in pipeline.named_steps.items():
            for attr in ("coef_", "intercept_"):
                if hasattr(step, attr):
                    out["learned_parameters"][f"{step_name}.{attr}"] = int(np.asarray(getattr(step, attr)).size)
    out["learned_parameter_count"] = sum(out["learned_parameters"].values())
    return out


def main() -> int:
    path = ROOT / "artifacts/classifier.joblib"
    bundle = joblib.load(path)
    config = json.loads((ROOT / "artifacts/config.json").read_text(encoding="utf-8"))
    report = {
        "artifact": {
            "path": str(path),
            "bytes": path.stat().st_size,
            "bundle_type": type(bundle).__name__,
            "serialization": bundle.get("serialization"),
            "version": bundle.get("version"),
            "selected_model": bundle.get("selected_model"),
        },
        "config": {
            "model_name": config.get("model_name"),
            "model_revision": config.get("model_revision"),
            "embedding_prefix": config.get("embedding_prefix"),
            "selected_model": config.get("selected_model"),
            "thresholds": config.get("thresholds"),
            "training": config.get("training"),
        },
        "heads": {
            name: inspect_head(name, bundle[name])
            for name in ("tfidf", "e5")
        },
    }
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2, default=str)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
