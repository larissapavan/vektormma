"""Which fighter photos come from ESPN, so the site can print the credit on them.

The photos are small copies stored with the site (frontend/public/fighter-photos). Where each one came from is written
down when it is downloaded: data/raw/fighter_photos.csv for the UFC roster, where `source` is "ESPN" for the ESPN
headshots, and the Bellator archive's headshots are ESPN's too (see the About page). The site asks for this list once and
credits every photo on it ("Foto: ESPN"); a photo that is not on it gets no credit line.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from src.ufc_predictor.config import RAW_DATA_DIR

PHOTOS_MANIFEST_PATH = RAW_DATA_DIR / "fighter_photos.csv"
BELLATOR_FIGHTERS_PATH = RAW_DATA_DIR / "bellator" / "fighters.csv"
WEB_PREFIX = "/fighter-photos/"


def _web_path(value: str) -> str:
    """The address a photo is served at, without the ?v= cache-busting version."""
    return str(value).split("?")[0].strip()


@lru_cache(maxsize=1)
def espn_photo_paths() -> list[str]:
    paths: set[str] = set()
    if PHOTOS_MANIFEST_PATH.exists():
        manifest = pd.read_csv(PHOTOS_MANIFEST_PATH, keep_default_na=False, dtype=str)
        espn = manifest[manifest["source"].str.upper().str.startswith("ESPN") & manifest["local_path"].str.strip().ne("")]
        for stored, local in zip(espn["image_url"], espn["local_path"]):
            paths.add(_web_path(stored) or WEB_PREFIX + Path(local).name)
    if BELLATOR_FIGHTERS_PATH.exists():
        bellator = pd.read_csv(BELLATOR_FIGHTERS_PATH, keep_default_na=False, dtype=str, usecols=["image_url"])
        paths.update(_web_path(url) for url in bellator["image_url"] if url.strip())
    return sorted(paths)


def photo_credits() -> dict[str, list[str]]:
    """Credit line -> the photos it goes on."""
    return {"ESPN": espn_photo_paths()}
