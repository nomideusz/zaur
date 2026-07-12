<script lang="ts">
	import Sprite from '$lib/Sprite.svelte';

	const title = 'Zaur — apps, packages, templates';
	const description =
		'Everything we build in one place: Zaur apps, open-source npm packages, one-click Railway templates, and live websites.';

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
		},
		{
			id: 'dino',
			name: 'Dino',
			desc: 'A quiet page of important news — no feed, no ads, just Zaur and a few stories a day.',
			href: 'https://dino.zaur.app'
		},
		{
			id: 'music',
			name: 'Music',
			desc: 'A private, self-hosted music library and radio powered by Navidrome.',
			href: 'https://music.zaur.app'
		}
	];

	const packages = [
		{
			name: '@nomideusz/zaur-world',
			desc: 'A living ambient sky — real sun times, weather, seasons, terrain, and satellites. Zero dependencies.',
			npm: 'https://www.npmjs.com/package/@nomideusz/zaur-world',
			demo: 'https://dino.zaur.app',
			source: 'https://github.com/nomideusz/zaur-world'
		},
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
			name: 'Stalwart Webmail',
			desc: 'Offline-capable, white-label JMAP webmail for self-hosted Stalwart servers.',
			deploy: 'https://railway.com/deploy/stalwart-webmail',
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/webmail'
		},
		{
			name: 'Twenty CRM',
			desc: 'Production-ready open-source CRM with a worker, Redis, Postgres, and S3 file storage.',
			deploy: 'https://railway.com/deploy/twenty-crm-production',
			source: 'https://github.com/nomideusz/twenty-railway'
		},
		{
			name: 'Dify',
			desc: 'Ten-service AI workflow, agent, and RAG platform with pgvector and isolated code execution.',
			deploy: 'https://railway.com/deploy/dify-production',
			source: 'https://github.com/nomideusz/dify-railway'
		},
		{
			name: 'Evolution API + n8n',
			desc: 'WhatsApp automation stack with workflow orchestration, Postgres, and Redis.',
			deploy: 'https://railway.com/deploy/evolution-n8n',
			source: 'https://github.com/nomideusz/evolution-n8n-railway'
		},
		{
			name: 'n8n Queue Mode',
			desc: 'Scalable n8n with dedicated workers, webhook processing, Redis, and pgvector.',
			deploy: 'https://railway.com/deploy/n8n-queue',
			source: 'https://github.com/nomideusz/n8n-queue-railway'
		},
		{
			name: 'Chatwoot',
			desc: 'Omnichannel customer support with Sidekiq, pgvector, Redis, and S3 attachments.',
			deploy: 'https://railway.com/deploy/chatwoot-3',
			source: 'https://github.com/nomideusz/chatwoot-railway'
		},
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
			id: 'thebest',
			name: 'thebest.travel',
			desc: 'Tour marketplace with live availability and online booking.',
			href: 'https://thebest.travel'
		},
		{
			id: 'szkolyjogi',
			name: 'szkolyjogi.pl',
			desc: 'Directory of yoga schools and studios across Poland.',
			href: 'https://szkolyjogi.pl'
		},
		{
			id: 'kompi',
			name: 'kompi.pl',
			desc: 'Online store for microcomputers, Raspberry Pi, Arduino, and electronics.',
			href: 'https://kompi.pl'
		},
		{
			id: 'fixtar',
			name: 'fixtar.pl',
			desc: 'E-commerce store for power tools, built with SvelteKit.',
			href: 'https://fixtar.pl'
		},
		{
			id: 'recycling',
			name: 'recycling.kompi.pl',
			desc: 'Map of e-waste, battery, and fluorescent-lamp collection points across Poland.',
			href: 'https://recycling.kompi.pl'
		},
		{
			id: 'pikastro',
			name: 'pikastro.eu',
			desc: 'Colourful interior design studio combining architecture, graphics, and AI prototyping.',
			href: 'https://pikastro.eu'
		},
		{
			id: 'kurcz',
			name: 'kurcz.pl',
			desc: 'Everything about muscle cramps — causes, first aid, prevention (Polish).',
			href: 'https://kurcz.pl'
		},
		{
			id: 'tutitutu',
			name: 'tutitutu.pl',
			desc: 'Image-first portfolio for an interior architecture studio founded in 1997.',
			href: 'https://tutitutu.pl'
		},
		{
			id: 'kruk',
			name: 'kruk.live',
			desc: 'Real-time collaborative drawing, kanban, property, pixel-art, and photo apps.',
			href: 'https://kruk.live'
		},
		{
			id: 'wibroakustyka',
			name: 'wibroakustyka.ai',
			desc: 'Product site for the Graal vibroacoustic wellness chair.',
			href: 'https://wibroakustyka.ai'
		},
		{
			id: 'intertech',
			name: 'intertechpoland.pl',
			desc: 'Scientific equipment catalogue and industry news for Picarro and UGT solutions.',
			href: 'https://intertechpoland.pl'
		},
		{
			id: 'radiobartek',
			name: 'radiobartek.com',
			desc: 'Internet radio station, self-hosted on AzuraCast.',
			href: 'https://radiobartek.com'
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

<section class="zw-hero zw-container" aria-labelledby="hero-title">
	<div class="zw-hero__copy">
		<p class="zw-eyebrow">Independent projects</p>
		<h1 class="zw-hero__title" id="hero-title">Things<br />we make.</h1>
		<p class="zw-hero__lede">
			Apps, open-source packages, deployment templates, and websites. Collected in one place.
		</p>
		<div class="zw-hero__actions">
			<a class="zw-button" href="#featured">Browse the work</a>
			<a class="zw-text-link" href="https://github.com/nomideusz">Follow the source <span aria-hidden="true">↗</span></a>
		</div>
	</div>

	<aside class="zw-field-note" aria-label="About the live sky">
		<div class="zw-field-note__top">
			<span class="zw-live-dot" aria-hidden="true"></span>
			<span>Live from your sky</span>
			<span class="zw-field-note__mark">
				<Sprite frame="happy" size={64} label="Zaur" blinks />
			</span>
		</div>
		<p class="zw-field-note__title">This background knows when your sun sets.</p>
		<p class="zw-field-note__body">
			It follows local weather, seasons, moon phases, meteor showers, and the occasional ISS pass.
			We turned it into a zero-dependency package.
		</p>
		<div class="zw-field-note__links">
			<a href="https://www.npmjs.com/package/@nomideusz/zaur-world">Get zaur-world</a>
			<a href="https://github.com/nomideusz/zaur-world">Read the source</a>
		</div>
	</aside>
</section>

<section class="zw-container zw-featured" id="featured" aria-labelledby="featured-heading">
	<div class="zw-featured__intro">
		<p class="zw-eyebrow">Selected work</p>
		<h2 id="featured-heading">A few highlights.</h2>
	</div>
	<div class="zw-featured__grid">
		<a class="zw-feature zw-feature--mail" href="https://webmail.zaur.app">
			<span class="zw-feature__kind">Product</span>
			<span class="zw-feature__title">Private email.</span>
			<span class="zw-feature__desc">A fast JMAP inbox with calendar, contacts, and offline support.</span>
			<span class="zw-feature__action">Open Mail <span aria-hidden="true">→</span></span>
		</a>
		<a class="zw-feature zw-feature--world" href="https://www.npmjs.com/package/@nomideusz/zaur-world">
			<span class="zw-feature__kind">Open source</span>
			<span class="zw-feature__title">A living sky.</span>
			<span class="zw-feature__desc">The living canvas behind this page, packaged for any website.</span>
			<span class="zw-feature__action">Explore zaur-world <span aria-hidden="true">→</span></span>
		</a>
		<a class="zw-feature" href="https://thebest.travel">
			<span class="zw-feature__kind">Selected work</span>
			<span class="zw-feature__title">Tours and experiences.</span>
			<span class="zw-feature__desc">Tours, guides, live availability, and payments in one SvelteKit product.</span>
			<span class="zw-feature__action">Visit thebest.travel <span aria-hidden="true">↗</span></span>
		</a>
		<a class="zw-feature" href="#templates">
			<span class="zw-feature__kind">Infrastructure</span>
			<span class="zw-feature__title">One-click infrastructure.</span>
			<span class="zw-feature__desc">Production-minded Railway templates for Dify, n8n, Chatwoot, and more.</span>
			<span class="zw-feature__action">Browse templates <span aria-hidden="true">↓</span></span>
		</a>
	</div>
</section>

<section class="zw-container zw-section" id="apps" aria-labelledby="apps-heading">
	<div class="zw-section__intro">
		<p class="zw-eyebrow">Products</p>
		<h2 class="zw-section__title" id="apps-heading">Zaur apps.</h2>
		<p class="zw-section__lede">A few services we build and run.</p>
	</div>
	<div class="zw-products zw-products--apps">
		{#each products as p (p.id)}
			<a class="zw-card" id={p.id} href={p.href}>
				<span class="zw-card__kicker">Zaur app</span>
				<span class="zw-card__name">{p.name}</span>
				<span class="zw-card__desc">{p.desc}</span>
				<span class="zw-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" id="packages" aria-labelledby="packages-heading">
	<div class="zw-section__intro">
		<p class="zw-eyebrow">Open source</p>
		<h2 class="zw-section__title" id="packages-heading">npm packages.</h2>
		<p class="zw-section__lede">Libraries published under the @nomideusz scope.</p>
	</div>
	<div class="zw-products">
		{#each packages as p (p.name)}
			<div class="zw-card zw-card--static">
				<span class="zw-card__kicker">npm package</span>
				<span class="zw-card__name zw-card__name--mono">{p.name}</span>
				<span class="zw-card__desc">{p.desc}</span>
				<span class="zw-card__links">
					<a href={p.npm}>View on npm</a>
					<a href={p.demo}>Try the demo</a>
					<a href={p.source}>Source</a>
				</span>
			</div>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" id="templates" aria-labelledby="templates-heading">
	<div class="zw-section__intro">
		<p class="zw-eyebrow">Infrastructure</p>
		<h2 class="zw-section__title" id="templates-heading">Railway templates.</h2>
		<p class="zw-section__lede">One-click deployments for open-source software.</p>
		<a class="zw-referral" href="https://railway.com?referralCode=sLjDXb">
			<span>New to Railway?</span>
			<strong>Get $20 credit</strong>
			<span aria-hidden="true">↗</span>
		</a>
		<p class="zw-referral__note">Referral link. We may earn a commission if you sign up.</p>
	</div>
	<div class="zw-products">
		{#each templates as t (t.name)}
			<div class="zw-card zw-card--static">
				<span class="zw-card__kicker">One-click deploy</span>
				<span class="zw-card__name">{t.name}</span>
				<span class="zw-card__desc">{t.desc}</span>
				<span class="zw-card__links">
					<a href={t.deploy}>Deploy on Railway</a>
					<a href={t.source}>Source</a>
				</span>
			</div>
		{/each}
	</div>
</section>

<section class="zw-container zw-section" id="websites" aria-labelledby="websites-heading">
	<div class="zw-section__intro">
		<p class="zw-eyebrow">Websites</p>
		<h2 class="zw-section__title" id="websites-heading">Selected websites.</h2>
		<p class="zw-section__lede">A mix of products, client work, and experiments.</p>
	</div>
	<div class="zw-products">
		{#each websites as w (w.id)}
			<a class="zw-card" href={w.href}>
				<span class="zw-card__kicker">Live website</span>
				<span class="zw-card__name">{w.name}</span>
				<span class="zw-card__desc">{w.desc}</span>
				<span class="zw-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
</section>

<aside class="zw-closing zw-container">
	<div>
		<p class="zw-eyebrow">Still curious?</p>
		<p class="zw-closing__title">More projects and source code live on GitHub.</p>
	</div>
	<a class="zw-button zw-button--quiet" href="https://github.com/nomideusz">Browse everything on GitHub <span aria-hidden="true">↗</span></a>
</aside>
