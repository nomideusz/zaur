"""Re-shoot captures from the live sites: python3 scripts/capture.py [id ...]

Plates: 1440x900 at DPR 2, scaled to 1200x750 (<id>-1.webp, or <id>-<n> per FRAMES url).
Windows: 1280x800 at DPR 2, the live window's desktop width, scaled to 1200x750.
Phone: 390x844 at DPR 2, kept at 780x1688 (<id>-phone.webp).
Each file gets a .webp.json provenance note, as DESIGN.md asks.
"""
import io, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

LIB = Path(__file__).resolve().parent.parent / 'src/lib'
SITES = {
    'fixtar': 'https://fixtar.pl',
    'pikastro': 'https://pikastro.eu',
    'wibroakustyka': 'https://wibroakustyka.ai',
    'tutitutu': 'https://tutitutu.pl',
    'intertech': 'https://intertechpoland.pl',
    'polaczenie': 'https://gabinet-polaczenie.pl',
    'kurcz': 'https://kurcz.pl',
    'kruk': 'https://kruk.live',
}
# Products shown in a live window: the capture stands in until the site loads.
WINDOWS = {
    'szkolyjogi': 'https://szkolyjogi.pl',
    'thebest': 'https://thebest.travel',
    'kino': 'https://kino.net.pl',
    'kompi': 'https://kompi.pl',
    'festivals': 'https://festivals.zaur.app',
}
# Look-inside frames, in the order plates.ts describes them.
FRAMES = {
    'szkolyjogi': ['https://szkolyjogi.pl/en/krakow/yoga-shala-krakow', 'https://szkolyjogi.pl/en/krakow/dzisiaj', 'https://szkolyjogi.pl/en/krakow'],
}
CONSENT = re.compile(r'^\s*(akceptuj|zaakceptuj|zgadzam|accept|allow all|ok|rozumiem)', re.I)
HIDE = '::-webkit-scrollbar{display:none} html{scrollbar-width:none}'

def shoot(browser, url, w, h):
    page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2,
                            is_mobile=w < 500, has_touch=w < 500)
    page.goto(url, wait_until='load', timeout=60000)
    page.add_style_tag(content=HIDE)
    for b in page.get_by_role('button').all():
        try:
            if b.is_visible() and CONSENT.match(b.inner_text(timeout=500)):
                b.click(timeout=2000); break
        except Exception:
            pass
    page.wait_for_timeout(2500)
    png = page.screenshot()
    page.close()
    return Image.open(io.BytesIO(png))

def save(img, name, note, dir='plates'):
    img.save(LIB / dir / f'{name}.webp', quality=82, method=6)
    (LIB / dir / f'{name}.webp.json').write_text(json.dumps(
        {'prompt': f'Live capture, not generated: {note}', 'createdAt': datetime.now(timezone.utc).isoformat()}, indent=2) + '\n')

ids = sys.argv[1:] or [*SITES, *WINDOWS]
day = datetime.now().date().isoformat()
desk = lambda url, w, h: f'{url} screenshotted with Playwright Chromium at {w}x{h}, DPR 2, scrollbars hidden, consent banner dismissed, on {day}; scaled to 1200x750 webp.'
with sync_playwright() as p:
    browser = p.chromium.launch()
    for id in ids:
        url = SITES.get(id) or WINDOWS[id]
        if id in WINDOWS:
            save(shoot(browser, url, 1280, 800).resize((1200, 750), Image.LANCZOS), id, desk(url, 1280, 800), 'windows')
        for n, u in enumerate(FRAMES.get(id) or ([url] if id in SITES else []), 1):
            save(shoot(browser, u, 1440, 900).resize((1200, 750), Image.LANCZOS), f'{id}-{n}', desk(u, 1440, 900))
        save(shoot(browser, url, 390, 844), f'{id}-phone',
             f'{url} screenshotted with Playwright Chromium at a 390x844 phone viewport, DPR 2, scrollbars hidden, consent banner dismissed, on {day}; kept at 780x1688 webp.')
        print('ok', id)
    browser.close()
