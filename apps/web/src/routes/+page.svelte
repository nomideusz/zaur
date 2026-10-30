<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { keys } from '#lib/keys.svelte';
	import { alternates, intlLocale, localizeHref, LocaleSwitcher } from '@nomideusz/svelte-i18n';
	import { platesFor, phoneFor } from '#lib/plates';
	import { shapesOf } from '#lib/shapes';
	import { GeometrizedImage, shapeCount, type GeometrizePlaceholder } from '@nomideusz/svelte-geometrize';
	import { downloadQrPng, getQrCapacity, getQrMatrix, matrixToSvg, type ErrorCorrection } from '@nomideusz/svelte-qr';
	import media from '#lib/media/manifest.json';
	import Live from '#lib/Live.svelte';
	import Radio from '#lib/Radio.svelte';
	import CalendarDemo from '#lib/CalendarDemo.svelte';
	import Daily, { linked } from '#lib/Daily.svelte';
	import { fold, gramsOf, indexed, search as match, tokensOf, type Entry } from '#lib/find';
	import { booking, canRefund, discountFrom, email, perPerson, policies, quote, rebook, sendRefund, thursday } from '#lib/booking.svelte';
	import { track } from '#lib/visit';
	import { i18n, t, list, pairs } from '#lib/i18n';
	import { routing, languages, short } from '#lib/i18n-routing';
	import me from '#lib/me.webp';

	let { data } = $props();
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const templateCount = data.templates.reduce((n, g) => n + g.items.length, 0);
	const tplItems = data.templates.flatMap((g) => g.items);
	const tplDeploys = tplItems.reduce((n, tp) => n + tp.deploys, 0);
	const tplRunning = tplItems.reduce((n, tp) => n + tp.running, 0);

	// The layout set the language before this page rendered, and a switch reloads
	// the page, so every text below is read once, in the right language.
	const locale = i18n.locale;
	const intl = intlLocale(locale);
	const num = (x: number) => x.toLocaleString(intl);
	const and = new Intl.ListFormat(intl, { type: 'conjunction' });

	const title = t('meta.title');
	const description = t('meta.description');
	const origin = 'https://zaur.app';
	// The English page keeps its trailing-slash root; the others are /pl, /de, /ua.
	const site = `${origin}${localizeHref('/', locale, routing)}`;
	const links = alternates('/', routing, origin);
	// intlLocale leaves bare codes it has no region for (de, fr) as they are; og:locale needs one.
	const ogRegion: Record<string, string> = { de: 'de-DE', fr: 'fr-FR' };
	const ogLocale = (l: string) => intlLocale(ogRegion[l] ?? l).replace('-', '_');
	const github = 'https://github.com/nomideusz';
	const linkedin = 'https://www.linkedin.com/in/bartosz-dymet';
	const ld = {
		'@context': 'https://schema.org',
		'@graph': [
			{ '@type': 'ProfilePage', '@id': `${site}#page`, url: site, name: title, description, inLanguage: locale, mainEntity: { '@id': `${origin}/#me` } },
			{
				'@type': 'Person',
				'@id': `${origin}/#me`,
				name: 'Bartosz Dymet',
				jobTitle: t('meta.jobTitle'),
				url: `${origin}/`,
				email: 'bartek@zaur.app',
				address: { '@type': 'PostalAddress', addressLocality: 'Kraków', addressCountry: 'PL' },
				knowsAbout: ['Svelte', 'SvelteKit', 'TypeScript', 'Web accessibility', 'Web performance'],
				knowsLanguage: ['pl', 'en'],
				sameAs: [github, linkedin, 'https://www.npmjs.com/~nomideusz']
			}
		]
	};

	// The work, in the order an employer should read it. Flagships carry a full
	// case study; every claim is a fact from the product's own repo. The words
	// live in src/lib/messages under work.<id>.*; this keeps the facts that are
	// not language: ids and links. `uses` is read from each product's code at
	// build time (src/lib/usage.ts); the lists here are only the fallback for a
	// build that cannot read the repo.
	type Work = {
		id: string;
		name: string;
		kind: string;
		href: string;
		/** The domain its section title shows, when it is not href's host. */
		site?: string;
		what: string;
		uses: string[];
		source?: string;
		built?: string[];
		proof?: [string, string][];
		parts?: [string, string][];
		/** Live windows shown instead of a capture, when the product itself sits behind a sign-in. */
		demos?: { id: string; href: string; name: string; label?: string; note: string }[];
		/** Not launched yet: shown folded under Work in progress, not among the products. */
		wip?: boolean;
	};
	type WorkFacts = Pick<Work, 'id' | 'name' | 'href' | 'site' | 'source' | 'uses' | 'wip'> & { demos?: { id: string; href: string; label?: string }[] };
	const facts: WorkFacts[] = [
		{
			id: 'szkolyjogi',
			name: 'Szkoły Jogi',
			href: 'https://szkolyjogi.pl',
			uses: ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify']
		},
		{
			id: 'zaur',
			name: 'Zaur',
			href: 'https://webmail.zaur.app',
			site: 'zaur.app',
			source: 'https://github.com/nomideusz/zaur',
			demos: [
				{ id: 'mail-demo', href: 'https://demo.zaur.app', label: 'webmail.zaur.app' },
				{ id: 'signup', href: 'https://register.zaur.app' }
			],
			uses: ['svelte-calendar']
		},
		{
			id: 'thebest',
			name: 'thebest.travel',
			href: 'https://thebest.travel',
			wip: true,
			uses: ['svelte-calendar', 'svelte-scheduler', 'svelte-search', 'svelte-i18n', 'svelte-qr', 'svelte-media', 'svelte-notify', 'svelte-payments']
		},
		{ id: 'kino', name: 'Kino', href: 'https://kino.net.pl', uses: ['svelte-i18n', 'svelte-notify'] },
		{ id: 'kompi', name: 'Kompi', href: 'https://kompi.pl', uses: [] },
		{ id: 'festivals', name: 'Friendly Festivals', href: 'https://festivals.zaur.app', uses: ['zaur-world', 'svelte-search', 'svelte-i18n', 'svelte-media', 'svelte-notify'] }
	];
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const detected = data.uses;
	// A product without built.* messages is a smaller one: it renders as a row.
	const work: Work[] = facts.map((f) => {
		const built = list(`work.${f.id}.built`);
		const parts = pairs(`work.${f.id}.parts`);
		const uses = detected[f.id] ?? f.uses;
		return {
			...f,
			uses,
			kind: t(`work.${f.id}.kind`),
			what: t(`work.${f.id}.what`),
			built: built.length ? built : undefined,
			proof: pairs(`work.${f.id}.proof`),
			parts: parts.length ? parts : undefined,
			demos: f.demos?.map((d) => ({ ...d, name: t(`demo.${d.id}.name`), note: t(`demo.${d.id}.note`) }))
		};
	});

	const packages = [
		{
			name: '@nomideusz/zaur-world',
			npm: 'https://www.npmjs.com/package/@nomideusz/zaur-world',
			// Its demo is Radio Bartek, played under its sky right in the row.
			demo: 'https://radiobartek.com',
			source: 'https://github.com/nomideusz/zaur-world'
		},
		{
			name: '@nomideusz/svelte-calendar',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-calendar',
			demo: 'https://svelte-calendar.xyz',
			source: 'https://github.com/nomideusz/svelte-calendar',
			// Opens the section as a case: its own widget, live on this page.
			featured: true
		},
		{
			name: '@nomideusz/svelte-search',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-search',
			source: 'https://github.com/nomideusz/svelte-search'
		},
		{
			name: '@nomideusz/svelte-i18n',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-i18n',
			source: 'https://github.com/nomideusz/svelte-i18n'
		},
		{
			name: '@nomideusz/svelte-geometrize',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-geometrize',
			source: 'https://github.com/nomideusz/svelte-geometrize'
		},
		{
			name: '@nomideusz/svelte-qr',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-qr',
			source: 'https://github.com/nomideusz/svelte-qr'
		},
		{
			name: '@nomideusz/svelte-media',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-media',
			source: 'https://github.com/nomideusz/svelte-media'
		},
		{
			name: '@nomideusz/svelte-scheduler',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-scheduler'
		},
		{
			name: '@nomideusz/svelte-payments',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-payments'
		},
		{
			name: '@nomideusz/svelte-notify',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-notify'
		}
	] as { name: string; npm: string; demo?: string; source?: string; featured?: boolean }[];
	// Every svelte-* package has its demo and docs on one hub: svelte.zaur.app/<name>.
	const hub = 'https://svelte.zaur.app';

	const skills = [{ name: 'simple-web-design', source: 'https://github.com/nomideusz/simple-web-design' }].map((s) => ({
		...s,
		desc: t(`skill.${s.name}`)
	}));

	// Work for clients, then small things of my own. Spec rows are facts visible on the live site. Strongest first. Words
	// in site.<id>.*.
	type Site = {
		id: string;
		name: string;
		desc: string;
		href: string;
		basket: 'client' | 'side';
		specs: [string, string][];
		uses?: string[];
		/** Played live as zaur-world's demo in the packages, not as a card. */
		live?: boolean;
	};
	const siteFacts: Pick<Site, 'id' | 'name' | 'href' | 'basket' | 'uses' | 'live'>[] = [
		{ id: 'fixtar', name: 'fixtar.pl', href: 'https://fixtar.pl', basket: 'client', uses: ['svelte-search'] },
		{ id: 'pikastro', name: 'pikastro.eu', href: 'https://pikastro.eu', basket: 'client' },
		{ id: 'wibroakustyka', name: 'wibroakustyka.ai', href: 'https://wibroakustyka.ai', basket: 'client' },
		{ id: 'tutitutu', name: 'tutitutu.pl', href: 'https://tutitutu.pl', basket: 'client' },
		{ id: 'intertech', name: 'intertechpoland.pl', href: 'https://intertechpoland.pl', basket: 'client' },
		{ id: 'polaczenie', name: 'gabinet-polaczenie.pl', href: 'https://gabinet-polaczenie.pl', basket: 'client' },
		{ id: 'radiobartek', name: 'radiobartek.com', href: 'https://radiobartek.com', basket: 'side', live: true, uses: ['zaur-world'] },
		{ id: 'kurcz', name: 'kurcz.pl', href: 'https://kurcz.pl', basket: 'side', uses: ['svelte-i18n'] },
		{ id: 'kruk', name: 'kruk.live', href: 'https://kruk.live', basket: 'side' }
	];
	const websites: Site[] = siteFacts.map((s) => ({
		...s,
		uses: detected[s.id] ?? s.uses,
		desc: t(`site.${s.id}.desc`),
		specs: pairs(`site.${s.id}.specs`)
	}));

	// Windows: a capture of the live site (src/lib/windows, provenance embedded),
	// replaced by the site itself where its headers allow framing (checked at prerender).
	const shots = import.meta.glob('../lib/windows/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
	const shot = (id: string) => shots[`../lib/windows/${id}.webp`];
	const isLive = (href: string) => data.live.includes(href);
	const host = (href: string) => new URL(href).host;

	const pkgs = packages.map((p) => {
		const id = p.name.split('/')[1];
		const home = id.startsWith('svelte-') ? `${hub}/${id.slice(7)}` : undefined;
		// svelte-calendar keeps its own domain (it forwards to the hub) and its Google numbers.
		return { ...p, id, demo: p.demo ?? home, docs: home && `${home}/docs`, desc: t(`pkg.${id}`) };
	});
	const products = work.filter((w) => !w.wip);
	const wip = work.filter((w) => w.wip);
	const flagships = products.filter((w) => w.built);
	const usedIn = (id: string) => [...work, ...websites].filter((w) => w.uses?.includes(id)).map((w) => w.name);
	const usedInText = (id: string) => t('packages.usedIn', { list: and.format(usedIn(id)) });
	// Group names come from templates.ts in English; the key is their slug.
	const kindSlug = (kind: string) => kind.toLowerCase().replace(/[^a-z]+/g, '-');
	const kindName = (kind: string) => t(`templates.kind.${kindSlug(kind)}`);
	// The templates narrowed to what is typed: name, blurb or repo; a group with no match goes.
	// svelte-search's matching ranks them (lib/find), so a typo still finds its
	// template; under three letters, a plain substring is all a query can carry.
	let find = $state('');
	const needle = $derived(find.trim().toLocaleLowerCase(intl));
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const tplEntries = indexed(data.templates.flatMap((g) => g.items.map((tp): Entry => ({ kind: 'template', name: tp.name, text: `${tp.desc} ${tp.slug}`, href: tp.slug }))));
	const groups = $derived.by(() => {
		if (!tokensOf(find).length) {
			return data.templates
				.map((g) => ({ ...g, items: g.items.filter((tp) => `${tp.name} ${tp.desc} ${tp.slug}`.toLocaleLowerCase(intl).includes(needle)) }))
				.filter((g) => g.items.length);
		}
		const rank = new Map(match(tplEntries, find).map((r) => [r.href, r.score]));
		return data.templates
			.map((g) => ({ ...g, items: g.items.filter((tp) => rank.has(tp.slug)).sort((a, b) => rank.get(b.slug)! - rank.get(a.slug)!) }))
			.filter((g) => g.items.length);
	});
	// Every smaller project renders as the same ruled row: a capture, then the facts.
	// Live windows are kept for the flagships, so the page stays short.
	type Card = { id: string; name: string; href: string; img?: string; desc: string; specs: [string, string][]; uses?: string[] };
	const others: Card[] = products
		.filter((w) => !w.built)
		.map((w) => ({ id: w.id, name: w.site ?? host(w.href), href: w.href, img: shot(w.id), desc: w.what, specs: w.proof ?? [], uses: w.uses }));
	const siteCards = (basket: Site['basket']): Card[] =>
		websites.filter((w) => w.basket === basket && !w.live).map((w) => ({ ...w, img: platesFor(w.id, w.name)?.frames[0].src }));
	const clients = siteCards('client');
	const side = siteCards('side');
	// A featured package gets a case of its own, not a row.
	const featured = (p: (typeof pkgs)[number]) => !!p.featured;
	const npmOf = (id: string) => pkgs.find((p) => p.id === id)?.npm;
	// What a developer weighs before installing: license, Svelte range, dependency count.
	const metaOf = (id: string) => {
		const m = data.meta[id];
		if (!m) return '';
		return [m.license, m.svelte && `svelte ${m.svelte}`, t('packages.deps', { count: m.deps, n: m.deps })].filter(Boolean).join(' · ');
	};
	// The install line copies itself; the line stays selectable where the clipboard is refused.
	let copied = $state('');
	const copy = (cmd: string) =>
		navigator.clipboard
			.writeText(cmd)
			.then(() => {
				copied = cmd;
				setTimeout(() => copied === cmd && (copied = ''), 2000);
			})
			.catch(() => {});

	// The signature: pointing at a product lights the packages it is built from,
	// pointing at a package lights the products that use it. No lines, only light.
	let active = $state<{ kind: 'pkg' | 'work'; id: string } | null>(null);
	const litPkgs = $derived.by(() => {
		if (!active) return null;
		if (active.kind === 'pkg') return new Set([active.id]);
		return new Set(work.find((w) => w.id === active!.id)?.uses ?? []);
	});
	const litWork = $derived.by(() => {
		if (!active) return null;
		if (active.kind === 'work') return new Set([active.id]);
		return new Set(work.filter((w) => w.uses.includes(active!.id)).map((w) => w.id));
	});
	const point = (kind: 'pkg' | 'work', id: string) => () => (active = { kind, id });
	const leave = () => (active = null);

	// Seeded once from the prerendered numbers; npm refreshes them on mount.
	// svelte-ignore state_referenced_locally
	let versions = $state<Record<string, string>>({ ...data.versions });
	let registryDown = $state(false);
	// Google Search, live from the server (search.mjs, /api/traffic): clicks, impressions and
	// average position for each of the last ninety days. Every site Search
	// Console has shows the same three, however they look.
	type Sum = { clicks: number; impressions: number; position: number | null };
	type Search = { through: string; days: [string, number, number, number | null][]; now: Sum; before: Sum };
	const searched = ['szkolyjogi', 'zaur', 'thebest', 'kino', 'kompi', 'festivals', 'fixtar', 'pikastro', 'wibroakustyka', 'intertech', 'polaczenie', 'kurcz', 'tutitutu', 'svelte-calendar'];
	let traffic = $state<Record<string, Search> | null>(null);
	let trafficDown = $state(false);
	const searching = (id: string) => searched.includes(id) && !trafficDown && (!traffic || !!traffic[id]);
	// A package's demo gets no search traffic to speak of; npm counts its
	// downloads, day by day for the same ninety days, from the same endpoint.
	let downloads = $state<Record<string, { through: string; days: string[]; values: number[] }>>({});
	const tenths = new Intl.NumberFormat(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	const rank = (p: number | null) => (p === null ? '—' : tenths.format(p));
	const compact = new Intl.NumberFormat(intl, { notation: 'compact' });
	const pct = new Intl.NumberFormat(intl, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 });
	const day = (d: string) => new Date(d).toLocaleDateString(intl, { day: 'numeric', month: 'short', timeZone: 'UTC' });
	// The last 28 days against the 28 before, down as plainly as up.
	const change = (now: number, before: number) => (before ? pct.format(now / before - 1) : now ? t('daily.new') : '—');
	type Row = { label: string; days: string[]; values: (number | null)[]; now: number | null; change: string; fmt: (v: number) => string; line?: boolean };
	const searchRows = (s: Search): Row[] => {
		const days = s.days.map(([d]) => d);
		const { now, before } = s;
		return [
			{ label: t('daily.clicks'), days, values: s.days.map((d) => d[1]), now: now.clicks, change: change(now.clicks, before.clicks), fmt: num },
			{ label: t('daily.impressions'), days, values: s.days.map((d) => d[2]), now: now.impressions, change: change(now.impressions, before.impressions), fmt: compact.format },
			{ label: t('daily.position'), days, values: s.days.map((d) => d[3]), now: now.position, change: before.position === null ? '—' : t('daily.was', { position: rank(before.position) }), fmt: rank, line: true }
		];
	};
	const downloadRow = (id: string): Row => {
		const { days, values } = downloads[id];
		const total = (from: number, to?: number) => values.slice(from, to).reduce((a, v) => a + v, 0);
		return { label: t('daily.downloads'), days, values, now: total(-28), change: change(total(-28), total(-56, -28)), fmt: num };
	};
	const version = (id: string) => versions[id] ?? (registryDown ? '—' : '…');
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const pinned = data.usedVersions;
	/** The version a product runs when it is behind the latest on npm; a product built from source is never behind. */
	const behind = (product: string, pkg: string) => {
		const used = pinned[product]?.[pkg];
		const latest = versions[pkg];
		return used && used !== 'workspace' && latest && used !== latest ? used : undefined;
	};

	// The package demonstrating itself: the whole page as its message keys, and
	// back. zaur.app/#keys opens it that way (the demo site links there).
	// The switch stays under the pointer while everything around it changes
	// length; the #keys link, arriving from elsewhere, centres the row instead.
	// The page above keeps settling for a few frames after the swap (Firefox and
	// Safari don't anchor scrolling through it), so it is held for a second, on
	// every resize only: scrolling meanwhile is left alone.
	const flipKeys = async () => {
		const at = () => document.querySelector('#pkg-svelte-i18n .p-keys')?.getBoundingClientRect().top;
		const before = location.hash === '#keys' ? undefined : at();
		keys.on = !keys.on;
		if (location.hash === '#keys') history.replaceState(null, '', location.pathname);
		await tick();
		if (before === undefined) return document.getElementById('pkg-svelte-i18n')?.scrollIntoView({ block: 'center' });
		const hold = () => {
			const after = at();
			if (after !== undefined) scrollBy({ top: after - before, behavior: 'instant' });
		};
		hold();
		const settling = new ResizeObserver(hold);
		settling.observe(document.body);
		setTimeout(() => settling.disconnect(), 1000);
	};

	// The other package demonstrating itself: every capture held at its triangles,
	// fewer or more of them, and back to the photos. zaur.app/#shapes opens it so.
	let shapes = $state({ on: false, n: 60 });
	// One capture beside the switch, so what it does shows where it is pressed.
	const sample = platesFor('pikastro', 'pikastro.eu')?.frames[0].src;
	const flipShapes = async () => {
		shapes.on = !shapes.on;
		if (location.hash === '#shapes') {
			history.replaceState(null, '', location.pathname);
			await tick();
			document.querySelector('.sites .geometrize')?.scrollIntoView({ block: 'center' });
		}
	};

	// svelte-qr demonstrating itself: the code for this row's own address, so a
	// phone can pick the page up right here; typing encodes anything else.
	const qrHome = `${site}#pkg-svelte-qr`;
	const levels: ErrorCorrection[] = ['L', 'M', 'Q', 'H'];
	let qr = $state({ text: qrHome, level: 'M' as ErrorCorrection });
	const qrCode = $derived.by(() => {
		const data = qr.text || qrHome;
		const used = new TextEncoder().encode(data).length;
		try {
			const m = getQrMatrix(data, { errorCorrection: qr.level });
			const v = (m.length - 17) / 4;
			// The poster's ink on paper; the SVG holds only path data, never the text.
			const svg = matrixToSvg(m, { foreground: '#0b0a09', background: '#f8f6f1' });
			return { data, used, n: m.length, v, cap: getQrCapacity(qr.level, v), svg };
		} catch {
			return { data, used, cap: getQrCapacity(qr.level) };
		}
	});

	// svelte-media demonstrating itself: what one processAndStore call made of a
	// capture at build (scripts/media.mjs), files and manifest committed.
	const stored = import.meta.glob<string>('../lib/media/**/*.webp', { eager: true, import: 'default' });
	const storedUrl = (key: string) => stored[`../lib/media/${key}`];
	const sizes = ['thumbnail', 'medium', 'large', 'original'] as const;
	// JSON widens the placeholder's literal version field; the script wrote it from the real type.
	const placeholder = media.derived as GeometrizePlaceholder;
	const kb = new Intl.NumberFormat(intl, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 });

	// svelte-search demonstrating itself: everything this page lists, searchable
	// with the package's own matching, each step of it on show (lib/find).
	const pageEntries = indexed([
		...work.map((w): Entry => ({ kind: 'product', name: w.name, text: w.what, href: `#${w.id}` })),
		...pkgs.map((p): Entry => ({ kind: 'package', name: p.id, text: p.desc, href: `#pkg-${p.id}` })),
		...tplEntries.map((e): Entry => ({ ...e, href: `#tpl-${e.href}` })),
		...websites.filter((w) => !w.live).map((w): Entry => ({ kind: 'site', name: w.name, text: w.desc, href: `#${w.id}` }))
	]);
	// A folded Polish name, a Polish word for an English one, two typos.
	const tries = ['szkoly', 'kalendarz', 'metabse', 'chromiun'];
	let probe = $state('');
	const found = $derived(match(pageEntries, probe));
	const probeGrams = $derived([...new Set(gramsOf(probe))]);
	const shared = $derived(new Set(found[0] ? gramsOf(found[0].folded) : []));
	const score = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const why = (r: (typeof found)[number]) =>
		r.matches.map((m) => (m.how === 'exact' ? t('packages.search.exact') : t(`packages.search.${m.how}`, { token: m.token, word: m.word! }))).join(' · ');

	// svelte-scheduler, -payments and -notify on one sample booking (lib/booking).
	const pln = new Intl.NumberFormat(intl, { style: 'currency', currency: 'PLN' });
	const classAt = new Intl.DateTimeFormat(intl, { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(thursday);
	const bk = $derived(quote());
	// The email dates the class's next Thursday, so it renders in the browser only.
	let inBrowser = $state(false);
	const mail = $derived(inBrowser ? email(locale, `${site}#pkg-svelte-scheduler`) : null);

	onMount(() => {
		inBrowser = true;
		track();
		if (location.hash === '#keys' && !keys.on) flipKeys();
		if (location.hash === '#shapes') flipShapes();
		// A link to a fold or into one (the Templates tab, a shared #tpl-n8n-queue) opens it. The
		// page is too short to scroll to the fold until it has grown, and nothing
		// reports the end of its reveal, so the fold opens without one: the scroll
		// then finds the full page in the same layout pass.
		const unfold = (id = location.hash.slice(1)) => {
			// Chrome may open the fold for the hash itself, mid-reveal, before this runs: scroll even then.
			const el = id && document.getElementById(id);
			const fold = el && el.closest('details');
			if (el && fold) {
				fold.classList.add('jump');
				fold.open = true;
				el.scrollIntoView();
				fold.classList.remove('jump');
			}
		};
		// A click on the link of a fold closed since the hash was set changes no hash.
		const onclick = (e: MouseEvent) => {
			const id = (e.target as Element).closest?.('a[href^="#"]')?.getAttribute('href')?.slice(1);
			if (id) unfold(id);
		};
		const onhash = () => unfold();
		unfold();
		addEventListener('hashchange', onhash);
		addEventListener('click', onclick);
		fetch('/api/traffic')
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((t) => {
				traffic = t.search;
				downloads = t.npm;
			})
			.catch(() => (trafficDown = true));
		for (const p of pkgs) {
			fetch(`https://registry.npmjs.org/${p.name}/latest`)
				.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
				.then((j) => (versions[p.id] = j.version))
				.catch(() => (registryDown = true));
		}
		return () => {
			removeEventListener('hashchange', onhash);
			removeEventListener('click', onclick);
		};
	});
</script>

<!-- A capture paints as its build-time triangles, then opens into the photo;
     re-keyed on the switch so the triangles play again either way. -->
{#snippet still(src: string, top = false)}
	{@const placeholder = shapesOf(src)}
	{#if placeholder}
		{#key shapes.on}
			<GeometrizedImage {placeholder} src={shapes.on ? undefined : src} alt="" loading="lazy" revealMs={900} objectPosition={top ? 'top' : 'center'} />
		{/key}
	{:else}
		<img {src} alt="" width="1200" height="750" loading="lazy" decoding="async" />
	{/if}
{/snippet}

<!-- A package under a product: the version the product runs, and the latest
     beside it in Quiet when the product is behind. -->
{#snippet chip(product: string, name: string, u: string)}
	{@const used = behind(product, u)}
	<li>
		<a
			class="chip"
			href={npmOf(u)}
			aria-label={used ? t('chip.behind', { pkg: u, name, used, latest: version(u) }) : undefined}
		>
			<span>{u}</span>
			<span>{#if used}{used}<span class="latest">→ {version(u)}</span>{:else}{version(u)}{/if}</span>
		</a>
	</li>
{/snippet}

<!-- An install line and the button that copies it. -->
{#snippet install(cmd: string)}
	<span class="p-install">
		<code>{cmd}</code>
		<button type="button" onclick={() => copy(cmd)}><span aria-live="polite">{t(copied === cmd ? 'packages.copied' : 'packages.copy')}</span></button>
	</span>
{/snippet}

{#snippet card(c: Card)}
	<li id={c.id}>
		{#if c.img}
			<a class="shot" href={c.href} tabindex="-1" aria-hidden="true">
				{@render still(c.img)}
			</a>
		{/if}
		<div class="site">
			<h3>
				{#if searching(c.id)}<span class="dot" class:off={!traffic} aria-hidden="true"></span>{/if}
				<a href={c.href}>{c.name}</a>
			</h3>
			<p>{c.desc}</p>
			{@render search(c.id)}
			{#if c.uses?.length}
				<ul class="chips">
					{#each c.uses as u (u)}
						{@render chip(c.id, c.name, u)}
					{/each}
				</ul>
			{/if}
		</div>
		<dl>
			{#each c.specs as [k, v], i (i)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
		</dl>
	</li>
{/snippet}

{#snippet study(w: Work)}
	{@const title = w.site ?? host(w.href)}
	{@const demos = w.demos?.filter((d) => isLive(d.href)) ?? []}
	<article class="case" id={w.id}>
		<div class="media">
			{#if demos.length}
				{#each demos as d (d.href)}
					<figure class="demo">
						<Live href={d.href} name={d.name} label={d.label} shot={shot(d.id)} phone={phoneFor(d.id)} />
						<figcaption>{d.note}</figcaption>
					</figure>
				{/each}
			{:else if shot(w.id) && isLive(w.href)}
				<Live href={w.href} name={w.name} shot={shot(w.id)} phone={phoneFor(w.id)} />
			{:else if shot(w.id)}
				<a class="window" href={w.href} tabindex="-1" aria-hidden="true">
					{@render still(shot(w.id)!, true)}
				</a>
			{:else if w.parts}
				<ul class="parts">
					{#each w.parts as [n, h], i (i)}
						<li><b>{n}</b><span>{h}</span></li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="case-body">
			<h3>
				{#if searching(w.id)}<span class="dot" class:off={!traffic} aria-hidden="true"></span>{/if}
				<a href={w.href}>{title}</a>
			</h3>
			{#if host(w.href) !== title}<p class="meta">{host(w.href)}</p>{/if}
			<p class="what">{w.what}</p>
			{#if searching(w.id)}
				<h4>{t('daily.caption')}</h4>
				{@render search(w.id)}
			{/if}
			<h4>{t('work.built')}</h4>
			<ul class="built">
				{#each w.built ?? [] as b, i (i)}<li>{b}</li>{/each}
			</ul>
			<dl class="facts">
				{#each w.proof ?? [] as [k, v], i (i)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
			</dl>
			<ul class="chips">
				{#each w.uses as u (u)}
					{@render chip(w.id, w.name, u)}
				{/each}
			</ul>
			<p class="go">
				<a href={w.href}>{t('work.open', { host: host(w.href) })}</a>
				{#if w.source}<a href={w.source}>{t('work.source')}</a>{/if}
			</p>
		</div>
	</article>
{/snippet}

<!-- Linked daily charts, a row a number: the last 28 days and how they
     compare with the 28 before, or the day pointed at in any chart. -->
{#snippet daily(rows: Row[], source: string, through: string, note = true)}
	<dl class="daily">
		{#each rows as r (r.label)}
			{@const i = linked.day ? r.days.indexOf(linked.day) : -1}
			{@const v = linked.day ? (i < 0 ? null : r.values[i]) : r.now}
			<div>
				<dt>{r.label}</dt>
				<dd><Daily days={r.days} values={r.values} line={r.line} /></dd>
				<dd class="v">{v === null ? '—' : r.fmt(v)}</dd>
				<dd>{linked.day ? day(linked.day) : r.change}</dd>
			</div>
		{/each}
	</dl>
	{#if note}<p class="daily-note">{t('daily.note', { source, date: day(through) })}</p>{/if}
{/snippet}

{#snippet search(id: string)}
	{#if traffic?.[id]}
		{@render daily(searchRows(traffic[id]), 'Google Search Console', traffic[id].through)}
	{:else if searching(id)}
		<p class="meta">{t('search.reading')}</p>
	{/if}
{/snippet}

{#snippet npm(id: string)}
	{#if downloads[id]}{@render daily([downloadRow(id)], 'npm', downloads[id].through)}{/if}
{/snippet}

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={site} />
	{#each links as l (l.hreflang)}<link rel="alternate" hreflang={l.hreflang} href={l.href} />{/each}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Zaur" />
	<meta property="og:locale" content={ogLocale(locale)} />
	{#each routing.supportedLocales.filter((l) => l !== locale) as l (l)}<meta property="og:locale:alternate" content={ogLocale(l)} />{/each}
	<meta property="og:url" content={site} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="{site}og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={t('meta.ogAlt')} />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${JSON.stringify(ld)}</script>`}
</svelte:head>

<a class="skip" href="#main">{t('nav.skip')}</a>
<header class="bar">
	<a class="mark" href="#top">Bartosz Dymet</a>
	<nav class="tabs" aria-label={t('nav.sections')}>
		<a href="#work">{t('nav.work')}</a>
		<a href="#packages">{t('nav.packages')}</a>
		<a href="#templates">{t('nav.templates')}</a>
		<a href="#clients">{t('nav.clients')}</a>
	</nav>
	<a class="mail" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<!-- The language switch is @nomideusz/svelte-i18n's own component: it writes
	     the locale cookie and moves to the same page under the new prefix. -->
	<span class="lang"><LocaleSwitcher {i18n} {routing} labels={short} label={t('nav.language')} /></span>
</header>

<main id="main">
	<div class="poster" class:pointing={litPkgs?.size} style:--rows={products.length}>
		<nav class="programme" aria-label={t('nav.products')}>
			<ul>
				{#each products as w (w.id)}
					<li class:lit={litWork?.has(w.id)}>
						<a
							class="row"
							href="#{w.id}"
							onpointerenter={point('work', w.id)}
							onpointerleave={leave}
							onfocus={point('work', w.id)}
							onblur={leave}
						>
							<span class="name">{w.name}</span>
							<span class="ver">{w.kind}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<section class="intro" aria-labelledby="who">
			<div class="who">
				<h1 id="who">Bartosz Dymet</h1>
				<img class="me" src={me} alt={t('intro.portrait')} width="480" height="480" />
				<p class="role">{t('intro.role')}</p>
				<p class="pitch">{t('intro.pitch')}</p>
			</div>
			<p class="links">
				<a class="phone" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
				<a href={github}>GitHub</a>
				<a href={linkedin}>LinkedIn</a>
				<span class="intro-lang">{@render langs()}</span>
			</p>
			<div class="kit">
				<h2>{t('intro.kit')}</h2>
				<p class="point">{t('intro.point')}</p>
				<ul class="chips">
					{#each pkgs as p (p.id)}
						<li class:lit={litPkgs?.has(p.id)}>
							<a
								class="chip"
								href="#pkg-{p.id}"
								onpointerenter={point('pkg', p.id)}
								onpointerleave={leave}
								onfocus={point('pkg', p.id)}
								onblur={leave}
							>
								<span>{p.id}</span><span>{version(p.id)}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	</div>

	<section class="work" id="work" aria-labelledby="work-h">
		<div class="strip"><h2 id="work-h">{t('work.heading')} <span class="n">· {products.length}</span></h2></div>
		{#each flagships as w (w.id)}{@render study(w)}{/each}
		<ul class="sites">
			{#each others as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="packages" id="packages" aria-labelledby="packages-h">
		<div class="strip"><h2 id="packages-h">{t('packages.heading')} <span class="n">· {pkgs.length}</span></h2></div>
		<p class="lede">{t('packages.lede')} {t('packages.hub')} <a href={hub}>svelte.zaur.app</a></p>
		{#each pkgs.filter(featured) as p (p.id)}
			<article class="case" id="pkg-{p.id}">
				<div class="media">
					<figure class="demo">
						<CalendarDemo locale={intl} />
						<figcaption>{t('packages.calendar.note')}</figcaption>
					</figure>
				</div>
				<div class="case-body">
					<h3>
						<a href={p.demo}>{host(p.demo!)}</a>
					</h3>
					<p class="meta">{p.name} {version(p.id)}{#if metaOf(p.id)} · {metaOf(p.id)}{/if}</p>
					<p class="what">{p.desc}</p>
					{@render npm(p.id)}
					{@render search(p.id)}
					{@render install(`npm i ${p.name}`)}
					{#if usedIn(p.id).length}<p class="p-used">{usedInText(p.id)}</p>{/if}
					<p class="go">
						{#if p.docs}<a href={p.docs}>{t('packages.docs')}</a>{/if}
						<a href={p.npm}>{t('packages.npm')}</a>
						{#if p.source}<a href={p.source}>{t('work.source')}</a>{/if}
					</p>
				</div>
			</article>
		{/each}
		<ul class="ptable">
			{#each pkgs.filter((p) => !featured(p)) as p (p.id)}
				<li id="pkg-{p.id}">
					<a class="p-name" href="#pkg-{p.id}">{p.id}</a>
					<span class="p-ver">{version(p.id)}</span>
					<div>
						<p>{p.desc}</p>
						{#if metaOf(p.id)}<p class="p-meta">{metaOf(p.id)}</p>{/if}
						{#if downloads[p.id]}
							{@render daily([downloadRow(p.id)], 'npm', downloads[p.id].through, false)}
						{/if}
						{@render install(`npm i ${p.name}`)}
						{#if p.id === 'svelte-i18n'}
							<!-- i18n.t, not t: the switch stays readable while the page shows keys. -->
							<p class="p-try">
								<button type="button" class="p-keys" aria-pressed={keys.on} onclick={flipKeys}>{i18n.t(keys.on ? 'packages.i18n.text' : 'packages.i18n.keys')}</button>
								{i18n.t(keys.on ? 'packages.i18n.hintOn' : 'packages.i18n.hint')}
							</p>
						{:else if p.id === 'svelte-geometrize'}
							<p class="p-try">
								<button type="button" class="p-keys" aria-pressed={shapes.on} onclick={flipShapes}>{t(shapes.on ? 'packages.geometrize.photos' : 'packages.geometrize.shapes')}</button>
								{#if shapes.on}
									<label class="p-n">
										<input type="range" min="1" max="60" bind:value={shapes.n} aria-label={t('packages.geometrize.count')} />
										<span>{shapes.n}</span>
									</label>
									<!-- fewer: the fit is in order, so dropping its tail leaves the coarse picture -->
									{@html `<style>.geometrize > svg > g > :nth-child(n + ${shapes.n + 1}) { display: none }</style>`}
								{/if}
								<span class="p-hint">{t('packages.geometrize.hint')}</span>
							</p>
							{#if sample}<div class="p-sample" aria-hidden="true">{@render still(sample)}</div>{/if}
						{:else if p.id === 'svelte-qr'}
							<div class="p-qr">
								{#if qrCode.svg}<div class="p-qr-code">{@html qrCode.svg}</div>{/if}
								<div class="p-qr-controls">
									<label class="p-field">{t('packages.qr.label')} <input type="text" bind:value={qr.text} autocomplete="off" spellcheck="false" /></label>
									<div class="p-seg" role="group" aria-label={t('packages.qr.level')}>
										<span aria-hidden="true">{t('packages.qr.level')}</span>
										{#each levels as l (l)}<button type="button" aria-pressed={qr.level === l} onclick={() => (qr.level = l)}>{l}</button>{/each}
									</div>
									<p class="p-meta" aria-live="polite">
										{#if qrCode.svg}{t('packages.qr.meta', { v: qrCode.v, n: qrCode.n, used: qrCode.used, cap: qrCode.cap })}{:else}{t('packages.qr.tooLong', { level: qr.level, cap: qrCode.cap })}{/if}
									</p>
									{#if qrCode.svg}
										<button type="button" class="p-keys" onclick={() => downloadQrPng(qrCode.data, 'qr.png', { errorCorrection: qr.level })}>{t('packages.qr.save')}</button>
									{/if}
								</div>
							</div>
							<p class="p-try">{t('packages.qr.hint')}</p>
						{:else if p.id === 'svelte-media'}
							{@const f = media.files}
							<!-- medium and thumbnail side by side at one scale: flex shares are their widths -->
							<div class="p-scale">
								{#each [f.medium, f.thumbnail] as x, i (x.key)}
									<span style:flex="{x.width} 1 0" style:aspect-ratio="{x.width} / {x.height}">
										{#if i === 0}
											{#key shapes.on}
												<GeometrizedImage {placeholder} src={shapes.on ? undefined : storedUrl(x.key)} alt="" loading="lazy" revealMs={900} />
											{/key}
										{:else}
											<img src={storedUrl(x.key)} alt="" width={x.width} height={x.height} loading="lazy" decoding="async" />
										{/if}
									</span>
								{/each}
							</div>
							<ul class="p-files">
								{#each sizes as size (size)}
									{@const x = f[size]}
									<li><code>{x.key.split('/').pop()}</code><span>{x.width}×{x.height}</span><span>{x.fit ?? ''}</span><span>{kb.format(x.bytes / 1000)}</span></li>
								{/each}
								<li><code>derived</code><span>{t('packages.media.shapes', { n: shapeCount(placeholder) })}</span><span></span><span>{kb.format(JSON.stringify(media.derived).length / 1000)}</span></li>
							</ul>
							<p class="p-try">{t('packages.media.hint')}</p>
						{:else if p.id === 'svelte-search'}
							<div class="p-stack">
								<label class="p-field">{t('packages.search.label')} <input type="search" bind:value={probe} autocomplete="off" spellcheck="false" /></label>
								<div class="p-seg" role="group" aria-label={t('packages.search.try')}>
									<span aria-hidden="true">{t('packages.search.try')}</span>
									{#each tries as q (q)}<button type="button" aria-pressed={probe === q} onclick={() => (probe = q)}>{q}</button>{/each}
								</div>
								{#if tokensOf(probe).length}
									<p class="p-meta" aria-live="polite">normalize → <code>{fold(probe)}</code> · {t('packages.search.meta', { count: found.length, total: pageEntries.length })}</p>
									<p class="p-grams">
										<span>{t('packages.search.trigrams')}</span>
										{#each probeGrams as g (g)}<code class:on={shared.has(g)}>{g}</code>{/each}
									</p>
									{#if found.length}
										<ol class="p-files p-found">
											{#each found.slice(0, 6) as r (r.href)}
												<li>
													<span>{t(`packages.search.kind.${r.kind}`)}</span>
													<span><a href={r.href}>{r.name}</a><small>{why(r)}</small></span>
													<span>{score.format(r.score)}</span>
												</li>
											{/each}
										</ol>
									{:else}
										<p class="p-meta">{t('packages.search.none', { q: probe.trim() })}</p>
									{/if}
								{/if}
							</div>
							<p class="p-try">{t('packages.search.hint')}</p>
						{:else if p.id === 'svelte-scheduler'}
							<div class="p-stack">
								<p class="p-book">{t('packages.booking.class', { when: classAt, price: pln.format(perPerson) })}</p>
								<div class="p-seg" role="group" aria-label={t('packages.booking.guests')}>
									<span aria-hidden="true">{t('packages.booking.guests')}</span>
									{#each [1, 2, 3, 4, 5, 6] as n (n)}<button type="button" aria-pressed={booking.people === n} onclick={() => rebook(n)}>{n}</button>{/each}
								</div>
								<ul class="p-files p-sum">
									<li><span>{t('packages.booking.base', { n: booking.people, price: pln.format(perPerson) })}</span><span>{pln.format(bk.price.basePrice)}</span></li>
									{#if bk.price.groupDiscount}<li><span>{t('packages.booking.discount', { n: discountFrom })}</span><span>−{pln.format(bk.price.groupDiscount)}</span></li>{/if}
									<li><span>{t('packages.booking.fee')}</span><span>{pln.format(bk.price.processingFee)}</span></li>
									<li><b>{t('packages.booking.total')}</b><b>{pln.format(bk.price.totalAmount)}</b></li>
								</ul>
								<div class="p-seg" role="group" aria-label={t('packages.booking.policy')}>
									<span aria-hidden="true">{t('packages.booking.policy')}</span>
									{#each policies as x (x)}<button type="button" aria-pressed={booking.policy === x} onclick={() => (booking.policy = x)}>{t(`packages.booking.${x}`)}</button>{/each}
								</div>
								<label class="p-n">
									<input type="range" min="0" max="192" bind:value={booking.hours} />
									<span>{t('packages.booking.cancel', { h: booking.hours })}</span>
								</label>
								<p class="p-meta" aria-live="polite">{t('packages.booking.refund', { pct: bk.refund.refundPercentage, amount: pln.format(bk.refund.refundAmount) })}</p>
							</div>
							<p class="p-try">{t('packages.booking.hint')}</p>
						{:else if p.id === 'svelte-payments'}
							<div class="p-stack">
								<ul class="p-files p-ledger">
									<li><code>{bk.charge}</code><span>charge</span><span>{bk.totalMinor}</span></li>
									{#each booking.refunds as r (r.key)}<li><code>{r.key}</code><span>refund</span><span>{r.amount}</span></li>{/each}
								</ul>
								<p class="p-meta">derivePaymentStatus → <code>{bk.status}</code></p>
								<button type="button" class="p-keys" disabled={!canRefund(bk)} onclick={sendRefund}>{t('packages.booking.send')} {pln.format(bk.refund.refundAmount)}</button>
								{#if booking.log.length}
									<ul class="p-log" aria-live="polite">
										{#each booking.log as l, i (i)}<li class:dup={l.status === 'duplicate'}>{t(`packages.booking.${l.status}`, { key: l.key })}</li>{/each}
									</ul>
								{/if}
							</div>
							<p class="p-try">{t('packages.booking.ledgerHint')}</p>
						{:else if p.id === 'svelte-notify'}
							<div class="p-stack">
								<div class="p-seg" role="group" aria-label={t('packages.booking.mail')}>
									<span aria-hidden="true">{t('packages.booking.mail')}</span>
									{#each ['confirmation', 'cancellation'] as const as m (m)}<button type="button" aria-pressed={booking.mail === m} onclick={() => (booking.mail = m)}>{t(`packages.booking.${m}`)}</button>{/each}
								</div>
								<!-- no scripts and no same origin: the email is markup and nothing else -->
								<div class="p-mail">{#if mail}<iframe title={mail.subject} srcdoc={mail.html} sandbox=""></iframe>{/if}</div>
							</div>
							<p class="p-try">{t('packages.booking.mailHint')}</p>
						{:else if p.id === 'zaur-world'}
							<div class="p-sample"><Radio href={p.demo!} /></div>
							<p class="p-try">{t('packages.world.hint')}</p>
						{/if}
					</div>
					<p class="p-used">{usedIn(p.id).length ? usedInText(p.id) : ''}</p>
					<p class="p-links">
						{#if p.demo}<a href={p.demo}>{t('packages.demo')}</a>{/if}
						{#if p.docs}<a href={p.docs}>{t('packages.docs')}</a>{/if}
						<a href={p.npm}>{t('packages.npm')}</a>
						{#if p.source}<a href={p.source}>{t('packages.source')}</a>{/if}
					</p>
				</li>
			{/each}
		</ul>
	</section>

	<div class="folds">
		<details id="templates">
			<summary>
				<h2>{t('templates.heading')} · {templateCount}</h2>
				{@render toggle()}
			</summary>
			<div class="fold">
				<p class="lede">{t('templates.lede')}</p>
				<p class="t-note">{t('templates.stats', { deploys: num(tplDeploys), running: num(tplRunning) })} {t('templates.referral')}</p>
				<div class="t-find">
					<label>{t('templates.search')} <input type="search" bind:value={find} autocomplete="off" spellcheck="false" /></label>
					<ul class="chips">
						{#each groups as g (g.kind)}
							<li><a class="chip" href="#tpl-{kindSlug(g.kind)}"><span>{kindName(g.kind)}</span><span>{g.items.length}</span></a></li>
						{/each}
					</ul>
				</div>
				{#each groups as g (g.kind)}
					<h3 id="tpl-{kindSlug(g.kind)}">{kindName(g.kind)}</h3>
					<ul class="table">
						{#each g.items as tp (tp.slug)}
							<li id="tpl-{tp.slug}">
								<a class="t-name" href="#tpl-{tp.slug}">{tp.name}</a>
								<p>{tp.desc}</p>
								<span class="t-src">{#if tp.running}<span class="t-runs">{t('templates.running', { n: num(tp.running) })}</span>{/if}<a href={tp.deploy}>{t('templates.deploy')}</a><a href={tp.source}>{t('templates.source')}</a></span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="t-none">{t('templates.none', { q: find.trim() })}</p>
				{/each}
			</div>
		</details>

		<details id="skills">
			<summary>
				<h2>{t('skills.heading')} · {skills.length}</h2>
				{@render toggle()}
			</summary>
			<div class="fold">
				<ul class="table">
					{#each skills as s (s.name)}
						<li>
							<a class="t-name" href={s.source}>{s.name}</a>
							<div>
								<p>{s.desc}</p>
								{@render install(`npx skills add nomideusz/${s.name}`)}
							</div>
							<a class="t-src" href={s.source}>{t('skills.source')}</a>
						</li>
					{/each}
				</ul>
			</div>
		</details>
	</div>

	<section class="websites" id="clients" aria-labelledby="clients-h">
		<div class="strip"><h2 id="clients-h">{t('clients.heading')} <span class="n">· {clients.length}</span></h2></div>
		<p class="lede">{t('clients.lede')}</p>
		<ul class="sites">
			{#each clients as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="folds" aria-label={t('folds.label')}>
		<details id="wip">
			<summary>
				<h2>{t('wip.heading')} · {wip.length}</h2>
				{@render toggle()}
			</summary>
			{#each wip as w (w.id)}{@render study(w)}{/each}
		</details>

		<details class="websites" id="side">
			<summary>
				<h2>{t('side.heading')} · {side.length}</h2>
				{@render toggle()}
			</summary>
			<p class="lede">{t('side.lede')}</p>
			<ul class="sites">
				{#each side as c (c.id)}{@render card(c)}{/each}
			</ul>
		</details>
	</section>

</main>

<footer class="foot">
	<p class="hire">{t('foot.hire')}</p>
	<a class="write" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<div class="small">
		<p>{t('foot.copyright')}</p>
		<a href={github}>GitHub</a>
		<a href={linkedin}>LinkedIn</a>
		<span class="foot-lang">{@render langs()}</span>
	</div>
</footer>

<!-- Each language in its own name, as plain links: a static page needs no menu. -->
{#snippet langs()}
	{#each routing.supportedLocales as l (l)}
		<a href={localizeHref('/', l, routing)} hreflang={l} lang={l} aria-current={l === locale ? 'page' : undefined}>{languages[l]}</a>
	{/each}
{/snippet}

{#snippet toggle()}
	<svg class="toggle" viewBox="0 0 24 24" aria-hidden="true">
		<path d="M4 12h16" />
		<path class="v" d="M12 4v16" />
	</svg>
{/snippet}

<style>
	/* Every first-viewport measure is in vw: the poster scales as one sheet.
	   Numbers come from the approved comp at 2512 wide (layout.css scaffold). */
	.bar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: grid;
		/* The comp's tracks, but never narrower than what they hold: between 901
		   and about 1200 the vw tracks would otherwise overflow by the scrollbar's
		   width and squeeze the tabs below the caption floor. */
		grid-template-columns:
			minmax(max-content, 28vw) repeat(3, minmax(max-content, 9.4vw))
			minmax(max-content, 10.4vw) minmax(max-content, 1fr) auto;
		align-items: stretch;
		height: 3.66vw;
		background: var(--ink);
		color: var(--paper);
	}
	.mark {
		align-self: center;
		padding-left: 1.31vw;
		font-weight: 800;
		font-size: 2.24vw;
		letter-spacing: -0.01em;
		line-height: 1;
		text-decoration: none;
	}
	.tabs {
		display: contents;
	}
	.tabs a,
	.mail {
		display: grid;
		place-items: center;
		padding: 0 0.75vw;
		font-size: max(13px, 1.2vw);
		text-decoration: none;
		white-space: nowrap;
	}
	.tabs a {
		border-left: var(--rule) solid var(--bar-rule);
	}
	.tabs a:last-child {
		border-right: var(--rule) solid var(--bar-rule);
	}
	.mail {
		justify-items: start;
		padding-left: 3.4vw;
		font-size: max(13px, 1.45vw);
	}
	.bar a:hover {
		color: var(--orange);
	}
	/* LocaleSwitcher is styled through its own custom properties: black on the
	   bar, square like everything else on the poster. */
	.lang {
		display: grid;
		place-items: center;
		padding: 0 1.31vw;
		border-left: var(--rule) solid var(--bar-rule);
		--asini-font-sans: inherit;
		--asini-surface: var(--ink);
		--asini-text: var(--paper);
		--asini-border: var(--bar-rule);
		--asini-border-strong: var(--orange);
		--asini-accent: var(--orange);
		--asini-radius-sm: 0;
	}
	.lang :global(select) {
		font-size: max(13px, 1.2vw);
		font-weight: 700;
	}
	.intro-lang {
		display: none;
	}
	.foot-lang {
		display: flex;
	}
	.foot-lang,
	.intro-lang {
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
	}
	.foot-lang [aria-current],
	.intro-lang [aria-current] {
		font-weight: 700;
		text-decoration: none;
	}
	.bar :focus-visible {
		outline-color: var(--orange);
		outline-offset: -3px;
	}
	.skip {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 3;
		padding: 0.5rem 0.9rem;
		background: var(--paper);
		font-weight: 700;
		translate: 0 -200%;
	}
	.skip:focus {
		translate: none;
	}

	/* The rows share the screen under the bar, so the sheet fills the first view
	   whatever its shape. --u is 1vw until a row is shorter than the comp's 7.5vw,
	   or the intro (about 51u tall, French wrapping most) taller than the screen
	   under the bar, as in a window wider than 16:10; then the names and the
	   intro shrink with it to fit. Rows are at least --row and grow to fill the
	   column, so a tall window gets taller bands (names stay on their rules) and
	   a short one, where the intro sets the height, gets no orange gap under the
	   last row. */
	.poster {
		--bar: 3.66vw;
		--row: max(5vw, (100svh - var(--bar) - var(--rule-heavy)) / var(--rows));
		--u: min(1vw, var(--row) / 7.5, (100svh - var(--bar) - var(--rule-heavy)) / 52);
		display: grid;
		grid-template-columns: 63.42vw 1fr;
		border-bottom: var(--rule-heavy) solid var(--ink);
	}

	/* The programme: product names as the poster. */
	.programme {
		display: flex;
		background: var(--orange);
		border-right: var(--rule-heavy) solid var(--ink);
	}
	.programme ul {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.programme li {
		flex: 1 0 var(--row);
		display: flex;
	}
	.programme li + li .row {
		border-top: var(--rule) solid var(--orange-rule);
	}
	.row {
		flex: 1;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		padding: 0 1.64vw 0.35vw 1.39vw;
		text-decoration: none;
	}
	.name {
		font-weight: 700;
		font-size: calc(4.87 * var(--u));
		line-height: 1;
		letter-spacing: -0.03em;		/* Descenders cross the rule below, as on the poster. */
		translate: 0 0.1em;
	}
	.ver {
		padding-bottom: 1.05vw;
		font-size: 1.53vw;
	}
	.lit .row {
		background: var(--orange-lit);
		box-shadow: inset 0 calc(-1 * var(--rule)) var(--paper);
	}
	.lit .name,
	.lit .ver {
		color: var(--paper);
	}
	/* Focus is drawn inside the row, so it reads apart from the light. */
	.row:focus-visible {
		outline-color: var(--paper);
		outline-offset: -6px;
	}

	/* The intro: who, in the column beside the products. */
	.intro {
		display: flex;
		flex-direction: column;
		padding: calc(2 * var(--u)) calc(1.6 * var(--u)) calc(1.6 * var(--u));
		background: var(--lilac);
	}
	/* Name across the top; the portrait sits beside role and pitch. */
	.who {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: calc(1.2 * var(--u));
	}
	.who h1 {
		grid-column: 1 / -1;
	}
	.me {
		grid-column: 2;
		grid-row: 2 / span 2;
		width: calc(7.5 * var(--u));
		height: auto;
		margin-top: calc(0.8 * var(--u));
		border: var(--rule) solid var(--ink);
	}
	.intro h1 {
		font-weight: 800;
		font-size: calc(3.7 * var(--u));
		line-height: 0.95;
		letter-spacing: -0.035em;
	}
	.role {
		margin-top: calc(0.8 * var(--u));
		font-weight: 700;
		font-size: max(14px, calc(1.3 * var(--u)));
	}
	.pitch {
		max-width: 32ch;
		margin-top: calc(1.5 * var(--u));
		font-size: max(1rem, calc(1.45 * var(--u)));
		line-height: 1.35;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: calc(0.4 * var(--u)) calc(1.6 * var(--u));
		margin-top: calc(1.3 * var(--u));
		font-size: max(13px, calc(1.05 * var(--u)));
	}
	.kit {
		margin-top: auto;
		padding-top: calc(1.6 * var(--u));
	}
	.kit h2 {
		margin-bottom: calc(0.7 * var(--u));
		font-weight: 700;
		font-size: max(13px, calc(0.95 * var(--u)));
	}
	.kit .point {
		margin: calc(-0.5 * var(--u)) 0 calc(0.7 * var(--u));
		color: var(--quiet);
		font-size: max(13px, calc(0.95 * var(--u)));
	}
	.links .phone {
		display: none;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: calc(0.45 * var(--u));
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 1em;
		height: calc(2.2 * var(--u));
		min-height: 28px;
		padding: 0 calc(0.55 * var(--u));
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font-size: max(13px, calc(0.95 * var(--u)));
		white-space: nowrap;
		text-decoration: none;
	}
	.chip span + span {
		font-variant-numeric: tabular-nums;
	}
	/* The latest release beside the version a product runs, when it is behind. */
	.chip .latest {
		margin-left: 0.4em;
		color: var(--quiet);
	}
	.chip:hover,
	.chips .lit .chip {
		background: var(--chip);
	}
	.pointing .kit li:not(.lit) .chip {
		opacity: 0.35;
	}
	/* On the sheet the kit fills the rest of the column as a ruled list, a small
	   programme of its own beside the big one. */
	@media (min-width: 901px) {
		.kit {
			flex: 1;
			display: flex;
			flex-direction: column;
			margin-top: calc(1.6 * var(--u));
		}
		.kit .chips {
			flex: 1;
			display: grid;
			grid-auto-rows: minmax(calc(2 * var(--u)), 1fr);
			gap: 0;
			border-top: var(--rule) solid var(--ink);
		}
		.kit .chip {
			justify-content: space-between;
			height: 100%;
			min-height: 0;
			padding: 0 calc(0.4 * var(--u));
			border: 0;
			border-bottom: var(--rule) solid var(--ink);
			border-radius: 0;
			font-size: max(13px, calc(1.25 * var(--u)));
		}
	}

	h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.75rem;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	h3 a {
		text-decoration: none;
	}
	h3 a:hover {
		text-decoration: underline;
	}
	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--live);
	}
	.sites .dot {
		align-self: center;
	}
	.dot.off {
		background: var(--quiet);
	}
	.meta {
		margin-top: 0.3rem;
		font-size: 0.875rem;
	}
	.what {
		max-width: 60ch;
		margin-top: 0.75rem;
		font-size: max(1rem, 1.1vw);
	}
	.facts {
		margin: 1rem 0;
		font-size: 0.9375rem;
	}
	.facts div {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 0.75rem;
		padding: 0.25rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.facts dt {
		color: var(--quiet);
	}
	/* Inter Tight sets about 1.3 characters to the ch: 54ch holds a line near 70. */
	.facts dd,
	.sites > li > dl dd {
		max-width: 54ch;
	}

	/* Linked daily charts: label, ninety days, the number, how it moved. */
	/* Capped: on a wide screen ninety bars would stretch past reading. */
	.daily {
		max-width: 40rem;
		margin-top: 0.75rem;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.daily div {
		display: grid;
		grid-template-columns: 7.5rem minmax(0, 1fr) 4rem 5.5rem;
		gap: 0.75rem;
		align-items: end;
		padding: 0.3rem 0;
	}
	.daily dt {
		color: var(--quiet);
	}
	.daily .v {
		text-align: right;
		font-weight: 700;
	}
	.daily-note {
		margin-top: 0.4rem;
		font-size: 0.8125rem;
		color: var(--quiet);
	}

	/* Work: three case studies, then the rest in a ruled row. */
	.work,
	.websites {
		border-bottom: var(--rule-heavy) solid var(--ink);
	}
	/* Open source runs on into the folds, so the heavy rule closes the last fold. */
	.packages {
		border-bottom: var(--rule) solid var(--ink);
	}
	.case {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		border-bottom: var(--rule) solid var(--ink);
	}
	/* The window runs edge to edge and grows to the case's height, so the site
	   fills the column instead of floating in it. */
	.media {
		display: flex;
		flex-direction: column;
		border-right: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.media > :global(.live),
	.demo:last-child {
		flex: 1;
	}
	.media :global(.live) {
		border: 0;
	}
	.window {
		position: relative;
		display: block;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background: var(--paper);
	}
	.window :global(.geometrize) {
		height: 100%;
	}
	.window img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	.demo {
		display: flex;
		flex-direction: column;
		margin: 0;
	}
	.demo :global(.live) {
		flex: 1;
	}
	.demo + .demo {
		border-top: var(--rule) solid var(--ink);
	}
	.demo figcaption {
		padding: 0.6rem 1.39vw;
		border-top: var(--rule) solid var(--ink);
		background: var(--lilac);
		font-size: 0.875rem;
	}
	.parts {
		display: grid;
		aspect-ratio: 541 / 299;
		align-content: center;
		background: var(--paper);
	}
	.parts li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.6vw 1.2vw;
	}
	.parts li + li {
		border-top: var(--rule) solid var(--ink);
	}
	.parts b {
		font-weight: 700;
		font-size: max(1.5rem, 3vw);
		line-height: 1;
		letter-spacing: -0.03em;
	}
	.parts span {
		font-size: max(0.8125rem, 1vw);
		text-align: right;
	}
	.case-body {
		padding: 1.4vw 1.39vw 1.6vw;
	}
	/* Beside a taller window the text rides along, so its column is never left empty. */
	@media (min-width: 901px) {
		.case-body {
			position: sticky;
			top: 3.66vw;
			align-self: start;
		}
	}
	.case h3 {
		font-weight: 800;
		font-size: max(2rem, 3.6vw);
		letter-spacing: -0.035em;
	}
	.case h4 {
		/* block only: on a phone the case body's children keep their 1rem gutter */
		margin-block: 1.25rem 0.4rem;
		font-weight: 700;
		font-size: 0.875rem;
	}
	.built {
		max-width: 66ch;
		padding-left: 1.1em;
		list-style: square;
	}
	.built li + li {
		margin-top: 0.35rem;
	}
	.go {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		margin-top: 1.1rem;
		font-weight: 700;
	}

	/* Packages: the shared building blocks, one ruled row each. */
	.packages .lede,
	.websites .lede {
		max-width: none;
		margin: 0;
		padding: 1.25rem 1.39vw;
		border-bottom: var(--rule) solid var(--ink);
	}
	.ptable > li {
		display: grid;
		grid-template-columns: minmax(13rem, 21vw) 4.5rem minmax(0, 1fr) minmax(9rem, 17vw) max-content;
		gap: 0.5rem 2rem;
		align-items: baseline;
		padding: 0.85rem 1.39vw;
	}
	/* Inter Tight is narrow: the description column would run past 75ch on a laptop. */
	.ptable > li > div {
		max-width: 66ch;
	}
	.ptable > li + li {
		border-top: var(--rule) solid var(--ink);
	}
	.ptable > li:target {
		background: var(--chip);
	}
	.p-name {
		font-weight: 700;
		font-size: max(1.25rem, 1.8vw);
		letter-spacing: -0.02em;
		text-decoration: none;
	}
	.p-name:hover {
		text-decoration: underline;
	}
	.p-ver {
		font-variant-numeric: tabular-nums;
	}
	.p-meta {
		margin-top: 0.3rem;
		color: var(--quiet);
		font-size: 0.875rem;
	}
	/* The command and its copy button in one outline, split by a rule. */
	.p-install {
		display: inline-flex;
		max-width: 100%;
		min-height: 1.75rem;
		margin-top: 0.4rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font-size: 0.875rem;
	}
	.p-install code {
		align-self: center;
		padding: 0.1rem 0.45rem;
		font: inherit;
		user-select: all;
		overflow-wrap: anywhere;
	}
	.p-install button {
		flex: none;
		padding: 0 0.6rem;
		border: 0;
		border-left: var(--rule) solid var(--ink);
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.p-install button:hover {
		background: var(--chip);
	}
	.p-install button:focus-visible {
		outline-offset: -4px;
	}
	.p-used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.case-body .p-used {
		margin-top: 0.6rem;
	}
	.p-try {
		max-width: 54ch;
		margin-top: 0.6rem;
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.p-keys {
		margin-right: 0.4rem;
		padding: 0.1rem 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		cursor: pointer;
	}
	.p-sample {
		max-width: 24rem;
		margin-top: 0.75rem;
		overflow: hidden;
		border: var(--rule) solid var(--ink);
	}
	.p-sample :global(.radio) {
		border-bottom: 0;
	}
	.p-hint {
		display: block;
		margin-top: 0.3rem;
	}
	.p-n {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-right: 0.4rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.p-n input {
		width: 8rem;
		accent-color: var(--ink);
	}
	.p-n span {
		min-width: 3ch;
	}
	.p-keys[aria-pressed='true'] {
		background: none;
		color: var(--ink);
	}
	/* svelte-qr's row: the code, and what drives it beside. */
	.p-qr {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: 1rem 1.5rem;
		margin-top: 0.75rem;
	}
	.p-qr-code {
		flex: none;
		width: 10rem;
		border: var(--rule) solid var(--ink);
		line-height: 0;
	}
	.p-qr-code :global(svg) {
		width: 100%;
		height: auto;
	}
	.p-qr-controls {
		flex: 1 1 14rem;
		display: grid;
		justify-items: start;
		gap: 0.6rem;
	}
	.p-qr-controls .p-meta {
		margin: 0;
	}
	.p-field {
		display: grid;
		gap: 0.3rem;
		width: 100%;
		font-weight: 700;
		font-size: 0.875rem;
	}
	.p-field input {
		width: 100%;
	}
	/* One of four, the chosen one filled. */
	.p-seg {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		font-size: 0.875rem;
	}
	.p-seg span {
		margin-right: 0.35rem;
	}
	.p-seg button {
		min-width: 2rem;
		height: 1.75rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: none;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.p-seg button:hover {
		background: var(--chip);
	}
	.p-seg button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	/* svelte-media's row: two of its files at one scale, then all it returned. */
	.p-scale {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		max-width: 32rem;
		margin-top: 0.75rem;
	}
	.p-scale span {
		display: block;
		overflow: hidden;
		border: var(--rule) solid var(--ink);
	}
	.p-scale img,
	.p-scale :global(.geometrize) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.p-files {
		max-width: 32rem;
		margin-top: 0.6rem;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.p-files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 5.5rem 3.25rem 4rem;
		gap: 0 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	/* The keys share one long id: keep their size prefix, clip the rest. */
	.p-files code {
		overflow: hidden;
		font: inherit;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.p-files span:last-child {
		text-align: right;
	}
	/* The booking rows: controls stacked, one booking through three packages. */
	.p-stack {
		display: grid;
		justify-items: start;
		gap: 0.6rem;
		max-width: 32rem;
		margin-top: 0.75rem;
	}
	.p-stack > .p-files,
	.p-stack > .p-meta {
		width: 100%;
		margin: 0;
	}
	.p-book {
		font-weight: 700;
	}
	.p-sum li {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	/* svelte-search's row: the query's trigrams, filled where the top result has them too. */
	.p-grams {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.875rem;
	}
	.p-grams span {
		margin-right: 0.35rem;
		font-weight: 700;
	}
	.p-grams code {
		padding: 0 0.35rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font: inherit;
		font-variant-numeric: tabular-nums;
	}
	.p-grams code.on {
		background: var(--ink);
		color: var(--paper);
	}
	.p-found {
		padding: 0;
		list-style: none;
	}
	.p-found li {
		grid-template-columns: 5.5rem minmax(0, 1fr) 2.5rem;
		align-items: baseline;
	}
	.p-found li > span:first-child {
		color: var(--quiet);
	}
	.p-found a {
		font-weight: 700;
	}
	.p-found small {
		display: block;
		color: var(--quiet);
		font-size: 0.8125rem;
	}
	.p-ledger li {
		grid-template-columns: minmax(0, 1fr) 3.5rem 4.5rem;
	}
	.p-sum li > :last-child {
		text-align: right;
	}
	.p-keys:disabled {
		border-color: color-mix(in srgb, var(--ink) 35%, transparent);
		background: none;
		color: var(--quiet);
		cursor: default;
	}
	.p-log {
		font-size: 0.875rem;
		overflow-wrap: anywhere;
	}
	/* A replay the ledger stopped, the package's whole point: marked in orange. */
	.p-log li {
		padding-left: 0.5rem;
		border-left: 4px solid transparent;
	}
	.p-log .dup {
		border-left-color: var(--orange);
		font-weight: 700;
	}
	.p-mail {
		width: 100%;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.p-mail iframe {
		display: block;
		width: 100%;
		height: 34rem;
		border: 0;
	}
	.p-links {
		display: flex;
		gap: 1rem;
		justify-self: end;
	}

	/* Folds: closed catalogs, opened in place. */
	.folds details {
		border-bottom: var(--rule) solid var(--ink);
		interpolate-size: allow-keywords;
	}
	.folds .case:last-child {
		border-bottom: 0;
	}
	.folds details:last-child {
		border-bottom-width: var(--rule-heavy);
	}
	/* The one authored moment: a short height reveal where supported; elsewhere folds open instantly. */
	.folds details::details-content {
		height: 0;
		overflow: clip;
		transition:
			height 220ms cubic-bezier(0.2, 0, 0, 1),
			content-visibility 220ms allow-discrete;
	}
	.folds details[open]::details-content {
		height: auto;
	}
	.folds details:global(.jump)::details-content {
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.folds details::details-content {
			transition: none;
		}
	}
	summary,
	.strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 3.7vw;
		min-height: 3rem;
		padding: 0 1.29vw 0 1.39vw;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary h2,
	.strip h2 {
		font-weight: 800;
		font-size: max(1.75rem, 3.07vw);
		line-height: 1;
		letter-spacing: -0.03em;
	}
	/* An open section starts on an ink band, its name at programme scale. */
	.strip h2 {
		font-size: max(2.5rem, 5.4vw);
		letter-spacing: -0.04em;
		word-spacing: 0.1em;
		translate: 0 0.1em;
	}
	.strip .n {
		color: var(--orange);
	}
	summary:hover {
		background: color-mix(in srgb, var(--ink) 6%, var(--ground));
	}
	summary:focus-visible {
		outline-offset: -4px;
	}
	.toggle {
		width: max(2.25rem, 2.6vw);
		height: max(2rem, 2.4vw);
		padding: 0.35vw;
		border: var(--rule) solid var(--ink);
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.6;
	}
	details[open] .toggle .v {
		display: none;
	}
	details[open] summary {
		border-bottom: var(--rule) solid var(--ink);
	}

	.fold {
		padding: 2rem 1.39vw 3rem;
	}
	.lede {
		max-width: 60ch;
		margin-bottom: 1.5rem;
		font-size: max(1.125rem, 1.45vw);
		line-height: 1.3;
	}
	.fold h3 {
		margin: 2.5rem 0 0.5rem;
		font-size: 1.5rem;
	}
	.fold h3:first-of-type {
		margin-top: 0;
	}
	.table li {
		display: grid;
		grid-template-columns: minmax(12rem, 18rem) minmax(0, 62ch) auto;
		gap: 0.5rem 2rem;
		align-items: baseline;
		padding: 0.75rem 0;
		border-top: var(--rule) solid var(--ink);
	}
	.t-name {
		font-weight: 800;
		font-size: 1.125rem;
	}
	a.t-name {
		text-decoration: none;
	}
	a.t-name:hover {
		text-decoration: underline;
	}
	.table li:target {
		background: var(--chip);
	}
	.t-note {
		margin: -0.75rem 0 1.5rem;
		color: var(--quiet);
		font-size: 0.875rem;
	}
	/* Find: a native search box that narrows the rows, and a chip per group. */
	.t-find {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
		margin-bottom: 2.5rem;
	}
	.t-find label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-weight: 700;
	}
	.t-find input,
	.p-field input {
		width: 18rem;
		height: 2.25rem;
		padding: 0 0.6rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
	}
	/* The browser's clear button is tinted blue; ink, like everything else. */
	.t-find input::-webkit-search-cancel-button,
	.p-field input::-webkit-search-cancel-button {
		filter: grayscale(1) brightness(0);
	}
	.t-none {
		padding: 0.75rem 0;
		border-top: var(--rule) solid var(--ink);
	}
	.t-runs {
		color: var(--quiet);
		font-variant-numeric: tabular-nums;
	}
	.t-src {
		display: flex;
		gap: 1.25rem;
		justify-self: end;
		white-space: nowrap;
	}

	/* A section opens on an ink band. */
	.strip {
		height: auto;
		padding-top: 1.6vw;
		padding-bottom: 1.1vw;
		cursor: auto;
		background: var(--ink);
		color: var(--paper);
	}
	/* The rest of the work: one ruled row each, a small capture beside the name
	   and what it is, the facts in a column of their own. */
	.sites > li {
		display: grid;
		grid-template-columns: minmax(11rem, 18vw) minmax(0, 1fr) minmax(0, 1.1fr);
		gap: 0 1.39vw;
		align-items: start;
		padding: 1.1rem 1.39vw 1.3rem;
	}
	.sites > li + li {
		border-top: var(--rule) solid var(--ink);
	}
	.shot {
		display: block;
		overflow: hidden;
		border: var(--rule) solid var(--ink);
	}
	.sites img {
		display: block;
		width: 100%;
		height: auto;
	}
	.sites h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		margin: 0;
		font-weight: 800;
		font-size: max(1.5rem, 2.2vw);
		letter-spacing: -0.035em;
	}
	.sites h3 a {
		overflow-wrap: anywhere;
		text-decoration: none;
	}
	.sites h3 a:hover {
		text-decoration: underline;
	}
	.site > p:not(.meta) {
		max-width: 52ch;
		margin-top: 0.5rem;
	}
	.sites > li > dl {
		font-size: 0.9375rem;
	}
	.sites > li > dl div {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.sites > li > dl div:first-child {
		border-top: 0;
	}
	.sites > li > dl dt {
		color: var(--quiet);
	}
	.site .chips {
		margin-top: 0.9rem;
	}

	/* The page closes on one more programme row: the address, at poster scale. */
	.foot {
		background: var(--orange);
	}
	.hire {
		padding: 2.4vw 1.39vw 0;
		font-weight: 700;
		font-size: max(1.125rem, 1.45vw);
	}
	.write {
		display: block;
		padding: 0.6vw 1.39vw 0;
		border-bottom: var(--rule) solid var(--orange-rule);
		font-weight: 700;
		font-size: max(2.5rem, 8.4vw);
		line-height: 1;
		letter-spacing: -0.04em;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	.write:hover,
	.write:focus-visible {
		background: var(--orange-lit);
		color: var(--paper);
	}
	.foot .small {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		padding: 1.25rem 1.39vw 2rem;
		font-size: 0.9375rem;
	}

	/* Below 900 the sheet stops scaling and becomes a stack. */
	@media (max-width: 900px) {
		.bar {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			height: auto;
		}
		/* Four tabs fill a phone's bar; the language moves to the intro's links. */
		.lang {
			display: none;
		}
		.intro-lang {
			display: flex;
		}
		/* One row of sections; the name and the address are in the intro below. */
		.mark,
		.mail {
			display: none;
		}
		.tabs a {
			height: 2.75rem;
			padding: 0 0.25rem;
			font-size: 0.8125rem;
			line-height: 1.1;
			text-align: center;
			border-left: 0;
			/* A label wider than a phone's tab: let <html lang> hyphenate it. */
			white-space: normal;
			hyphens: auto;
			/* Where the browser has no dictionary for the page's language, a word
			   wider than its tab still breaks rather than running into the next tab. */
			min-width: 0;
			overflow-wrap: break-word;
		}
		.tabs a + a {
			border-left: var(--rule) solid var(--bar-rule);
		}
		.tabs a:last-child {
			border-right: 0;
		}
		.poster {
			--bar: 2.75rem;
			--u: 1vw;
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
			min-height: calc(100svh - var(--bar));
		}
		.programme {
			border-right: 0;
			border-bottom: var(--rule-heavy) solid var(--ink);
		}
		.programme li {
			flex-basis: 13vw;
		}
		.row {
			padding: 0 1rem 0.2rem;
		}
		.name {
			font-size: 8.4vw;
		}
		.ver {
			padding-bottom: 0.6rem;
			font-size: 0.8125rem;
		}
		.intro {
			order: -1;
			padding: 1.5rem 1rem;
			border-bottom: var(--rule-heavy) solid var(--ink);
		}
		.intro h1 {
			font-size: 2.5rem;
		}
		.me {
			width: 6.5rem;
			margin-top: 0.5rem;
		}
		.role {
			margin-top: 0.5rem;
		}
		.pitch {
			margin-top: 1rem;
		}
		.links {
			gap: 0.4rem 1.5rem;
			margin-top: 1rem;
		}
		.kit {
			padding-top: 1.25rem;
		}
		/* No pointer to light anything with: the kit is chips under its heading. */
		.kit .point {
			display: none;
		}
		.kit h2 {
			margin-bottom: 0.6rem;
		}
		.links .phone {
			display: inline;
		}
		.chips {
			gap: 0.5rem;
		}
		.chip {
			height: 2.25rem;
			padding: 0 0.6rem;
			font-size: 0.875rem;
		}
		.case {
			grid-template-columns: minmax(0, 1fr);
		}
		/* On a phone the label takes a line of its own over the chart. */
		.daily div {
			grid-template-columns: minmax(0, 1fr) 3.5rem 5rem;
			gap: 0.1rem 0.6rem;
		}
		.daily dt {
			grid-column: 1 / -1;
		}
		.media {
			border-right: 0;
			border-bottom: var(--rule) solid var(--ink);
		}
		/* The title and its line come before the windows, so a window is
		   never shown ahead of its name. */
		.case-body {
			display: contents;
		}
		.case-body > * {
			margin-inline: 1rem;
		}
		.case h3,
		.case .meta,
		.case .what {
			order: -1;
		}
		.case h3 {
			margin-top: 1.25rem;
		}
		.case .what {
			margin-bottom: 1.25rem;
		}
		.case .go {
			margin-bottom: 1.5rem;
		}
		.parts li {
			padding: 0.5rem 0.75rem;
		}
		.packages .lede,
		.websites .lede {
			padding: 1rem;
		}
		.ptable > li {
			grid-template-columns: 1fr auto;
			gap: 0.25rem 1rem;
			padding: 1rem;
		}
		.ptable > li > p,
		.ptable > li > div {
			grid-column: 1 / -1;
		}
		.p-links {
			justify-self: start;
		}
		summary {
			padding: 0 1rem;
		}
		.fold {
			padding: 1.5rem 1rem 2.5rem;
		}
		.table li {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.strip {
			padding: 1rem 1rem 0.6rem;
		}
		/* The text runs round a small capture; chips and facts take the full width. */
		.sites > li {
			display: flow-root;
			padding: 1rem 1rem 1.25rem;
		}
		.shot {
			float: left;
			width: 7.5rem;
			margin: 0.25rem 1rem 0.5rem 0;
		}
		.sites h3 {
			font-size: 1.375rem;
		}
		.site .chips,
		.sites > li > dl {
			clear: both;
		}
		.sites > li > dl {
			margin-top: 0.9rem;
		}
		.t-src {
			justify-self: start;
		}
		.t-find label {
			flex: 1 1 100%;
		}
		.t-find input {
			flex: 1;
			width: auto;
			min-width: 0;
		}
		.hire {
			padding: 1.5rem 1rem 0;
		}
		.write {
			padding: 0.4rem 1rem 0;
		}
		.foot .small {
			padding: 1.25rem 1rem 2rem;
		}
	}

	/* Phones: a long name ("Friendly Festivals") would meet its kind, so the kind
	   steps up to the row's top right and the name takes the full width under it,
	   still sitting on the rule. */
	@media (max-width: 600px) {
		.programme li {
			flex-basis: max(3.75rem, 16vw);
		}
		.row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: 1fr auto;
			padding: 0.45rem 1rem 0.2rem;
		}
		.ver {
			grid-row: 1;
			justify-self: end;
			align-self: start;
			padding: 0;
			line-height: 1.2;
		}
		.name {
			grid-row: 2;
			white-space: nowrap;
		}
	}

	/* Tablets: the stack keeps its order, but a 7.5rem capture floated in a
	   768-wide row wastes the screen. The capture takes a column of its own, the
	   text and facts run beside it. */
	@media (min-width: 601px) and (max-width: 900px) {
		.sites > li {
			display: grid;
			grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
			gap: 0 1.25rem;
		}
		.shot {
			grid-row: 1 / span 2;
			float: none;
			width: auto;
			margin: 0;
		}
		.sites > li > dl {
			grid-column: 2;
		}
	}


	/* A standalone action is at least 24px tall for a mouse, */
	.go a,
	.p-links a,
	.t-src a,
	a.t-src {
		display: inline-flex;
		align-items: center;
		min-height: 1.5rem;
	}
	/* and a finger needs 44px: the links that stand alone as actions grow to it on
	   touch screens. Links inside running text stay as they are. */
	@media (pointer: coarse) {
		.intro .links {
			align-items: center;
		}
		.intro .links a,
		.go a,
		.p-links a,
		.t-src a,
		a.t-src,
		.foot .small a {
			display: inline-flex;
			align-items: center;
			min-height: 2.75rem;
		}
		.p-install,
		.p-seg button {
			min-height: 2.75rem;
		}
		.p-seg button {
			min-width: 2.75rem;
		}
	}
</style>
