"""
Retag the YouTube rips in the music library: "Artist - Title (Official Video)"
titles and uploader-as-artist become artist / title / album / year, the album
looked up on Deezer (with its cover). Songs keep their Navidrome IDs (matched by path).

  python3 retag.py plan   -> /data/retag/plan.jsonl   (reads only)
  python3 retag.py apply [plan]  -> writes tags; old tags to /data/retag/backup.jsonl
  python3 retag.py undo   -> restores tags from backup.jsonl
  python3 retag.py gain   -> ReplayGain track gain/peak (measured by ffmpeg) for every song without one
  python3 retag.py sweep  -> plan + apply + gain for files that arrived since, then a Navidrome scan
                             (hourly from contabo's crontab; see apps/music/README.md)

A song Deezer does not know becomes its own single (album = its title), so
nothing lands in Navidrome's "[Unknown Album]".
"""
import fcntl, hashlib, json, os, re, secrets, subprocess, sys, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.easymp4 import EasyMP4Tags
from mutagen.id3 import APIC, ID3, TALB, TDRC, TIT2, TPE1, TPE2

ROOT = os.environ.get('RETAG_ROOT', '/music')
OUT = os.environ.get('RETAG_OUT', '/data/retag')
UA = 'ZaurMusic-retag/1.0 (+https://music.zaur.app)'

NOISE = re.compile(
    r'\s*[\(\[][^\)\]]*\b(?:official|lyrics?|audio|video|visuali[sz]er|hd|hq|4k|remaster(?:ed)?|m/?v|clip|original mix|video ?clip)\b[^\)\]]*[\)\]]',
    re.I)
TRAIL = re.compile(r'\s*(?:\bofficial(?: (?:video|audio))?|\bhd|\bhq)\s*$', re.I)
FROM = re.compile(r'\(from\s+["“]?(.+?)["”]?\s*(?:-\s*official[^)]*)?\)', re.I)
DASH = re.compile(r'^(.+?)\s+[-–—]\s+(.+)$')
QUOTES = '"“”\'‘’«»'


def clean(title):
    title = FROM.sub('', title)
    title = NOISE.sub('', title)
    title = TRAIL.sub('', title)
    # 'Artist – “Title” (Label) 1966': the quoted part is the title.
    quoted = re.match(r'^\s*["“](.+?)["”]', title)
    if quoted: title = quoted.group(1)
    return re.sub(r'\s+', ' ', title).strip().strip(QUOTES).strip()


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'^the\s+', '', s)
    return re.sub(r'[^a-z0-9]', '', s)


