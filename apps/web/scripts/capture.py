"""Re-shoot plates from the live sites: python3 scripts/capture.py [id ...]

Desktop: 1440x900 at DPR 2, scaled to 1200x750 (<id>-1.webp).
Phone: 390x844 at DPR 2, kept at 780x1688 (<id>-phone.webp).
Each file gets a .webp.json provenance note, as DESIGN.md asks.
"""
import io, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

PLATES = Path(__file__).resolve().parent.parent / 'src/lib/plates'
SITES = {
    'fixtar': 'https://fixtar.pl',
    'pikastro': 'https://pikastro.eu',
    'wibroakustyka': 'https://wibroakustyka.ai',
    'tutitutu': 'https://tutitutu.pl',
    'intertech': 'https://intertechpoland.pl',
    'polaczenie': 'https://gabinet-polaczenie.pl',
    'kurcz': 'https://kurcz.pl',
    'kruk': 'https://kruk.live',
    'kompi': 'https://kompi.pl',
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

def save(img, name, note):
    img.save(PLATES / f'{name}.webp', quality=82, method=6)
    (PLATES / f'{name}.webp.json').write_text(json.dumps(
        {'prompt': f'Live capture, not generated: {note}', 'createdAt': datetime.now(timezone.utc).isoformat()}, indent=2) + '\n')

ids = sys.argv[1:] or list(SITES)
day = datetime.now().date().isoformat()
with sync_playwright() as p:
    browser = p.chromium.launch()
    for id in ids:
        url = SITES[id]
        save(shoot(browser, url, 1440, 900).resize((1200, 750), Image.LANCZOS), f'{id}-1',
             f'{url} screenshotted with Playwright Chromium at 1440x900, DPR 2, scrollbars hidden, consent banner dismissed, on {day}; scaled to 1200x750 webp.')
        save(shoot(browser, url, 390, 844), f'{id}-phone',
             f'{url} screenshotted with Playwright Chromium at a 390x844 phone viewport, DPR 2, scrollbars hidden, consent banner dismissed, on {day}; kept at 780x1688 webp.')
        print('ok', id)
    browser.close()
