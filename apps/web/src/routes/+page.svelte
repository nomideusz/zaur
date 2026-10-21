<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { keys } from '#lib/keys.svelte';
	import { alternates, intlLocale, localizeHref, LocaleSwitcher } from '@nomideusz/svelte-i18n';
	import { platesFor, phoneFor } from '#lib/plates';
	import { shapesOf } from '#lib/shapes';
	import { GeometrizedImage } from '@nomideusz/svelte-geometrize';
	import Live from '#lib/Live.svelte';
	import Radio from '#lib/Radio.svelte';
	import { track } from '#lib/visit';
	import { i18n, t, list, pairs } from '#lib/i18n';
	import { routing, languages, short } from '#lib/i18n-routing';
	import me from '#lib/me.webp';

	let { data } = $props();
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const templateCount = data.templates.reduce((n, g) => n + g.items.length, 0);

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
	};
	type WorkFacts = Pick<Work, 'id' | 'name' | 'href' | 'site' | 'source' | 'uses'> & { demos?: { id: string; href: string; label?: string }[] };
	const facts: WorkFacts[] = [
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
			id: 'szkolyjogi',
			name: 'Szkoły Jogi',
			href: 'https://szkolyjogi.pl',
			uses: ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify']
		},
		{
			id: 'thebest',
			name: 'thebest.travel',
			href: 'https://thebest.travel',
			uses: ['svelte-calendar', 'svelte-scheduler', 'svelte-search', 'svelte-i18n', 'svelte-qr', 'svelte-media', 'svelte-notify', 'svelte-payments']
		},
		{ id: 'kino', name: 'Kino', href: 'https://kino.net.pl', uses: ['svelte-i18n', 'svelte-notify'] },
		{ id: 'kompi', name: 'Kompi', href: 'https://kompi.pl', uses: [] },
		{ id: 'festivals', name: 'Friendly Festivals', href: 'https://festivals.zaur.app', uses: ['zaur-world', 'svelte-search', 'svelte-i18n', 'svelte-media', 'svelte-notify'] }
	];
	// svelte-ignore state_referenced_locally (prerendered: data never changes)
	const detected = data.uses;
	// svelte-ignore state_referenced_locally
	const total = data.published.length;
	// A product without built.* messages is a smaller one: it renders as a row.
	const work: Work[] = facts.map((f) => {
		const built = list(`work.${f.id}.built`);
		const parts = pairs(`work.${f.id}.parts`);
		const uses = detected[f.id] ?? f.uses;
		// A flagship built on several packages says how many, counted from `uses`.
		const builtOn: [string, string][] =
			built.length && uses.length > 1
				? [[t('work.builtOn.k'), t(uses.length === total ? 'work.builtOn.all' : 'work.builtOn.some', { used: uses.length, total })]]
				: [];
		return {
			...f,
			uses,
			kind: t(`work.${f.id}.kind`),
			what: t(`work.${f.id}.what`),
			built: built.length ? built : undefined,
			proof: [...pairs(`work.${f.id}.proof`), ...builtOn],
			parts: parts.length ? parts : undefined,
			demos: f.demos?.map((d) => ({ ...d, name: t(`demo.${d.id}.name`), note: t(`demo.${d.id}.note`) }))
		};
	});

	// How I work: what both kinds of employer ask about, each with its evidence.
	const how: { h: string; p: string; link?: [string, string] }[] = [
		{ id: 'whole' },
		{ id: 'agent', link: [t('how.agent.link'), 'https://github.com/nomideusz/zaur/blob/main/AGENTS.md'] as [string, string] },
		{ id: 'ai' },
		{ id: 'tested', link: [t('how.tested.link'), 'https://github.com/nomideusz/zaur/tree/main/docs/decisions'] as [string, string] },
		{ id: 'run', link: [t('how.run.link', { count: templateCount }), '#templates'] as [string, string] }
	].map(({ id, link }) => ({ h: t(`how.${id}.h`), p: t(`how.${id}.p`), link }));

	const packages = [
		{
			name: '@nomideusz/zaur-world',
			npm: 'https://www.npmjs.com/package/@nomideusz/zaur-world',
			demo: 'https://dino.zaur.app',
			source: 'https://github.com/nomideusz/zaur-world',
			// Runs the real sky in its node instead of showing screenshots.
			live: 'sky'
		},
		{
			name: '@nomideusz/svelte-calendar',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-calendar',
			demo: 'https://svelte-calendar.xyz',
			source: 'https://github.com/nomideusz/svelte-calendar',
			// Its demo site opens the section as a live window, when it may be framed.
			featured: true
		},
		{
			name: '@nomideusz/svelte-search',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-search',
			demo: 'https://svelte-search-eight.vercel.app',
			source: 'https://github.com/nomideusz/svelte-search'
		},
		{
			name: '@nomideusz/svelte-i18n',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-i18n',
			demo: 'https://svelte-i18n-five.vercel.app',
			source: 'https://github.com/nomideusz/svelte-i18n'
		},
		{
			name: '@nomideusz/svelte-geometrize',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-geometrize',
			demo: 'https://svelte-geometrize.vercel.app',
			source: 'https://github.com/nomideusz/svelte-geometrize'
		},
		{
			name: '@nomideusz/svelte-qr',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-qr',
			demo: 'https://svelte-qr.vercel.app',
			source: 'https://github.com/nomideusz/svelte-qr'
		},
		{
			name: '@nomideusz/svelte-media',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-media',
			demo: 'https://svelte-media-gamma.vercel.app',
			source: 'https://github.com/nomideusz/svelte-media'
		},
		{ name: '@nomideusz/svelte-scheduler', npm: 'https://www.npmjs.com/package/@nomideusz/svelte-scheduler' },
		{ name: '@nomideusz/svelte-payments', npm: 'https://www.npmjs.com/package/@nomideusz/svelte-payments' },
		{ name: '@nomideusz/svelte-notify', npm: 'https://www.npmjs.com/package/@nomideusz/svelte-notify' }
	] as { name: string; npm: string; demo?: string; source?: string; live?: string; featured?: boolean }[];

	const skills = [{ name: 'simple-web-design', source: 'https://github.com/nomideusz/simple-web-design' }].map((s) => ({
		...s,
		desc: t(`skill.${s.name}`)
	}));

	// Work for clients, then small things of my own. The tag says what the site
	// is; spec rows are facts visible on the live site. Strongest first. Words
	// in site.<id>.*.
	type Site = {
		id: string;
		name: string;
		desc: string;
		href: string;
		tag: string;
		basket: 'client' | 'side';
		specs: [string, string][];
		uses?: string[];
		/** Played and drawn live on this page instead of a screenshot. */
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
		{ id: 'kurcz', name: 'kurcz.pl', href: 'https://kurcz.pl', basket: 'side' },
		{ id: 'kruk', name: 'kruk.live', href: 'https://kruk.live', basket: 'side' }
	];
	const websites: Site[] = siteFacts.map((s) => ({
		...s,
		uses: detected[s.id] ?? s.uses,
		tag: t(`site.${s.id}.tag`),
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
		return { ...p, id, desc: t(`pkg.${id}`) };
	});
	const flagships = work.filter((w) => w.built);
	const usedIn = (id: string) => [...work, ...websites].filter((w) => w.uses?.includes(id)).map((w) => w.name);
	const usedInText = (id: string) => t('packages.usedIn', { list: and.format(usedIn(id)) });
	// Group names come from templates.ts in English; the key is their slug.
	const kindName = (kind: string) => t(`templates.kind.${kind.toLowerCase().replace(/[^a-z]+/g, '-')}`);
	// Every smaller project renders as the same ruled row: a capture, then the facts.
	// Live windows are kept for the flagships, so the page stays short.
	type Card = { id: string; name: string; tag: string; href: string; img?: string; live?: boolean; desc: string; specs: [string, string][]; uses?: string[] };
	const others: Card[] = work
		.filter((w) => !w.built)
		.map((w) => ({ id: w.id, name: w.site ?? host(w.href), tag: w.kind, href: w.href, img: shot(w.id), desc: w.what, specs: w.proof ?? [], uses: w.uses }));
	const siteCards = (basket: Site['basket']): Card[] =>
		websites.filter((w) => w.basket === basket).map((w) => ({ ...w, img: platesFor(w.id, w.name)?.frames[0].src }));
	const clients = siteCards('client');
	const side = siteCards('side');
	// A featured package whose demo may be framed gets a case of its own, not a row.
	const shownLive = (p: (typeof pkgs)[number]) => !!(p.featured && p.demo && isLive(p.demo));
	const npmOf = (id: string) => pkgs.find((p) => p.id === id)?.npm;

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
	// Google Search, live from the server: a day's median for each recent week.
	// Only a site with real daily clicks gets the weekly chart; the others show
	// their 28-day totals, and a site under 1,000 impressions shows nothing.
	type Search = { metric: 'clicks' | 'impressions'; perDay: number; weeks: [string, number][]; clicks28: number; impressions28: number; through: string };
	const searched = ['szkolyjogi', 'fixtar', 'kino', 'kompi', 'festivals'];
	let traffic = $state<Record<string, Search> | null>(null);
	let trafficDown = $state(false);
	const charted = (t?: Search) => t?.metric === 'clicks' && t.perDay >= 20;
	const searching = (id: string) => searched.includes(id) && !trafficDown && (!traffic || (traffic[id]?.impressions28 ?? 0) >= 1000);
	const perDay = (id: string) => {
		const s = traffic?.[id];
		if (!s) return t('search.reading');
		return charted(s)
			? t('search.perDay', { count: s.perDay, n: num(s.perDay) })
			: t('search.totals', { clicks: num(s.clicks28), impressions: num(s.impressions28) });
	};
	const compact = new Intl.NumberFormat(intl, { notation: 'compact' });
	const day = (d: string) => new Date(d).toLocaleDateString(intl, { day: 'numeric', month: 'short', timeZone: 'UTC' });
	const version = (id: string) => versions[id] ?? (registryDown ? '—' : '…');

	// The package demonstrating itself: the whole page as its message keys, and
	// back. zaur.app/#keys opens it that way (the demo site links there).
	// The switch stays under the pointer while everything around it changes
	// length; the #keys link, arriving from elsewhere, centres the row instead.
	const flipKeys = async () => {
		const at = () => document.querySelector('#pkg-svelte-i18n .p-keys')?.getBoundingClientRect().top;
		const before = location.hash === '#keys' ? undefined : at();
		keys.on = !keys.on;
		if (location.hash === '#keys') history.replaceState(null, '', location.pathname);
		await tick();
		const after = at();
		if (before === undefined || after === undefined) document.getElementById('pkg-svelte-i18n')?.scrollIntoView({ block: 'center' });
		else scrollBy({ top: after - before, behavior: 'instant' });
	};

	// The other package demonstrating itself: every capture held at its triangles,
	// fewer or more of them, and back to the photos. zaur.app/#shapes opens it so.
	let shapes = $state({ on: false, n: 60 });
	const flipShapes = async () => {
		shapes.on = !shapes.on;
		if (location.hash === '#shapes') {
			history.replaceState(null, '', location.pathname);
			await tick();
			document.querySelector('.sites .geometrize')?.scrollIntoView({ block: 'center' });
		}
	};

	onMount(() => {
		track();
		if (location.hash === '#keys' && !keys.on) flipKeys();
		if (location.hash === '#shapes') flipShapes();
		// A link to a fold (the Templates tab, a shared #websites URL) opens it.
		const unfold = () => {
			const el = location.hash && document.getElementById(location.hash.slice(1));
			if (el instanceof HTMLDetailsElement) {
				el.open = true;
				el.scrollIntoView();
			}
		};
		unfold();
		addEventListener('hashchange', unfold);
		fetch('/api/traffic')
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((t) => (traffic = t))
			.catch(() => (trafficDown = true));
		for (const p of pkgs) {
			fetch(`https://registry.npmjs.org/${p.name}/latest`)
				.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
				.then((j) => (versions[p.id] = j.version))
				.catch(() => (registryDown = true));
		}
		return () => removeEventListener('hashchange', unfold);
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

{#snippet card(c: Card)}
	<li id={c.id}>
		{#if c.live}
			<div class="shot wide"><Radio href={c.href} /></div>
		{:else if c.img}
			<a class="shot" href={c.href} tabindex="-1" aria-hidden="true">
				{@render still(c.img)}
			</a>
		{/if}
		<div class="site">
			<h3>
				{#if searching(c.id)}<span class="dot" class:off={!traffic} aria-hidden="true"></span>{/if}
				<a href={c.href}>{c.name}</a> <span>{c.tag}</span>
			</h3>
			{#if searching(c.id)}<p class="meta">{perDay(c.id)}</p>{/if}
			<p>{c.desc}</p>
			{#if c.uses?.length}
				<ul class="chips">
					{#each c.uses as u (u)}
						<li><a class="chip" href={npmOf(u)}><span>{u}</span><span>{version(u)}</span></a></li>
					{/each}
				</ul>
			{/if}
		</div>
		<dl>
			{#each c.specs as [k, v], i (i)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
		</dl>
	</li>
{/snippet}

{#snippet growth(id: string, s: Search)}
	{@const top = Math.max(1, ...s.weeks.map(([, n]) => n))}
	<figure class="growth">
		<figcaption>{t('growth.caption')}</figcaption>
		<ol>
			{#each s.weeks as [d, n], i (d)}
				{@const month = i === 0 || d.slice(5, 7) !== s.weeks[i - 1][0].slice(5, 7)}
				<li>
					<span class="col"><b>{compact.format(n)}</b><i style:height="{(n / top) * 100}%"></i></span>
					<span class="mo" class:day={!month}>{month ? day(d) : Number(d.slice(8))}</span>
				</li>
			{/each}
		</ol>
		<p>
			{t('growth.summary', { clicks: num(s.clicks28), impressions: num(s.impressions28), date: day(s.through) })}
			{t('growth.source')}
		</p>
	</figure>
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
		<a href="#how">{t('nav.how')}</a>
		<a href="#work">{t('nav.work')}</a>
		<a href="#clients">{t('nav.clients')}</a>
		<a href="#packages">{t('nav.packages')}</a>
		<a href="#templates">{t('nav.templates')}</a>
	</nav>
	<a class="mail" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<!-- The language switch is @nomideusz/svelte-i18n's own component: it writes
	     the locale cookie and moves to the same page under the new prefix. -->
	<span class="lang"><LocaleSwitcher {i18n} {routing} labels={short} label={t('nav.language')} /></span>
</header>

<main id="main">
	<div class="poster" class:pointing={litPkgs?.size} style:--rows={work.length}>
		<nav class="programme" aria-label={t('nav.products')}>
			<ul>
				{#each work as w (w.id)}
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
				<span class="intro-lang"><LocaleSwitcher {i18n} {routing} labels={languages} label={t('nav.language')} /></span>
			</p>
			<div class="kit">
				<a class="kit-all" href="#packages">{t('intro.kitAll', { count: pkgs.length })}</a>
				<h2>{t('intro.kit')}</h2>
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

	<section class="how" id="how" aria-labelledby="how-h">
		<div class="strip"><h2 id="how-h">{t('how.heading')}</h2></div>
		<ul class="how-grid">
			{#each how as x, i (i)}
				<li>
					<h3>{x.h}</h3>
					<p>{x.p}</p>
					{#if x.link}<a href={x.link[1]}>{x.link[0]}</a>{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="work" id="work" aria-labelledby="work-h">
		<div class="strip"><h2 id="work-h">{t('work.heading')} <span class="n">· {work.length}</span></h2></div>
		{#each flagships as w (w.id)}
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
					{#if traffic?.[w.id]}{@render growth(w.id, traffic[w.id])}{/if}
				</div>
				<div class="case-body">
					<h3>
						{#if searching(w.id)}<span class="dot" class:off={!traffic} aria-hidden="true"></span>{/if}
						<a href={w.href}>{title}</a>
						<span class="tag">{w.kind}</span>
					</h3>
					{#if host(w.href) !== title}
						<p class="meta">{host(w.href)}</p>
					{:else if searching(w.id)}
						<p class="meta">{perDay(w.id)}</p>
					{/if}
					<p class="what">{w.what}</p>
					<h4>{t('work.built')}</h4>
					<ul class="built">
						{#each w.built ?? [] as b, i (i)}<li>{b}</li>{/each}
					</ul>
					<dl class="facts">
						{#each w.proof ?? [] as [k, v], i (i)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
					</dl>
					<ul class="chips">
						{#each w.uses as u (u)}
							<li><a class="chip" href={npmOf(u)}><span>{u}</span><span>{version(u)}</span></a></li>
						{/each}
					</ul>
					<p class="go">
						<a href={w.href}>{t('work.open', { host: host(w.href) })}</a>
						{#if w.source}<a href={w.source}>{t('work.source')}</a>{/if}
					</p>
				</div>
			</article>
		{/each}
		<ul class="sites">
			{#each others as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="websites" id="clients" aria-labelledby="clients-h">
		<div class="strip"><h2 id="clients-h">{t('clients.heading')} <span class="n">· {clients.length}</span></h2></div>
		<p class="lede">{t('clients.lede')}</p>
		<ul class="sites">
			{#each clients as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>


	<section class="packages" id="packages" aria-labelledby="packages-h">
		<div class="strip"><h2 id="packages-h">{t('packages.heading')} <span class="n">· {pkgs.length}</span></h2></div>
		<p class="lede">{t('packages.lede')}</p>
		{#each pkgs.filter(shownLive) as p (p.id)}
			<article class="case" id="pkg-{p.id}">
				<div class="media">
					<Live href={p.demo!} name={p.name} shot={shot(p.id)} phone={phoneFor(p.id)} />
				</div>
				<div class="case-body">
					<h3>
						<a href={p.demo}>{host(p.demo!)}</a>
						<span class="tag">{t('packages.tag')}</span>
					</h3>
					<p class="meta">{p.name} {version(p.id)}</p>
					<p class="what">{p.desc}</p>
					<code class="p-install">npm i {p.name}</code>
					{#if usedIn(p.id).length}<p class="p-used">{usedInText(p.id)}</p>{/if}
					<p class="go">
						<a href={p.npm}>{t('packages.npm')}</a>
						{#if p.source}<a href={p.source}>{t('work.source')}</a>{/if}
					</p>
				</div>
			</article>
		{/each}
		<ul class="ptable">
			{#each pkgs.filter((p) => !shownLive(p)) as p (p.id)}
				<li id="pkg-{p.id}">
					<a class="p-name" href={p.npm}>{p.id}</a>
					<span class="p-ver">{version(p.id)}</span>
					<div>
						<p>{p.desc}</p>
						<code class="p-install">npm i {p.name}</code>
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
						{/if}
					</div>
					<p class="p-used">{usedIn(p.id).length ? usedInText(p.id) : ''}</p>
					<p class="p-links">
						{#if p.demo}<a href={p.demo}>{t('packages.demo')}</a>{/if}
						{#if p.source}<a href={p.source}>{t('packages.source')}</a>{/if}
					</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="folds" aria-label={t('folds.label')}>
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
				{#each data.templates as g (g.kind)}
					<h3>{kindName(g.kind)}</h3>
					<ul class="table">
						{#each g.items as tp (tp.slug)}
							<li>
								<b class="t-name">{tp.name}</b>
								<p>{tp.desc}</p>
								<span class="t-src"><a href={tp.deploy}>{t('templates.deploy')}</a><a href={tp.source}>{t('templates.source')}</a></span>
							</li>
						{/each}
					</ul>
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
							<p>{s.desc}</p>
							<a class="t-src" href={s.source}>{t('skills.source')}</a>
						</li>
					{/each}
				</ul>
			</div>
		</details>
	</section>

</main>

<footer class="foot">
	<a class="write" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<div class="small">
		<p>{t('foot.copyright')}</p>
		<a href={github}>GitHub</a>
		<a href={linkedin}>LinkedIn</a>
		<span class="foot-lang"><LocaleSwitcher {i18n} {routing} labels={languages} label={t('nav.language')} /></span>
	</div>
</footer>

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
			minmax(max-content, 28vw) minmax(max-content, 10.4vw) repeat(3, minmax(max-content, 9.4vw))
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
	.foot-lang,
	.intro-lang {
		--asini-font-sans: inherit;
		--asini-surface: var(--paper);
		--asini-text: var(--ink);
		--asini-border: var(--ink);
		--asini-border-strong: var(--ink);
		--asini-accent: var(--ink);
		--asini-radius-sm: 0;
	}
	.foot-lang :global(select),
	.intro-lang :global(select) {
		font-size: 0.9375rem;
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
	   whatever its shape (up to 1.5 times the comp's 7.5vw rows, past which a tall
	   window would only get empty bands). --u is 1vw until a row is shorter than
	   the comp's; then the names and the intro shrink with it to fit the screen. */
	.poster {
		--row: clamp(5vw, (100svh - 3.66vw - var(--rule-heavy)) / var(--rows), 11.25vw);
		--u: min(1vw, var(--row) / 7.5);
		display: grid;
		grid-template-columns: 63.42vw 1fr;
		border-bottom: var(--rule-heavy) solid var(--ink);
	}

	/* The programme: product names as the poster. */
	.programme {
		background: var(--orange);
		border-right: var(--rule-heavy) solid var(--ink);
	}
	.programme li + li .row {
		border-top: var(--rule) solid var(--orange-rule);
	}
	.row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: var(--row);
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
	.row:focus-visible {
		outline: none;
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
		font-size: max(15px, calc(1.45 * var(--u)));
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
	/* On a phone the packages are one link to their section; the sheet lists them. */
	.kit-all,
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
	.tag {
		padding: 0.05rem 0.45rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font-weight: 500;
		font-size: 0.8125rem;
		letter-spacing: 0;
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

	.growth {
		margin: 0;
		padding: 1rem 1.2rem 1.1rem;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.media .growth {
		border-width: var(--rule) 0 0;
	}
	.growth figcaption {
		font-weight: 700;
	}
	.growth ol {
		display: flex;
		gap: 0.5rem;
		height: 10rem;
		margin-top: 0.75rem;
	}
	.growth li {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-rows: 1fr auto;
	}
	.growth .col {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding-top: 1.25rem;
		border-bottom: var(--rule) solid var(--ink);
	}
	.growth b {
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	.growth i {
		display: block;
		min-height: 2px;
		background: var(--ink);
	}
	.growth li:last-child i {
		background: var(--orange);
	}
	.growth .mo {
		padding-top: 0.25rem;
		white-space: nowrap;
		font-size: 0.8125rem;
		color: var(--quiet);
	}
	.growth p {
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}

	/* Work: three case studies, then the rest in a ruled row. */
	.work,
	.websites,
	.how {
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
		scroll-margin-top: 4vw;
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
		margin: 1.25rem 0 0.4rem;
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
	.ptable li {
		display: grid;
		grid-template-columns: minmax(13rem, 21vw) 4.5rem minmax(0, 1fr) minmax(9rem, 17vw) 7.5rem;
		gap: 0.5rem 2rem;
		align-items: baseline;
		padding: 0.85rem 1.39vw;
		scroll-margin-top: 4vw;
	}
	.ptable li + li {
		border-top: var(--rule) solid var(--ink);
	}
	.ptable li:target {
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
	.p-install {
		display: inline-block;
		margin-top: 0.4rem;
		padding: 0.1rem 0.45rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font: inherit;
		font-size: 0.875rem;
		user-select: all;
		overflow-wrap: anywhere;
	}
	.p-used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.case-body .p-used {
		margin-top: 0.6rem;
	}
	.p-try {
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
	.p-links {
		display: flex;
		gap: 1rem;
		justify-self: end;
	}

	/* How I work: five ruled cells. */
	.how-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
	.how-grid li {
		padding: 1.2rem 1.39vw 1.5rem;
	}
	.how-grid li + li {
		border-left: var(--rule) solid var(--ink);
	}
	.how-grid h3 {
		font-size: max(1.25rem, 1.6vw);
	}
	.how-grid p {
		max-width: 40ch;
		margin: 0.6rem 0 0.8rem;
	}

	/* Folds: closed catalogs, opened in place. */
	.folds details {
		border-bottom: var(--rule) solid var(--ink);
		interpolate-size: allow-keywords;
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
	.shot :global(.radio) {
		border-bottom: 0;
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
	.sites h3 a + span {
		font-weight: 500;
		font-size: 0.8125rem;
		padding: 0.05rem 0.45rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		letter-spacing: 0;
	}
	.site > p:not(.meta) {
		max-width: 52ch;
		margin-top: 0.5rem;
	}
	.sites dl {
		font-size: 0.9375rem;
	}
	.sites dl div {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.sites dl div:first-child {
		border-top: 0;
	}
	.sites dt {
		color: var(--quiet);
	}
	.site .chips {
		margin-top: 0.9rem;
	}

	/* The page closes on one more programme row: the address, at poster scale. */
	.foot {
		background: var(--orange);
	}
	.write {
		display: block;
		padding: 2.4vw 1.39vw 0;
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
			grid-template-columns: repeat(5, minmax(0, 1fr));
			height: auto;
		}
		/* Five tabs fill a phone's bar; the language moves to the intro's links. */
		.lang {
			display: none;
		}
		.intro-lang {
			display: inline;
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
			/* "Arbeitsweise" is wider than a phone's tab: let <html lang> hyphenate it. */
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
			--u: 1vw;
			grid-template-columns: 1fr;
		}
		.programme {
			border-right: 0;
			border-bottom: var(--rule-heavy) solid var(--ink);
		}
		.row {
			height: 13vw;
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
			font-size: 2.75rem;
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
		.kit h2,
		.kit .chips {
			display: none;
		}
		.kit-all,
		.links .phone {
			display: inline;
		}
		.kit-all {
			font-weight: 700;
		}
		.chips {
			gap: 0.5rem;
		}
		.chip {
			height: 2.25rem;
			padding: 0 0.6rem;
			font-size: 0.875rem;
		}
		.case,
		.how-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.case,
		.ptable li {
			scroll-margin-top: 0;
		}
		/* Twelve weeks on a phone: the bars stay, the latest number and the
		   month starts label them. */
		.growth ol {
			gap: 0.3rem;
		}
		.growth li:not(:last-child) b,
		.growth .mo.day,
		.growth li:first-child:has(+ li .mo:not(.day)) .mo {
			visibility: hidden;
		}
		.growth li:last-child .mo {
			text-align: right;
		}
		.media {
			border-right: 0;
			border-bottom: var(--rule) solid var(--ink);
		}
		.case-body,
		.how-grid li {
			padding: 1.25rem 1rem 1.5rem;
		}
		.how-grid li + li {
			border-left: 0;
			border-top: var(--rule) solid var(--ink);
		}
		.parts li {
			padding: 0.5rem 0.75rem;
		}
		.packages .lede,
		.websites .lede {
			padding: 1rem;
		}
		.ptable li {
			grid-template-columns: 1fr auto;
			gap: 0.25rem 1rem;
			padding: 1rem;
		}
		.ptable li > p,
		.ptable li > div {
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
		.shot.wide {
			float: none;
			width: auto;
			margin: 0 0 0.9rem;
		}
		.sites h3 {
			font-size: 1.375rem;
		}
		.site .chips,
		.sites dl {
			clear: both;
		}
		.sites dl {
			margin-top: 0.9rem;
		}
		.t-src {
			justify-self: start;
		}
		.write {
			padding: 1.5rem 1rem 0;
		}
		.foot .small {
			padding: 1.25rem 1rem 2rem;
		}
	}

	/* Phones: a long name ("Friendly Festivals") would meet its kind, so the kind
	   steps up to the row's top right and the name takes the full width under it,
	   still sitting on the rule. */
	@media (max-width: 600px) {
		.row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: 1fr auto;
			height: max(3.75rem, 16vw);
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
	   text and facts run beside it, and How I work pairs its cells. */
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
		.sites dl {
			grid-column: 2;
		}
		/* The radio stays a full-width band, its words and facts side by side under it. */
		.sites > li:has(> .shot.wide) {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.shot.wide {
			grid-row: auto;
			grid-column: 1 / -1;
			margin-bottom: 0.9rem;
		}
	}

	/* How I work pairs its cells from tablet up to small laptops: five columns
	   under about 1280 are too narrow for German compounds such as
	   "Architekturentscheidungen". */
	@media (min-width: 601px) and (max-width: 1279px) {
		.how-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.how-grid li + li {
			border-top: 0;
			border-left: 0;
		}
		.how-grid li:nth-child(n + 3) {
			border-top: var(--rule) solid var(--ink);
		}
		.how-grid li:nth-child(even) {
			border-left: var(--rule) solid var(--ink);
		}
		.how-grid li:last-child:nth-child(odd) {
			grid-column: 1 / -1;
		}
	}

	/* A finger needs 44px: the links that stand alone as actions grow to it on
	   touch screens. Links inside running text stay as they are. */
	@media (pointer: coarse) {
		.intro .links {
			align-items: center;
		}
		.intro .links a,
		.intro .kit-all,
		.go a,
		.p-links a,
		.t-src a,
		a.t-src,
		.how-grid li > a,
		.foot .small a {
			display: inline-flex;
			align-items: center;
			min-height: 2.75rem;
		}
		.intro-lang :global(select),
		.foot-lang :global(select) {
			min-height: 2.75rem;
		}
	}
</style>
