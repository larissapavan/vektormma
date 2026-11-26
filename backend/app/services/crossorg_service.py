"""Fighters who have fought in the UFC and in another organization, so their history can be read in one place.

The UFC pipeline and the other organizations' files never share an id, so the link is the name (accents, case and
punctuation ignored, and the UFC's own spelling aliases applied). A wrong link would put someone else's fights on a
profile, so a name is linked only when it passes every guard below:

    - the name is unique on both sides;
    - the UFC profile has at least one UFC fight (the catalog also holds people who never fought there);
    - not across men's and women's divisions;
    - the two weight classes are at most MAX_DIVISION_GAP apart (two different men called David Martinez, a bantamweight
      and a welterweight, are not one fighter);
    - not between two different Sherdog pages: when the organization's file and data/raw/sherdog_careers.json each have one
      (the second was checked against the UFC bouts), the page says who it is, whatever the name.

This module only reads: it adds a second list of fights to a profile. Nothing here writes to the UFC files, and the
prediction model never reads it. The model's inputs (the record, the striking and takedown numbers, the pre-fight history)
come from the UFC catalog and event_cards.csv, which are untouched.
"""

from __future__ import annotations

import re

from backend.app.services import career_fights_service
from backend.app.services.catalog_service import canonical_name, get_fighter_catalog
from backend.app.services.org_service import ORGS, _name_key, get_org_fighter_fights, get_org_fighters

MAX_DIVISION_GAP = 2
MEN_ORDER = ["strawweight", "flyweight", "bantamweight", "featherweight", "lightweight", "welterweight", "middleweight", "light heavyweight", "heavyweight"]

_cache: dict = {"catalog": None, "ufc": {}, "everyone": {}, "photos": {}}
_pages_cache: dict = {"careers": None, "ids": {}}


def _womens(division: str | None) -> bool | None:
    return None if not division else division.lower().startswith("women")


def _division_rank(division: str | None) -> int | None:
    if not division:
        return None
    name = division.lower().replace("women's ", "")
    return MEN_ORDER.index(name) if name in MEN_ORDER else None


def _build_indexes() -> None:
    catalog = get_fighter_catalog()
    if _cache["catalog"] is not catalog:
        seen: dict[str, list[tuple[str, str | None]]] = {}
        everyone: dict[str, list[tuple[str, str | None]]] = {}
        for record in catalog.to_dict(orient="records"):
            division = record.get("division")
            entry = (record["name"], division if isinstance(division, str) else None)
            everyone.setdefault(_name_key(record["name"]), []).append(entry)
            if record.get("ufc_status") != "never":
                seen.setdefault(_name_key(record["name"]), []).append(entry)
        photos = {_name_key(name): image for name, image in zip(catalog["name"], catalog["image_url"]) if isinstance(image, str) and image}
        _cache.update(
            catalog=catalog,
            ufc={key: rows[0] for key, rows in seen.items() if len(rows) == 1},
            everyone={key: rows[0] for key, rows in everyone.items() if len(rows) == 1},
            photos=photos,
        )


def _ufc_index() -> dict[str, tuple[str, str | None]]:
    """name key -> (UFC name, division) for every UFC fighter whose key is unique and who has fought in the UFC."""
    _build_indexes()
    return _cache["ufc"]


def _catalog_index() -> dict[str, tuple[str, str | None]]:
    """The same for everyone in the catalog, the people who never fought in the UFC too (their numbers come from the same files)."""
    _build_indexes()
    return _cache["everyone"]


def ufc_photo(ufc_name: str) -> str | None:
    """The photo the UFC profile of this person has, to stand in where another organization has none of its own."""
    _ufc_index()
    return _cache["photos"].get(_name_key(ufc_name))


def ufc_photos() -> dict[str, str]:
    """Every UFC photo by name key, for a whole list of fighters (ufc_photo looks at the catalog's files on every call)."""
    _ufc_index()
    return _cache["photos"]


def _linked(ufc: tuple[str, str | None], org_division: str | None) -> bool:
    ufc_womens, org_womens = _womens(ufc[1]), _womens(org_division)
    if ufc_womens is not None and org_womens is not None and ufc_womens != org_womens:
        return False
    ufc_rank, org_rank = _division_rank(ufc[1]), _division_rank(org_division)
    return ufc_rank is None or org_rank is None or abs(ufc_rank - org_rank) <= MAX_DIVISION_GAP


