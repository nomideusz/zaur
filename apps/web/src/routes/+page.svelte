<script lang="ts">
	import { onMount } from 'svelte';
	import { kinds, kindOf } from '#lib/template-kinds';
	import { platesFor, phoneFor } from '#lib/plates';
	import Live from '#lib/Live.svelte';
	import Radio from '#lib/Radio.svelte';

	let { data } = $props();

	const title = 'Bartosz Dymet — frontend engineer, Svelte and TypeScript';
	const description =
		'I design, build and run complete products: the Zaur mail suite, Szkoły Jogi, thebest.travel and more, with the open-source Svelte packages they share.';
	const site = 'https://zaur.app/';
	const github = 'https://github.com/nomideusz';
	const ld = {
		'@context': 'https://schema.org',
		'@graph': [
			{ '@type': 'ProfilePage', '@id': `${site}#page`, url: site, name: title, description, mainEntity: { '@id': `${site}#me` } },
			{
				'@type': 'Person',
				'@id': `${site}#me`,
				name: 'Bartosz Dymet',
				jobTitle: 'Frontend engineer',
				url: site,
				email: 'bartek@zaur.app',
				address: { '@type': 'PostalAddress', addressLocality: 'Kraków', addressCountry: 'PL' },
				knowsAbout: ['Svelte', 'SvelteKit', 'TypeScript', 'Web accessibility', 'Web performance'],
				sameAs: [github, 'https://www.npmjs.com/~nomideusz']
			}
		]
	};

	// The work, in the order an employer should read it. Flagships carry a full
	// case study; every claim is a fact from the product's own repo.
	type Work = {
		id: string;
		name: string;
		kind: string;
		href: string;
		what: string;
		uses: string[];
		source?: string;
		built?: string[];
		proof?: [string, string][];
		parts?: [string, string][];
		growth?: { title: string; months: [string, number][]; note: string };
	};
	const work: Work[] = [
		{
			id: 'zaur',
			name: 'Zaur',
			kind: 'Mail suite',
			href: 'https://webmail.zaur.app',
			source: 'https://github.com/nomideusz/zaur',
			what: 'A private communications suite on one account: mail, calendar, video calls and music, on servers I set up and run.',
			parts: [
				['Mail', 'webmail.zaur.app'],
				['Sign-up', 'register.zaur.app'],
				['Music', 'music.zaur.app'],
				['Meet', 'Video calls inside Mail']
			],
			built: [
				'A mail client over JMAP on SvelteKit 3 and remote functions, started on the pre-release: installable and offline-capable, with push notifications, calendar, contacts, files, rich compose and several accounts.',
				'Its own sign-in. Mail is the OpenID Connect provider for Music, Photos and Bartube, and a sign-up portal creates real mailboxes through the Stalwart admin API.',
				'The servers behind it: Stalwart mail on a VPS run through Dokploy, restic backups to a second machine, errors and traces in a self-hosted Traceway.'
			],
			proof: [
				['Tests', '50 test files across the client and its shared packages; Playwright for sign-up'],
				['Decisions', '5 architecture decision records'],
				['Delivery', 'GitHub Actions deploys; agent conventions in AGENTS.md'],
				['AI', 'Mail sorted by an LLM into a fixed set of labels, with a confidence floor, a timeout and a headers-only privacy mode'],
				['Code', 'Public on GitHub']
			],
			uses: ['svelte-calendar']
		},
		{
			id: 'szkolyjogi',
			name: 'Szkoły Jogi',
			kind: 'Directory and booking',
			href: 'https://szkolyjogi.pl',
			what: 'The directory of yoga and pilates schools in Poland: class schedules, pass prices, reviews and online sign-up.',
			built: [
				'The public directory in Polish, English and Ukrainian, with schedules, prices, reviews and booking.',
				'A separate panel app for schools: passes, recurring classes, refund rules, VAT split and staff roles.',
				'A Python scraper that reads school websites, price lists and timetable images with LLMs. Answers are forced into schemas, the model returns null rather than guessing, monthly prices are computed in code, and a read that would shrink a stored schedule below 40% keeps the old classes.',
				'A database trigger stops the scraper overwriting anything a school edited itself. CI builds both apps as images and deploys them.'
			],
			proof: [
				['Tests', '83 test files (Vitest)'],
				['Models', 'Benchmarked before use; one was dropped for inventing 15 classes on an empty page'],
				['Speed', 'Home-page layout shift cut from 0.11 to 0.00 with metric-matched font fallbacks'],
				['Stack', 'SvelteKit, Svelte 5, Drizzle, Postgres, Better Auth'],
				['Built on', 'All 10 of my packages']
			],
			growth: {
				title: 'Clicks from Google search, per month',
				months: [['Apr', 8], ['May', 5], ['Jun', 6], ['Jul', 336], ['Aug', 953], ['Sep', 2692]],
				note: 'Average position went from 21.6 in June to 9.5 in September, with 244,000 impressions in the last 28 days. Source: Google Search Console, October 2026.'
			},
			uses: ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify']
		},
		{
			id: 'thebest',
			name: 'thebest.travel',
			kind: 'Tour booking',
			href: 'https://thebest.travel',
			what: 'A tour marketplace for Cracow: local guides, live availability and online booking.',
			built: [
				'Tour pages with live availability, time slots, pricing and cancellation policies, all from svelte-scheduler.',
				'Checkout on Stripe Connect, still in test mode while the business side is set up.',
				'English and Polish, deployed on Railway.'
			],
			proof: [
				['Stack', 'SvelteKit, Svelte 5, Drizzle, Postgres'],
				['Payments', 'A repeated Stripe webhook is ignored once the booking is paid'],
				['Built on', '8 of my 10 packages']
			],
			uses: ['svelte-calendar', 'svelte-scheduler', 'svelte-search', 'svelte-i18n', 'svelte-qr', 'svelte-media', 'svelte-notify', 'svelte-payments']
		},
		{
			id: 'kino',
			name: 'Kino',
			kind: 'Cinema listings',
			href: 'https://kino.net.pl',
			what: 'What plays in Polish cinemas today, hour by hour, with the small studio, culture-centre and film-club cinemas the big apps miss.',
			proof: [
				['Data', '230 cinemas in 174 towns, crawled every 6 hours'],
				['Sources', '12 ticketing-site readers that keep the last good data on an empty read. When one site blocked the server, I switched source and measured the cost: 6% of films missed, none wrong'],
				['Includes', 'Town pages, a page per film, a panel where cinemas fix their own facts']
			],
			uses: ['svelte-i18n', 'svelte-notify']
		},
		{
			id: 'kompi',
			name: 'Kompi',
			kind: 'E-waste map',
			href: 'https://kompi.pl',
			what: 'One map of the places in Poland that take back e-waste, batteries and bulbs, filtered by what they accept and how.',
			proof: [
				['Data', '30,036 collection points in 1,951 cities, scraped by a Python crawler'],
				['Map', 'MapLibre, address search, nearest points from your location']
			],
			uses: []
		},
		{
			id: 'festivals',
			name: 'Friendly Festivals',
			kind: 'Festival directory',
			href: 'https://festivals.zaur.app',
			what: 'A worldwide directory of friendly, open-minded festivals: ceremony and embodiment gatherings next to boutique music and arts festivals.',
			proof: [
				['Includes', 'Lineups, editions, reviews, organiser claims'],
				['Facts', 'A fact read by an LLM is kept only if its quote is on the fetched page; nothing publishes without approval'],
				['Tests', '31 test files']
			],
			uses: ['zaur-world', 'svelte-search', 'svelte-i18n', 'svelte-media', 'svelte-notify']
		}
	];

	// How I work: what both kinds of employer ask about, each with its evidence.
	const how: { h: string; p: string; link?: [string, string] }[] = [
		{
			h: 'Whole products',
			p: 'From the first screen to the server it runs on: interface, API, database, deploys and monitoring, and the upkeep after launch.'
		},
		{
			h: 'With an agent',
			p: 'Claude Code is my daily tool. Each repo carries an AGENTS.md with the conventions the agent works from, and I publish agent skills.',
			link: ['Zaur AGENTS.md', 'https://github.com/nomideusz/zaur/blob/main/AGENTS.md']
		},
		{
			h: 'AI that is checked',
			p: 'LLMs read and sort data in Szkoły Jogi, Friendly Festivals and Zaur Mail. Output is forced into schemas and checked against the source page, the model may answer null, and what cannot be checked waits for a person.'
		},
		{
			h: 'Tested and written down',
			p: 'Vitest and node:test for logic, Playwright for the flows that matter, and architecture decisions recorded as ADRs.',
			link: ['Zaur ADRs', 'https://github.com/nomideusz/zaur/tree/main/docs/decisions']
		},
		{
			h: 'Run in production',
			p: 'Docker on VPSes managed with Dokploy, deploys from GitHub Actions, errors and traces in a self-hosted Traceway, restic backups.',
			link: ['107 Railway templates', '#templates']
		}
	];

	const packages = [
		{
			name: '@nomideusz/zaur-world',
			desc: 'A living ambient sky — real sun times, weather, true star positions, eclipses, and a pixel dinosaur who lives in it. Zero dependencies.',
			npm: 'https://www.npmjs.com/package/@nomideusz/zaur-world',
			demo: 'https://dino.zaur.app',
			source: 'https://github.com/nomideusz/zaur-world',
			// Runs the real sky in its node instead of showing screenshots.
			live: 'sky'
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
		},
		{
			name: '@nomideusz/svelte-media',
			desc: 'Image upload, processing, and S3-compatible storage for Svelte 5 apps.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-media',
			demo: 'https://svelte-media-gamma.vercel.app',
			source: 'https://github.com/nomideusz/svelte-media'
		},
		{
			name: '@nomideusz/svelte-scheduler',
			desc: 'Booking and scheduling logic for Svelte 5 — tour slots, pricing, cancellation policies.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-scheduler'
		},
		{
			name: '@nomideusz/svelte-payments',
			desc: 'Provider-agnostic payments for the booking platform — Mollie server adapter + Stripe Connect UI.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-payments'
		},
		{
			name: '@nomideusz/svelte-notify',
			desc: 'Email notification template library for the booking platform.',
			npm: 'https://www.npmjs.com/package/@nomideusz/svelte-notify'
		}
	];

	const skills = [
		{
			name: 'simple-web-design',
			desc: "Agent skill for auditing, critiquing, and building better websites — grounded in Anthony Hobday's 15 principles of simple web design.",
			source: 'https://github.com/nomideusz/simple-web-design'
		}
	];

	const templates = [
		{
			name: 'Orca Server',
			desc: 'Orca, the IDE for fleets of parallel coding agents, running 24/7: Claude Code, Codex and OpenCode preinstalled, used from the browser, desktop or phone app.',
			deploy: 'https://railway.com/deploy/orca-server',
			source: 'https://github.com/nomideusz/orca-railway'
		},
		{
			name: 'DataLens',
			desc: 'DataLens: open-source business intelligence from Yandex. Connect Postgres, ClickHouse, MySQL and more, build charts and dashboards in the browser.',
			deploy: 'https://railway.com/deploy/datalens',
			source: 'https://github.com/nomideusz/datalens-railway'
		},
		{
			name: 'Evo CRM',
			desc: 'Evo CRM Community from the Evolution API team: an omnichannel support inbox with AI agents, WhatsApp through a bundled Evolution API, contacts, pipelines, segments and campaigns. Unmodified official images, 15 services, uploads in a Railway bucket.',
			deploy: 'https://railway.com/deploy/evo-crm',
			source: 'https://github.com/nomideusz/evo-crm-railway'
		},
		{
			name: 'Rustrak',
			desc: 'Rustrak: self-hosted error tracking that speaks the Sentry protocol. Point any Sentry SDK at it by changing the DSN, and get issues, logs, transactions and release health from one small Rust process on SQLite.',
			deploy: 'https://railway.com/deploy/rustrak',
			source: 'https://github.com/nomideusz/rustrak-railway'
		},
		{
			name: 'Oryx (SRS Stack)',
			desc: 'Oryx by the SRS team: stream from OBS over RTMP, play back as HLS/FLV, restream to YouTube, Twitch and others at once, loop videos as a 24/7 virtual live stream, and record to MP4.',
			deploy: 'https://railway.com/deploy/oryx',
			source: 'https://github.com/nomideusz/oryx-railway'
		},
		{
			name: 'MCSManager',
			desc: 'MCSManager, the popular multi-user game server panel: install Paper, Fabric, Forge or NeoForge from its app market and run them from a web console with file manager and schedules.',
			deploy: 'https://railway.com/deploy/mcsmanager',
			source: 'https://github.com/nomideusz/mcsmanager-railway'
		},
		{
			name: 'Opik',
			desc: 'Opik by Comet: open-source LLM tracing, LLM-as-a-judge evaluation, datasets, experiments and prompt management, on ClickHouse with an embedded Keeper, MySQL, Redis and MinIO, behind basic auth.',
			deploy: 'https://railway.com/deploy/opik-llm',
			source: 'https://github.com/nomideusz/opik-railway'
		},
		{
			name: 'Laminar',
			desc: 'Laminar: open-source observability and evals for AI agents. OpenTelemetry tracing, evaluations, datasets and a SQL editor over your traces, on ClickHouse and Postgres.',
			deploy: 'https://railway.com/deploy/laminar-observability',
			source: 'https://github.com/nomideusz/laminar-railway'
		},
		{
			name: 'T3 Code',
			desc: 'Your always-on cloud agent box: the T3 Code server with Claude Code, Codex and OpenCode preinstalled, paired to the T3 web, desktop and mobile apps.',
			deploy: 'https://railway.com/deploy/t3-code-cloud',
			source: 'https://github.com/nomideusz/t3code-railway'
		},
		{
			name: 'Lowcoder',
			desc: 'Lowcoder: the open-source Retool alternative. Build internal tools, admin panels and dashboards on your databases and APIs with a drag-and-drop editor, on MongoDB and Redis.',
			deploy: 'https://railway.com/deploy/lowcoder',
			source: 'https://github.com/nomideusz/lowcoder-railway'
		},
		{
			name: 'Morphik',
			desc: 'Morphik: an open-source RAG backend for documents. Ingest PDFs, Office files and text, then search and ask questions over them through a REST API or the Python SDK, with any LiteLLM model.',
			deploy: 'https://railway.com/deploy/morphik-rag',
			source: 'https://github.com/nomideusz/morphik-railway'
		},
		{
			name: 'Airweave',
			desc: 'Airweave: the open-source context retrieval layer for AI agents. Syncs Notion, Slack, GitHub, Drive and 50+ more apps into Vespa hybrid search, with Temporal workers and a password-protected gateway.',
			deploy: 'https://railway.com/deploy/airweave',
			source: 'https://github.com/nomideusz/airweave-railway'
		},
		{
			name: 'Activepieces',
			desc: 'Activepieces: the open-source Zapier and n8n alternative. Visual flow builder with hundreds of integrations, AI agents and MCP, on Postgres and Redis with a scalable worker service and sandboxed code steps.',
			deploy: 'https://railway.com/deploy/activepieces-workflows',
			source: 'https://github.com/nomideusz/activepieces-railway'
		},
		{
			name: 'Penpot',
			desc: 'Penpot: the open-source Figma alternative. Real-time collaborative design, prototyping, components and design tokens, with CSS/SVG inspect for developers, on Postgres and a Railway bucket.',
			deploy: 'https://railway.com/deploy/penpot-production',
			source: 'https://github.com/nomideusz/penpot-railway'
		},
		{
			name: 'Cal.com',
			desc: 'Cal.com: the open-source Calendly alternative. Public booking pages, event types, availability and Google Calendar sync, on your own Postgres.',
			deploy: 'https://railway.com/deploy/calcom-production',
			source: 'https://github.com/nomideusz/calcom-railway'
		},
		{
			name: 'Temporal',
			desc: 'Temporal: the open-source durable execution engine. Server, password-protected Web UI and Postgres with advanced visibility, schema migrations on every deploy.',
			deploy: 'https://railway.com/deploy/temporal-server',
			source: 'https://github.com/nomideusz/temporal-railway'
		},
		{
			name: 'Huly',
			desc: 'Huly: the open-source all-in-one alternative to Linear, Slack and Notion. Issue tracking, team chat, collaborative docs and planning on Postgres, Elasticsearch and a Railway bucket.',
			deploy: 'https://railway.com/deploy/huly-platform',
			source: 'https://github.com/nomideusz/huly-railway'
		},
		{
			name: 'Formbricks',
			desc: 'Formbricks 6: the open-source Typeform and Qualtrics alternative. Link, website and in-app surveys, NPS and CSAT, with the full v6 stack (Hub, Cube, SpiceDB) and uploads in a Railway bucket.',
			deploy: 'https://railway.com/deploy/formbricks-surveys',
			source: 'https://github.com/nomideusz/formbricks-railway'
		},
		{
			name: 'Outline',
			desc: 'Outline: the fast, collaborative team wiki and knowledge base. Ready on first boot: create your workspace and sign in with a passkey, then add SSO or SMTP for teammates.',
			deploy: 'https://railway.com/deploy/outline-production',
			source: 'https://github.com/nomideusz/outline-railway'
		},
		{
			name: 'RAGFlow',
			desc: 'RAGFlow: the open-source RAG engine with deep document understanding. Parse PDFs, Word, slides and spreadsheets into knowledge bases, then chat with them with grounded citations, on Elasticsearch, MySQL, MinIO and Redis.',
			deploy: 'https://railway.com/deploy/ragflow-engine',
			source: 'https://github.com/nomideusz/ragflow-railway'
		},
		{
			name: 'Documenso',
			desc: 'Documenso: the open-source DocuSign alternative. Send PDFs for signature and get them back digitally sealed, with the signing certificate and your admin account created on first boot.',
			deploy: 'https://railway.com/deploy/documenso-production',
			source: 'https://github.com/nomideusz/documenso-railway'
		},
		{
			name: 'Open WebUI + LiteLLM',
			desc: 'Open WebUI in front of a LiteLLM gateway: a ChatGPT-style workspace for your team, with models from OpenAI, Anthropic, OpenRouter and 100+ providers, virtual keys and spend tracking, on Postgres.',
			deploy: 'https://railway.com/deploy/open-webui-litellm',
			source: 'https://github.com/nomideusz/open-webui-litellm-railway'
		},
		{
			name: 'Mautic Production',
			desc: 'Email campaigns, segments and lead scoring, with the cron jobs and queue workers that actually send them.',
			deploy: 'https://railway.com/deploy/mautic-production',
			source: 'https://github.com/nomideusz/mautic-railway'
		},
		{
			name: 'Lago Production',
			desc: 'Lago usage-based billing: meter events, apply plans, credits and coupons, and issue PDF invoices on schedule — the complete stack with worker, clock and PDF renderer, admin seeded and sign-up closed.',
			deploy: 'https://railway.com/deploy/lago-production',
			source: 'https://github.com/nomideusz/lago-railway'
		},
		{
			name: 'OpenReplay',
			desc: 'OpenReplay session replay: watch what users did with console, network and performance data alongside, plus funnels, heatmaps and dashboards, with recordings kept on your own Railway volume.',
			deploy: 'https://railway.com/deploy/openreplay',
			source: 'https://github.com/nomideusz/openreplay-railway'
		},
		{
			name: 'Inbox Zero',
			desc: 'Inbox Zero AI email assistant for Gmail and Outlook: plain-English rules that label, archive and draft replies, plus bulk unsubscribe and digests, with your own LLM key, Postgres, Redis and built-in scheduled jobs.',
			deploy: 'https://railway.com/deploy/inbox-zero',
			source: 'https://github.com/nomideusz/inbox-zero-railway'
		},
		{
			name: 'AFFiNE',
			desc: 'AFFiNE: the open-source Notion and Miro alternative. Docs, edgeless whiteboards and databases in one workspace, with real-time collaboration, on Postgres with pgvector.',
			deploy: 'https://railway.com/deploy/affine-production',
			source: 'https://github.com/nomideusz/affine-railway'
		},
		{
			name: 'Fluxer',
			desc: 'Fluxer: the open-source Discord alternative. Servers, text channels, DMs, roles, file uploads and message search on your own Railway project.',
			deploy: 'https://railway.com/deploy/fluxer-chat',
			source: 'https://github.com/nomideusz/fluxer-railway'
		},
		{
			name: 'Rocket.Chat',
			desc: 'Rocket.Chat team chat: channels, DMs, threads, video calls and integrations, with a self-initiating MongoDB replica set and the admin created on first boot.',
			deploy: 'https://railway.com/deploy/rocketchat-workspace',
			source: 'https://github.com/nomideusz/rocketchat-railway'
		},
		{
			name: 'Teable',
			desc: 'Teable: the open-source Airtable alternative on real Postgres, with grid, kanban, gallery and form views, real-time collaboration and an API.',
			deploy: 'https://railway.com/deploy/teable-production',
			source: 'https://github.com/nomideusz/teable-railway'
		},
		{
			name: 'Infisical',
			desc: 'Infisical secrets manager: env vars, API keys and certificates for your team and apps, with the admin created and public sign-up closed on first boot.',
			deploy: 'https://railway.com/deploy/infisical-secrets',
			source: 'https://github.com/nomideusz/infisical-railway'
		},
		{
			name: 'Windmill',
			desc: 'Windmill developer platform: turn Python, TypeScript, Bash and SQL scripts into flows, webhooks, cron jobs and internal apps, with a worker and a native worker, and your superadmin created on first boot.',
			deploy: 'https://railway.com/deploy/windmill-dev',
			source: 'https://github.com/nomideusz/windmill-railway'
		},
		{
			name: 'Codewhale',
			desc: 'Codewhale coding agent, git, gh, Node, Python. Browser terminal + SSH.',
			deploy: 'https://railway.com/deploy/codewhale',
			source: 'https://github.com/nomideusz/codewhale-railway'
		},
		{
			name: 'AionUi',
			desc: 'AionUi WebUI: a password-protected cowork app for AI agents with any model',
			deploy: 'https://railway.com/deploy/aionui',
			source: 'https://github.com/nomideusz/aionui-railway'
		},
		{
			name: 'OpenCode',
			desc: 'Open-source AI coding agent with a browser UI, free built-in models, a real terminal and SSH.',
			deploy: 'https://railway.com/deploy/opencode-cloud',
			source: 'https://github.com/nomideusz/opencode-railway'
		},
		{
			name: 'Hermes Agent',
			desc: 'Hermes Agent by Nous Research on the official image: password-protected web dashboard with in-browser chat, the Telegram/Discord/Slack gateway and cron, memory and skills on a volume.',
			deploy: 'https://railway.com/deploy/hermes-agent-dashboard',
			source: 'https://github.com/nomideusz/hermes-railway'
		},
		{
			name: 'Dependency-Track 5',
			desc: 'OWASP Dependency-Track 5: upload SBOMs from CI and track known vulnerabilities, licenses and policy violations across every project, with the admin set on first boot.',
			deploy: 'https://railway.com/deploy/dependency-track',
			source: 'https://github.com/nomideusz/dependency-track-railway'
		},
		{
			name: 'EspoCRM',
			desc: 'EspoCRM 10: contacts, accounts, leads, deals and email in one CRM, live updates over WebSocket, and the admin created on first boot.',
			deploy: 'https://railway.com/deploy/crm',
			source: 'https://github.com/nomideusz/espocrm-railway'
		},
		{
			name: 'Plane Community',
			desc: 'Plane project tracker: issues, cycles, modules and pages for your team, uploads in a Railway bucket, and the admin created on first boot.',
			deploy: 'https://railway.com/deploy/plane-community',
			source: 'https://github.com/nomideusz/plane-railway'
		},
		{
			name: 'Zammad 7',
			desc: 'Zammad 7 helpdesk: email, chat and phone tickets in one inbox, full-text search on Elasticsearch, and the admin created on first boot.',
			deploy: 'https://railway.com/deploy/zammad-7',
			source: 'https://github.com/nomideusz/zammad-railway'
		},
		{
			name: 'Langfuse 4',
			desc: 'Langfuse v4 (web, worker, ClickHouse, Postgres, Redis) with traces in a Railway bucket and your API keys ready on first boot.',
			deploy: 'https://railway.com/deploy/langfuse-4',
			source: 'https://github.com/nomideusz/langfuse-railway'
		},
		{
			name: 'Invoice Ninja 5',
			desc: 'Invoice Ninja 5 on MariaDB with PDF rendering, queue worker and scheduler running from the first boot, your admin account created before the site goes public, and nightly backups to a Railway bucket.',
			deploy: 'https://railway.com/deploy/invoice-ninja-5',
			source: 'https://github.com/nomideusz/invoiceninja-railway'
		},
		{
			name: 'Moodle 5.2',
			desc: 'The current official Moodle 5.2 release on Postgres, installed from the command line with a generated admin password, with cron, upgrades on redeploy and nightly backups to a Railway bucket.',
			deploy: 'https://railway.com/deploy/moodle-5',
			source: 'https://github.com/nomideusz/moodle-railway'
		},
		{
			name: 'SUB/WAVE',
			desc: 'A personal internet radio station: an AI DJ picks tracks from your Navidrome library, talks between them and takes requests, all on one Icecast stream.',
			deploy: 'https://railway.com/deploy/subwave',
			source: 'https://github.com/nomideusz/subwave-railway'
		},
		{
			name: 'WordPress Pro',
			desc: 'WordPress on MariaDB with a Redis object cache, nightly backups to a Railway bucket, and an admin password generated before the site ever goes public.',
			deploy: 'https://railway.com/deploy/wordpress-pro',
			source: 'https://github.com/nomideusz/wordpress-railway'
		},
		{
			name: 'ERPNext 16',
			desc: 'ERPNext v16 with realtime updates, background jobs, automatic migrations on upgrade and nightly backups to a Railway bucket.',
			deploy: 'https://railway.com/deploy/erpnext-16',
			source: 'https://github.com/nomideusz/erpnext-railway'
		},
		{
			name: 'Laya',
			desc: "Laya's open decision model behind TypeSafe's /v1/systemone API, so Jev SDK code runs on your own server.",
			deploy: 'https://railway.com/deploy/laya',
			source: 'https://github.com/nomideusz/laya-railway'
		},
		{
			name: 'Minecraft Server',
			desc: "A Paper server players can join minutes after deploy, run from Crafty's web panel, with nightly backups.",
			deploy: 'https://railway.com/deploy/minecraft-java',
			source: 'https://github.com/nomideusz/minecraft-crafty-railway'
		},
		{
			name: 'Odoo 19',
			desc: 'Odoo 19 with prefork workers, nightly backups to a Railway bucket, and a database manager nobody can reach.',
			deploy: 'https://railway.com/deploy/odoo-19',
			source: 'https://github.com/nomideusz/odoo-railway'
		},
		{
			name: 'Mullvad Browser',
			desc: 'Mullvad Browser in the cloud — Tor-grade anti-fingerprinting without the Tor network.',
			deploy: 'https://railway.com/deploy/mullvad-browser',
			source: 'https://github.com/nomideusz/mullvad-railway'
		},
		{
			name: 'Ungoogled Chromium',
			desc: 'Ungoogled Chromium in the cloud — Chromium without Google services, profile persists.',
			deploy: 'https://railway.com/deploy/ungoogled-chromium',
			source: 'https://github.com/nomideusz/ungoogled-chromium-railway'
		},
		{
			name: 'FileZilla',
			desc: 'FileZilla in the cloud — move files between servers over datacenter bandwidth.',
			deploy: 'https://railway.com/deploy/filezilla',
			source: 'https://github.com/nomideusz/filezilla-railway'
		},
		{
			name: 'LibreWolf',
			desc: 'LibreWolf, the privacy-hardened Firefox, in the cloud — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/librewolf-browser',
			source: 'https://github.com/nomideusz/librewolf-railway'
		},
		{
			name: 'Blender',
			desc: 'Blender in the cloud — kick off CPU renders and close your laptop.',
			deploy: 'https://railway.com/deploy/blender',
			source: 'https://github.com/nomideusz/blender-railway'
		},
		{
			name: 'Vivaldi',
			desc: 'Desktop Vivaldi in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/vivaldi-browser',
			source: 'https://github.com/nomideusz/vivaldi-railway'
		},
		{
			name: 'Thunderbird',
			desc: 'Thunderbird in the cloud — one always-on mail client for all your accounts.',
			deploy: 'https://railway.com/deploy/thunderbird',
			source: 'https://github.com/nomideusz/thunderbird-railway'
		},
		{
			name: 'GIMP',
			desc: 'GIMP in the cloud — edit images from a tablet or a locked-down laptop, files persist.',
			deploy: 'https://railway.com/deploy/gimp',
			source: 'https://github.com/nomideusz/gimp-railway'
		},
		{
			name: 'Opera',
			desc: 'Desktop Opera in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/opera-browser',
			source: 'https://github.com/nomideusz/opera-railway'
		},
		{
			name: 'LibreOffice',
			desc: 'Full LibreOffice suite in the cloud — edit Office files from an iPad or Chromebook.',
			deploy: 'https://railway.com/deploy/libreoffice',
			source: 'https://github.com/nomideusz/libreoffice-railway'
		},
		{
			name: 'VSCodium',
			desc: 'Desktop VSCodium streamed to your browser — extensions and terminals stay alive between visits.',
			deploy: 'https://railway.com/deploy/vscodium',
			source: 'https://github.com/nomideusz/vscodium-railway'
		},
		{
			name: 'Linux Terminal (Ubuntu)',
			desc: 'Ubuntu shell in the browser and over SSH — tmux sessions survive disconnects, home persists.',
			deploy: 'https://railway.com/deploy/ubuntu-terminal',
			source: 'https://github.com/nomideusz/terminal-railway'
		},
		{
			name: 'Obsidian',
			desc: 'Obsidian desktop in the cloud — an always-on vault with plugins, reachable from any device.',
			deploy: 'https://railway.com/deploy/obsidian',
			source: 'https://github.com/nomideusz/obsidian-railway'
		},
		{
			name: 'Medusa v2',
			desc: 'Headless commerce backend with server + worker, Postgres and Redis — admin user created on first boot.',
			deploy: 'https://railway.com/deploy/medusa-commerce',
			source: 'https://github.com/nomideusz/medusa-railway'
		},
		{
			name: 'Flowise',
			desc: 'Visual AI agent builder in queue mode — main + worker, Postgres, Redis and bucket storage.',
			deploy: 'https://railway.com/deploy/flowise-workers',
			source: 'https://github.com/nomideusz/flowise-railway'
		},
		{
			name: 'Linux Desktop',
			desc: 'Full Ubuntu XFCE desktop streamed to your browser — sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop',
			source: 'https://github.com/nomideusz/webtop-railway'
		},
		{
			name: 'Linux Desktop (KDE Plasma)',
			desc: 'Ubuntu KDE Plasma desktop streamed to your browser — sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-kde',
			source: 'https://github.com/nomideusz/webtop-kde-railway'
		},
		{
			name: 'Linux Desktop (MATE)',
			desc: 'Ubuntu MATE desktop streamed to your browser — light, sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-mate',
			source: 'https://github.com/nomideusz/webtop-mate-railway'
		},
		{
			name: 'Linux Desktop (i3)',
			desc: 'Ubuntu i3 tiling desktop in your browser — 150 MB idle, sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-i3',
			source: 'https://github.com/nomideusz/webtop-i3-railway'
		},
		{
			name: 'Linux Desktop (LXQt)',
			desc: 'Ubuntu LXQt desktop streamed to your browser — light, sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-lxqt',
			source: 'https://github.com/nomideusz/webtop-lxqt-railway'
		},
		{
			name: 'Linux Desktop (Arch)',
			desc: 'Arch Linux XFCE desktop in your browser — pacman, sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-arch',
			source: 'https://github.com/nomideusz/webtop-arch-railway'
		},
		{
			name: 'Linux Desktop (Debian)',
			desc: 'Debian KDE Plasma desktop streamed to your browser — sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-debian',
			source: 'https://github.com/nomideusz/webtop-debian-railway'
		},
		{
			name: 'Linux Desktop (Alpine)',
			desc: 'Alpine KDE Plasma desktop streamed to your browser — sudo, persistent home, password-gated.',
			deploy: 'https://railway.com/deploy/linux-desktop-alpine',
			source: 'https://github.com/nomideusz/webtop-alpine-railway'
		},
		{
			name: 'LobeHub (Lobe Chat)',
			desc: 'Team AI chat with Postgres, file storage and knowledge base — sign up and go, no config.',
			deploy: 'https://railway.com/deploy/lobehub-chat',
			source: 'https://github.com/nomideusz/lobe-chat-railway'
		},
		{
			name: 'Claude Code',
			desc: 'Always-on Ubuntu dev box with Claude Code, gh, Node, and Python — browser terminal and SSH, home persists.',
			deploy: 'https://railway.com/deploy/claude-code',
			source: 'https://github.com/nomideusz/claude-code-railway'
		},
		{
			name: 'Google Chrome',
			desc: 'Desktop Chrome in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/google-chrome',
			source: 'https://github.com/nomideusz/chrome-railway'
		},
		{
			name: 'Brave',
			desc: 'Desktop Brave in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/brave-browser',
			source: 'https://github.com/nomideusz/brave-railway'
		},
		{
			name: 'Microsoft Edge',
			desc: 'Desktop Edge in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/microsoft-edge',
			source: 'https://github.com/nomideusz/edge-railway'
		},
		{
			name: 'Firefox',
			desc: 'Desktop Firefox in the cloud, streamed to any device — password-gated, profile persists.',
			deploy: 'https://railway.com/deploy/firefox-browser',
			source: 'https://github.com/nomideusz/firefox-railway'
		},
		{
			name: 'HyperDX',
			desc: 'ClickHouse observability — logs, traces, metrics, and session replay in one UI.',
			deploy: 'https://railway.com/deploy/hyperdx',
			source: 'https://github.com/nomideusz/hyperdx-railway'
		},
		{
			name: 'Uptrace',
			desc: 'OpenTelemetry APM on ClickHouse — traces, logs, metrics, service graph, and alerts.',
			deploy: 'https://railway.com/deploy/uptrace',
			source: 'https://github.com/nomideusz/uptrace-railway'
		},
		{
			name: 'SvelteKit + Better Auth Starter',
			desc: 'SvelteKit 3, Better Auth, Postgres/Drizzle, i18n and email — a base to build on.',
			deploy: 'https://railway.com/deploy/sveltekit-better-auth-starter',
			source: 'https://github.com/nomideusz/sveltekit-better-auth-starter'
		},
		{
			name: 'Stalwart Webmail',
			desc: 'Offline-capable, white-label JMAP webmail for self-hosted Stalwart servers.',
			deploy: 'https://railway.com/deploy/stalwart-webmail',
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/mail2'
		},
		{
			name: 'Stalwart',
			desc: 'Rust mailbox server on a single volume — JMAP, IMAP, CalDAV, and a web admin.',
			deploy: 'https://railway.com/new/template/stalwart-1',
			source: 'https://github.com/nomideusz/stalwart-railway'
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
		},
		{
			name: 'Funkwhale',
			desc: 'Federated audio platform — stream your library, podcasts, and channels via web or Subsonic apps.',
			deploy: 'https://railway.com/new/template/funkwhale',
			source: 'https://github.com/nomideusz/funkwhale-railway'
		},
		{
			name: 'PeerTube',
			desc: 'Decentralized video platform — HLS transcoding, RTMP live streaming, ActivityPub federation.',
			deploy: 'https://railway.com/new/template/peertube',
			source: 'https://github.com/nomideusz/peertube-railway'
		},
		{
			name: 'Chevereto',
			desc: 'Self-hosted image and video sharing — albums, user accounts, moderation, direct hotlinks.',
			deploy: 'https://railway.com/new/template/chevereto',
			source: 'https://github.com/nomideusz/chevereto-railway'
		},
		{
			name: 'Owncast',
			desc: 'Self-hosted live streaming with chat — point OBS at your own Twitch-style stream page.',
			deploy: 'https://railway.com/new/template/owncast',
			source: 'https://github.com/nomideusz/owncast-railway'
		},
		{
			name: 'LNbits',
			desc: 'Bitcoin Lightning wallet and payments API, backed by a self-custodial phoenixd node.',
			deploy: 'https://railway.com/deploy/lnbits',
			source: 'https://github.com/nomideusz/lnbits-railway'
		},
		{
			name: 'GoAlert',
			desc: 'On-call scheduling, escalations, and SMS/voice paging — PagerDuty alternative by Target.',
			deploy: 'https://railway.com/new/template/goalert',
			source: 'https://github.com/nomideusz/goalert-railway'
		},
		{
			name: 'Dittofeed',
			desc: 'Customer engagement journeys with segments, ClickHouse, and Temporal — Customer.io alternative.',
			deploy: 'https://railway.com/new/template/dittofeed-2',
			source: 'https://github.com/nomideusz/dittofeed-railway'
		},
		{
			name: 'OpenEMR',
			desc: 'Electronic medical records and practice management — charts, scheduling, billing, portal.',
			deploy: 'https://railway.com/new/template/openemr',
			source: 'https://github.com/nomideusz/openemr-railway'
		},
		{
			name: 'Navidrome',
			desc: 'Self-hosted music streaming with a drag-and-drop upload panel — works with any Subsonic app.',
			deploy: 'https://railway.com/new/template/navidrome-1',
			source: 'https://github.com/nomideusz/navidrome-railway'
		},
		{
			name: 'Pixelfed',
			desc: 'Federated photo sharing on ActivityPub — an Instagram alternative with albums and stories.',
			deploy: 'https://railway.com/new/template/pixelfed',
			source: 'https://github.com/nomideusz/pixelfed-railway'
		},
		{
			name: 'Audiobookshelf',
			desc: 'Audiobook and podcast server — streams to any device with progress sync across all of them.',
			deploy: 'https://railway.com/new/template/audiobookshelf',
			source: 'https://github.com/nomideusz/audiobookshelf-railway'
		},
		{
			name: 'TubeArchivist',
			desc: 'Self-hosted YouTube archive — subscribe to channels, download with yt-dlp, search everything.',
			deploy: 'https://railway.com/new/template/tubearchivist',
			source: 'https://github.com/nomideusz/tubearchivist-railway'
		},
		{
			name: 'Baby Buddy',
			desc: 'Baby tracker for caregivers — feedings, sleep, diapers, and growth on one timeline with charts.',
			deploy: 'https://railway.com/new/template/baby-buddy',
			source: 'https://github.com/nomideusz/babybuddy-railway'
		},
		{
			name: 'Cockpit CMS',
			desc: 'Veteran API-first headless CMS — model collections, singletons, and trees, deliver over REST or GraphQL.',
			deploy: 'https://railway.com/new/template/cockpit',
			source: 'https://github.com/nomideusz/cockpit-railway'
		},
		{
			name: 'Chromium',
			desc: 'A full desktop browser in the cloud, streamed to any device — sessions and extensions persist.',
			deploy: 'https://railway.com/new/template/chromium',
			source: 'https://github.com/nomideusz/chromium-railway'
		}
	];

	// Work for clients, then small things of my own. The tag says what the site
	// is; spec rows are facts visible on the live site. Strongest first.
	type Site = {
		id: string;
		name: string;
		desc: string;
		href: string;
		tag: string;
		basket: 'client' | 'side';
		specs: [string, string][];
		uses?: string[];
		growth?: Work['growth'];
		/** Played and drawn live on this page instead of a screenshot. */
		live?: boolean;
	};
	const websites: Site[] = [
		{
			id: 'fixtar',
			name: 'fixtar.pl',
			desc: 'An online shop for power tools that I built and run for a client: catalogue, checkout, payments and order handling.',
			href: 'https://fixtar.pl',
			tag: 'Online shop',
			basket: 'client',
			specs: [
				['Products', 'Synced from BaseLinker'],
				['Payments', 'PayU, Przelewy24; a payment marks the order paid once, and only that request pushes it to BaseLinker and sends the email'],
				['SEO', 'Built to the client’s technical SEO spec: Product and Offer schema, five split sitemaps, canonical and noindex rules'],
				['Feeds', 'Google Shopping feed generated from the same data as the schema']
			],
			growth: {
				title: 'Clicks from Google to product and blog pages',
				months: [['Jun', 19], ['Jul', 60], ['Aug', 92], ['Sep', 130]],
				note: 'Impressions on those pages grew from 768 to 4,061 a month. Source: Google Search Console, October 2026.'
			},
			uses: ['svelte-search']
		},
		{
			id: 'pikastro',
			name: 'pikastro.eu',
			desc: 'A colourful interior design studio in Kraków, with a custom CMS: the owner edits text and photos right on the live page.',
			href: 'https://pikastro.eu',
			tag: 'Studio site',
			basket: 'client',
			specs: [
				['CMS', 'Custom, click-to-edit on the page, with edit history'],
				['Storage', 'Netlify Blobs, no database'],
				['Languages', 'Polish, English']
			]
		},
		{
			id: 'wibroakustyka',
			name: 'wibroakustyka.ai',
			desc: 'Product site for the Graal vibroacoustic wellness chair.',
			href: 'https://wibroakustyka.ai',
			tag: 'Product site',
			basket: 'client',
			specs: [
				['Explains', 'What an acoustic chair is and how vibroacoustics works'],
				['Includes', 'News and the Health & Longevity Summit 2026']
			]
		},
		{
			id: 'tutitutu',
			name: 'tutitutu.pl',
			desc: 'Image-first portfolio for an interior architecture studio founded in 1997.',
			href: 'https://tutitutu.pl',
			tag: 'Portfolio',
			basket: 'client',
			specs: [
				['CMS', 'Custom, written by hand before AI: the studio edits its own realisations'],
				['Sections', 'Realisations, workshop, publications, references']
			]
		},
		{
			id: 'intertech',
			name: 'intertechpoland.pl',
			desc: 'Equipment catalogue and industry news for the Polish representative of Picarro and UGT.',
			href: 'https://intertechpoland.pl',
			tag: 'Catalogue',
			basket: 'client',
			specs: [
				['Energy', 'Emissions monitoring and reduction, leak detection, pipe replacement'],
				['Science', 'CRDS spectroscopy, lysimeters, ecotrons, plant sensors']
			]
		},
		{
			id: 'polaczenie',
			name: 'gabinet-polaczenie.pl',
			desc: 'Acupuncture clinic in Kraków offering treatments that complement conventional care.',
			href: 'https://gabinet-polaczenie.pl',
			tag: 'Clinic site',
			basket: 'client',
			specs: [
				['Format', 'One page, in Polish and English'],
				['Covers', 'Treatments and the therapist']
			]
		},
		{
			id: 'radiobartek',
			name: 'radiobartek.com',
			desc: 'A 24/7 internet radio station with an AI DJ who talks between the tracks in a clone of my voice.',
			href: 'https://radiobartek.com',
			tag: 'AI radio',
			basket: 'side',
			live: true,
			specs: [
				['Engine', 'Open-source SUB/WAVE with my own skins and patches; the sky is zaur-world through its React adapter'],
				['Voice', 'A Python bridge to Fish Audio speech that clones a voice from a short clip'],
				['Music', 'About 35 new tracks a day, picked from ListenBrainz recommendations']
			],
			uses: ['zaur-world']
		},
		{
			id: 'kurcz',
			name: 'kurcz.pl',
			desc: 'Everything about muscle cramps: causes, first aid and prevention, as fast static pages.',
			href: 'https://kurcz.pl',
			tag: 'Health guide',
			basket: 'side',
			specs: [
				['Built with', 'Astro, no JavaScript on article pages'],
				['Covers', 'Causes, first aid, prevention guides'],
				['Languages', 'Polish, English']
			]
		},
		{
			id: 'kruk',
			name: 'kruk.live',
			desc: 'Five mini-apps live on one site: a drawing board, a kanban, pixel art, friends and a property scraper.',
			href: 'https://kruk.live',
			tag: 'Mini-apps',
			basket: 'side',
			specs: [
				['Inside', 'Draw, Kanban, Pixels, Friends, Properties'],
				['Mode', 'Real-time and collaborative'],
				['Note', 'An experiment with Phoenix LiveView; the Elixir is written by Claude Code']
			]
		}
	];

	// Windows: a capture of the live site (src/lib/windows, provenance embedded),
	// replaced by the site itself where its headers allow framing (checked at prerender).
	const shots = import.meta.glob('../lib/windows/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
	const shot = (id: string) => shots[`../lib/windows/${id}.webp`];
	const isLive = (href: string) => data.live.includes(href);
	const host = (href: string) => new URL(href).host;

	const pkgs = packages.map((p) => ({ ...p, id: p.name.split('/')[1] }));
	const flagships = work.filter((w) => w.built);
	const usedIn = (id: string) => [...work, ...websites].filter((w) => w.uses?.includes(id)).map((w) => w.name);
	// Every smaller project renders as the same card: a picture, then the facts.
	type Card = { id: string; name: string; tag: string; href: string; img?: string; phone?: string; page?: string; pagePhone?: string; frame?: boolean; live?: boolean; desc: string; specs: [string, string][]; uses?: string[]; growth?: Work['growth'] };
	const others: Card[] = work
		.filter((w) => !w.built)
		.map((w) => ({ id: w.id, name: w.name, tag: w.kind, href: w.href, img: shot(w.id), phone: phoneFor(w.id), frame: isLive(w.href), desc: w.what, specs: w.proof ?? [], uses: w.uses }));
	const siteCards = (basket: Site['basket']): Card[] =>
		websites.filter((w) => w.basket === basket).map((w) => {
			// A site that may not be framed scrolls through whole-page captures instead.
			const page = shot(`${w.id}-page`);
			return { ...w, img: platesFor(w.id, w.name)?.frames[0].src, phone: phoneFor(w.id), page, pagePhone: shot(`${w.id}-page-phone`), frame: !!page || isLive(w.href) };
		});
	const clients = siteCards('client');
	const side = siteCards('side');
	const groups = kinds
		.map(([kind]) => ({ kind, items: templates.filter((t) => kindOf(t.name) === kind) }))
		.filter((g) => g.items.length);
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
	let traffic = $state<{ clicksPerDay: number; monthAgo: number | null } | null>(null);
	let trafficDown = $state(false);
	const version = (id: string) => versions[id] ?? (registryDown ? '—' : '…');

	onMount(() => {
		// A link to a fold (the Templates tab, a shared #websites URL) opens it.
		const unfold = () => {
			const el = location.hash && document.getElementById(location.hash.slice(1));
			if (el instanceof HTMLDetailsElement) el.open = true;
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

{#snippet card(c: Card)}
	<li id={c.id}>
		{#if c.live}
			<Radio href={c.href} />
		{:else if c.frame}
			<div class="shot"><Live href={c.href} name={c.name} shot={c.img} phone={c.phone} page={c.page} pagePhone={c.pagePhone} /></div>
		{:else if c.img}
			<a class="shot" href={c.href} tabindex="-1" aria-hidden="true">
				<img src={c.img} alt="" width="1200" height="750" loading="lazy" />
			</a>
		{/if}
		<div class="site">
			<h3><a href={c.href}>{c.name}</a><span>{c.tag}</span></h3>
			<p>{c.desc}</p>
			<dl>
				{#each c.specs as [k, v] (k)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
			</dl>
			{#if c.growth}{@render growth(c.growth)}{/if}
			{#if c.uses?.length}
				<ul class="chips">
					{#each c.uses as u (u)}
						<li><a class="chip" href={npmOf(u)}><span>{u}</span><span>{version(u)}</span></a></li>
					{/each}
				</ul>
			{/if}
		</div>
	</li>
{/snippet}

{#snippet growth(g: NonNullable<Work['growth']>)}
	{@const top = Math.max(...g.months.map(([, n]) => n))}
	<figure class="growth">
		<figcaption>{g.title}</figcaption>
		<ol>
			{#each g.months as [m, n] (m)}
				<li>
					<span class="col"><b>{n.toLocaleString('en')}</b><i style:height="{(n / top) * 100}%"></i></span>
					<span class="mo">{m}</span>
				</li>
			{/each}
		</ol>
		<p>{g.note}</p>
	</figure>
{/snippet}

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={site} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Zaur" />
	<meta property="og:url" content={site} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="{site}og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Bartosz Dymet, frontend engineer, beside the product names Zaur, Szkoły Jogi, thebest.travel, Kino, Kompi and Friendly Festivals." />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${JSON.stringify(ld)}</script>`}
</svelte:head>

<header class="bar">
	<a class="mark" href="/">Bartosz Dymet</a>
	<nav class="tabs" aria-label="Sections">
		<a href="#work">Products</a>
		<a href="#clients">Clients</a>
		<a href="#packages">Open source</a>
		<a href="#how">How I work</a>
	</nav>
	<a class="mail" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
</header>

<main>
	<div class="poster" class:pointing={active}>
		<nav class="programme" aria-label="Products">
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
			<h1 id="who">Bartosz Dymet</h1>
			<p class="role">Frontend engineer · Svelte and TypeScript · Kraków</p>
			<p class="pitch">
				I design, build and run complete products: the interface, the backend, the servers and the tests. Six are live.
				Point at one to see the packages it is built from.
			</p>
			<p class="links">
				<a href={github}>github.com/nomideusz</a>
				<a href="mailto:bartek@zaur.app">bartek@zaur.app</a>
			</p>
			<div class="kit">
				<h2>Built from my open-source packages</h2>
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
		<div class="strip"><h2 id="work-h">Products <span class="n">· {work.length}</span></h2></div>
		{#each flagships as w (w.id)}
			{@const gsc = w.id === 'szkolyjogi'}
			<article class="case" id={w.id}>
				<div class="media">
					{#if shot(w.id) && isLive(w.href)}
						<Live href={w.href} name={w.name} shot={shot(w.id)} phone={phoneFor(w.id)} />
					{:else if shot(w.id)}
						<a class="window" href={w.href} tabindex="-1" aria-hidden="true">
							<img src={shot(w.id)} alt="" width="1200" height="750" loading="lazy" />
						</a>
					{:else if w.parts}
						<ul class="parts">
							{#each w.parts as [n, h] (n)}
								<li><b>{n}</b><span>{h}</span></li>
							{/each}
						</ul>
					{/if}
					{#if w.growth}{@render growth(w.growth)}{/if}
				</div>
				<div class="case-body">
					<h3>
						{#if gsc}<span class="dot" class:off={!traffic && !trafficDown} aria-hidden="true"></span>{/if}
						<a href={w.href}>{w.name}</a>
						<span class="tag">{w.kind}</span>
					</h3>
					<p class="meta">
						{host(w.href)}{#if gsc && !trafficDown}<span> · {traffic?.clicksPerDay ?? '…'} search clicks a day from Google</span>{/if}
					</p>
					<p class="what">{w.what}</p>
					<h4>What I built</h4>
					<ul class="built">
						{#each w.built ?? [] as b (b)}<li>{b}</li>{/each}
					</ul>
					<dl class="facts">
						{#each w.proof ?? [] as [k, v] (k)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
					</dl>
					<ul class="chips">
						{#each w.uses as u (u)}
							<li><a class="chip" href={npmOf(u)}><span>{u}</span><span>{version(u)}</span></a></li>
						{/each}
					</ul>
					<p class="go">
						<a href={w.href}>Open {host(w.href)}</a>
						{#if w.source}<a href={w.source}>Source on GitHub</a>{/if}
					</p>
				</div>
			</article>
		{/each}
		<ul class="sites">
			{#each others as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="websites" id="clients" aria-labelledby="clients-h">
		<div class="strip"><h2 id="clients-h">Client work <span class="n">· {clients.length}</span></h2></div>
		<p class="lede">An online shop and five websites for businesses: designed, built and kept running.</p>
		<ul class="sites">
			{#each clients as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="websites" id="side" aria-labelledby="side-h">
		<div class="strip"><h2 id="side-h">Side projects <span class="n">· {side.length}</span></h2></div>
		<p class="lede">Small things I made for myself and keep online.</p>
		<ul class="sites">
			{#each side as c (c.id)}{@render card(c)}{/each}
		</ul>
	</section>

	<section class="packages" id="packages" aria-labelledby="packages-h">
		<div class="strip"><h2 id="packages-h">Packages <span class="n">· {pkgs.length}</span></h2></div>
		<p class="lede">The building blocks my products share, published on npm under @nomideusz.</p>
		<ul class="ptable">
			{#each pkgs as p (p.id)}
				<li id="pkg-{p.id}">
					<a class="p-name" href={p.npm}>{p.id}</a>
					<span class="p-ver">{version(p.id)}</span>
					<p>{p.desc}</p>
					<p class="p-used">{usedIn(p.id).length ? `Used in ${usedIn(p.id).join(', ')}` : ''}</p>
					<p class="p-links">
						{#if p.demo}<a href={p.demo}>Demo</a>{/if}
						{#if p.source}<a href={p.source}>Source</a>{/if}
					</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="folds" aria-label="More open source">
		<details id="templates">
			<summary>
				<h2>Railway templates · {templates.length}</h2>
				{@render toggle()}
			</summary>
			<div class="fold">
				<p class="lede">Infrastructure work: one-click deploys of open-source software on Railway. Every template runs unmodified upstream images.</p>
				{#each groups as g (g.kind)}
					<h3>{g.kind}</h3>
					<ul class="table">
						{#each g.items as t (t.name)}
							<li>
								<a class="t-name" href={t.deploy}>{t.name}</a>
								<p>{t.desc}</p>
								<a class="t-src" href={t.source}>Source</a>
							</li>
						{/each}
					</ul>
				{/each}
			</div>
		</details>

		<details id="skills">
			<summary>
				<h2>Skills · {skills.length}</h2>
				{@render toggle()}
			</summary>
			<div class="fold">
				<ul class="table">
					{#each skills as s (s.name)}
						<li>
							<a class="t-name" href={s.source}>{s.name}</a>
							<p>{s.desc}</p>
							<a class="t-src" href={s.source}>Source</a>
						</li>
					{/each}
				</ul>
			</div>
		</details>
	</section>

	<section class="how" id="how" aria-labelledby="how-h">
		<div class="strip"><h2 id="how-h">How I work</h2></div>
		<ul class="how-grid">
			{#each how as x (x.h)}
				<li>
					<h3>{x.h}</h3>
					<p>{x.p}</p>
					{#if x.link}<a href={x.link[1]}>{x.link[0]}</a>{/if}
				</li>
			{/each}
		</ul>
	</section>
</main>

<footer class="foot">
	<a class="write" href="mailto:bartek@zaur.app">bartek@zaur.app</a>
	<div class="small">
		<p>© 2026 Bartosz Dymet</p>
		<a href={github}>github.com/nomideusz</a>
		<a href="https://register.zaur.app">Get an @zaur.app address</a>
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
		grid-template-columns: 38.35vw 9.4vw 10.4vw 10.4vw 11.9vw 1fr;
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
		font-size: 1.2vw;
		text-decoration: none;
	}
	.tabs a {
		border-left: var(--rule) solid var(--bar-rule);
	}
	.tabs a:last-child {
		border-right: var(--rule) solid var(--bar-rule);
	}
	.mail {
		justify-items: start;
		padding-left: 6.93vw;
		font-size: 1.45vw;
	}
	.bar a:hover {
		color: var(--orange);
	}
	.bar :focus-visible {
		outline-color: var(--orange);
		outline-offset: -3px;
	}

	.poster {
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
		height: 7.5vw;
		padding: 0 1.64vw 0.35vw 1.39vw;
		text-decoration: none;
	}
	.name {
		font-weight: 700;
		font-size: 4.87vw;
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
	.lit .name {
		color: var(--paper);
	}
	.row:focus-visible {
		outline: none;
	}

	/* The intro: who, in the column beside the products. */
	.intro {
		display: flex;
		flex-direction: column;
		padding: 2vw 1.6vw 1.6vw;
		background: var(--lilac);
	}
	.intro h1 {
		font-weight: 800;
		font-size: 3.7vw;
		line-height: 0.95;
		letter-spacing: -0.035em;
	}
	.role {
		margin-top: 0.8vw;
		font-weight: 700;
		font-size: max(14px, 1.3vw);
	}
	.pitch {
		max-width: 32ch;
		margin-top: 1.5vw;
		font-size: max(15px, 1.45vw);
		line-height: 1.35;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4vw 1.6vw;
		margin-top: 1.3vw;
		font-size: max(13px, 1.05vw);
	}
	.kit {
		margin-top: auto;
		padding-top: 1.6vw;
	}
	.kit h2 {
		margin-bottom: 0.7vw;
		font-weight: 700;
		font-size: max(12px, 0.95vw);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45vw;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 1em;
		height: 2.2vw;
		min-height: 28px;
		padding: 0 0.55vw;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font-size: max(12px, 0.95vw);
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
		font-size: 0.875rem;
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
		margin: 1.39vw 0 0;
		padding: 1rem 1.2rem 1.1rem;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
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
	.media {
		padding: 1.39vw;
		border-right: var(--rule) solid var(--ink);
		background: var(--lilac);
	}
	.window {
		position: relative;
		display: block;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.window img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	.parts {
		display: grid;
		aspect-ratio: 541 / 299;
		align-content: center;
		border: var(--rule) solid var(--ink);
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
	.p-used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.p-links {
		display: flex;
		gap: 1rem;
		justify-self: end;
	}

	/* How I work: four ruled cells. */
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
		justify-self: end;
	}

	/* Websites: always open, a grid of client sites ruled like the poster. */
	.strip {
		height: auto;
		padding-top: 1.6vw;
		padding-bottom: 1.1vw;
		cursor: auto;
		background: var(--ink);
		color: var(--paper);
	}
	.sites {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.sites > li {
		display: flex;
		flex-direction: column;
		border-right: var(--rule) solid var(--ink);
		border-bottom: var(--rule) solid var(--ink);
	}
	.sites > li:nth-child(2n),
	.sites > li:last-child {
		border-right: 0;
	}
	.sites > li:last-child,
	.sites > li:nth-last-child(2):nth-child(odd) {
		border-bottom: 0;
	}
	/* An odd one out takes the whole row: the site beside its facts. */
	.sites > li:last-child:nth-child(odd) {
		grid-column: 1 / -1;
		flex-direction: row;
	}
	.sites > li:last-child:nth-child(odd) > .shot {
		flex: 0 0 50%;
		border-right: var(--rule) solid var(--ink);
		border-bottom: 0;
	}
	.shot {
		position: relative;
		display: block;
		overflow: hidden;
		border-bottom: var(--rule) solid var(--ink);
	}
	.shot > :global(.live) {
		border: 0;
	}
	.sites img {
		display: block;
		width: 100%;
		height: auto;
	}
	.site {
		padding: 1.1rem 1.39vw 1.4rem;
	}
	.sites h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
		margin: 0;
		font-weight: 800;
		font-size: max(1.5rem, 2.4vw);
		letter-spacing: -0.035em;
	}
	.sites h3 a {
		text-decoration: none;
	}
	.sites h3 a:hover {
		text-decoration: underline;
	}
	.sites h3 span {
		font-weight: 500;
		font-size: 0.8125rem;
		padding: 0.05rem 0.45rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		letter-spacing: 0;
	}
	.site > p {
		max-width: 52ch;
		margin: 0.5rem 0 0.9rem;
	}
	.sites dl {
		font-size: 0.875rem;
	}
	.sites dl div {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.sites dt {
		color: var(--quiet);
	}
	.site .growth,
	.site .chips {
		margin-top: 1rem;
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
			grid-template-columns: repeat(4, 1fr);
			height: auto;
		}
		.mark {
			grid-column: 1 / 3;
			padding: 0.9rem 1rem;
			font-size: 1.5rem;
		}
		.mail {
			grid-column: 3 / 5;
			grid-row: 1;
			justify-self: end;
			padding-right: 1rem;
			font-size: 0.875rem;
		}
		.tabs a {
			height: 2.75rem;
			font-size: 0.875rem;
			border-top: var(--rule) solid var(--bar-rule);
			border-left: 0;
		}
		.tabs a + a {
			border-left: var(--rule) solid var(--bar-rule);
		}
		.tabs a:last-child {
			border-right: 0;
		}
		.poster {
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
			padding-top: 1.5rem;
		}
		.kit h2 {
			margin-bottom: 0.5rem;
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
			grid-template-columns: 1fr;
		}
		.media {
			padding: 1rem;
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
		.ptable li > p {
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
		.sites {
			grid-template-columns: 1fr;
		}
		.sites > li,
		.sites > li:nth-last-child(2):nth-child(odd) {
			border-right: 0;
			border-bottom: var(--rule) solid var(--ink);
		}
		.sites > li:last-child:nth-child(odd) {
			flex-direction: column;
		}
		.sites > li:last-child:nth-child(odd) > .shot {
			border-right: 0;
			border-bottom: var(--rule) solid var(--ink);
		}
		.sites > li:last-child {
			border-bottom: 0;
		}
		.site {
			padding: 1rem 1rem 1.25rem;
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
</style>
