/**
 * What a beacon becomes. The address is read here, in memory, to find a place
 * and a network, and to tell the owner; it is never written. The user agent is
 * read for the browser and system words and dropped.
 */
import { createHmac } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { cleanPath, SITES, type Site } from '#lib/sites';
import { rejudge } from './bots';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|inspect|fetch|curl|wget|python|java\/|monitor|scrap|httpclient|facebookexternalhit/i;

// The szkolyjogi.pl crawler of 2026-10-29: a real browser on one residential IP
// per visit, rotating exactly these late-2023 builds, every one in Asia/Shanghai
// at 1280 px. Cloudflare challenges the same list; change both together.
const CRAWLER_UAS = new Set([
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]);

export function isBot(ua: string, body: { tz?: unknown; w?: unknown }): boolean {
	if (!ua || BOT.test(ua) || CRAWLER_UAS.has(ua)) return true;
	// A real browser knows its time zone; headless Chrome in a container does not.
	if (body.tz === 'Etc/Unknown') return true;
	return body.tz === 'Asia/Shanghai' && body.w === 1280;
}

const browser = (ua: string) =>
	(
		[
			[/LinkedInApp/, 'LinkedIn app'],
			[/FBAN|FBAV/, 'Facebook app'],
			[/Instagram/, 'Instagram app'],
			[/GSA\//, 'Google app'],
			[/Edg/, 'Edge'],
			[/OPR\//, 'Opera'],
			[/SamsungBrowser/, 'Samsung'],
			[/Firefox|FxiOS/, 'Firefox'],
			[/Chrome|CriOS/, 'Chrome'],
			[/Safari/, 'Safari']
		] as [RegExp, string][]
	).find(([re]) => re.test(ua))?.[1] ?? 'other';
const os = (ua: string) =>
	(
		[
			[/iPhone|iPad|iPod/, 'iOS'],
			[/Android/, 'Android'],
			[/Windows/, 'Windows'],
			[/Mac OS X/, 'macOS'],
			[/CrOS/, 'ChromeOS'],
			[/Linux/, 'Linux']
		] as [RegExp, string][]
	).find(([re]) => re.test(ua))?.[1] ?? 'other';

// Where a visit came from, as one word: the ?r= tag first, then the referrer's
// host. Host suffixes, so l.facebook.com matches facebook.com; AI before search,
// as gemini.google.com is not a Google search.
const AI = ['chatgpt.com', 'openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com', 'deepseek.com', 'grok.com', 'mistral.ai'];
const MAIL = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com', 'mail.proton.me', 'poczta.onet.pl', 'poczta.wp.pl', 'poczta.interia.pl', 'webmail.zaur.app'];
const SEARCH = ['bing.com', 'duckduckgo.com', 'search.yahoo.com', 'ecosia.org', 'yandex.ru', 'yandex.com', 'search.brave.com', 'qwant.com', 'startpage.com', 'com.google.android.googlequicksearchbox'];
const SOCIAL = ['linkedin.com', 'lnkd.in', 'com.linkedin.android', 'facebook.com', 'messenger.com', 'instagram.com', 't.co', 'x.com', 'twitter.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com', 'threads.net', 'threads.com', 'bsky.app', 'news.ycombinator.com', 'wykop.pl'];
const GOOGLE = /^(www\.)?google\.[a-z.]+$/;
const under = (host: string, sites: string[]) => sites.some((s) => host === s || host.endsWith(`.${s}`));
const domain = (host: string) => host.split('.').slice(-2).join('.');

export function source(v: { tag?: string | null; ref?: string | null; browser?: string | null; internal?: boolean; site?: Site }): string {
	if (v.internal) return 'internal';
	if (v.tag) return 'tagged';
	if (!v.ref) return /LinkedIn|Facebook|Instagram/.test(v.browser ?? '') ? 'social' : 'direct';
	const host = v.ref.toLowerCase().replace(/:\d+$/, '');
	// The panel and a school's subdomain are the same site as the directory.
	// (Not on zaur.app, where every app has its own subdomain.)
	if (domain(host) !== 'zaur.app' && v.site?.hosts.some((h) => domain(h) === domain(host))) return 'internal';
	if (under(host, AI)) return 'ai';
	if (under(host, MAIL)) return 'mail';
	if (domain(host) === 'zaur.app' || SITES.some((s) => s.hosts.some((h) => domain(h) === domain(host)))) return 'own';
	if (GOOGLE.test(host) || under(host, SEARCH)) return 'search';
	if (under(host, SOCIAL)) return 'social';
	return 'other';
}

// Days and hours are Warsaw's: every site here is read from there.
const TZ = 'Europe/Warsaw';
export const dayOf = (t: number) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ });
export const hourOf = (t: number) => Number(new Date(t).toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }));

