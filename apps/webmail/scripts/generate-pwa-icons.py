#!/usr/bin/env python3
"""Generate PWA icons for ZAUR Webmail."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "static"
BLUE = (37, 99, 235)
WHITE = (255, 255, 255)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BLUE + (255,))
    draw = ImageDraw.Draw(img)
    margin = size * 0.18
    body = [margin, margin * 1.35, size - margin, size - margin * 0.85]
    draw.rounded_rectangle(body, radius=size * 0.08, fill=WHITE)

    flap_top = margin * 1.35
    flap_bottom = size * 0.46
    draw.polygon(
        [
            (margin, flap_top),
            (size / 2, flap_bottom),
            (size - margin, flap_top),
        ],
        fill=BLUE,
    )
    draw.line([(margin, flap_top), (size / 2, flap_bottom), (size - margin, flap_top)], fill=WHITE, width=max(2, size // 64))
    return img


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        icon = draw_icon(size)
        icon.save(ROOT / f"pwa-{size}x{size}.png", format="PNG")
        print(f"Wrote {ROOT / f'pwa-{size}x{size}.png'}")

    touch = draw_icon(192)
    touch.save(ROOT / "apple-touch-icon.png", format="PNG")
    touch.save(ROOT / "apple-touch-icon-precomposed.png", format="PNG")
    touch.save(ROOT / "favicon.ico", format="ICO", sizes=[(192, 192)])
    print(f"Wrote {ROOT / 'apple-touch-icon.png'}")
    print(f"Wrote {ROOT / 'apple-touch-icon-precomposed.png'}")
    print(f"Wrote {ROOT / 'favicon.ico'}")


if __name__ == "__main__":
    main()
