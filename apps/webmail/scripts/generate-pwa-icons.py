#!/usr/bin/env python3
"""Generate PWA icons for ZAUR Webmail using the Zaur pixel art sprite."""

import re
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "static"
ASSETS_DIR = Path(__file__).resolve().parent.parent / "src" / "lib" / "assets"
SPRITE_TS = Path(__file__).resolve().parents[3] / "packages" / "sprite" / "src" / "frames.ts"

# Brand colors
GRADIENT_START = (59, 130, 246)  # #3b82f6 (Bright Blue)
GRADIENT_END = (29, 79, 216)    # #1d4ed8 (Deep Blue)
ZAUR_INK_RGB = (232, 228, 216)  # #e8e4d8 (Off-white Zaur Ink)
SHADOW_COLOR = (15, 23, 42, 50)  # Dark slate shadow with alpha

def load_sprite_frame(frame_name: str) -> list[str]:
    """Parse the sprite frame from packages/sprite/src/frames.ts."""
    content = SPRITE_TS.read_text(encoding="utf-8")
    # Find the array of strings for the frame
    match = re.search(rf"const {frame_name.upper()} = \[(.*?)\];", content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find frame {frame_name} in {SPRITE_TS}")
    # Extract string literals
    lines = re.findall(r'"([^"]*)"', match.group(1))
    return lines

def create_gradient_bg(size: int) -> Image.Image:
    """Create a beautiful vertical gradient image."""
    base = Image.new("RGBA", (size, size))
    for y in range(size):
        ratio = y / (size - 1) if size > 1 else 0
        r = int(GRADIENT_START[0] + (GRADIENT_END[0] - GRADIENT_START[0]) * ratio)
        g = int(GRADIENT_START[1] + (GRADIENT_END[1] - GRADIENT_START[1]) * ratio)
        b = int(GRADIENT_START[2] + (GRADIENT_END[2] - GRADIENT_START[2]) * ratio)
        for x in range(size):
            base.putpixel((x, y), (r, g, b, 255))
    return base

def draw_zaur_pixels(draw: ImageDraw.Draw, frame: list[str], scale: int, ox: int, oy: int, color: tuple):
    """Draw Zaur sprite pixel rects at offset (ox, oy) with pixel size `scale`."""
    for y, row in enumerate(frame):
        for x, char in enumerate(row):
            if char == 'X':
                x1 = ox + x * scale
                y1 = oy + y * scale
                x2 = x1 + scale
                y2 = y1 + scale
                draw.rectangle([x1, y1, x2, y2], fill=color)

def draw_icon(size: int, frame: list[str]) -> Image.Image:
    """Create the icon with gradient background and centered Zaur dino with drop shadow."""
    img = create_gradient_bg(size)
    draw = ImageDraw.Draw(img)
    
    # We want the sprite to take up ~60% of the canvas height
    # Sprite grid is 20 wide, 18 high
    sprite_h = 18
    sprite_w = 20
    
    # Calculate scale as integer
    scale = max(1, int(size * 0.60 / sprite_h))
    
    # Centered offset
    width_px = sprite_w * scale
    height_px = sprite_h * scale
    ox = (size - width_px) // 2
    oy = (size - height_px) // 2
    
    # Draw drop shadow (offset down and right)
    shadow_offset = max(1, scale // 4)
    draw_zaur_pixels(draw, frame, scale, ox + shadow_offset, oy + shadow_offset, SHADOW_COLOR)
    
    # Draw main body
    draw_zaur_pixels(draw, frame, scale, ox, oy, ZAUR_INK_RGB)
    
    return img

def generate_svg(frame: list[str], color_hex: str) -> str:
    """Generate raw SVG string for the given frame."""
    scale = 1
    w = 20 * scale
    h = 18 * scale
    rects = []
    for y, row in enumerate(frame):
        for x, char in enumerate(row):
            if char == 'X':
                rects.append(f'<rect x="{x * scale}" y="{y * scale}" width="{scale}" height="{scale}"/>')
    
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" shape-rendering="crispEdges" fill="{color_hex}">' + "".join(rects) + '</svg>'

def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Load the HAPPY frame
    frame = load_sprite_frame("HAPPY")
    print(f"Loaded HAPPY frame from {SPRITE_TS}")
    
    # 2. Write src/lib/assets/favicon.svg
    svg_content = generate_svg(frame, "#2563eb")  # Zaur brand blue
    (ASSETS_DIR / "favicon.svg").write_text(svg_content, encoding="utf-8")
    print(f"Wrote {ASSETS_DIR / 'favicon.svg'}")
    
    # 3. Generate PNG/ICO icons
    for size in (192, 512):
        icon = draw_icon(size, frame)
        icon.save(ROOT / f"pwa-{size}x{size}.png", format="PNG")
        print(f"Wrote {ROOT / f'pwa-{size}x{size}.png'}")
        
    touch = draw_icon(192, frame)
    touch.save(ROOT / "apple-touch-icon.png", format="PNG")
    touch.save(ROOT / "apple-touch-icon-precomposed.png", format="PNG")
    
    # Convert and save favicon.ico
    touch.save(ROOT / "favicon.ico", format="ICO", sizes=[(192, 192)])
    print(f"Wrote {ROOT / 'apple-touch-icon.png'}")
    print(f"Wrote {ROOT / 'apple-touch-icon-precomposed.png'}")
    print(f"Wrote {ROOT / 'favicon.ico'}")

if __name__ == "__main__":
    main()
