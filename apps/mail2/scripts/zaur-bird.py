#!/usr/bin/env python3
"""Zaur's bird: every icon of the zaur set, and the Android app's, from one image.

The source is scripts/zaur-bird.png: a flat, low-poly bird in seven colours on
transparency, 1024 x 1024. It is drawn two ways:

- traced into polygons, one path per colour, for src/lib/bird.ts (the mark the
  app draws inline: the shell's home button, the sign-in card, the offline page,
  Meet) and static/icons/zaur/favicon.svg — crisp at any size, a few kilobytes;
- resampled from the source for every bitmap: favicons, PWA and Apple icons, the
  push badge (its silhouette), the Android launcher icons and splash screens.

The suite's other front doors wear it too: zaur.app (apps/web/static), Music
(apps/music/static, and its inline mark from apps/music/src/lib/bird.ts) and
Register (apps/register/public, its cards' marks between `<!-- bird N -->`
markers, N pixels wide).

    python scripts/zaur-bird.py      # needs Pillow, numpy, opencv-python-headless

The plain set (an envelope, static/icons/mail/) is still drawn by
scripts/generate-icons.py.
"""
import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
APP = HERE.parent
APPS = APP.parent
STATIC = APP / "static" / "icons" / "zaur"
ANDROID_RES = APP.parent / "mobile" / "android" / "app" / "src" / "main" / "res"
MOBILE_ASSETS = APP.parent / "mobile" / "assets"

SOURCE = Image.open(HERE / "zaur-bird.png").convert("RGBA")
# The bird's seven flat colours; anything else in the source is an edge's blend.
PALETTE = ["#ff6b5a", "#7657d6", "#a48ff2", "#8b70e6", "#5f43c2", "#e04a48", "#b9a8f7"]
# Android's own dark splash colour, as before.
NIGHT = (28, 28, 30)


def rgb(hex_colour: str) -> tuple[int, int, int]:
    return tuple(int(hex_colour[i : i + 2], 16) for i in (1, 3, 5))


def bird() -> Image.Image:
    """The source cropped to the bird."""
    return SOURCE.crop(SOURCE.getchannel("A").getbbox())


# ---------------------------------------------------------------- tracing


def path(mask: np.ndarray, origin: tuple[int, int], epsilon: float) -> str:
    """One even-odd path for a mask: every outline and every hole."""
    contours, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    parts = []
    for contour in contours:
        if cv2.contourArea(contour) < 12:
            continue
        points = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
        if len(points) < 3:
            continue
        x0, y0 = origin
        parts.append("M" + "L".join(f"{x - x0} {y - y0}" for x, y in points) + "Z")
    return "".join(parts)


def trace() -> dict:
    pixels = np.array(SOURCE)
    alpha = pixels[:, :, 3]
    solid = alpha >= 128
    left, top, right, bottom = SOURCE.getchannel("A").getbbox()
    # Each solid pixel goes to its nearest flat colour.
    colours = np.array([rgb(c) for c in PALETTE], dtype=np.int32)
    distance = ((pixels[:, :, None, :3].astype(np.int32) - colours[None, None]) ** 2).sum(axis=3)
    nearest = distance.argmin(axis=2)
    shapes = []
    for index, colour in enumerate(PALETTE):
        mask = ((nearest == index) & solid).astype(np.uint8) * 255
        d = path(mask, (left, top), 1.4)
        if d:
            shapes.append([colour, d])
    return {
        "width": right - left,
        "height": bottom - top,
        "shapes": shapes,
        "silhouette": path(solid.astype(np.uint8) * 255, (left, top), 1.4),
    }


def svg(traced: dict, square: bool) -> str:
    """The traced bird; `square` centres it in a square box (a favicon)."""
    w, h = traced["width"], traced["height"]
    side = max(w, h)
    box = f"{-(side - w) / 2:g} {-(side - h) / 2:g} {side} {side}" if square else f"0 0 {w} {h}"
    # Each colour's own stroke closes the hairline seams between neighbouring polygons.
    body = "".join(
        f'<path fill="{c}" stroke="{c}" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd" d="{d}"/>'
        for c, d in traced["shapes"]
    )
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}">{body}</svg>\n'


# ---------------------------------------------------------------- bitmaps


