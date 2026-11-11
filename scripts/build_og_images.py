"""Draw the share images (Open Graph, 1200x630): the site card and one per athlete and announced fight with a static page.

    python -m scripts.build_og_images

Link previews (WhatsApp, X, LinkedIn, Discord) show this image when someone shares /athlete/jon-jones or
/fight/waldo-cortes-acosta-vs-johnny-walker. It reads frontend/src/seo/athletes.json (scripts/build_seo_athletes.py) and
the photos in frontend/public/fighter-photos, and writes frontend/public/og/athletes/<slug>.jpg and og/fights/<slug>.jpg,
plus frontend/public/og-image.jpg, the card of every other page.
The build (seoPages in frontend/vite.config.ts) points each page's og:image at its file when it exists.

Only new or changed cards are drawn: frontend/public/og/manifest.json keeps a hash of what each card was drawn from.
Cards for athletes who left the roster and fights that were played are deleted. The text on a card is in English and
numbers only (name, record, division, odds), so one image serves the page in every language.
The look follows the site (light mat, ink text, red and blue only for the fight corners). The fonts are the site's own,
Big Shoulders Display and Hanken Grotesk, kept in scripts/fonts (SIL Open Font License) so a card looks the same on any
machine. Needs Pillow only.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "frontend" / "src" / "seo" / "athletes.json"
PHOTOS = ROOT / "frontend" / "public" / "fighter-photos"
OUT = ROOT / "frontend" / "public" / "og"
SITE_CARD = ROOT / "frontend" / "public" / "og-image.jpg"
MANIFEST = OUT / "manifest.json"
FONTS = Path(__file__).resolve().parent / "fonts"
DISPLAY_FONT = FONTS / "BigShouldersDisplay[wght].ttf"
TEXT_FONT = FONTS / "HankenGrotesk[wght].ttf"

# Bump when the drawing changes, so every card is drawn again.
DESIGN_VERSION = "3"

W, H = 1200, 630
M = 64  # outer margin
# The site's tokens (frontend/src/index.css, light theme).
MAT, PANEL, INK, MUTED, RULE, TRACK = (227, 230, 233), (244, 245, 246), (16, 21, 29), (74, 84, 99), (195, 201, 208), (210, 215, 221)
RED, BLUE, GOLD_FILL = (214, 47, 47), (43, 89, 217), (242, 194, 48)
CAP = 0.9  # the site never shows a probability past 90% as an exact number (see probability.ts)


@lru_cache(maxsize=None)
def _font(path: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(path, size)
    f.set_variation_by_axes([weight])
    return f


def display(size: int, weight: int = 900) -> ImageFont.FreeTypeFont:
    """Names, numbers and titles."""
    return _font(str(DISPLAY_FONT), size, weight)


def text(size: int, weight: int = 500) -> ImageFont.FreeTypeFont:
    """Everything else."""
    return _font(str(TEXT_FONT), size, weight)


def background() -> Image.Image:
    """The page colour with the 3px ink rule the site puts on top of every list."""
    img = Image.new("RGB", (W, H), MAT)
    ImageDraw.Draw(img).rectangle([0, 0, W, 5], fill=INK)
    return img


def mark(d: ImageDraw.ImageDraw, x: float, y: float, size: float) -> None:
    """The V of BrandMark.tsx (32x32 viewBox), top-left at (x, y)."""
    k = size / 32
    d.polygon([(x + px * k, y + py * k) for px, py in [(2, 3), (10, 3), (18, 29), (13, 29)]], fill=RED)
    d.polygon([(x + px * k, y + py * k) for px, py in [(30, 3), (22, 3), (14, 29), (19, 29)]], fill=BLUE)


def brand(img: Image.Image, x: int = M, y: int = 40) -> None:
    d = ImageDraw.Draw(img)
    mark(d, x, y, 44)
    d.text((x + 52, y + 22), "Vektor MMA", font=display(40), fill=INK, anchor="lm")


def fit(value: str, max_width: int, make, start: int, minimum: int) -> ImageFont.FreeTypeFont:
    size = start
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    while size > minimum and measure.textlength(value, font=make(size)) > max_width:
        size -= 2
    return make(size)


def wrap_name(name: str, max_width: int, max_height: int) -> tuple[list[str], ImageFont.FreeTypeFont]:
    """The name on one line at the largest size that fits, or on two lines when that would make it small; never taller
    than `max_height`."""
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    one = fit(name, max_width, display, min(128, max_height), 48)
    words = name.split()
    if (measure.textlength(name, font=one) <= max_width and one.size >= 88) or len(words) < 2:
        return [name], one
    best = min(range(1, len(words)), key=lambda i: abs(len(" ".join(words[:i])) - len(" ".join(words[i:]))))
    lines = [" ".join(words[:best]), " ".join(words[best:])]
    two = fit(max(lines, key=len), max_width, display, min(112, max_height // 2), 40)
    return (lines, two) if two.size > one.size else ([name], one)


def photo_path(photo: str | None) -> Path | None:
    """athletes.json keeps a cache-busting query on each photo (`name.webp?v=hash`); the file has no query."""
    if not photo:
        return None
    path = PHOTOS / photo.split("?", 1)[0]
    return path if path.exists() else None


def cutout(photo: str | None, max_w: int, max_h: int) -> Image.Image | None:
    """The fighter's photo trimmed to what is drawn and scaled to fit the box, or None when there is no photo."""
    path = photo_path(photo)
    if not path:
        return None
    img = Image.open(path).convert("RGBA")
    box = img.getchannel("A").getbbox()
    if box:
        img = img.crop(box)
    # Fill the box's height; a wide photo loses its sides rather than shrinking into a small head.
    scale = max_h / img.height
    img = img.resize((max(1, round(img.width * scale)), max_h), Image.LANCZOS)
    if img.width > max_w:
        left = (img.width - max_w) // 2
        img = img.crop((left, 0, left + max_w, max_h))
    return img