def lucene(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


last = 0.0
def get(url):
    """Deezer's API: 50 requests per 5 s, no key."""
    global last
    for attempt in range(4):
        wait = 0.15 - (time.time() - last)
        if wait > 0: time.sleep(wait)
        last = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                body = json.load(r)
            if 'error' in body:
                print('deezer error', body['error'], file=sys.stderr); time.sleep(5); continue
            return body
        except Exception as e:
            print('deezer error', e, file=sys.stderr); time.sleep(5)
    return {}


albums = {}
def album(album_id):
    if album_id not in albums:
        albums[album_id] = get(f'https://api.deezer.com/album/{album_id}')
    return albums[album_id]


EDITION = re.compile(r'\s*[\(\[][^\)\]]*\b(?:deluxe|remaster(?:ed)?|expanded|edition|anniversary|bonus)\b[^\)\]]*[\)\]]', re.I)
NOT_ORIGINAL = re.compile(r'\b(live|best of|greatest|hits|collection|anthology|essential|gold|remix(es)?|singles|playlist|karaoke|tribute|originally performed)\b', re.I)


def lookup(title, artist):
    """The original album (else EP, else single) this song first came out on, per Deezer."""
    # Deezer's artist:"" track:"" filters return nothing; plain search ranks well.
    found = get('https://api.deezer.com/search?' + urllib.parse.urlencode({'q': f'{artist} {title}', 'limit': 25})).get('data', [])
    picks = []
    for t in found:
        short, full = clean(t.get('title_short') or ''), clean(t.get('title') or '')
        if norm(full) == norm(title): name = full
        elif norm(short) == norm(title) and not re.search(r'\b(remix|mix|edit|version|live|dub)\b', t.get('title_version') or '', re.I): name = short
        else: continue
        a, c = norm(artist), norm(t.get('artist', {}).get('name', ''))
        if not a or not c or (a not in c and c not in a): continue
        if len({p[4] for p in picks}) >= 6: break
        info = album(t['album']['id'])
        kind = {'album': 0, 'ep': 1, 'single': 2}.get(info.get('record_type'))
        if kind is None or info.get('artist', {}).get('name') == 'Various Artists': continue
        if NOT_ORIGINAL.search(info.get('title', '')) and not NOT_ORIGINAL.search(title): continue
        picks.append((kind, info.get('release_date') or '9999', info['title'], t, info['id'], info, name))
    if not picks: return None
    kind, date, album_title, t, album_id, info, name = min(picks, key=lambda p: p[:2])
    return {
        'artist': t['artist']['name'],
        'title': name,
        'album': EDITION.sub('', album_title).strip() or album_title,
        'albumartist': info.get('artist', {}).get('name') or t['artist']['name'],
        'year': date[:4] if date != '9999' else None,
        'cover': info.get('cover_xl'),
        'deezer_album': album_id,
    }


def text(tags, key):
    v = tags.get(key)
    return str(v.text[0]) if v is not None and getattr(v, 'text', None) else ''


def plan():
    os.makedirs(OUT, exist_ok=True)
    done = set()
    path = f'{OUT}/plan.jsonl'
    if os.path.exists(path):
        done = {json.loads(l)['path'] for l in open(path)}
    out = open(path, 'a')
    for root, _, files in sorted(os.walk(ROOT)):
        if root.startswith(f'{ROOT}/YouTube'): continue
        for name in sorted(files):
            p = os.path.join(root, name)
            if not name.lower().endswith('.mp3') or p in done: continue
            # Still arriving, maybe: the next sweep takes it.
            if time.time() - os.path.getmtime(p) < 600: continue
            try: tags = ID3(p)
            except Exception: continue
            if text(tags, 'TALB'): continue
            old = {k: text(tags, f) for k, f in (('title', 'TIT2'), ('artist', 'TPE1'), ('album', 'TALB'), ('year', 'TDRC'))}
            raw = old['title'] or os.path.splitext(name)[0]
            new, how = None, 'single'
            from_album = FROM.search(raw)
            m = DASH.match(clean(raw))
            if m:
                a, t = clean(m.group(1)), clean(m.group(2))
                hit, how = lookup(t, a), 'deezer'
                if not hit:
                    hit, how = lookup(a, t), 'deezer-reverse'
                if hit:
                    new = {**hit, 'year': hit['year'] or old['year']}
                else:
                    how = 'from-title' if from_album else 'single'
                    new = {'artist': a, 'title': t, 'album': from_album.group(1).strip() if from_album else t, 'year': old['year']}
            else:
                # No "Artist - Title": maybe the channel is the artist.
                t = clean(raw)
                channel = re.sub(r'\s*(?:-\s*Topic|VEVO|Official)$', '', old['artist'], flags=re.I).strip()
                hit = lookup(t, channel) if channel else None
                if hit: new, how = {**hit, 'year': hit['year'] or old['year']}, 'deezer-channel'
                else: new, how = {'artist': old['artist'], 'title': t, 'album': t, 'year': old['year']}, 'bare'
            out.write(json.dumps({'path': p, 'how': how, 'old': old, 'new': new}, ensure_ascii=False) + '\n')
            out.flush()


def apply(plan_file=f'{OUT}/plan.jsonl'):
    os.makedirs(f'{OUT}/old-covers', exist_ok=True)
    backup_path = f'{OUT}/backup.jsonl'
    # Never back up a file twice: the second backup would hold the new tags.
    done = {json.loads(l)['path'] for l in open(backup_path)} if os.path.exists(backup_path) else set()
    backup = open(backup_path, 'a')
    covers, n = {}, 0
    for i, line in enumerate(open(plan_file)):
        row = json.loads(line)
        p, new = row['path'], row['new']
        # Bare (no "Artist - Title" and Deezer did not know it): its own single, the uploader as artist.
        if p in done or not os.path.exists(p): continue
        tags = ID3(p)
        old_covers = []
        for j, pic in enumerate(tags.getall('APIC')):
            # Named by plan too: a second plan's line numbers restart at 0.
            f = f'{OUT}/old-covers/{os.path.basename(plan_file)}-{i}-{j}'
            with open(f, 'wb') as out: out.write(pic.data)
            old_covers.append({'file': f, 'mime': pic.mime, 'type': int(pic.type), 'desc': pic.desc})
        backup.write(json.dumps({'path': p, 'frames': {f: text(tags, f) for f in ('TIT2', 'TPE1', 'TPE2', 'TALB', 'TDRC')}, 'covers': old_covers}, ensure_ascii=False) + '\n')
        backup.flush()
        tags.setall('TIT2', [TIT2(encoding=3, text=new['title'])])
        if new['artist']:
            tags.setall('TPE1', [TPE1(encoding=3, text=new['artist'])])
            tags.setall('TPE2', [TPE2(encoding=3, text=new.get('albumartist') or new['artist'])])
        tags.setall('TALB', [TALB(encoding=3, text=new['album'])])
        if new.get('year'): tags.setall('TDRC', [TDRC(encoding=3, text=str(new['year']))])
        url = new.get('cover')
        if url:
            if url not in covers:
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r: covers[url] = r.read()
                except Exception as e:
                    print('cover error', url, e, file=sys.stderr); covers[url] = None
            if covers[url]:
                tags.delall('APIC')
                tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=covers[url]))
        tags.save(p)
        n += 1
    print('retagged', n)
    return n


