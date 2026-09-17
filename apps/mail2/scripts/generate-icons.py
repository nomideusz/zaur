#!/usr/bin/env python3
"""Draw mail2's PNG icons from the ZA/UR mark (ZaurMark.svelte).

The mark is a 16px icon glyph: four stroked letters on a 16-unit grid, round
caps and joins, in fixed identity inks. The paths below mirror the component's
SVG, with its two arcs flattened, so the PNGs are the same drawing — not type.
`static/favicon.svg` is written by hand from the same paths.

    python3 scripts/generate-icons.py      # writes into static/ (needs Pillow)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
SUPERSAMPLE = 4

SURFACE = (255, 255, 255, 255)  # --z-surface
Z, A, R = (225, 29, 72, 255), (8, 145, 178, 255), (13, 148, 136, 255)  # --z-mark-*


def arc(cx: float, cy: float, rx: float, ry: float, start: float, end: float, steps: int = 16) -> list[tuple[float, float]]:
    return [(cx + rx * math.cos(a), cy + ry * math.sin(a)) for a in (start + (end - start) * i / steps for i in range(steps + 1))]


# (ink, polyline) — ZaurMark.svelte's paths on the 16-unit grid.
GLYPH = [
    (Z, [(2.5, 2.5), (6.5, 2.5), (2.5, 6.5), (6.5, 6.5)]),
    (A, [(9.5, 6.5), (11.5, 2.5), (13.5, 6.5)]),
    (A, [(10.25, 5), (12.75, 5)]),
    (A, [(2.5, 9.5), (2.5, 11.6), *arc(4.5, 11.6, 2, 1.9, math.pi, 0), (6.5, 9.5)]),
    (R, [(9.5, 13.5), (9.5, 9.5), (11.6, 9.5), *arc(11.6, 10.9, 1.4, 1.4, -math.pi / 2, math.pi / 2), (9.5, 12.3)]),
    (R, [(11.4, 12.3), (13.5, 13.5)]),
]


def glyph(draw: ImageDraw.ImageDraw, x: float, y: float, unit: float, stroke: float, ink=None) -> None:
    """Stroke the glyph with its 16-unit box at (x, y), `unit` px per grid unit."""
    width = max(1, round(stroke * unit))
    for colour, points in GLYPH:
        pts = [(x + px * unit, y + py * unit) for px, py in points]
        fill = ink or colour
        draw.line(pts, fill=fill, width=width, joint="curve")
        r = width / 2  # round caps
        for cx, cy in (pts[0], pts[-1]):
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)


def tile(size: int, glyph_share: float, stroke: float, radius: float, ink=None, background=SURFACE) -> Image.Image:
    s = size * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if background:
        draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=round(radius * s), fill=background)
    unit = s * glyph_share / 16
    offset = (s - 16 * unit) / 2
    glyph(draw, offset, offset, unit, stroke, ink)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    # App icons: full-bleed paper (the platform masks the corners), glyph inside the safe zone.
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        icon = tile(size, 0.5, 1.15, 0)
        (icon.convert("RGB") if name.startswith("apple") else icon).save(STATIC / name, optimize=True)
    # Favicon PNG fallback: favicon.svg's drawing — 85% glyph, heavier stroke.
    favicon = tile(48, 0.85, 1.5, 3.5 / 16)
    favicon.save(STATIC / "favicon.png", optimize=True)
    favicon.save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # Android draws the status-bar badge from alpha alone.
    tile(96, 0.85, 1.5, 0, ink=(255, 255, 255, 255), background=None).save(STATIC / "badge.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in STATIC.iterdir() if p.is_file())))


if __name__ == "__main__":
    main()
