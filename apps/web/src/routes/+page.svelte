<script lang="ts">
	import Sprite from '$lib/Sprite.svelte';

	const title = 'Zaur — apps, packages, templates';
	const description =
		'Everything we build in one place: Zaur apps, open-source Svelte 5 packages on npm, one-click Railway templates, and live websites.';

	const products = [
		{
			id: 'mail',
			name: 'Mail',
			desc: 'A clean inbox and your own @zaur.app address.',
			href: 'https://webmail.zaur.app'
		},
		{
			id: 'register',
			name: 'Register',
			desc: 'Create your own @zaur.app email account.',
			href: 'https://register.zaur.app'
		}
	];

	const packages = [
		{
			name: '@nomideusz/svelte-calendar',
			desc: 'A themeable Svelte 5 calendar with Day and Week views — Planner and Agenda.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-calendar',
			demo: 'https://svelte-calendar.xyz',
			source: 'https://github.com/nomideusz/svelte-calendar'
		},
		{
			name: '@nomideusz/svelte-search',
			desc: 'Full-text search for Svelte 5 — FTS5, fuzzy matching, geo proximity, autocomplete, Polish locale.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-search',
			demo: 'https://svelte-search-eight.vercel.app',
			source: 'https://github.com/nomideusz/svelte-search'
		},
		{
			name: '@nomideusz/svelte-i18n',
			desc: 'Lightweight i18n for Svelte 5 — runes-based locale state, flat JSON messages, URL-locale routing.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-i18n',
			demo: 'https://svelte-i18n-five.vercel.app',
			source: 'https://github.com/nomideusz/svelte-i18n'
		},
		{
			name: '@nomideusz/svelte-geometrize',
			desc: 'Geometric image placeholders — triangles resolve into the real photo as it loads.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-geometrize',
			demo: 'https://svelte-geometrize.vercel.app',
			source: 'https://github.com/nomideusz/svelte-geometrize'
		},
		{
			name: '@nomideusz/svelte-qr',
			desc: 'Zero-dependency QR codes for Svelte 5 — pure TypeScript encoder, SVG output.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-qr',
			demo: 'https://svelte-qr.vercel.app',
			source: 'https://github.com/nomideusz/svelte-qr'
		}
	];

	const templates = [
		{
			name: 'AzuraCast',
			desc: 'Self-hosted web radio suite — Icecast streaming, playlist automation, live WebDJ.',
			deploy: 'https://railway.com/new/template/azuracast',
			source: 'https://github.com/nomideusz/azuracast-railway'
		},
		{
			name: 'MediaCMS',
			desc: 'Open-source video platform with HLS adaptive streaming and automatic transcoding.',
			deploy: 'https://railway.com/new/template/mediacms',
			source: 'https://github.com/nomideusz/mediacms-railway'
		},
		{
			name: 'Appwrite',
			desc: 'Open-source backend-as-a-service — auth, databases, storage, realtime.',
			deploy: 'https://railway.com/new/template/appwrite-1',
			source: 'https://github.com/nomideusz/appwrite-railway'
		},
		{
			name: 'Invidious',
			desc: 'Privacy-friendly YouTube frontend with Companion and Postgres included.',
			deploy: 'https://railway.com/deploy/invidious',
			source: 'https://github.com/nomideusz/invidious-railway'
		}
	];

	const websites = [
		{
			id: 'szkolyjogi',
			name: 'szkolyjogi.pl',
			desc: 'Directory of yoga schools and studios across Poland.',
			href: 'https://szkolyjogi.pl'
		},
		{
			id: 'kurcz',
			name: 'kurcz.pl',
			desc: 'Everything about muscle cramps — causes, first aid, prevention (Polish).',
			href: 'https://kurcz.pl'
		},
		{
			id: 'radiobartek',
			name: 'radiobartek.com',
			desc: 'Internet radio station, self-hosted on AzuraCast.',
			href: 'https://radiobartek.com'
		},
		{
			id: 'fixtar',
			name: 'fixtar.pl',
			desc: 'FixTar — e-commerce store for power tools, built with SvelteKit.',
			href: 'https://fixtar.pl'
		}
	];
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://zaur.app/" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<link rel="canonical" href="https://zaur.app/" />
</svelte:head>

<section class="zw-hero zw-container">
	<div class="zw-hero__mark">
		<Sprite frame="happy" size={96} label="Zaur" />
	</div>
	<h1 class="zw-hero__title">One page to rule them all.</h1>
	<p class="zw-hero__lede">
		Apps, open-source Svelte packages, Railway templates, and websites — everything we ship, in
		one place.
	</p>
</section>

<section class="zw-container zw-section" aria-labelledby="apps-heading">
	<h2 class="zw-section__title" id="apps-heading">Apps</h2>
	<div class="zw-products">
		{#each products as p (p.id)}
			<a class="zw-card" id={p.id} href={p.href}>
				<span class="zw-card__name">{p.name}</span>
				<span class="zw-card__desc">{p.desc}</span>
				<span class="zw-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" aria-labelledby="packages-heading">
	<h2 class="zw-section__title" id="packages-heading">npm packages</h2>
	<p class="zw-section__lede">Svelte 5 libraries, published under the @nomideusz scope.</p>
	<div class="zw-products">
		{#each packages as p (p.name)}
			<div class="zw-card zw-card--static">
				<span class="zw-card__name zw-card__name--mono">{p.name}</span>
				<span class="zw-card__desc">{p.desc}</span>
				<span class="zw-card__links">
					<a href={p.npm}>npm</a>
					<a href={p.demo}>demo</a>
					<a href={p.source}>source</a>
				</span>
			</div>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" aria-labelledby="templates-heading">
	<h2 class="zw-section__title" id="templates-heading">Railway templates</h2>
	<p class="zw-section__lede">One-click deployments we maintain on Railway.</p>
	<div class="zw-products">
		{#each templates as t (t.name)}
			<div class="zw-card zw-card--static">
				<span class="zw-card__name">{t.name}</span>
				<span class="zw-card__desc">{t.desc}</span>
				<span class="zw-card__links">
					<a href={t.deploy}>deploy</a>
					<a href={t.source}>source</a>
				</span>
			</div>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" aria-labelledby="websites-heading">
	<h2 class="zw-section__title" id="websites-heading">Websites</h2>
	<div class="zw-products">
		{#each websites as w (w.id)}
			<a class="zw-card" href={w.href}>
				<span class="zw-card__name">{w.name}</span>
				<span class="zw-card__desc">{w.desc}</span>
				<span class="zw-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
</section>

<p class="zw-aside zw-container">
	All source code on <a class="z-link" href="https://github.com/nomideusz">github.com/nomideusz</a>.
	Looking for tours and travel? Zaur's old site moved to
	<a class="z-link" href="https://thebest.travel">thebest.travel</a>.
</p>
