#!/usr/bin/env python3
"""Load raw dataset inputs for the canonical pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = ROOT / "dataset"
RAW_DIR = DATASET_DIR / "raw"
CONFIG_DIR = RAW_DIR / "config"
CURATED_DIR = RAW_DIR / "curated"
CONTENT_DIR = RAW_DIR / "content"


@dataclass(frozen=True)
class RawCatalog:
    flagship_dimensions: list[dict[str, Any]]
    dimension_catalog: dict[str, dict[str, Any]]
    dimension_profiles: dict[str, dict[str, Any]]
    legacy_overrides: dict[str, dict[str, Any]]
    wikidata_subjects: dict[str, dict[str, Any]]
    curated_observations: list[dict[str, Any]]
    content_overrides: list[dict[str, Any]]


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _load_curated_observations() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(CURATED_DIR.glob("*.json")):
        payload = _load_json(path, [])
        if not isinstance(payload, list):
            raise ValueError(f"Expected a list of observations in {path}")
        for row in payload:
            if not isinstance(row, dict):
                raise ValueError(f"Expected observation object in {path}")
            record = dict(row)
            record["_raw_path"] = str(path.relative_to(ROOT))
            records.append(record)
    return records


def _load_content_overrides() -> list[dict[str, Any]]:
    if not CONTENT_DIR.exists():
        return []

    records: list[dict[str, Any]] = []
    for path in sorted(CONTENT_DIR.glob("*.json")):
        payload = _load_json(path, [])
        if isinstance(payload, dict):
            if "items" in payload and isinstance(payload["items"], list):
                items = payload["items"]
            else:
                items = []
                for key, value in payload.items():
                    if not isinstance(value, dict):
                        continue
                    record = dict(value)
                    record.setdefault("subject_key", key)
                    items.append(record)
        elif isinstance(payload, list):
            items = payload
        else:
            raise ValueError(f"Unsupported content override payload in {path}")

        for row in items:
            if not isinstance(row, dict):
                raise ValueError(f"Expected content override object in {path}")
            record = dict(row)
            record.setdefault("dimension", path.stem)
            record["_raw_path"] = str(path.relative_to(ROOT))
            records.append(record)
    return records


def load_raw_catalog() -> RawCatalog:
    flagship_dimensions = _load_json(CONFIG_DIR / "flagship_dimensions.json", [])
    dimension_catalog = _load_json(CONFIG_DIR / "dimensions.json", {})
    dimension_profiles = _load_json(CONFIG_DIR / "dimension_profiles.json", {})
    legacy_overrides = _load_json(CONFIG_DIR / "legacy_overrides.json", {})
    wikidata_subjects = _load_json(CONFIG_DIR / "wikidata_subjects.json", {})
    curated_observations = _load_curated_observations()
    content_overrides = _load_content_overrides()
    return RawCatalog(
        flagship_dimensions=flagship_dimensions,
        dimension_catalog=dimension_catalog,
        dimension_profiles=dimension_profiles,
        legacy_overrides=legacy_overrides,
        wikidata_subjects=wikidata_subjects,
        curated_observations=curated_observations,
        content_overrides=content_overrides,
    )
