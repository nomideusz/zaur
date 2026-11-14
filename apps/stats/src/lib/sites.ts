/**
 * The sites that report here, by the host a beacon's Origin names. A host that
 * is not listed is not counted, so a copied snippet or a preview deploy cannot
 * write here.
 *
 * `skip` drops a page whose address holds a secret or belongs to an owner's
 * panel, `mask` keeps a page but hides who or what it names, and `detail: false`
 * is for a signed-in app, where a click's label or link could be somebody's
 * mail. The tag on each site repeats `skip` in its data-skip, so those addresses
 * never leave the page; this list is what holds if a tag is wrong.
 */
export interface Site {
	id: string;
	name: string;
	/** Exact, or `*.example.com` for its subdomains. */
	hosts: string[];
	notHosts?: string[];
	skip?: RegExp;
	mask?: [RegExp, string][];
	detail?: boolean;
	/** Days a view is kept. Default 90; null keeps it (zaur.app's tagged links read from all time). */
	keepDays?: number | null;
	/** zaur.app alone sends an address to ipapi.is, as it always has. Everyone else stays on the offline database. */
	lookup?: 'ipapi';
	/**
	 * Parts of the site read apart as well as together: each is the page at a path and
	 * every page under it. `title` heads their list on the site's report.
	 */
	parts?: { title: string; list: { path: string; name: string }[] };
}

export const SITES: Site[] = [
	{ id: 'zaur', name: 'zaur.app', hosts: ['zaur.app'], keepDays: null, lookup: 'ipapi' },
	{
		id: 'yoga',
		name: 'szkolyjogi.pl',
		hosts: ['szkolyjogi.pl', '*.szkolyjogi.pl'],
		notHosts: ['panel.szkolyjogi.pl', 'www.szkolyjogi.pl'],
		skip: /^\/(panel|auth|pass|wypisz)(\/|$)/
	},
	{
		id: 'thebest',
		name: 'thebest.travel',
		hosts: ['thebest.travel', 'www.thebest.travel'],
		skip: /^\/(guide|auth|bookings|verify|book)(\/|$)/
	},
	{ id: 'kompi', name: 'kompi.pl', hosts: ['kompi.pl', 'www.kompi.pl', 'recycling.kompi.pl'] },
	{
		id: 'kino',
		name: 'kino.net.pl',
		hosts: ['kino.net.pl', 'www.kino.net.pl'],
		// After the panel, Invidious's pages from before kino was a cinema guide: 404s
		// now, still opened every day from old links (ChatGPT's, mostly).
		skip: /^\/(app|auth)(\/|$)|^(\/[a-z]{2})?\/(watch|channel|hashtag|playlist|results|feed|shorts|embed)(\/|$)/
	},
	{ id: 'festivals', name: 'festivals.zaur.app', hosts: ['festivals.zaur.app'], skip: /^\/(admin|app|auth|organizer)(\/|$)/ },
	{ id: 'kurcz', name: 'kurcz.pl', hosts: ['kurcz.pl', 'www.kurcz.pl'] },
	{
		id: 'mail',
		name: 'Zaur Mail',
		hosts: ['webmail.zaur.app', 'mail.zaur.app', 'mail2.zaur.app'],
		skip: /^\/(meet|auth|oidc|forgot-password\/reset)(\/|$)/,
		detail: false
	},
	{
		id: 'music',
		name: 'Zaur Music',
		hosts: ['music.zaur.app'],
		skip: /^\/auth(\/|$)/,
		mask: [[/^\/(album|artist|playlist)\/[^/]+/, '/$1/…']],
		detail: false
	},
	{ id: 'register', name: 'Zaur Register', hosts: ['register.zaur.app'], skip: /^\/admin/, detail: false },
	{
		id: 'radiobartek',
		name: 'radiobartek.com',
		hosts: ['radiobartek.com', 'www.radiobartek.com'],
		// SUB/WAVE's operator pages: the admin panel and its first-run setup.
		skip: /^\/(admin|setup|onboarding)(\/|$)/
	},
	{
		id: 'svelte',
		name: 'svelte.zaur.app',
		hosts: ['svelte.zaur.app'],
		// The package hub (asini's packages/demo): a package's demo is at its slug and its docs under it.
		parts: {
			title: 'Packages',
			list: ['calendar', 'search', 'scheduler', 'qr', 'i18n', 'geometrize', 'media', 'notify', 'payments'].map((slug) => ({ path: `/${slug}`, name: `svelte-${slug}` }))
		}
	}
];

export const siteById = (id: string) => SITES.find((s) => s.id === id);

const matches = (host: string, pattern: string) => (pattern.startsWith('*.') ? host.endsWith(pattern.slice(1)) : host === pattern);

export function siteForHost(host: string): Site | undefined {
	return SITES.find((s) => s.hosts.some((p) => matches(host, p)) && !s.notHosts?.some((p) => matches(host, p)));
}

/** The address kept for a page: null when the page is not counted at all. */
export function cleanPath(site: Site, path: string): string | null {
	if (site.skip?.test(path)) return null;
	return (site.mask ?? []).reduce((p, [re, to]) => p.replace(re, to), path);
}

/** A site's public address, for links out of the dashboard. */
export const siteUrl = (site: Site) => `https://${site.hosts[0]}`;
