#!/usr/bin/env python3
"""Draw mail2's PWA icons and favicon from the ZAUR stamp (ZaurMark.svelte).

The stamp in the shell is `ZAUR` in IBM Plex Mono 600, letter-spaced 0.22em,
inside a 1px ink box: 24px tall, 9px side padding, 11px type, 6px radius. The
icons scale those proportions exactly, so the app icon is the mark and not a
new drawing. A favicon cannot hold four letters at 16-48px, so it is the same
box around a single Z.

    python3 scripts/generate-icons.py      # writes into static/ (needs Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
FONT = ROOT / "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2"

INK = (11, 18, 32, 255)  # --z-ink
SURFACE = (255, 255, 255, 255)  # --z-surface
SUPERSAMPLE = 4

# ZaurMark.svelte, in CSS px at the 24px size.
STAMP_HEIGHT, PAD_X, TYPE, TRACKING, RADIUS, BORDER = 24, 9, 11, 0.22, 6, 1


def stamp(text: str, width: int, square: bool = False) -> Image.Image:
    """The stamp at `width` px, supersampled, transparent outside the box."""
    font = ImageFont.truetype(str(FONT), 100)
    advances = [font.getlength(ch) / 100 * TYPE + TRACKING * TYPE for ch in text]
    # The square favicon trims the padding so one letter still reads at 16px.
    natural_w = sum(advances) + 2 * (3.5 if square else PAD_X)
    natural_h = natural_w if square else STAMP_HEIGHT
    scale = width * SUPERSAMPLE / natural_w
    w, h = round(natural_w * scale), round(natural_h * scale)

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    border = max(1, round(BORDER * scale))
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=round(RADIUS * scale), fill=SURFACE, outline=INK, width=border)

    size = TYPE * scale
    face = ImageFont.truetype(str(FONT), round(size))
    cap_top, cap_bottom = face.getbbox("Z", anchor="ls")[1], 0
    baseline = h / 2 + (cap_bottom - cap_top) / 2
    # Letter-spacing trails every glyph (as in CSS), so the text block is centred
    # including the last gap, which is what the shell's stamp does too.
    x = (w - sum(a * scale for a in advances)) / 2 + (TRACKING * TYPE * scale) / 2
    for ch, advance in zip(text, advances):
        draw.text((x, baseline), ch, font=face, fill=INK, anchor="ls")
        x += advance * scale
    return img


def app_icon(size: int) -> Image.Image:
    """Full-bleed ink square with the stamp inside the maskable safe zone."""
    canvas = Image.new("RGBA", (size * SUPERSAMPLE,) * 2, INK)
    mark = stamp("ZAUR", round(size * 0.62))
    canvas.alpha_composite(mark, ((canvas.width - mark.width) // 2, (canvas.height - mark.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def favicon(size: int) -> Image.Image:
    mark = stamp("Z", size, square=True)
    return mark.resize((size, size), Image.LANCZOS)


def badge(size: int) -> Image.Image:
    """Android draws the status-bar badge from alpha alone: an outlined Z, no fill."""
    mark = stamp("Z", size, square=True)
    white = Image.new("RGBA", mark.size, (255, 255, 255, 255))
    # Keep only the ink (border and letter) as opaque white.
    ink = mark.split()[0].point(lambda v: 255 - v)
    white.putalpha(Image.composite(ink, Image.new("L", mark.size, 0), mark.split()[3]))
    return white.resize((size, size), Image.LANCZOS)


def main() -> None:
    STATIC.mkdir(exist_ok=True)
    app_icon(192).save(STATIC / "icon-192.png", optimize=True)
    app_icon(512).save(STATIC / "icon-512.png", optimize=True)
    app_icon(180).convert("RGB").save(STATIC / "apple-touch-icon.png", optimize=True)
    favicon(48).save(STATIC / "favicon.png", optimize=True)
    favicon(48).save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    badge(96).save(STATIC / "badge.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in STATIC.iterdir())))


if __name__ == "__main__":
    main()
