PY ?= .venv/bin/python

.PHONY: data train eval test all

data:
	$(PY) -m src.prepare_data --input data/raw/generated.jsonl

train:
	$(PY) -m src.train

eval:
	$(PY) -m src.evaluate

test:
	$(PY) -m pytest -q

all: data train eval test
