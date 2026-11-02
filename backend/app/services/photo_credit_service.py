"""Which fighter photos come from ESPN, ufc.com or onefc.com, so the site can print the credit on them.

The photos are small copies stored with the site (frontend/public/fighter-photos). Where each one came from is written
down when it is downloaded: data/raw/fighter_photos.csv for the UFC roster, where `source` is "ESPN" for the ESPN
headshots and "ufc.com ..." for the champions' belt photos and the athlete-page photos, and the headshots of the Bellator
archive and of RIZIN, KSW, LFA and Cage Warriors are ESPN's too (see the About page). The ONE Championship photos are
the athlete-page photos of onefc.com, registered in data/raw/one/fighters.csv. The site asks for this list once and
credits every photo on it ("Foto:
ESPN", "Foto: UFC"); a photo that is not on it gets no credit line.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from src.ufc_predictor.config import RAW_DATA_DIR

PHOTOS_MANIFEST_PATH = RAW_DATA_DIR / "fighter_photos.csv"
# Organisations whose headshots come from ESPN (their fighters.csv holds the stored photo in `image_url`).
ESPN_ORG_FIGHTERS_PATHS = [RAW_DATA_DIR / org / "fighters.csv" for org in ("bellator", "rizin", "ksw", "lfa", "cage-warriors")]
ONE_FIGHTERS_PATH = RAW_DATA_DIR / "one" / "fighters.csv"
WEB_PREFIX = "/fighter-photos/"
ONE_WEB_PREFIX = WEB_PREFIX + "one/"


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
    for fighters_path in ESPN_ORG_FIGHTERS_PATHS:
        if fighters_path.exists():
            fighters = pd.read_csv(fighters_path, keep_default_na=False, dtype=str, usecols=["image_url"])
            paths.update(_web_path(url) for url in fighters["image_url"] if url.strip())
    # A file that ufc.com later replaced still has its old ESPN row in the manifest; it is the newer source's photo now.
    return sorted(paths - set(ufc_photo_paths()))


@lru_cache(maxsize=1)
def ufc_photo_paths() -> list[str]:
    return sorted(_manifest_paths("UFC.COM"))


@lru_cache(maxsize=1)
def one_photo_paths() -> list[str]:
    """The ONE fighters' photos: every image the ONE roster points at inside the site's own one/ folder."""
    if not ONE_FIGHTERS_PATH.exists():
        return []
    fighters = pd.read_csv(ONE_FIGHTERS_PATH, keep_default_na=False, dtype=str, usecols=["image_url"], encoding="utf-8-sig")
    return sorted({_web_path(url) for url in fighters["image_url"] if _web_path(url).startswith(ONE_WEB_PREFIX)})


def photo_credits() -> dict[str, list[str]]:
    """Credit line -> the photos it goes on."""
    return {"ESPN": espn_photo_paths(), "UFC": ufc_photo_paths(), "ONE": one_photo_paths()}