def navidrome(method, **params):
    salt = secrets.token_hex(6)
    q = {'u': os.environ['NAVIDROME_ADMIN_USER'], 't': hashlib.md5((os.environ['NAVIDROME_ADMIN_PASSWORD'] + salt).encode()).hexdigest(),
         's': salt, 'v': '1.16.1', 'c': 'retag', 'f': 'json', **params}
    base = os.environ.get('NAVIDROME_URL', 'http://navidrome:4533').rstrip('/')
    return json.load(urllib.request.urlopen(f'{base}/rest/{method}?' + urllib.parse.urlencode(q), timeout=60))['subsonic-response']


# ReplayGain 2.0: gain to bring the song to -18 LUFS. The player turns it into a volume.
AUDIO = ('.mp3', '.m4a', '.flac', '.ogg', '.opus')
GAIN_KEY, PEAK_KEY = 'replaygain_track_gain', 'replaygain_track_peak'
# TXXX frames, which Navidrome reads (EasyID3's own replaygain keys write RVA2).
EasyID3.RegisterTXXXKey(GAIN_KEY, 'REPLAYGAIN_TRACK_GAIN')
EasyID3.RegisterTXXXKey(PEAK_KEY, 'REPLAYGAIN_TRACK_PEAK')
EasyMP4Tags.RegisterFreeformKey(GAIN_KEY, 'REPLAYGAIN_TRACK_GAIN')
EasyMP4Tags.RegisterFreeformKey(PEAK_KEY, 'REPLAYGAIN_TRACK_PEAK')


def loudness(p):
    """(integrated LUFS, sample peak dBFS) from ffmpeg's ebur128 summary, or None."""
    r = subprocess.run(['nice', 'ffmpeg', '-nostats', '-hide_banner', '-i', p, '-map', '0:a:0', '-af', 'ebur128=peak=sample', '-f', 'null', '-'],
                       capture_output=True, text=True, errors='replace', timeout=600)
    i = re.findall(r'^\s+I:\s+(-?[\d.]+) LUFS', r.stderr, re.M)
    peak = re.findall(r'^\s+Peak:\s+(-?[\d.]+|-inf) dBFS', r.stderr, re.M)
    if r.returncode or not i or not peak: return None
    return float(i[-1]), float(peak[-1])


def gain_one(p):
    try:
        f = mutagen.File(p, easy=True)
        if f is None or f.tags is not None and GAIN_KEY in f.tags: return 0
        measured = loudness(p)
        # Silence measures -70 LUFS: no gain to give.
        if not measured or measured[0] <= -70: return -1
        if f.tags is None: f.add_tags()
        f[GAIN_KEY] = f'{-18 - measured[0]:.2f} dB'
        f[PEAK_KEY] = f'{10 ** (measured[1] / 20):.6f}'
        f.save()
        return 1
    except Exception as e:
        print('gain error', p, e, file=sys.stderr)
        return -1


def gain():
    # Not measured (unreadable, silent) once is not tried every hour.
    failed_path = f'{OUT}/gain-failed.txt'
    failed = set(open(failed_path).read().splitlines()) if os.path.exists(failed_path) else set()
    todo = [os.path.join(root, name) for root, _, files in os.walk(ROOT) for name in files
            if name.lower().endswith(AUDIO) and os.path.join(root, name) not in failed]
    # Still arriving, maybe: the next sweep takes it.
    todo = [p for p in todo if time.time() - os.path.getmtime(p) >= 600]
    # ponytail: 3 ffmpegs at nice 10 measure ~3,000 songs in ~15 min; the box also runs mail.
    with ThreadPoolExecutor(3) as pool, open(failed_path, 'a') as out:
        results = list(pool.map(gain_one, todo))
        for p, r in zip(todo, results):
            if r < 0: out.write(p + '\n')
    n = results.count(1)
    print('gained', n, 'failed', results.count(-1))
    return n


def sweep():
    # One at a time: the first gain pass outlasts the hour.
    lock = open(f'{OUT}/sweep.lock', 'w')
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: return print('another sweep is running')
    plan()
    if apply() + gain(): navidrome('startScan')


def undo():
    n = 0
    for line in open(f'{OUT}/backup.jsonl'):
        row = json.loads(line)
        # Deleted since (e.g. the wrong Bernstein download).
        if not os.path.exists(row['path']): continue
        tags = ID3(row['path'])
        for f, v in row['frames'].items():
            tags.delall(f)
            if v: tags.add(getattr(mutagen.id3, f)(encoding=3, text=v))
        tags.delall('APIC')
        for c in row.get('covers', []):
            tags.add(APIC(encoding=3, mime=c['mime'], type=c['type'], desc=c['desc'], data=open(c['file'], 'rb').read()))
        tags.save(row['path'])
        n += 1
    print('restored', n)


if __name__ == '__main__':
    {'plan': plan, 'apply': apply, 'undo': undo, 'gain': gain, 'sweep': sweep, 'scan': lambda: navidrome('startScan')}[sys.argv[1]](*sys.argv[2:])
