"""Render the Fight Intelligence brand mark to frontend/public/favicon.png and og-image.jpg.

Geometry mirrors frontend/src/shared/components/BrandMark.tsx and public/favicon.svg (40x40 viewBox). Needs Pillow only.
Usage: python scripts/generate_brand_assets.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parents[1] / "frontend" / "public"
RED, INK, CREAM = "#C8102E", "#0E0E0E", "#F6F1E4"
SS = 8  # supersampling factor

# 40x40 viewBox, mirrored in frontend/src/shared/components/BrandMark.tsx: an ink octagon with a red hard shadow and an italic FI monogram.
OCTAGON = [(11.54, 1), (26.46, 1), (37, 11.54), (37, 26.46), (26.46, 37), (11.54, 37), (1, 26.46), (1, 11.54)]
LETTER_F = [(8.5, 29), (12.1, 11), (25.1, 11), (24.26, 15.2), (15.86, 15.2), (15.28, 18.1), (22.08, 18.1), (21.28, 22.1), (14.48, 22.1), (13.1, 29)]
LETTER_I = [(26.9, 11), (31.5, 11), (27.9, 29), (23.3, 29)]


def draw_mark(size: int, tile: bool = False) -> Image.Image:
    big = size * SS
    k = big / 40
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def poly(points, fill, dx=0.0, dy=0.0):
        d.polygon([((x + dx) * k, (y + dy) * k) for x, y in points], fill=fill)

    if tile:
        d.rectangle([0, 0, big - 1, big - 1], fill=CREAM)
    poly(OCTAGON, RED, 2, 2)  # hard offset shadow
    poly(OCTAGON, INK)
    poly(LETTER_F, CREAM)
    poly(LETTER_I, RED)
    return img.resize((size, size), Image.LANCZOS)


def make_cover(width: int = 1200, height: int = 627) -> Image.Image:
    """LinkedIn project cover (1200x627): the FI mark alone, centred on white."""
    img = Image.new("RGB", (width, height), "#FFFFFF")
    size = 440
    mark = draw_mark(size)
    # The mark's drawing spans 1..39 of its 40-unit box (shadow included), so centre on that, not on the box.
    offset = size / 40
    img.paste(mark, (round((width - size) / 2 - 0 * offset), round((height - size) / 2)), mark)
    return img


def main() -> None:
    draw_mark(256).save(PUBLIC / "favicon.png")
    # og-image.jpg is the Vektor MMA share card, designed by hand: this script does not touch it.
    brand_dir = PUBLIC.parents[1] / "docs" / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)
    make_cover().save(brand_dir / "linkedin-cover.png")
    print("wrote favicon.png (256x256) and docs/brand/linkedin-cover.png (1200x627)")


if __name__ == "__main__":
    main()