def _sherdog_id(url: str | None) -> str | None:
    """The number of a Sherdog fighter page ("https://www.sherdog.com/fighter/Bruno-Silva-294775"), or None for any other page."""
    found = re.search(r"sherdog\.com/fighter/[^/?#]*-(\d+)$", url or "")
    return found.group(1) if found else None


def _sherdog_ids() -> dict[str, str]:
    """UFC name key -> the number of the fighter's own Sherdog page. Read it once for a whole list, like the indexes."""
    careers = career_fights_service._load(career_fights_service.SHERDOG_FILE)
    if _pages_cache["careers"] is not careers:
        ids = {_name_key(name): _sherdog_id(career.get("sherdog_url")) for name, career in careers.items()}
        _pages_cache.update(careers=careers, ids={key: page for key, page in ids.items() if page})
    return _pages_cache["ids"]


def _other_page(ufc_name: str, profile_url: str | None, sherdog_ids: dict[str, str]) -> bool:
    """True when both sides have a Sherdog page and they are two pages: two people with one name."""
    theirs, ours = _sherdog_id(profile_url), sherdog_ids.get(_name_key(ufc_name))
    return theirs is not None and ours is not None and theirs != ours


def _find(index: dict, sherdog_ids: dict[str, str], name: str, division: str | None, profile_url: str | None) -> str | None:
    match = index.get(_name_key(name)) or index.get(_name_key(canonical_name(name) or ""))
    if match is None or not _linked(match, division) or _other_page(match[0], profile_url, sherdog_ids):
        return None
    return match[0]


def ufc_name_for(name: str, division: str | None, profile_url: str | None = None) -> str | None:
    """The UFC name of the same person as an organization's fighter, or None when no name passes every guard above."""
    return _find(_ufc_index(), _sherdog_ids(), name, division, profile_url)


def catalog_matcher():
    """A function (name, division, profile_url) -> the catalog name of the same person, whether or not they ever fought in the UFC.

    For the career numbers the catalog holds, which are the person's own whatever promotion they fought in. Same guards on the
    name (unique), the division (same sex, at most MAX_DIVISION_GAP apart) and the Sherdog page, but not the one about having
    fought in the UFC.
    The index is read once, so a whole organization can be matched without asking for it again on every fighter."""
    index, sherdog_ids = _catalog_index(), _sherdog_ids()

    def match_name(name: str, division: str | None, profile_url: str | None = None) -> str | None:
        return _find(index, sherdog_ids, name, division, profile_url)

    return match_name


def catalog_name_for(name: str, division: str | None) -> str | None:
    """One-off form of catalog_matcher."""
    return catalog_matcher()(name, division)


def ufc_names_for_org(org_id: str) -> dict[str, str]:
    """Org fighter name key -> the UFC name of the same person, for the fighters of that organization who fought in the UFC."""
    # The index is read once: asking for it per fighter checks the catalog's files thousands of times, seconds for a big organization.
    index, sherdog_ids = _ufc_index(), _sherdog_ids()
    links: dict[str, str] = {}
    for fighter in get_org_fighters(org_id):
        ufc_name = _find(index, sherdog_ids, fighter["name"], fighter["division"], fighter["profile_url"])
        if ufc_name:
            links[_name_key(fighter["name"])] = ufc_name
    return links


def other_organizations(ufc_name: str) -> list[dict]:
    """The fights this UFC fighter had in every other organization: [{org_id, short_name, name, fighter_name, org_record, fights}]."""
    index = _ufc_index()
    profile = index.get(_name_key(ufc_name))
    if profile is None:
        return []
    sherdog_ids = _sherdog_ids()
    found = []
    for org in ORGS.values():
        for fighter in get_org_fighters(org.id):
            if _name_key(fighter["name"]) != _name_key(profile[0]) and _name_key(canonical_name(fighter["name"]) or "") != _name_key(profile[0]):
                continue
            if not _linked(profile, fighter["division"]) or _other_page(profile[0], fighter["profile_url"], sherdog_ids):
                continue
            fights = get_org_fighter_fights(org.id, fighter["name"])
            if fights:
                found.append(
                    {
                        "org_id": org.id,
                        "short_name": org.short_name,
                        "name": org.name,
                        "fighter_name": fighter["name"],
                        "org_record": fighter["org_record"],
                        "fights": fights,
                    }
                )
            break
    return found
