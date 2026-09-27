#!/usr/bin/env python3
"""Draw Zaur Music's icons: two beamed notes, white on a violet tile.

The same paths as src/lib/components/Mark.svelte, on mail's 16-unit grid.
Violet (the digest channel's --z-ch-digest-stroke to a deeper step) keeps it
apart from Mail's blue tile on a home screen.

    python3 scripts/generate-icons.py      # writes into static/ (needs cairosvg, Pillow)
"""
import io
from pathlib import Path

import cairosvg
from PIL import Image

STATIC = Path(__file__).resolve().parent.parent / "static"


def svg(share: float, radius: float) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<defs><linearGradient id="v" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#6d28d9"/>'
        "</linearGradient></defs>"
        f'<rect width="16" height="16" rx="{radius}" fill="url(#v)"/>'
        f'<g transform="translate(8 8) scale({share}) translate(-8 -8)" fill="#fff" stroke="#fff"'
        ' stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M6 11.2V4.6l6-1.4v6.6" fill="none"/>'
        '<path d="M6 6.6l6-1.4" fill="none" stroke-opacity="0.55"/>'
        '<circle cx="4.6" cy="11.4" r="1.5" stroke="none"/>'
        '<circle cx="10.6" cy="10" r="1.5" stroke="none"/>'
        "</g></svg>\n"
    )


def png(source: str, size: int) -> Image.Image:
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=source.encode(), output_width=size))).convert("RGBA")


def main() -> None:
    favicon = svg(1, 3.5)
    (STATIC / "favicon.svg").write_text(favicon)
    small = png(favicon, 48)
    small.save(STATIC / "favicon.png", optimize=True)
    small.save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # Full bleed (the platform masks the corners); the notes stay inside the maskable safe circle.
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        icon = png(svg(0.72, 0), size)
        (icon.convert("RGB") if name.startswith("apple") else icon).save(STATIC / name, optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in STATIC.iterdir() if p.is_file())))


if __name__ == "__main__":
    main()
