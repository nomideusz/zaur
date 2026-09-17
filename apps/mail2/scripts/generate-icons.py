#!/usr/bin/env python3
"""Draw mail2's PWA icons and favicon from the ZA/UR logomark (ZaurMark.svelte).

The mark is `ZA` over `UR` in Ioskeley Mono 700, letter-spaced 0.04em, in a
square with a 1px stroke. The handoff's size ladder fixes the proportions per
slot, so each icon scales the ladder rung it stands for rather than a new drawing:

    square  radius  type   line-height
    64      12      30     0.80          app icons
    16      4       6.8    0.82          favicon, badge

    python3 scripts/generate-icons.py      # writes into static/ (needs Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
FONT = ROOT / "static/fonts/ioskeley-mono/IoskeleyMono-Bold.woff2"

INK = (11, 18, 32, 255)  # --z-ink
PAPER = (255, 255, 255, 255)  # --z-mark-fill
STROKE = (148, 163, 184, 255)  # --z-mark-stroke
LETTERS = {"Z": (225, 29, 72, 255), "A": (8, 145, 178, 255), "U": (8, 145, 178, 255), "R": (13, 148, 136, 255)}
TRACKING = 0.04
SUPERSAMPLE = 4

LARGE = (64, 12, 30, 0.80)
SMALL = (16, 4, 6.8, 0.82)


def mark(width: int, rung: tuple[float, float, float, float]) -> Image.Image:
    """The mark at `width` px, supersampled, transparent outside the square."""
    box, radius, type_px, line_height = rung
    scale = width * SUPERSAMPLE / box
    w = round(box * scale)

    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, w - 1), radius=round(radius * scale), fill=PAPER, outline=STROKE, width=max(1, round(scale)))

    size = type_px * scale
    face = ImageFont.truetype(str(FONT), round(size))
    advance = face.getlength("Z") + TRACKING * size
    cap = -face.getbbox("Z", anchor="ls")[1]
    pitch = line_height * size
    # Two rows centred as a block; the trailing letter-spacing is trimmed, as
    # the shell's `margin-right: -0.04em` does.
    left = (w - (2 * advance - TRACKING * size)) / 2
    first_baseline = w / 2 - pitch / 2 + cap / 2
    for row, pair in enumerate(("ZA", "UR")):
        for col, ch in enumerate(pair):
            draw.text((left + col * advance, first_baseline + row * pitch), ch, font=face, fill=LETTERS[ch], anchor="ls")
    return img


def app_icon(size: int) -> Image.Image:
    """Full-bleed ink square with the mark inside the maskable safe zone."""
    canvas = Image.new("RGBA", (size * SUPERSAMPLE,) * 2, INK)
    m = mark(round(size * 0.56), LARGE)
    canvas.alpha_composite(m, ((canvas.width - m.width) // 2, (canvas.height - m.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def favicon(size: int) -> Image.Image:
    return mark(size, SMALL).resize((size, size), Image.LANCZOS)


def badge(size: int) -> Image.Image:
    """Android draws the status-bar badge from alpha alone: stroke and letters, no fill."""
    m = mark(size, SMALL)
    # Anything darker than the paper fill is ink; keep it as opaque white.
    ink = m.convert("L").point(lambda v: 255 if v < 235 else 0)
    alpha = Image.composite(ink, Image.new("L", m.size, 0), m.split()[3])
    white = Image.new("RGBA", m.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white.resize((size, size), Image.LANCZOS)


def main() -> None:
    STATIC.mkdir(exist_ok=True)
    app_icon(192).save(STATIC / "icon-192.png", optimize=True)
    app_icon(512).save(STATIC / "icon-512.png", optimize=True)
    app_icon(180).convert("RGB").save(STATIC / "apple-touch-icon.png", optimize=True)
    favicon(48).save(STATIC / "favicon.png", optimize=True)
    favicon(48).save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    badge(96).save(STATIC / "badge.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in STATIC.iterdir() if p.is_file())))


if __name__ == "__main__":
    main()
