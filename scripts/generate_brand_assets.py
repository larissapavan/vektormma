"""Render the Vektor MMA mark (a V in the two corner colours) to frontend/public/favicon.png, favicon.ico and docs/brand.

Geometry mirrors frontend/src/shared/components/BrandMark.tsx and public/favicon.svg (32x32 viewBox). Needs Pillow only.
Usage: python scripts/generate_brand_assets.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parents[1] / "frontend" / "public"
RED, BLUE, MAT = "#D62F2F", "#2B59D9", "#E3E6E9"
SS = 8  # supersampling factor

# 32x32 viewBox, mirrored in frontend/src/shared/components/BrandMark.tsx: the two strokes of a V.
STROKE_RED = [(2, 3), (10, 3), (18, 29), (13, 29)]
STROKE_BLUE = [(30, 3), (22, 3), (14, 29), (19, 29)]


def draw_mark(size: int, tile: bool = False) -> Image.Image:
    """The V alone, or on a light mat square with slightly rounded corners (tile) so it reads on any tab colour."""
    big = size * SS
    k = big / 32
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # On a tile the V shrinks a little so it keeps a margin inside the square.
    scale = 1 - 3 / 16 if tile else 1.0

    def poly(points, fill):
        d.polygon([((x - 16) * scale * k + big / 2, (y - 16) * scale * k + big / 2) for x, y in points], fill=fill)

    if tile:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=round(4 * k), fill=MAT)
    poly(STROKE_RED, RED)
    poly(STROKE_BLUE, BLUE)
    return img.resize((size, size), Image.LANCZOS)


def make_cover(width: int = 1200, height: int = 627) -> Image.Image:
    """LinkedIn project cover (1200x627): the V alone, centred on the mat colour."""
    img = Image.new("RGB", (width, height), MAT)
    size = 440
    mark = draw_mark(size)
    img.paste(mark, (round((width - size) / 2), round((height - size) / 2)), mark)
    return img


def main() -> None:
    draw_mark(128, tile=True).save(PUBLIC / "favicon.png")
    draw_mark(64, tile=True).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)])
    # og-image.jpg is the Vektor MMA share card, designed by hand: this script does not touch it.
    brand_dir = PUBLIC.parents[1] / "docs" / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)
    make_cover().save(brand_dir / "linkedin-cover.png")
    print("wrote favicon.png (128x128), favicon.ico and docs/brand/linkedin-cover.png (1200x627)")


if __name__ == "__main__":
    main()