def initials(name: str, w: int, h: int, fill, colour) -> Image.Image:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    letters = "".join(word[0] for word in name.split()[:2]).upper()
    d.text((w / 2, h / 2), letters, font=display(min(w, h) // 2), fill=colour, anchor="mm")
    return img


def stand(img: Image.Image, sprite: Image.Image, cx: int, bottom: int) -> None:
    """Paste `sprite` standing on `bottom`, centred on `cx`."""
    img.paste(sprite, (cx - sprite.width // 2, bottom - sprite.height), sprite)


def record_text(a: dict) -> str | None:
    if a.get("wins") is None or a.get("losses") is None:
        return None
    return f"{a['wins']}-{a['losses']}-{a.get('draws') or 0}"


def draw_athlete(a: dict) -> Image.Image:
    img = background()
    brand(img)
    d = ImageDraw.Draw(img)

    # Photo on a panel at the right, standing on the panel's bottom edge.
    px0, py0, px1, py1 = 724, 40, W - M, H - 40
    d.rectangle([px0, py0, px1, py1], fill=PANEL)
    d.rectangle([px0, py0, px1, py0 + 5], fill=INK)
    sprite = cutout(a.get("photo"), px1 - px0 - 24, py1 - py0 - 40) or initials(a["name"], px1 - px0, py1 - py0 - 40, PANEL, MUTED)
    stand(img, sprite, (px0 + px1) // 2, py1)
    d = ImageDraw.Draw(img)

    text_width = px0 - M - 40
    y = 120
    if a.get("belt"):
        label = "Champion"
        f = text(26, 700)
        tw = d.textlength(label, font=f)
        d.rectangle([M, y, M + tw + 32, y + 44], fill=GOLD_FILL)
        d.text((M + 16, y + 22), label, font=f, fill=INK, anchor="lm")
        y += 64
    # Name, nickname and division share the space between the badge and the record at the foot of the card.
    below = (50 if a.get("nickname") else 0) + 56
    record_top = H - 78 - 92
    lines, f = wrap_name(a["name"], text_width, record_top - 16 - below - y)
    for line in lines:
        d.text((M, y), line, font=f, fill=INK)
        y += int(f.size * 0.98)
    if a.get("nickname"):
        nick = f"“{a['nickname']}”"
        d.text((M, y + 8), nick, font=fit(nick, text_width, lambda s: text(s, 500), 34, 22), fill=MUTED)
        y += 50
    label = " · ".join(part for part in ("UFC", a.get("division") or "") if part)
    d.text((M, y + 14), label, font=fit(label, text_width, lambda s: text(s, 600), 32, 22), fill=INK)

    rec = record_text(a)
    if rec:
        d.text((M, H - 78), rec, font=display(104), fill=INK, anchor="ls")
        d.text((M, H - 40), "Wins-losses-draws", font=text(24, 500), fill=MUTED, anchor="ls")
    return img


def odds(value: float) -> str:
    if value >= CAP - 1e-9:
        return "90%+"
    if value <= 1 - CAP + 1e-9:
        return "<10%"
    return f"{round(value * 100)}%"


def draw_fight(f: dict) -> Image.Image:
    img = background()
    brand(img)
    d = ImageDraw.Draw(img)

    place = {1: "Main event", 2: "Co-main event"}.get(f["position"], "Fight")
    if f.get("titleFight"):
        place += " · Title fight"
    d.text((W - M, 62), place, font=text(26, 700), fill=INK, anchor="rm")
    event = f"{f['event']} · {date.fromisoformat(f['date']).strftime('%b %d, %Y').replace(' 0', ' ')}"
    d.text((M, 118), event, font=fit(event, W - 2 * M, lambda s: text(s, 500), 28, 20), fill=MUTED, anchor="lm")

    # One block per corner, red at the left and blue at the right, like CornerSplit on the site.
    top, bottom, gap = 148, 400, 8
    half = (W - 2 * M - gap) // 2
    for i, (side, colour) in enumerate(((f["a"], RED), (f["b"], BLUE))):
        x0 = M + i * (half + gap)
        d.rectangle([x0, top, x0 + half, bottom], fill=colour)
        sprite = cutout(side.get("photo"), half - 40, bottom - top - 16) or initials(side["name"], half, bottom - top, colour, (255, 255, 255))
        stand(img, sprite, x0 + half // 2, bottom)
        d = ImageDraw.Draw(img)
        anchor_x, anchor = (x0, "la") if i == 0 else (x0 + half, "ra")
        d.text((anchor_x, bottom + 14), side["name"], font=fit(side["name"], half - 8, display, 56, 32), fill=INK, anchor=anchor)
        rec = record_text(side)
        if rec:
            d.text((anchor_x, bottom + 78), rec, font=text(26, 600), fill=MUTED, anchor=anchor)

    pick = f.get("pick")
    if pick:
        prob_a = pick["probability"] if pick["winnerIsA"] else 1 - pick["probability"]
        bar_x, bar_y, bar_w, bar_h = M, H - 52, W - 2 * M, 16
        split = bar_x + round(bar_w * prob_a)
        d.rectangle([bar_x, bar_y, split - 2, bar_y + bar_h], fill=RED)
        d.rectangle([split + 2, bar_y, bar_x + bar_w, bar_y + bar_h], fill=BLUE)
        d.text((bar_x, bar_y - 10), odds(prob_a), font=display(40), fill=INK, anchor="ls")
        d.text((bar_x + bar_w, bar_y - 10), odds(1 - prob_a), font=display(40), fill=INK, anchor="rs")
        d.text((W // 2, bar_y - 12), "Win chance estimated by the model", font=text(22, 500), fill=MUTED, anchor="ms")
    return img


def draw_site_card() -> Image.Image:
    """The card of every page without one of its own: the mark, the name and what the site does."""
    img = background()
    d = ImageDraw.Draw(img)
    mark(d, M - 8, 150, 240)
    x = M + 260
    d.text((x, 168), "Vektor MMA", font=display(150), fill=INK, anchor="lt")
    d.text((x, 350), "MMA stats, rankings and results,", font=text(36, 500), fill=INK, anchor="ls")
    d.text((x, 396), "with the model’s estimated win chance", font=text(36, 500), fill=INK, anchor="ls")
    d.text((x, 442), "for every fight.", font=text(36, 500), fill=INK, anchor="ls")
    # The two corner colours side by side at the foot of the card.
    d.rectangle([0, H - 24, W // 2 - 2, H], fill=RED)
    d.rectangle([W // 2 + 2, H - 24, W, H], fill=BLUE)
    return img


def digest(payload: object, photos: list[str | None]) -> str:
    h = hashlib.sha1(DESIGN_VERSION.encode())
    h.update(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode())
    for photo in photos:
        path = photo_path(photo)
        if path:
            h.update(path.read_bytes())
    return h.hexdigest()[:12]


def main() -> bool:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    manifest: dict[str, str] = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}

    site_sig = hashlib.sha1(f"site-{DESIGN_VERSION}".encode()).hexdigest()[:12]
    if manifest.get("og-image.jpg") != site_sig or not SITE_CARD.exists():
        draw_site_card().save(SITE_CARD, "JPEG", quality=85, optimize=True, progressive=True)

    wanted: dict[str, tuple[object, list[str | None], object]] = {}
    for athlete in data["athletes"]:
        wanted[f"athletes/{athlete['slug']}.jpg"] = (athlete, [athlete.get("photo")], draw_athlete)
    for fight in data["fights"]:
        wanted[f"fights/{fight['slug']}.jpg"] = (fight, [fight["a"].get("photo"), fight["b"].get("photo")], draw_fight)

    drawn = 0
    next_manifest: dict[str, str] = {"og-image.jpg": site_sig}
    for key, (payload, photos, draw) in wanted.items():
        target = OUT / key
        sig = digest(payload, photos)
        next_manifest[key] = sig
        if target.exists() and manifest.get(key) == sig:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        draw(payload).save(target, "JPEG", quality=68, optimize=True, progressive=True)
        drawn += 1

    removed = 0
    for sub in ("athletes", "fights"):
        for stale in (OUT / sub).glob("*.jpg") if (OUT / sub).exists() else []:
            if f"{sub}/{stale.name}" not in wanted:
                stale.unlink()
                removed += 1
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(next_manifest, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"OG images: {drawn} drawn, {len(wanted) - drawn} unchanged, {removed} removed")
    return True


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
