"""Draw the share image (Open Graph, 1200x630) of every athlete and announced fight with a static page.

    python -m scripts.build_og_images

Link previews (WhatsApp, X, LinkedIn, Discord) show this image when someone shares /athlete/jon-jones or
/fight/waldo-cortes-acosta-vs-johnny-walker. It reads frontend/src/seo/athletes.json (scripts/build_seo_athletes.py) and
the photos in frontend/public/fighter-photos, and writes frontend/public/og/athletes/<slug>.jpg and og/fights/<slug>.jpg.
The build (seoPages in frontend/vite.config.ts) points each page's og:image at its file when it exists.

Only new or changed cards are drawn: frontend/public/og/manifest.json keeps a hash of what each card was drawn from.
Cards for athletes who left the roster and fights that were played are deleted. The text on a card is in English and
numbers only (name, record, division, odds), so one image serves the page in every language.
Needs Pillow and matplotlib, which ships the font (DejaVu Sans Bold), so a card looks the same on any machine.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from pathlib import Path

import matplotlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "frontend" / "src" / "seo" / "athletes.json"
PHOTOS = ROOT / "frontend" / "public" / "fighter-photos"
OUT = ROOT / "frontend" / "public" / "og"
MANIFEST = OUT / "manifest.json"
FONT_PATH = Path(matplotlib.get_data_path()) / "fonts" / "ttf" / "DejaVuSans-Bold.ttf"

# Bump when the drawing changes, so every card is drawn again.
DESIGN_VERSION = "2"

W, H = 1200, 630
BG, RED, BLUE, GOLD = (11, 12, 16), (225, 29, 72), (37, 99, 235), (245, 158, 11)
WHITE, GRAY = (248, 250, 252), (160, 170, 186)
CAP = 0.9  # the site never shows a probability past 90% as an exact number (see probability.ts)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size)


def background() -> Image.Image:
    """Dark card with a red glow at the left and a blue one at the right, like the site's hero."""
    img = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(glow)
    d.ellipse([-260, -300, 560, 420], fill=(120, 14, 40))
    d.ellipse([700, -320, 1460, 360], fill=(18, 50, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img.paste(glow)
    d = ImageDraw.Draw(img)
    d.rectangle([0, H - 12, W, H], fill=RED)
    return img


def brand(img: Image.Image, x: int = 64, y: int = 44) -> None:
    d = ImageDraw.Draw(img)
    f = font(34)
    d.text((x, y), "VEKTOR", font=f, fill=WHITE)
    d.text((x + d.textlength("VEKTOR ", font=f), y), "MMA", font=f, fill=(255, 46, 84))


def fit(text: str, max_width: int, start: int, minimum: int) -> ImageFont.FreeTypeFont:
    size = start
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    while size > minimum and measure.textlength(text, font=font(size)) > max_width:
        size -= 2
    return font(size)


def wrap_name(name: str, max_width: int) -> tuple[list[str], ImageFont.FreeTypeFont]:
    """The name on one line at the largest size that fits, or on two lines when that would make it small."""
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    one = fit(name, max_width, 92, 40)
    if measure.textlength(name, font=one) <= max_width and one.size >= 64:
        return [name], one
    words = name.split()
    if len(words) < 2:
        return [name], one
    best = min(range(1, len(words)), key=lambda i: abs(len(" ".join(words[:i])) - len(" ".join(words[i:]))))
    lines = [" ".join(words[:best]), " ".join(words[best:])]
    return lines, fit(max(lines, key=len), max_width, 76, 40)


def cutout(photo: str | None, height: int) -> Image.Image | None:
    """The fighter's headshot scaled to `height`, or None when there is no photo."""
    if not photo or not (PHOTOS / photo).exists():
        return None
    img = Image.open(PHOTOS / photo).convert("RGBA")
    return img.resize((round(img.width * height / img.height), height), Image.LANCZOS)


def initials_badge(name: str, size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, size - 1, size - 1], fill=(30, 34, 46, 255), outline=(255, 255, 255, 40), width=3)
    letters = "".join(word[0] for word in name.split()[:2]).upper()
    f = font(size // 3)
    d.text((size / 2, size / 2), letters, font=f, fill=WHITE, anchor="mm")
    return img


def paste_bottom_center(img: Image.Image, sprite: Image.Image, cx: int, bottom: int) -> None:
    """The headshot standing on `bottom`, centred on `cx`, with a soft white halo so a dark cutout does not sink into the card."""
    pad = 40
    halo = Image.new("RGBA", (sprite.width + pad * 2, sprite.height + pad * 2), (0, 0, 0, 0))
    halo.paste((255, 255, 255, 46), (pad, pad), sprite.split()[3])
    halo = halo.filter(ImageFilter.GaussianBlur(18))
    x, y = cx - sprite.width // 2, bottom - sprite.height
    img.paste(halo, (x - pad, y - pad), halo)
    img.paste(sprite, (x, y), sprite)


def record_text(a: dict) -> str | None:
    if a.get("wins") is None or a.get("losses") is None:
        return None
    return f"{a['wins']}-{a['losses']}-{a.get('draws') or 0}"


def draw_athlete(a: dict) -> Image.Image:
    img = background()
    brand(img)
    d = ImageDraw.Draw(img)

    sprite = cutout(a.get("photo"), 540) or initials_badge(a["name"], 360)
    paste_bottom_center(img, sprite, W - 64 - sprite.width // 2 - 20, H - 12)
    d = ImageDraw.Draw(img)

    text_width = 640
    lines, f = wrap_name(a["name"], text_width)
    y = 150
    for line in lines:
        d.text((64, y), line, font=f, fill=WHITE)
        y += int(f.size * 1.08)
    if a.get("nickname"):
        d.text((64, y + 6), f"“{a['nickname']}”", font=fit(f"“{a['nickname']}”", text_width, 40, 26), fill=(255, 46, 84))
        y += 62
    label = " · ".join(part for part in ("UFC", a.get("division") or "") if part)
    d.text((64, y + 14), label, font=fit(label, text_width, 34, 22), fill=(203, 213, 225))

    rec = record_text(a)
    if rec:
        d.text((64, H - 184), rec, font=font(100), fill=WHITE)
        d.text((68, H - 66), "WINS-LOSSES-DRAWS", font=font(22), fill=GRAY)
    if a.get("belt"):
        d.rounded_rectangle([64, 104, 64 + 218, 104 + 40], radius=20, fill=GOLD)
        d.text((64 + 109, 124), "CHAMPION", font=font(22), fill=(20, 14, 0), anchor="mm")
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

    place = {1: "MAIN EVENT", 2: "CO-MAIN"}.get(f["position"], "FIGHT")
    if f.get("titleFight"):
        place += " · TITLE FIGHT"
    d.text((W - 64, 52), place, font=font(26), fill=(255, 46, 84), anchor="ra")
    event = f"{f['event']} · {date.fromisoformat(f['date']).strftime('%b %d, %Y').replace(' 0', ' ')}"
    d.text((W // 2, 118), event, font=fit(event, W - 128, 30, 20), fill=(203, 213, 225), anchor="mm")

    for side, cx in ((f["a"], 300), (f["b"], 900)):
        sprite = cutout(side.get("photo"), 270) or initials_badge(side["name"], 220)
        paste_bottom_center(img, sprite, cx, 420)
        d = ImageDraw.Draw(img)
        d.text((cx, 434), side["name"], font=fit(side["name"], 500, 42, 26), fill=WHITE, anchor="ma")
        rec = record_text(side)
        if rec:
            d.text((cx, 484), rec, font=font(30), fill=GRAY, anchor="ma")
    d.text((W // 2, 300), "VS", font=font(84), fill=(255, 46, 84), anchor="mm")

    pick = f.get("pick")
    if pick:
        prob_a = pick["probability"] if pick["winnerIsA"] else 1 - pick["probability"]
        bar_x, bar_y, bar_w, bar_h = 64, H - 46, W - 128, 14
        d.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=7, fill=(70, 76, 92))
        d.rounded_rectangle([bar_x, bar_y, bar_x + max(14, round(bar_w * prob_a)), bar_y + bar_h], radius=7, fill=RED)
        d.text((bar_x, bar_y - 12), odds(prob_a), font=font(26), fill=WHITE, anchor="ls")
        d.text((bar_x + bar_w, bar_y - 12), odds(1 - prob_a), font=font(26), fill=WHITE, anchor="rs")
        d.text((W // 2, bar_y - 12), "MODEL ODDS", font=font(20), fill=GRAY, anchor="ms")
    return img


def digest(payload: object, photos: list[str | None]) -> str:
    h = hashlib.sha1(DESIGN_VERSION.encode())
    h.update(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode())
    for photo in photos:
        if photo and (PHOTOS / photo).exists():
            h.update((PHOTOS / photo).read_bytes())
    return h.hexdigest()[:12]


def main() -> bool:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    manifest: dict[str, str] = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}

    wanted: dict[str, tuple[object, list[str | None], object]] = {}
    for athlete in data["athletes"]:
        wanted[f"athletes/{athlete['slug']}.jpg"] = (athlete, [athlete.get("photo")], draw_athlete)
    for fight in data["fights"]:
        wanted[f"fights/{fight['slug']}.jpg"] = (fight, [fight["a"].get("photo"), fight["b"].get("photo")], draw_fight)

    drawn = 0
    next_manifest: dict[str, str] = {}
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
