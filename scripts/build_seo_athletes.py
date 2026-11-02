"""Write the data behind the static athlete and fight pages (frontend/src/seo/athletes.json).

    python -m scripts.build_seo_athletes

The site is a single-page app: a search engine or a link preview reads the HTML as served, before any script runs. The
build (see seoPages in frontend/vite.config.ts) writes one HTML file per athlete and per announced fight from this file,
and the images in frontend/public/og/ are drawn from it too (scripts/build_og_images.py). It holds:

  - every fighter active in the UFC: name, URL slug, record, division, titles, origin and photo;
  - every announced UFC fight with both fighters in the catalog, with the model's pick when the prediction log has one.

It reads the fighter catalog and the prediction log only, so it needs neither the model nor the network. The daily update
runs it after the data refresh. The slug must match athleteSlug() in frontend/src/seo/athletes.ts; a frontend test checks
every name in the file against that function.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.catalog_service import get_fighter_profile, list_fighters
from backend.app.services.events_service import get_upcoming_events
from backend.app.services.track_record_service import load_log

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "src" / "seo" / "athletes.json"
PHOTO_PREFIX = "/fighter-photos/"

# Same letters as NON_DECOMPOSING_LETTERS in frontend/src/shared/hooks/useFighterImages.ts: they do not decompose with NFD.
_NON_DECOMPOSING = {
    "ł": "l", "Ł": "l", "đ": "d", "Đ": "d", "ø": "o", "Ø": "o",
    "ß": "ss", "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe",
}


def athlete_slug(name: str) -> str:
    """'Jon Jones' -> 'jon-jones'. The same steps as normalizeFighterName() in the frontend, joined with hyphens."""
    mapped = "".join(_NON_DECOMPOSING.get(char, char) for char in name)
    decomposed = unicodedata.normalize("NFD", mapped)
    stripped = "".join(char for char in decomposed if not 0x300 <= ord(char) <= 0x36F)
    lowered = stripped.lower().replace(".", "")
    return "-".join(re.sub(r"[^a-z0-9]+", " ", lowered).split())


def _photo(image_url: str | None) -> str | None:
    """The file name of a bundled photo ('aaron-pico.webp'), or None when the fighter has none."""
    if image_url and image_url.startswith(PHOTO_PREFIX):
        return image_url[len(PHOTO_PREFIX):]
    return None


def _athlete(fighter: dict) -> dict:
    return {
        "name": fighter["name"],
        "slug": athlete_slug(fighter["name"]),
        "nickname": fighter.get("nickname"),
        "division": fighter.get("division"),
        "wins": fighter.get("wins"),
        "losses": fighter.get("losses"),
        "draws": fighter.get("draws"),
        "belt": bool(fighter.get("belt")),
        "titles": list(fighter.get("current_titles") or []),
        "country": fighter.get("country"),
        "countryCode": fighter.get("country_code"),
        "photo": _photo(fighter.get("image_url")),
    }


def build_athletes() -> list[dict]:
    athletes = [_athlete(f) for f in list_fighters(ufc_only=True) if f.get("ufc_status") == "active"]
    seen: dict[str, str] = {}
    for athlete in athletes:
        other = seen.setdefault(athlete["slug"], athlete["name"])
        if other != athlete["name"]:
            raise SystemExit(f"Two active fighters share the slug {athlete['slug']!r}: {other!r} and {athlete['name']!r}")
    return sorted(athletes, key=lambda a: a["slug"])


def build_fights(today: str) -> list[dict]:
    """Announced fights with the model's pick, in card order (the main event first)."""
    picks: dict[tuple[str, str, str], dict] = {}
    log = load_log()
    for row in log.to_dict(orient="records"):
        picks[(str(row["event_date"])[:10], *sorted([str(row["fighter_1"]), str(row["fighter_2"])]))] = row

    fights: list[dict] = []
    for event in get_upcoming_events():
        if not event.get("date") or event["date"] < today:
            continue
        for position, fight in enumerate(event.get("fights", []), start=1):
            names = [fight.get("fighter_1"), fight.get("fighter_2")]
            if not all(names) or any(str(n).strip().upper() in ("TBD", "TBA") for n in names):
                continue
            try:
                profiles = [get_fighter_profile(n) for n in names]
            except KeyError:
                continue  # a debutant with no catalog profile: nothing to show yet
            a, b = (_athlete(p) for p in profiles)
            entry = {
                "slug": f"{a['slug']}-vs-{b['slug']}",
                "event": event["name"],
                "date": event["date"],
                "position": position,
                "titleFight": bool(fight.get("title_fight")),
                "weightClass": fight.get("weight_class"),
                "a": a,
                "b": b,
            }
            logged = picks.get((event["date"], *sorted([a["name"], b["name"]])))
            if logged is not None:
                favorite_is_a = logged["predicted_winner"] == a["name"]
                entry["pick"] = {"winner": logged["predicted_winner"], "probability": round(float(logged["confidence"]), 4), "winnerIsA": favorite_is_a}
            fights.append(entry)
    return fights


def main() -> bool:
    athletes = build_athletes()
    fights = build_fights(date.today().isoformat())
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({"athletes": athletes, "fights": fights}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(athletes)} athletes and {len(fights)} fights to {OUTPUT_PATH}")
    return True


if __name__ == "__main__":
    raise SystemExit(0 if main() else 1)
