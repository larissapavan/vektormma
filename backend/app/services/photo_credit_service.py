"""Which fighter photos come from ESPN or from ufc.com, so the site can print the credit on them.

The photos are small copies stored with the site (frontend/public/fighter-photos). Where each one came from is written
down when it is downloaded: data/raw/fighter_photos.csv for the UFC roster, where `source` is "ESPN" for the ESPN
headshots and "ufc.com ..." for the champions' belt photos and the athlete-page photos, and the Bellator archive's
headshots are ESPN's too (see the About page). The site asks for this list once and credits every photo on it ("Foto:
ESPN", "Foto: UFC"); a photo that is not on it gets no credit line.
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


def _manifest_paths(source_prefix: str) -> set[str]:
    """The photos in the manifest whose `source` starts with source_prefix (case-insensitive)."""
    if not PHOTOS_MANIFEST_PATH.exists():
        return set()
    manifest = pd.read_csv(PHOTOS_MANIFEST_PATH, keep_default_na=False, dtype=str)
    rows = manifest[manifest["source"].str.upper().str.startswith(source_prefix) & manifest["local_path"].str.strip().ne("")]
    return {_web_path(stored) or WEB_PREFIX + Path(local).name for stored, local in zip(rows["image_url"], rows["local_path"])}


@lru_cache(maxsize=1)
def espn_photo_paths() -> list[str]:
    paths = _manifest_paths("ESPN")
    if BELLATOR_FIGHTERS_PATH.exists():
        bellator = pd.read_csv(BELLATOR_FIGHTERS_PATH, keep_default_na=False, dtype=str, usecols=["image_url"])
        paths.update(_web_path(url) for url in bellator["image_url"] if url.strip())
    # A file that ufc.com later replaced still has its old ESPN row in the manifest; it is the newer source's photo now.
    return sorted(paths - set(ufc_photo_paths()))


@lru_cache(maxsize=1)
def ufc_photo_paths() -> list[str]:
    return sorted(_manifest_paths("UFC.COM"))


def photo_credits() -> dict[str, list[str]]:
    """Credit line -> the photos it goes on."""
    return {"ESPN": espn_photo_paths(), "UFC": ufc_photo_paths()}