const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : null);
const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : null);
const ID = /^[a-z0-9-]{8,32}$/;

export interface Place {
	org?: string;
	orgType?: string;
	city?: string;
	region?: string;
	country?: string;
	hosting?: number;
	vpn?: number;
	mobile?: number;
}

const OWNER_IP_DAYS = 60;
const ipHash = (ip: string, key: string) => createHmac('sha256', key).update(ip).digest('base64url');

/** An admin opening the dashboard says this address is theirs: visits from it are Mine. */
export function markOwnerIp(db: DatabaseSync, ip: string, key: string, now = Date.now()): void {
	if (!ip) return;
	db.prepare('INSERT INTO owner_ips (hash, seen) VALUES (?, ?) ON CONFLICT (hash) DO UPDATE SET seen = excluded.seen').run(ipHash(ip, key), now);
}
export function isOwnerIp(db: DatabaseSync, ip: string, key: string, now = Date.now()): boolean {
	if (!ip) return false;
	return !!db.prepare('SELECT 1 FROM owner_ips WHERE hash = ? AND seen > ?').get(ipHash(ip, key), now - OWNER_IP_DAYS * 86_400_000);
}

const ownNetworks = () => new Set((process.env.OWN_NETWORKS ?? '').split('|').map((n) => n.trim()).filter(Boolean));

export interface HitContext {
	site: Site;
	host: string;
	ua: string;
	/** The address already told us this is the owner. */
	owner: boolean;
	place: Place;
	now?: number;
}

