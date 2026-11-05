<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { keys } from '#lib/keys.svelte';
	import { alternates, intlLocale, localizeHref, LocaleSwitcher } from '@nomideusz/svelte-i18n';
	import { platesFor, phoneFor } from '#lib/plates';
	import { shapesOf } from '#lib/shapes';
	import { GeometrizedImage } from '@nomideusz/svelte-geometrize';
	import Live from '#lib/Live.svelte';
	import BookingMachine from '#lib/BookingMachine.svelte';
	import Darkroom from '#lib/Darkroom.svelte';
	import Sky from '#lib/Sky.svelte';
	import Install from '#lib/Install.svelte';
	import PkgLinks from '#lib/PkgLinks.svelte';
	import UsedIn, { type UsedList } from '#lib/UsedIn.svelte';
	import { watchOpened } from '#lib/opened.svelte';
	import Palette, { palette } from '#lib/Palette.svelte';
	import TicketView from '#lib/TicketView.svelte';
	import { decodeTicket, ticketHash, type Ticket } from '#lib/ticket';
	import Daily, { linked } from '#lib/Daily.svelte';
	import { indexed, search as match, tokensOf, type Entry } from '#lib/find';
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
				knowsAbout: ['Svelte', 'SvelteKit', 'TypeScript', 'Node.js', 'PostgreSQL', 'JMAP', 'OpenID Connect', 'Web accessibility', 'Web performance'],
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
		/** A second address worth opening, beside the product's own. */
		also?: string;
		/** Live windows shown instead of a capture, when the product itself sits behind a sign-in. */
		demos?: { id: string; href: string; name: string; label?: string; note: string }[];
		/** Not launched yet: shown folded under Work in progress, not among the products. */
		wip?: boolean;
	};
	type WorkFacts = Pick<Work, 'id' | 'name' | 'href' | 'site' | 'source' | 'uses' | 'wip' | 'also'> & { demos?: { id: string; href: string; label?: string }[] };
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
			also: 'https://register.zaur.app',
			demos: [{ id: 'mail-demo', href: 'https://demo.zaur.app', label: 'webmail.zaur.app' }],
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
			source: 'https://github.com/nomideusz/svelte-calendar'
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
	] as { name: string; npm: string; demo?: string; source?: string }[];
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
		{ id: 'kurcz', name: 'kurcz.pl', href: 'https://kurcz.pl', basket: 'client', uses: ['svelte-i18n'] },
		{ id: 'radiobartek', name: 'radiobartek.com', href: 'https://radiobartek.com', basket: 'side', live: true, uses: ['zaur-world'] },
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
	const npmOf = (id: string) => pkgs.find((p) => p.id === id)?.npm;
	// Seeded once from the prerendered numbers; npm refreshes them on mount.
	// svelte-ignore state_referenced_locally
	let versions = $state<Record<string, string>>({ ...data.versions });
	let registryDown = $state(false);
	// Google Search for Szkoły Jogi, the one product whose figures show, live from the
	// server (search.mjs, /api/traffic): clicks, impressions and average position
	// for each of the last ninety days.
	type Sum = { clicks: number; impressions: number; position: number | null };
	type Search = { through: string; days: [string, number, number, number | null][]; now: Sum; before: Sum };
	let traffic = $state<Record<string, Search> | null>(null);
	let trafficDown = $state(false);
	const searching = (id: string) => id === 'szkolyjogi' && !trafficDown && (!traffic || !!traffic[id]);
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
			{ label: t('daily.position'), days, values: s.days.map((d) => d[3]), now: now.position, change: before.position === null ? '' : t('daily.was', { position: rank(before.position) }), fmt: rank, line: true }
		];
	};
	const version = (id: string) => versions[id] ?? (registryDown ? '—' : '…');
	/** A package's Docs and Source, where it has them; the links in its head. */
	const linksOf = (id: string) => {
		const p = pkgs.find((x) => x.id === id);
		return { docs: p?.docs, source: p?.source };
	};
	// The package demonstrating itself: the whole page as its message keys, and
	// back, from the bar or its row. zaur.app/#keys opens it that way (the demo
	// site links there). What is being read stays put while everything around it
	// changes length; the #keys link, arriving from elsewhere, centres the row.
	// The page above keeps settling for a few frames after the swap (Firefox and
	// Safari don't anchor scrolling through it), so it is held for a second, on
	// every resize only: scrolling meanwhile is left alone.
	const flipKeys = async () => {
		const arriving = location.hash === '#keys';
		const reading = arriving ? null : document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[id]');
		const id = reading?.id;
		const at = () => (id ? document.getElementById(id)?.getBoundingClientRect().top : undefined);
		const before = at();
		keys.on = !keys.on;
		if (arriving) history.replaceState(null, '', location.pathname);
		await tick();
		if (arriving) return document.getElementById('pkg-svelte-i18n')?.scrollIntoView({ block: 'center' });
		if (before === undefined) return;
		const hold = () => {
			const after = at();
			if (after !== undefined) scrollBy({ top: after - before, behavior: 'instant' });
		};
		hold();
		const settling = new ResizeObserver(hold);
		settling.observe(document.body);
		setTimeout(() => settling.disconnect(), 1000);
	};

	// zaur.app/#shapes, for the demo site's link: every capture held at its triangles.
	let shapes = $state({ on: false });
	const showShapes = async () => {
		shapes.on = true;
		history.replaceState(null, '', location.pathname);
		await tick();
		document.querySelector('.sites .geometrize')?.scrollIntoView({ block: 'center' });
	};

	// svelte-search demonstrating itself: the search in the bar, over everything
	// this page lists, each step of its matching on show (lib/Palette, lib/find).
	const pageEntries = indexed([
		...work.map((w): Entry => ({ kind: 'product', name: w.name, text: w.what, href: `#${w.id}` })),
		...pkgs.map((p): Entry => ({ kind: 'package', name: p.id, text: p.desc, href: `#pkg-${p.id}` })),
		...tplEntries.map((e): Entry => ({ ...e, href: `#tpl-${e.href}` })),
		...websites.filter((w) => !w.live).map((w): Entry => ({ kind: 'site', name: w.name, text: w.desc, href: `#${w.id}` }))
	]);
	// Each name links to its own part of the page; the radio plays in the sky, so it links out.
	const usedLine = (id: string): UsedList | null => {
		const rows = [
			...work.filter((w) => w.uses?.includes(id)).map((w) => ({ name: w.name, href: `#${w.id}` })),
			...websites.filter((w) => w.uses?.includes(id)).map((w) => ({ name: w.name, href: w.live ? w.href : `#${w.id}` }))
		];
		if (!rows.length) return null;
		const [before, after] = t('packages.usedIn', { list: '' }).split('');
		const hrefs = new Map(rows.map((r) => [r.name, r.href]));
		return { before, after, parts: and.formatToParts(rows.map((r) => r.name)).map((p) => ({ text: p.value, href: p.type === 'element' ? hrefs.get(p.value) : undefined })) };
	};
	// The three whose demo is this page itself: its sky, its search, its languages.
	const running = ['zaur-world', 'svelte-search', 'svelte-i18n'].map((id) => pkgs.find((p) => p.id === id)!);

	// A scanned ticket: the phone opens this page with the booking in its address.
	let ticket = $state<Ticket | null>(null);
	const readTicket = () => {
		ticket = location.hash.startsWith(ticketHash) ? decodeTicket(location.hash.slice(ticketHash.length)) : null;
	};
	const closeTicket = () => {
		ticket = null;
		history.replaceState(null, '', location.pathname + location.search);
		document.getElementById('machine')?.scrollIntoView();
	};
	$effect(() => {
		document.documentElement.style.overflow = ticket ? 'hidden' : '';
	});

	onMount(watchOpened);
	onMount(() => {
		readTicket();
		if (location.hash === '#keys' && !keys.on) flipKeys();
		if (location.hash === '#shapes') showShapes();
		// A link to a fold or into one (a search result, a shared #tpl-n8n-queue) opens it. The
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
		const onhash = () => {
			readTicket();
			unfold();
		};
		unfold();
		addEventListener('hashchange', onhash);
		addEventListener('click', onclick);
		fetch('/api/traffic')
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((t) => {
				traffic = t.search;
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

<!-- The facts behind a product or a site, shut until asked for. -->
{#snippet how(specs: [string, string][], uses: string[])}
	<details class="how">
		<summary>{t('work.details')}{@render toggle()}</summary>
		<dl class="facts">
			{#each specs as [k, v], i (i)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
			{#if uses.length}<div><dt>{t('nav.packages')}</dt><dd><a href="#packages">{uses.length} / {pkgs.length}</a></dd></div>{/if}
		</dl>
	</details>
{/snippet}

{#snippet card(c: Card)}
	<li id={c.id}>
		{#if c.img}
			<a class="shot" href={c.href} tabindex="-1" aria-hidden="true">
				{@render still(c.img)}
			</a>
		{/if}
		<div class="site">
			<h3><a href={c.href}>{c.name}</a></h3>
			<p>{c.desc}</p>
		</div>
		{@render how(c.specs, c.uses ?? [])}
	</li>
{/snippet}

{#snippet study(w: Work)}
	{@const title = w.site ?? host(w.href)}
	{@const demos = w.demos?.filter((d) => isLive(d.href)) ?? []}
	<article class="case" id={w.id}>
		<!-- The words come first in the markup, so a reader that skims (an agent, a screen reader)
		     meets the facts before the live windows; .media takes the left column back by order. -->
		<div class="case-body">
			<h3><a href={w.href}>{title}</a></h3>
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
			<p class="go">
				<a href={w.href}>{t('work.open', { host: host(w.href) })}</a>
				{#if w.also}<a href={w.also}>{t('work.open', { host: host(w.also) })}</a>{/if}
				{#if w.source}<a href={w.source}>{t('work.source')}</a>{/if}
			</p>
			{@render how(w.proof ?? [], w.uses)}
		</div>
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
		<p class="meta reading">{t('search.reading')}</p>
	{/if}
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
		<a href="#clients">{t('nav.clients')}</a>
	</nav>
	<a class="mail" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<!-- i18n.t, not t: it stays readable while the page shows its keys. -->
	<button type="button" class="tool find" aria-label={i18n.t('nav.search')} onclick={() => (palette.open = true)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5.5 5.5" /></svg>
		<span class="tool-label">{i18n.t('nav.search')}</span>
		<kbd aria-hidden="true">/</kbd>
	</button>
	<!-- The language switch is @nomideusz/svelte-i18n's own component: it writes
	     the locale cookie and moves to the same page under the new prefix. -->
	<span class="lang"><LocaleSwitcher {i18n} {routing} labels={short} label={t('nav.language')} /></span>
</header>

<main id="main">
	<div class="poster" style:--rows={products.length}>
		<nav class="programme" aria-label={t('nav.products')}>
			<ul>
				{#each products as w (w.id)}
					<li>
						<a class="row" href="#{w.id}">
							<span class="name">{w.name}</span>
							<span class="ver">{w.kind}</span>
						</a>
						<!-- The row reads about the product; this opens it. -->
						<a class="out" href={w.href} aria-label={t('work.open', { host: host(w.href) })}>{host(w.href)} ↗</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="intro">
			<section class="who" aria-labelledby="who">
				<h1 id="who">Bartosz Dymet</h1>
				<img class="me" src={me} alt={t('intro.portrait')} width="480" height="480" />
				<p class="role">{t('intro.role')}</p>
				<p class="pitch">
					{t('intro.pitch', { products: num(products.length), packages: num(pkgs.length) })}
				</p>
			</section>
			<p class="links">
				<a class="phone" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
				<a href={github}>GitHub</a>
				<a href={linkedin}>LinkedIn</a>
				<span class="intro-lang"><LocaleSwitcher {i18n} {routing} labels={short} label={t('nav.language')} /></span>
			</p>
			<Sky href="https://radiobartek.com" />
		</div>
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

		<Darkroom locale={intl} {version} {npmOf} {linksOf} usedIn={usedLine} />

		<BookingMachine locale={intl} language={locale} {site} {version} {npmOf} {linksOf} usedIn={usedLine} />

		<div class="here">
			<h3>{t('packages.here')}</h3>
			<ul>
				{#each running as p (p.id)}
					{@const used = usedLine(p.id)}
					<li id="pkg-{p.id}">
						<header>
							<h4><a href={p.npm}>{p.id}</a></h4>
							<PkgLinks docs={p.docs} source={p.source} />
							<span>{version(p.id)}</span>
						</header>
						<p>{p.desc}</p>
						<p>
							{#if p.id === 'svelte-search'}
								<button type="button" class="p-keys" onclick={() => (palette.open = true)}>{t('nav.search')}</button>
							{:else if p.id === 'svelte-i18n'}
								<!-- i18n.t, not t: the switch stays readable while the page shows keys. -->
								<button type="button" class="p-keys" aria-pressed={keys.on} onclick={flipKeys}>{i18n.t(keys.on ? 'packages.i18n.text' : 'packages.i18n.keys')}</button>
							{:else}
								<a class="p-keys" href="#sky">{t('sky.title', { city: 'Kraków' })}</a>
							{/if}
						</p>
						<div class="p-foot">
							<Install cmd="npm i {p.name}" />
							{#if used}<p class="p-used"><UsedIn list={used} /></p>{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="websites" id="clients" aria-labelledby="clients-h">
		<div class="strip"><h2 id="clients-h">{t('clients.heading')} <span class="n">· {clients.length}</span></h2></div>
		<p class="lede">{t('clients.lede')}</p>
		<ul class="sites">
			{#each clients as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="folds" aria-label={t('folds.label')}>
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
								<Install cmd="npx skills add nomideusz/{s.name}" />
							</div>
							<a class="t-src" href={s.source}>{t('skills.source')}</a>
						</li>
					{/each}
				</ul>
			</div>
		</details>

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
	</section>

</main>

<Palette entries={pageEntries} locale={intl} />
{#if ticket}<TicketView {ticket} locale={intl} onclose={closeTicket} />{/if}

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

<!-- Each language in its own name, as plain links: a static page needs no menu.
     A full load, because the language is read once as the page starts (+layout). -->
{#snippet langs()}
	{#each routing.supportedLocales as l (l)}
		<a href={localizeHref('/', l, routing)} hreflang={l} lang={l} data-sveltekit-reload aria-current={l === locale ? 'page' : undefined}>{languages[l]}</a>
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
			minmax(max-content, 1fr) auto auto;
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
		justify-items: end;
		padding-right: 1.31vw;
		font-size: max(13px, 1.45vw);
	}
	.bar a:hover {
		color: var(--orange);
	}
	/* The page's own search, sitting among the tabs. */
	.tool {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0 0.9vw;
		border: 0;
		border-left: var(--rule) solid var(--bar-rule);
		background: none;
		color: inherit;
		font-size: max(13px, 1.2vw);
		white-space: nowrap;
		cursor: pointer;
	}
	.tool:hover {
		color: var(--orange);
	}
	.tool svg {
		display: none;
		width: 1.25rem;
		height: 1.25rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: square;
	}
	.tool kbd {
		display: grid;
		place-items: center;
		min-width: 1.5em;
		height: 1.5em;
		border: var(--rule) solid currentColor;
		border-radius: 3px;
		font: inherit;
		font-weight: 700;
		line-height: 1;
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
		--asini-font-sans: inherit;
		--asini-surface: var(--lilac);
		--asini-text: var(--ink);
		--asini-border: var(--ink);
		--asini-border-strong: var(--ink);
		--asini-accent: var(--ink);
		--asini-radius-sm: 3px;
	}
	.foot-lang {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
	}
	.foot-lang [aria-current] {
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
	   or the column (the intro, the sky's board and its smallest window: under
	   52u, French wrapping most) taller than the screen under the bar, as in a
	   window wider than 16:10; then the names and the column shrink with it to
	   fit. Rows are at least --row and grow to fill the
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
		position: relative;
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
	.programme li:hover .row,
	.programme li:focus-within .row {
		background: var(--orange-lit);
		box-shadow: inset 0 calc(-1 * var(--rule)) var(--paper);
	}
	/* The address stands over the kind, like a venue under its billing. It lies on
	   top of the row's link rather than inside it: a link can't hold a link. */
	.out {
		position: absolute;
		right: 1.64vw;
		bottom: calc(1.4vw + 1.53vw * 1.45);
		padding: 0 0.3em;
		margin-right: -0.3em;
		font-weight: 700;
		font-size: 1.53vw;
		line-height: 1.25;
		white-space: nowrap;
	}
	.out:hover {
		background: var(--ink);
		color: var(--paper);
	}
	.programme li:hover :is(.name, .ver, .out:not(:hover)),
	.programme li:focus-within :is(.name, .ver, .out:not(:hover)) {
		color: var(--paper);
	}
	/* Focus is drawn inside the row, so it reads apart from the light. */
	.row:focus-visible,
	.out:focus-visible {
		outline-color: var(--paper);
		outline-offset: -6px;
	}
	.out:focus-visible {
		outline-offset: 0;
	}

	/* The intro: who, in the column beside the products; the sky takes the rest. */
	.intro {
		display: flex;
		flex-direction: column;
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
		font-size: max(1rem, calc(1.35 * var(--u)));
		line-height: 1.35;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: calc(0.4 * var(--u)) calc(1.6 * var(--u));
		margin-top: calc(1.3 * var(--u));
		font-size: max(13px, calc(1.05 * var(--u)));
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
	.chip:hover {
		background: var(--chip);
	}
	@media (min-width: 901px) {
		/* The bar names me on the sheet, so the column opens on what I do. The heading
		   stays for readers that skim by headings; at 900 and below it shows, as the
		   bar drops the name. */
		.who h1 {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.me {
			grid-row: 1 / span 2;
			margin-top: 0;
		}
		.role {
			margin-top: 0;
		}
		.who {
			padding: calc(2 * var(--u)) calc(1.6 * var(--u)) 0;
		}
		.intro .links {
			padding: 0 calc(1.6 * var(--u)) calc(1.3 * var(--u));
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
	.facts dd {
		max-width: 54ch;
	}
	/* The details of a case or a row: shut until asked for. */
	.how > summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.25rem;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}
	.how > summary::-webkit-details-marker {
		display: none;
	}
	.how > summary:hover {
		text-decoration: underline;
	}
	.how .toggle {
		flex: none;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0.15rem;
		stroke-width: 2.5;
	}
	/* In a row the fold is an action, flush right like every other. */
	.sites .how > summary {
		justify-content: flex-end;
		gap: 0.6rem;
	}
	.how[open] > summary {
		margin-bottom: 0.5rem;
	}
	.how .facts {
		margin: 0.75rem 0 0;
	}
	/* The charts' height while they load, so a flagship's body doesn't grow under a reader. */
	.case .reading {
		min-height: 7.25rem;
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
	.packages {
		border-bottom: var(--rule-heavy) solid var(--ink);
	}
	.case {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		border-bottom: var(--rule) solid var(--ink);
	}
	/* The window runs edge to edge and grows to the case's height, so the site
	   fills the column instead of floating in it. */
	.media {
		order: -1;
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
	.case .how {
		margin-top: 1.1rem;
		border-top: var(--rule) solid var(--ink);
		padding-top: 0.4rem;
	}

	/* Packages: each one once, where it runs. */
	.packages .lede,
	.websites .lede {
		max-width: none;
		margin: 0;
		padding: 1.25rem 1.39vw;
		border-bottom: var(--rule) solid var(--ink);
	}
	/* The three whose demo is this page: head, one line, a way to try it, the install. */
	.here h3 {
		padding: 1.4vw 1.39vw 0.8vw;
		border-bottom: var(--rule) solid var(--ink);
		font-weight: 800;
		font-size: max(2rem, 3.6vw);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}
	.here ul {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.here li {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		min-width: 0;
		padding-bottom: 1rem;
	}
	.here li + li {
		border-left: var(--rule) solid var(--ink);
	}
	.here li:target header {
		background: var(--chip);
	}
	.here header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.5rem 1.39vw 0.45rem;
		border-bottom: var(--rule) solid var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.here h4 {
		margin: 0;
		font-weight: 700;
		font-size: max(1.125rem, 1.45vw);
		letter-spacing: -0.02em;
	}
	.here h4 a {
		text-decoration: none;
	}
	.here h4 a:hover {
		text-decoration: underline;
	}
	.here li > p,
	.p-foot {
		padding-inline: 1.39vw;
	}
	.p-foot {
		display: grid;
		gap: 0.4rem;
		justify-items: start;
		margin-top: auto;
	}
	.p-used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.p-keys {
		display: inline-block;
		padding: 0.1rem 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		font-size: 0.875rem;
		text-decoration: none;
		cursor: pointer;
	}
	.p-keys:hover {
		background: var(--orange);
		color: var(--ink);
	}
	.p-keys[aria-pressed='true'] {
		background: none;
		color: var(--ink);
	}
	.p-keys[aria-pressed='true']:hover {
		background: var(--chip);
	}

	/* Folds: closed catalogs, opened in place. */
	.folds > details {
		border-bottom: var(--rule) solid var(--ink);
		interpolate-size: allow-keywords;
	}
	.folds .case:last-child {
		border-bottom: 0;
	}
	.folds > details:last-child {
		border-bottom-width: var(--rule-heavy);
	}
	/* The one authored moment: a short height reveal where supported; elsewhere folds open instantly. */
	.folds > details::details-content {
		height: 0;
		overflow: clip;
		transition:
			height 220ms cubic-bezier(0.2, 0, 0, 1),
			content-visibility 220ms allow-discrete;
	}
	.folds > details[open]::details-content {
		height: auto;
	}
	.folds > details:global(.jump)::details-content {
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.folds > details::details-content {
			transition: none;
		}
	}
	.folds > details > summary,
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
	.folds > details > summary::-webkit-details-marker {
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
	.folds > details > summary:hover {
		background: color-mix(in srgb, var(--ink) 6%, var(--ground));
	}
	.folds > details > summary:focus-visible {
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
	details[open] > summary .toggle .v {
		display: none;
	}
	.folds > details[open] > summary {
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
	.t-find input {
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
	.t-find input::-webkit-search-cancel-button {
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
		grid-template-columns: minmax(8rem, 10vw) minmax(0, 1.2fr) minmax(0, 1fr);
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
			grid-template-columns: repeat(3, minmax(0, 1fr)) 2.75rem;
			height: auto;
		}
		/* The tabs fill a phone's bar; the language moves to the intro's links. */
		.lang {
			display: none;
		}
		.intro-lang {
			display: flex;
		}
		/* One row of sections; the name and the address are in the intro below;
		   search keeps its place as a drawn icon. */
		.mark,
		.mail {
			display: none;
		}
		.tool {
			justify-content: center;
			padding: 0;
		}
		.tool svg {
			display: block;
		}
		.tool-label,
		.tool kbd {
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
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto auto auto 1fr;
			min-height: calc(100svh - var(--bar));
		}
		.programme {
			border-right: 0;
			border-block: var(--rule-heavy) solid var(--ink);
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
		.out {
			right: 1rem;
			bottom: calc(0.2rem + 0.6rem + 1.45 * 0.8125rem);
			font-size: 0.8125rem;
		}
		/* Who I am, then the products, then the sky to play with: the intro's parts
		   take their places in the stack around the programme. */
		.intro {
			display: contents;
		}
		.who,
		.intro .links {
			background: var(--lilac);
		}
		.who {
			order: -2;
			padding: 1.5rem 1rem 0;
		}
		.intro .links {
			order: -1;
			margin: 0;
			padding: 1rem 1rem 1.25rem;
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
			max-width: 52ch;
			margin-top: 1rem;
		}
		.links {
			gap: 0.4rem 1.5rem;
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
		.here h3 {
			padding: 1.25rem 1rem 0.6rem;
		}
		.here ul {
			grid-template-columns: minmax(0, 1fr);
		}
		.here li + li {
			border-top: var(--rule) solid var(--ink);
			border-left: 0;
		}
		.here header {
			align-items: center;
			padding-inline: 1rem;
		}
		.here li > p,
		.p-foot {
			padding-inline: 1rem;
		}
		.folds > details > summary {
			padding: 0 1rem;
		}
		.case .reading {
			min-height: 12rem;
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
		/* The text runs round a small capture; the fold takes the full width. */
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
		.sites .how {
			clear: both;
			padding-top: 0.5rem;
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
			flex-basis: max(4.25rem, 18vw);
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
		/* On the kind's line, at its far end, with the name free underneath. */
		.out {
			top: 0.45rem;
			right: auto;
			bottom: auto;
			left: 1rem;
			margin: 0 0 0 -0.3em;
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
			grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
			gap: 0 1.25rem;
		}
		.shot {
			grid-row: 1 / span 2;
			float: none;
			width: auto;
			margin: 0;
		}
		.sites .how {
			grid-column: 2;
			clear: none;
		}
	}


	/* A standalone action is at least 24px tall for a mouse, */
	.go a,
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
		.t-src a,
		a.t-src,
		.foot .small a {
			display: inline-flex;
			align-items: center;
			min-height: 2.75rem;
		}
		.p-keys {
			min-height: 2.75rem;
		}
		.how > summary {
			min-height: 2.75rem;
		}
		/* The address is one line among the row's text, so its target grows without
		   its type: downward over the name would steal the row's own tap. */
		.programme .out {
			padding-block: 0.5rem;
			margin-block: -0.5rem;
		}
	}
</style>