def placed(size: tuple[int, int], width_share: float, background=None, art: Image.Image | None = None) -> Image.Image:
    """The bird `width_share` of the canvas wide, centred, on `background` (transparent if None)."""
    art = art or bird()
    canvas = Image.new("RGBA", size, (*background, 255) if background else (0, 0, 0, 0))
    width = max(1, round(min(size) * width_share))
    height = max(1, round(width * art.height / art.width))
    scaled = art.resize((width, height), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((size[0] - width) // 2, (size[1] - height) // 2))
    return canvas


def silhouette() -> Image.Image:
    """White where the bird is: Android draws a notification badge from alpha alone."""
    art = bird()
    white = Image.new("RGBA", art.size, (255, 255, 255, 255))
    white.putalpha(art.getchannel("A"))
    return white


def rounded(image: Image.Image, radius_share: float) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    from PIL import ImageDraw

    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.size[0] - 1, image.size[1] - 1), radius=round(image.size[0] * radius_share), fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def web(traced: dict) -> None:
    STATIC.mkdir(parents=True, exist_ok=True)
    (STATIC / "favicon.svg").write_text(svg(traced, square=True), encoding="utf-8")
    # Favicon: the bird alone, nearly edge to edge, so it reads at 16px.
    small = placed((48, 48), 0.98)
    small.save(STATIC / "favicon.png", optimize=True)
    small.save(STATIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # PWA icons serve as "maskable" too: the bird stays inside the central safe circle
    # (radius 40%), on white, which the bird's colours were drawn against.
    for size in (192, 512):
        placed((size, size), 0.62, (255, 255, 255)).save(STATIC / f"icon-{size}.png", optimize=True)
    # iOS rounds the corners itself and wants no transparency.
    placed((180, 180), 0.7, (255, 255, 255)).convert("RGB").save(STATIC / "apple-touch-icon.png", optimize=True)
    placed((96, 96), 0.94, art=silhouette()).save(STATIC / "badge.png", optimize=True)


def android() -> None:
    if not ANDROID_RES.exists():
        return
    densities = {"ldpi": 0.75, "mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, scale in densities.items():
        folder = ANDROID_RES / f"mipmap-{name}"
        legacy = round(48 * scale)
        # Before Android 8: a white tile, square-ish and round.
        square = placed((legacy, legacy), 0.7, (255, 255, 255))
        rounded(square, 0.18).save(folder / "ic_launcher.png", optimize=True)
        circle = placed((legacy, legacy), 0.66, (255, 255, 255))
        mask = Image.new("L", circle.size, 0)
        from PIL import ImageDraw

        ImageDraw.Draw(mask).ellipse((0, 0, legacy - 1, legacy - 1), fill=255)
        circle.putalpha(mask)
        circle.save(folder / "ic_launcher_round.png", optimize=True)
        # Adaptive (8+): mipmap-anydpi-v26 insets both layers 16.7%; the bird keeps inside
        # the launcher's 66dp safe circle of that inset area.
        layer = round(108 * scale)
        placed((layer, layer), 0.68).save(folder / "ic_launcher_foreground.png", optimize=True)
        Image.new("RGBA", (layer, layer), (255, 255, 255, 255)).save(folder / "ic_launcher_background.png", optimize=True)
    for splash in ANDROID_RES.glob("drawable*/splash.png"):
        size = Image.open(splash).size
        background = NIGHT if "night" in splash.parent.name else (255, 255, 255)
        placed(size, 0.28, background).save(splash, optimize=True)
    if MOBILE_ASSETS.exists():
        # The source @capacitor/assets would generate from.
        SOURCE.save(MOBILE_ASSETS / "logo.png", optimize=True)


def inline(traced: dict, width: int) -> str:
    """The bird as markup for a static page, `width` pixels wide."""
    body = "".join(
        f'<path fill="{c}" stroke="{c}" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd" d="{d}" />'
        for c, d in traced["shapes"]
    )
    return f'<svg width="{width}" viewBox="0 0 {traced["width"]} {traced["height"]}" style="flex-shrink:0" aria-hidden="true">{body}</svg>'


def module(traced: dict, out: Path) -> None:
    out.write_text(
        "// Generated by apps/mail2/scripts/zaur-bird.py from its zaur-bird.png — do not edit.\n"
        "/** Zaur's bird, traced: one even-odd path per flat colour, and its silhouette. */\n"
        f"export const BIRD = {json.dumps(traced, indent='\t')} as const;\n",
        encoding="utf-8",
    )


def suite(traced: dict) -> None:
    """zaur.app, Music and Register: the same favicon and app icons as webmail."""
    square = svg(traced, square=True)
    white = (255, 255, 255)
    landing = APPS / "web" / "static"
    if landing.exists():
        (landing / "favicon.svg").write_text(square, encoding="utf-8")
        placed((48, 48), 0.98).save(landing / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        placed((180, 180), 0.7, white).convert("RGB").save(landing / "apple-touch-icon.png", optimize=True)
        placed((512, 512), 0.62, white).convert("RGB").save(landing / "icon-512.png", optimize=True)
    music = APPS / "music" / "static"
    if music.exists():
        (music / "favicon.svg").write_text(square, encoding="utf-8")
        small = placed((48, 48), 0.98)
        small.save(music / "favicon.png", optimize=True)
        small.save(music / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        placed((180, 180), 0.7, white).convert("RGB").save(music / "apple-touch-icon.png", optimize=True)
        for size in (192, 512):
            placed((size, size), 0.62, white).save(music / f"icon-{size}.png", optimize=True)
        module(traced, APPS / "music" / "src" / "lib" / "bird.ts")
    register = APPS / "register" / "public"
    if register.exists():
        (register / "favicon.svg").write_text(square, encoding="utf-8")
        placed((48, 48), 0.98).save(register / "favicon.png", optimize=True)
        placed((180, 180), 0.7, white).convert("RGB").save(register / "apple-touch-icon.png", optimize=True)
        # Its pages are static HTML: the bird goes between `<!-- bird N … -->` and `<!-- /bird -->`.
        marker = re.compile(r"(<!-- bird (\d+)[^>]*-->).*?(<!-- /bird -->)", re.S)
        for page in register.glob("*.html"):
            text = page.read_text(encoding="utf-8")
            filled = marker.sub(lambda m: m.group(1) + inline(traced, int(m.group(2))) + m.group(3), text)
            if filled != text:
                page.write_bytes(filled.encode("utf-8"))


def main() -> None:
    traced = trace()
    module(traced, APP / "src" / "lib" / "bird.ts")
    web(traced)
    android()
    suite(traced)
    size = sum(len(d) for _, d in traced["shapes"])
    print(f"traced {len(traced['shapes'])} colours, {size} chars; wrote webmail, Android, zaur.app, Music and Register")


if __name__ == "__main__":
    main()
