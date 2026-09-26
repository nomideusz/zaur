#!/usr/bin/env python3
"""Draw Zaur Mail's icons: the Z that folds an envelope.

On a 16-unit grid, an envelope 12 x 8. Its top edge, the flap's long arm
running corner to corner, and its bottom edge are one bold stroke — a Z. The
sides and the flap's short arm are the same stroke, faint: the letter it seals.
White on the accent blue, deepening downward (--z-accent-stroke to
--z-accent-edge). ZaurMark.svelte draws the same paths in the shell's ink.

Every file comes from the one SVG below, favicon.svg included.

    python3 scripts/generate-icons.py      # writes into static/ (needs cairosvg, Pillow)
"""
import io
from pathlib import Path

import cairosvg
from PIL import Image

STATIC = Path(__file__).resolve().parent.parent / "static"

# The mark on its grid — mirrored in ZaurMark.svelte.
FAINT = "M2 4V12M14 4V12M2 4L8 8"
BOLD = "M2 4H14L2 12H14"


def svg(share: float, stroke: float, radius: float, tile: bool = True) -> str:
    """The mark scaled to `share` of a 16-unit tile with corner `radius`; `tile=False` leaves it bare (alpha only)."""
    back = (
        '<defs><linearGradient id="sky" x2="0" y2="1">'
        '<stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/>'
        "</linearGradient></defs>"
        f'<rect width="16" height="16" rx="{radius}" fill="url(#sky)"/>'
        if tile
        else ""
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        f"{back}"
        f'<g transform="translate(8 8) scale({share}) translate(-8 -8)" fill="none" stroke="#fff"'
        f' stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">'
        '<rect x="2" y="4" width="12" height="8" fill="#fff" fill-opacity="0.12" stroke="none"/>'
        f'<path d="{FAINT}" stroke-opacity="0.45"/>'
        f'<path d="{BOLD}"/>'
        "</g></svg>\n"
    )


def png(source: str, size: int) -> Image.Image:
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=source.encode(), output_width=size))).convert("RGBA")


def main() -> None:
    # Favicon: the mark nearly fills a rounded tile, heavier so it holds at 16px.
    favicon = svg(1, 1.7, 3.5)
    (STATIC / "favicon.svg").write_text(favicon)
    small = png(favicon, 48)
    small.save(STATIC / "favicon.png", optimize=True)
    small.save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # App icons: full bleed (the platform masks the corners); the envelope's
    # corners stay inside the maskable safe circle.
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        icon = png(svg(0.72, 1.5, 0), size)
        (icon.convert("RGB") if name.startswith("apple") else icon).save(STATIC / name, optimize=True)
    # Android draws the status-bar badge from alpha alone.
    png(svg(1, 1.6, 0, tile=False), 96).save(STATIC / "badge.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in STATIC.iterdir() if p.is_file())))


if __name__ == "__main__":
    main()