/** Writes a view, or fills in the end of one. False when there was nothing to keep. */
export function recordHit(db: DatabaseSync, raw: unknown, ctx: HitContext): 'view' | 'end' | false {
	if (!raw || typeof raw !== 'object') return false;
	const b = raw as Record<string, unknown>;
	if (typeof b.id !== 'string' || !ID.test(b.id)) return false;
	if (isBot(ctx.ua, b)) return false;
	const { site, place } = ctx;
	const now = ctx.now ?? Date.now();
	const detail = site.detail !== false;

	if (b.k === 'end') {
		const clicks = detail && Array.isArray(b.clicks) ? b.clicks.slice(0, 30).map((c) => str(c, 120)).filter(Boolean) : [];
		const seen =
			detail && b.seen && typeof b.seen === 'object'
				? Object.entries(b.seen)
						.filter(([k, s]) => /^[a-zA-Z][\w-]{0,30}$/.test(k) && typeof s === 'number' && s > 0)
						.slice(0, 16)
						.map(([k, s]) => [k, Math.round(s as number)])
				: [];
		// A day is far longer than any tab stays open on one page.
		const done = db
			.prepare('UPDATE views SET secs = ?, depth = ?, clicks = ?, seen = ? WHERE site = ? AND id = ? AND t > ?')
			.run(int(b.secs, 86_400), int(b.depth, 100), clicks.length ? JSON.stringify(clicks) : null, seen.length ? JSON.stringify(Object.fromEntries(seen)) : null, site.id, b.id, now - 86_400_000);
		if (!done.changes) return false;
		// Staying is what tells a person on a VPN from a proxy.
		rejudge(db, site.id, b.id);
		return 'end';
	}

	if (b.k !== 'view' || typeof b.path !== 'string' || !b.path.startsWith('/')) return false;
	const path = cleanPath(site, b.path.split(/[?#]/)[0].slice(0, 200));
	if (path === null) return false;

	const internal = b.internal === 1;
	const fromPath = internal ? cleanPath(site, str(b.ref, 200)?.split(/[?#]/)[0] ?? '') : null;
	const ref = internal ? fromPath : str(b.ref, 100);
	const name = browser(ctx.ua);
	const tag = detail ? str(b.tag, 40) : null;
	const device = /Mobi|Android|iPhone|iPad/.test(ctx.ua) ? 'phone' : 'desktop';
	const screen = typeof b.screen === 'string' && /^\d{2,5}x\d{2,5}$/.test(b.screen) ? b.screen : null;
	const w = int(b.w, 10_000);
	const h = int(b.h, 10_000);
	const me = b.me === 1 || ctx.owner || (!!place.org && ownNetworks().has(place.org)) ? 1 : 0;
	// A desktop window exactly the size of its screen has no toolbar or taskbar:
	// an AI agent's or a cloud browser. Still a visit.
	const agent = device === 'desktop' && !!screen && screen === `${w}x${h}` ? 1 : 0;

	const done = db
		.prepare(
			`INSERT INTO views (site, id, t, day, hour, host, path, source, ref, tag, hash, tz, lang, w, h, screen, dpr, dark, device, browser, os,
				city, region, country, org, org_type, hosting, vpn, mobile, me, agent)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (site, id) DO NOTHING`
		)
		.run(
			site.id,
			b.id,
			now,
			dayOf(now),
			hourOf(now),
			ctx.host,
			path,
			source({ tag, ref, browser: name, internal, site }),
			ref ?? null,
			tag,
			detail ? str(b.hash, 40) : null,
			str(b.tz, 60),
			str(b.lang, 20),
			w,
			h,
			screen,
			typeof b.dpr === 'number' && Number.isFinite(b.dpr) ? Math.round(b.dpr * 100) / 100 : null,
			b.dark === 1 ? 1 : b.dark === 0 ? 0 : null,
			device,
			name,
			os(ctx.ua),
			place.city ?? null,
			place.region ?? null,
			place.country ?? null,
			place.org ?? null,
			place.orgType ?? null,
			place.hosting ?? null,
			place.vpn ?? null,
			place.mobile ?? null,
			me,
			agent
		);
	if (!done.changes) return false;
	rejudge(db, site.id, b.id);
	return 'view';
}

/** What a slower lookup learned about a view already written. */
export function fillPlace(db: DatabaseSync, site: string, id: string, place: Place): void {
	db.prepare(
		`UPDATE views SET city = COALESCE(?, city), region = COALESCE(?, region), country = COALESCE(?, country), org = COALESCE(?, org),
			org_type = COALESCE(?, org_type), hosting = COALESCE(?, hosting), vpn = COALESCE(?, vpn), mobile = COALESCE(?, mobile),
			me = CASE WHEN ? THEN 1 ELSE me END
		WHERE site = ? AND id = ?`
	).run(
		place.city ?? null,
		place.region ?? null,
		place.country ?? null,
		place.org ?? null,
		place.orgType ?? null,
		place.hosting ?? null,
		place.vpn ?? null,
		place.mobile ?? null,
		place.org && ownNetworks().has(place.org) ? 1 : 0,
		site,
		id
	);
	rejudge(db, site, id);
}

/** Past their site's keepDays; no site, no keeping. */
export function sweep(db: DatabaseSync, now = Date.now()): void {
	for (const s of SITES) {
		if (s.keepDays === null) continue;
		db.prepare('DELETE FROM views WHERE site = ? AND t < ?').run(s.id, now - (s.keepDays ?? 90) * 86_400_000);
	}
	db.prepare('DELETE FROM owner_ips WHERE seen < ?').run(now - OWNER_IP_DAYS * 86_400_000);
}

// A beacon nobody limits is a table anybody can fill. In memory only, and per address.
const buckets = new Map<string, { at: number; n: number }>();
const LIMIT = 120; // a minute: far past any reader, short of a flood
export function overLimit(ip: string, now = Date.now()): boolean {
	const b = buckets.get(ip);
	if (!b || now - b.at > 60_000) {
		if (buckets.size > 20_000) buckets.clear();
		buckets.set(ip, { at: now, n: 1 });
		return false;
	}
	return ++b.n > LIMIT;
}
