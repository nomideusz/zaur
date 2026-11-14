/**
 * Which views a program made, judged from what a row already holds, so the same
 * rules can be run again over every row when they change. A view the rules can't
 * be sure of stays a person's. The owner's own views are never a program's.
 *
 * The bots that reach the beacon run real browsers (the user agent ones are
 * dropped on arrival), so what gives them away is a browser that doesn't fit
 * where it is.
 */
import type { DatabaseSync } from 'node:sqlite';
import type { BotReason } from '#lib/bots';
import zones from './zones.json';

export interface BotFacts {
	me: number;
	t: number;
	tz: string | null;
	country: string | null;
	org: string | null;
	device: string | null;
	browser: string | null;
	screen: string | null;
	w: number | null;
	secs: number | null;
}

// Clouds a person rarely browses from. Not Cloudflare or Akamai, which carry
// WARP and iCloud Private Relay, and not the small hosts a VPN rents: their
// people come with their own clocks and read. "cloud" is ipapi.is naming a
// netblock instead of its owner (Azure's, on 2026-10-27).
const CLOUDS = /^(amazon|google llc|microsoft|facebook|meta platforms|shenzhen tencent|tencent|alibaba|byteplus|bytedance|hetzner|ovh|digitalocean|cloud$)/i;

// The countries each time zone's clocks are kept in (scripts/zones.mjs), and the
// databases' English names for countries back to their codes: Intl's names, and
// a few they spell otherwise.
const ZONES = zones as Record<string, string>;
const CODES = (() => {
	const names = new Intl.DisplayNames(['en'], { type: 'region' });
	const m = new Map<string, string>();
	for (const codes of Object.values(ZONES)) for (const code of codes.split(' ')) m.set(names.of(code)!.toLowerCase(), code);
	for (const [name, code] of [
		['the netherlands', 'NL'],
		['palestinian territory', 'PS'],
		['russian federation', 'RU'],
		['czech republic', 'CZ'],
		['turkey', 'TR'],
		['vietnam', 'VN'],
		['south korea', 'KR'],
		['republic of korea', 'KR'],
		['hong kong', 'HK'],
		['macao', 'MO'],
		['ivory coast', 'CI'],
		['democratic republic of the congo', 'CD'],
		['republic of the congo', 'CG'],
		['united states of america', 'US'],
		['iran', 'IR'],
		['syria', 'SY'],
		['laos', 'LA'],
		['moldova', 'MD'],
		['tanzania', 'TZ'],
		['north macedonia', 'MK'],
		['bosnia and herzegovina', 'BA']
	] as const)
		m.set(name, code);
	return m;
})();

const IN = new Map<string, string[]>();
for (const [zone, codes] of Object.entries(ZONES)) for (const code of codes.split(' ')) IN.set(code, [...(IN.get(code) ?? []), zone]);

// A clock's offset from UTC on a day, as Intl writes it ("GMT+01:00").
const offsets = new Map<string, string>();
function offset(tz: string, t: number): string | null {
	const key = `${tz} ${Math.floor(t / 86_400_000)}`;
	let o = offsets.get(key);
	if (o === undefined) {
		try {
			o = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(t).find((p) => p.type === 'timeZoneName')?.value ?? '';
		} catch {
			o = '';
		}
		if (offsets.size > 50_000) offsets.clear();
		offsets.set(key, o);
	}
	return o || null;
}

/**
 * False when no clock in the address's country showed the time this one did;
 * null when either is unknown. By the offset, not the zone's name: Windows sets
 * a Pole's clock to "Belgrade, Bratislava, Budapest" as readily as to Warsaw.
 */
export function clockFits(tz: string | null, country: string | null, t: number): boolean | null {
	if (!tz || !country) return null;
	const code = CODES.get(country.toLowerCase());
	const own = offset(tz, t);
	if (!code || !own || !ZONES[tz]) return null;
	return (IN.get(code) ?? []).some((z) => offset(z, t) === own);
}

// iCloud Private Relay and WARP, whose exits are near a person but not always in their country.
const RELAYS = /^(cloudflare|akamai|apple)/i;

const UTC = new Set(['UTC', 'Etc/UTC', 'Etc/GMT', 'GMT', 'Etc/Universal', 'Etc/Zulu', 'Universal', 'Zulu']);

export function botReason(v: BotFacts): BotReason | null {
	if (v.me) return null;
	// Every clock a person sets is a place's; UTC is a server's.
	if (v.tz && UTC.has(v.tz)) return 'utc';
	// A cloud's own address, with a clock that isn't the audience's: a link
	// scanner (Microsoft's Safe Links opens each link four times) or a crawler.
	if (v.org && CLOUDS.test(v.org) && v.tz && !v.tz.startsWith('Europe/')) return 'cloud';
	// A clock no one in the address's country keeps is someone on a VPN, or a
	// residential proxy. The person stays and the end beacon comes; the proxy
	// opens the page and is gone (kurcz.pl's US "Comcast" visitors on Asian
	// clocks). Not through the relays, which place a person only roughly, nor
	// in rows brought over from before the end beacon (no browser).
	if (v.secs == null && !(v.org && RELAYS.test(v.org)) && v.browser != null && clockFits(v.tz, v.country, v.t) === false) return 'proxy';
	// Puppeteer's screen stays 800×600 whatever window it is given.
	if (v.device === 'desktop' && v.screen === '800x600' && (v.w ?? 0) > 800) return 'headless';
	return null;
}

const FACTS = 'me, t, tz, country, org, device, browser, screen, w, secs';

/** Judges one view again, after what it holds has changed. */
export function rejudge(db: DatabaseSync, site: string, id: string): void {
	const v = db.prepare(`SELECT ${FACTS} FROM views WHERE site = ? AND id = ?`).get(site, id) as BotFacts | undefined;
	if (v) db.prepare('UPDATE views SET bot = ? WHERE site = ? AND id = ?').run(botReason(v), site, id);
}

/** Judges every view by the rules as they now are; only the changed verdicts are written. Read whole first, as it writes the table it reads. */
export function rejudgeAll(db: DatabaseSync): void {
	const set = db.prepare('UPDATE views SET bot = ? WHERE site = ? AND id = ?');
	db.exec('BEGIN');
	try {
		for (const v of db.prepare(`SELECT site, id, bot, ${FACTS} FROM views`).all() as unknown as Array<BotFacts & { site: string; id: string; bot: string | null }>) {
			const why = botReason(v);
			if (why !== v.bot) set.run(why, v.site, v.id);
		}
		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}
