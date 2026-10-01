"""
Duplicate songs in the music library: the same artist and title (tidied as
retag.py tidies them) at the same length, give or take a few seconds. Of each
set, the copy on a real album wins, then lossless, then the higher bitrate; the
rest move out of the library to a folder of their own, so undo puts them back.
Only a loose single, or a second copy on the same album, moves: the same song
on two albums is both albums' (an album by the same name, give or take
"(Deluxe Edition)", is the same album, tagged twice). Nor does a copy in anyone's favourites or a playlist.

Runs on contabo's host (not in the music container): it reads Navidrome's
database, read-only, for the songs and who uses them.

  python3 dupes.py report  -> /srv/zaur-music/retag/dupes.jsonl, and a summary (moves nothing)
  python3 dupes.py apply   -> moves what the report says to /srv/zaur-music/dupes/, then a Navidrome scan
  python3 dupes.py undo    -> moves them back, then a scan
"""
import collections, json, os, re, shutil, sqlite3, subprocess, sys, unicodedata

DB = os.environ.get('NAVIDROME_DB', '/var/lib/docker/volumes/captain--data/_data/navidrome.db')
LIBRARY = os.environ.get('LIBRARY', '/mnt/remote-music')
TRASH = os.environ.get('TRASH', '/srv/zaur-music/dupes')
OUT = os.environ.get('OUT', '/srv/zaur-music/retag')
REPORT, MOVED = f'{OUT}/dupes.jsonl', f'{OUT}/dupes-moved.jsonl'

# retag.py's, plus editions and "version" brackets: one song to anyone listening.
# (Copied, not imported: retag.py needs mutagen, which the host does not have.)
NOISE = re.compile(
    r'\s*[\(\[][^\)\]]*\b(?:official|lyrics?|audio|video|visuali[sz]er|hd|hq|4k|remaster(?:ed)?|m/?v|clip|original mix|video ?clip)\b[^\)\]]*[\)\]]',
    re.I)
EDITION = re.compile(r'\s*[\(\[][^\)\]]*\b(?:deluxe|remaster(?:ed)?|expanded|edition|anniversary|bonus)\b[^\)\]]*[\)\]]', re.I)


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'^the\s+', '', s)
    return re.sub(r'[^a-z0-9]', '', s)


def same_take(a, b):
    return abs(a['duration'] - b['duration']) <= max(4, 0.03 * max(a['duration'], b['duration']))


def report():
    db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    used = {r[0] for r in db.execute(
        "select item_id from annotation where item_type = 'media_file' and (starred or rating > 0)"
        " union select media_file_id from playlist_tracks")}
    songs = [dict(r) for r in db.execute(
        'select id, path, title, artist, album, album_id, duration, bit_rate, suffix from media_file where not missing')]
    # How many songs each album has: a "single" made by retag.py is an album of one.
    on_album = collections.Counter(s['album_id'] for s in songs)
    groups = collections.defaultdict(list)
    for s in songs:
        key = (norm(s['artist']), norm(NOISE.sub('', s['title'] or '')))
        if all(key): groups[key].append(s)

    def rank(s):
        return (on_album[s['album_id']] > 1, s['suffix'] == 'flac', s['bit_rate'] or 0)

    sets, moves, kept_in_use = [], 0, 0
    for group in groups.values():
        group.sort(key=rank, reverse=True)
        while group:
            keep, *rest = group
            same = [s for s in rest if same_take(keep, s)
                    and (on_album[s['album_id']] == 1 or s['album_id'] == keep['album_id']
                         or norm(EDITION.sub('', s['album'])) == norm(EDITION.sub('', keep['album'])))]
            group = [s for s in rest if s not in same]
            if not same: continue
            drop = [s for s in same if s['id'] not in used]
            kept_in_use += len(same) - len(drop)
            moves += len(drop)
            sets.append({'keep': keep['path'], 'drop': [s['path'] for s in drop],
                         'in_use': [s['path'] for s in same if s['id'] in used]})
    with open(REPORT, 'w') as out:
        for s in sets: out.write(json.dumps(s, ensure_ascii=False) + '\n')
    for s in sets:
        print('keep', s['keep'])
        for p in s['drop']: print('  move', p)
        for p in s['in_use']: print('  stays (favourite/playlist)', p)
    print(f'{len(sets)} sets: {moves} to move, {kept_in_use} stay because someone uses them -> {REPORT}')


def scan():
    container = subprocess.run(['docker', 'ps', '-qf', 'name=zaur-music-klupig'], capture_output=True, text=True).stdout.split()
    if container: subprocess.run(['docker', 'exec', container[0], 'python3', '/data/retag/retag.py', 'scan'], check=False)
    else: print('music container not found: scan Navidrome by hand')


def move(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(src, dst)


def apply():
    n = 0
    with open(MOVED, 'a') as log:
        for line in open(REPORT):
            for p in json.loads(line)['drop']:
                src, dst = os.path.join(LIBRARY, p), os.path.join(TRASH, p)
                if not os.path.exists(src): continue
                move(src, dst)
                log.write(json.dumps({'from': src, 'to': dst}, ensure_ascii=False) + '\n')
                n += 1
    print('moved', n)
    if n: scan()


def undo():
    n = 0
    for line in open(MOVED):
        row = json.loads(line)
        if os.path.exists(row['to']) and not os.path.exists(row['from']):
            move(row['to'], row['from'])
            n += 1
    os.rename(MOVED, MOVED + '.undone')
    print('restored', n)
    if n: scan()


if __name__ == '__main__':
    {'report': report, 'apply': apply, 'undo': undo}[sys.argv[1]]()
