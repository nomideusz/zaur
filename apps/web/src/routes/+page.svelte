<script lang="ts">
	import { onMount } from 'svelte';
	import { kinds, kindOf } from '#lib/template-kinds';
	import { platesFor } from '#lib/plates';

	let { data } = $props();

	const title = 'Zaur — apps, packages, templates';
	const description =
		'Everything I build in one place: Zaur apps, open-source npm packages, one-click Railway templates, and live websites.';
	const site = 'https://zaur.app/';
	const ld = {
		'@context': 'https://schema.org',
		'@graph': [
			{ '@type': 'WebSite', '@id': `${site}#site`, url: site, name: 'Zaur', description, publisher: { '@id': `${site}#org` } },
			{
				'@type': 'Organization',
				'@id': `${site}#org`,
				name: 'Zaur',
				url: site,
				logo: `${site}icon-512.png`,
				email: 'nom@zaur.app',
				sameAs: ['https://github.com/nomideusz', 'https://www.npmjs.com/~nomideusz']
			}
		]
	};

	const products = [
		{
			id: 'szkolyjogi',
			name: 'Szkoły Jogi',
			desc: 'The directory of yoga and pilates schools in Poland: class schedules, pass prices, reviews and online sign-up.',
			href: 'https://szkolyjogi.pl',
			lead: true,
			uses: ['zaur-world', 'svelte-calendar', 'svelte-search', 'svelte-i18n', 'svelte-geometrize', 'svelte-qr', 'svelte-media', 'svelte-scheduler', 'svelte-payments', 'svelte-notify']
		},
		{
			id: 'fixtar',
			name: 'Fixtar',
			desc: 'An online shop for power tools that I built and run for a client: catalogue, checkout, payments and order handling.',
			href: 'https://fixtar.pl',
			lead: true,
			client: true,
			uses: ['svelte-search']
		},
		{
			id: 'mail',
			name: 'Mail',
			desc: 'A clean inbox and your own @zaur.app address.',
			href: 'https://webmail.zaur.app',
			uses: ['svelte-calendar'],
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/mail2',
			account: true,
			// Mail, Register and Music share one Zaur account, so they sit in one cluster on the canvas.
			cluster: true
		},
		{
			id: 'register',
			name: 'Register',
			desc: 'Create your own @zaur.app email account.',
			href: 'https://register.zaur.app',
			cluster: true
		},
		{
			id: 'music',
			name: 'Music',
			desc: 'A private, self-hosted music library and radio powered by Navidrome.',
			href: 'https://music.zaur.app',
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/music',
			account: true,
			cluster: true
		},
		{
			id: 'thebest',
			name: 'thebest.travel',
			desc: 'A tour marketplace for Cracow: local guides, live availability and online booking with card payments.',
			href: 'https://thebest.travel',
			lead: true,
			uses: ['svelte-calendar', 'svelte-scheduler', 'svelte-search', 'svelte-i18n', 'svelte-qr', 'svelte-media', 'svelte-notify', 'svelte-payments']
		},
		{
			id: 'festivals',
			name: 'Friendly Festivals',
			desc: 'A worldwide directory of friendly, open-minded festivals: ceremony and embodiment gatherings next to boutique music and arts festivals.',
			href: 'https://festivals.zaur.app',
			lead: true,
			// A lead node placed in the right column so the three graph columns stay level.
			column: 'right',
			uses: ['zaur-world', 'svelte-search', 'svelte-i18n', 'svelte-media', 'svelte-notify']
		},
		{
			id: 'kino',
			name: 'Kino',
			desc: 'What plays in Polish cinemas today, hour by hour, with the small studio and culture-centre cinemas first.',
			href: 'https://kino.net.pl',
			lead: true,
			// Under the packages: a fourth lead node in any side column left that one hanging.
			column: 'middle',
			uses: ['svelte-i18n', 'svelte-notify']
		},
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

	// Sites people read or look at, as opposed to apps that keep state. The tag
	// says the relationship: client work, an experiment, or (untagged) my own.
	// Spec rows are facts visible on the live site. Strongest first: the lead
	// spans the row, the two features share the next one, the rest sit three across.
	const websites: { id: string; name: string; desc: string; href: string; tag?: string; lead?: boolean; feature?: boolean; specs: [string, string][] }[] = [
		{
			id: 'pikastro',
			name: 'pikastro.eu',
			desc: 'A colourful interior design studio in Kraków, with a custom CMS: the owner edits text and photos right on the live page.',
			href: 'https://pikastro.eu',
			tag: 'Client work',
			lead: true,
			specs: [
				['CMS', 'Custom, click-to-edit on the page, with edit history'],
				['Storage', 'Netlify Blobs, no database'],
				['Languages', 'Polish, English']
			]
		},
		{
			id: 'kurcz',
			name: 'kurcz.pl',
			desc: 'Everything about muscle cramps: causes, first aid and prevention, as fast static pages.',
			feature: true,
			href: 'https://kurcz.pl',
			specs: [
				['Built with', 'Astro, no JavaScript on article pages'],
				['Covers', 'Causes, first aid, prevention guides'],
				['Languages', 'Polish, English']
			]
		},
		{
			id: 'wibroakustyka',
			name: 'wibroakustyka.ai',
			desc: 'Product site for the Graal vibroacoustic wellness chair.',
			feature: true,
			href: 'https://wibroakustyka.ai',
			tag: 'Client work',
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
			tag: 'Client work',
			specs: [
				['CMS', 'Custom, written by hand before AI: the studio edits its own realisations'],
				['Sections', 'Realisations, workshop, publications, references']
			]
		},
		{
			id: 'kruk',
			name: 'kruk.live',
			desc: 'Five mini-apps live on one site: a drawing board, a kanban, pixel art, friends and a property scraper.',
			href: 'https://kruk.live',
			tag: 'Experiment',
			specs: [
				['Inside', 'Draw, Kanban, Pixels, Friends, Properties'],
				['Mode', 'Real-time and collaborative']
			]
		},
		{
			id: 'recycling',
			name: 'recycling.kompi.pl',
			desc: 'Where to hand in e-waste, batteries, oils and tyres, anywhere in Poland.',
			href: 'https://recycling.kompi.pl',
			tag: 'Experiment',
			specs: [
				['Data', 'Thousands of collection points, with a page for every city'],
				['Includes', 'Interactive map, city pages, a recycling guide']
			]
		},
		{
			id: 'intertech',
			name: 'intertechpoland.pl',
			desc: 'Equipment catalogue and industry news for the Polish representative of Picarro and UGT.',
			href: 'https://intertechpoland.pl',
			tag: 'Client work',
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
			tag: 'Client work',
			specs: [
				['Format', 'One page, in Polish and English'],
				['Covers', 'Treatments and the therapist']
			]
		},
		{
			id: 'radiobartek',
			name: 'radiobartek.com',
			desc: 'Internet radio station, self-hosted on AzuraCast.',
			href: 'https://radiobartek.com',
			tag: 'Experiment',
			specs: [
				['Stream', 'AzuraCast, self-hosted'],
				['Player', 'One page, one button: listen']
			]
		}
	];

	// Spec rows per app; every value is a fact from the app's own repo.
	const specs: Record<string, [string, string][]> = {
		szkolyjogi: [
			['Covers', 'Yoga and pilates schools across Poland'],
			['Built on', 'All 10 packages in this catalog'],
			['Languages', 'Polish, English, Ukrainian']
		],
		fixtar: [
			['Products', 'Synced from BaseLinker'],
			['Payments', 'PayU, Przelewy24'],
			['Search', '@nomideusz/svelte-search'],
			['Feeds', 'Google Merchant']
		],
		mail: [
			['Server', 'Stalwart, self-hosted'],
			['Protocol', 'JMAP'],
			['Includes', 'Calendar, contacts, files, Meet video calls'],
			['Client', 'Installable web app, push notifications, several accounts'],
			['Sign-in', 'One Zaur account for Mail, Music, Photos and Bartube']
		],
		register: [
			['Creates', 'A real @zaur.app mailbox'],
			['Talks to', 'Stalwart admin API']
		],
		thebest: [
			['Covers', 'Guided tours in Cracow'],
			['Payments', 'Stripe'],
			['Languages', 'English, Polish']
		],
		festivals: [
			['Covers', 'Festivals worldwide'],
			['Includes', 'Lineups, editions, reviews, organiser claims']
		],
		kino: [
			['Covers', 'Cinemas across Poland, small ones first'],
			['Data', 'Programmes crawled every 6 hours']
		],
		music: [
			['Server', 'Navidrome, self-hosted'],
			['Client', 'Installable web app'],
			['Sign-in', 'Your Zaur account']
		]
	};

	// Lead projects come first, in the order the poster shows them; any project
	// not named here follows in catalog order.
	const order = ['szkolyjogi', 'fixtar', 'thebest', 'festivals', 'kino', 'mail', 'music', 'register'];
	const rank = (id: string) => (order.indexOf(id) + 1 || order.length + 1);
	// Windows: a capture of the live site (src/lib/windows, provenance embedded),
	// replaced by the site itself in an iframe where the site allows framing.
	const shots = import.meta.glob('../lib/windows/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
	const shot = (id: string) => shots[`../lib/windows/${id}.webp`];
	const framable = new Set(['szkolyjogi']);
	const host = (href: string) => new URL(href).host;
	// Which of a project's packages its three chips show first.
	const chipsFirst: Record<string, string[]> = {
		szkolyjogi: ['svelte-search', 'svelte-i18n', 'zaur-world'],
		thebest: ['svelte-search', 'svelte-calendar', 'svelte-qr']
	};
	const chipOrder = (id: string, uses: string[]) => {
		const first = chipsFirst[id] ?? [];
		return [...first.filter((u) => uses.includes(u)), ...uses.filter((u) => !first.includes(u))];
	};

	const pkgs = packages.map((p) => ({ ...p, id: p.name.split('/')[1] }));
	const projects = [...products]
		.sort((a, b) => rank(a.id) - rank(b.id))
		.map((p) => ({ ...p, uses: chipOrder(p.id, p.uses ?? []), specs: specs[p.id] ?? [], shot: shot(p.id), live: framable.has(p.id) }));
	const sites = websites.map((w) => ({ ...w, plates: platesFor(w.id, w.name) }));
	const groups = kinds
		.map(([kind]) => ({ kind, items: templates.filter((t) => kindOf(t.name) === kind) }))
		.filter((g) => g.items.length);
	const npmOf = (id: string) => pkgs.find((p) => p.id === id)?.npm;

	// The signature: pointing at a package lights the projects built from it,
	// pointing at a project lights its packages. No lines, only light.
	let active = $state<{ kind: 'pkg' | 'proj'; id: string } | null>(null);
	const litPkgs = $derived.by(() => {
		if (!active) return null;
		if (active.kind === 'pkg') return new Set([active.id]);
		return new Set(projects.find((p) => p.id === active!.id)?.uses ?? []);
	});
	const litProjs = $derived.by(() => {
		if (!active) return null;
		if (active.kind === 'proj') return new Set([active.id]);
		return new Set(projects.filter((p) => p.uses.includes(active!.id)).map((p) => p.id));
	});
	const point = (kind: 'pkg' | 'proj', id: string) => () => {
		active = { kind, id };
		if (kind === 'pkg') reveal();
	};
	const leave = () => (active = null);

	// When a lit project sits below the column's fold, bring the first one up.
	let column = $state<HTMLElement>();
	function reveal() {
		const first = column?.querySelector<HTMLElement>('.proj.lit');
		if (!column || !first) return;
		const top = first.offsetTop - column.offsetTop;
		if (top < column.scrollTop || top + 40 > column.scrollTop + column.clientHeight) {
			const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
			column.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
		}
	}

	// Seeded once from the prerendered numbers; npm refreshes them on mount.
	// svelte-ignore state_referenced_locally
	let versions = $state<Record<string, string>>({ ...data.versions });
	let registryDown = $state(false);
	let traffic = $state<{ clicksPerDay: number; monthAgo: number | null } | null>(null);
	let trafficDown = $state(false);
	let frameWidth = $state(541);
	let framed = $state(false);
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
	<meta property="og:image:alt" content="Zaur package names with their versions beside the words Projects, packages, templates." />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${JSON.stringify(ld)}</script>`}
</svelte:head>

<header class="bar">
	<a class="mark" href="/" aria-label="Zaur, home">ZAUR</a>
	<nav class="tabs" aria-label="Sections">
		<a href="#projects">Projects</a>
		<a href="#packages">Packages</a>
		<a href="#websites">Websites</a>
		<a href="#templates">Templates</a>
	</nav>
	<a class="mail" href="mailto:nom@zaur.app">nom@zaur.app</a>
</header>

<main>
	<h1 class="sr">Zaur: projects and the packages they are built from</h1>
	<div class="poster" class:pointing={active}>
		<section class="programme" id="packages" aria-labelledby="packages-h">
			<h2 class="sr" id="packages-h">Packages</h2>
			<ul>
				{#each pkgs as p (p.id)}
					<li class:lit={litPkgs?.has(p.id)}>
						<a
							class="row"
							href={p.demo ?? p.npm}
							onpointerenter={point('pkg', p.id)}
							onpointerleave={leave}
							onfocus={point('pkg', p.id)}
							onblur={leave}
						>
							<span class="name">{p.id}</span>
							<span class="sr">: {p.desc}</span>
							<span class="ver" aria-label="version {version(p.id)}">{version(p.id)}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<section class="projects" id="projects" aria-labelledby="projects-h" bind:this={column}>
			<h2 class="sr" id="projects-h">Projects</h2>
			{#each projects as a (a.id)}
				<article
					class="proj"
					class:lit={litProjs?.has(a.id)}
					class:bare={!a.shot}
					onpointerenter={point('proj', a.id)}
					onpointerleave={leave}
					onfocusin={point('proj', a.id)}
					onfocusout={leave}
				>
					<div class="body">
						<h3>
							{#if a.live}<span class="dot" class:off={!traffic && !trafficDown} aria-hidden="true"></span>{/if}
							<a href={a.href}>{a.name}</a>
						</h3>
						<p class="where">
							<span>{host(a.href)}</span>
							{#if a.live && !trafficDown}
								<span>{traffic?.clicksPerDay ?? '…'} search clicks a day · Google Search</span>
							{:else if a.client}
								<span>client work</span>
							{:else if a.account}
								<span>needs a Zaur address</span>
							{/if}
						</p>
						{#if a.shot}
							<a class="window" href={a.href} tabindex="-1" aria-hidden="true" bind:clientWidth={frameWidth}>
								<img src={a.shot} alt="" width="1200" height="663" loading={a.live ? 'eager' : 'lazy'} />
								{#if a.live}
									<iframe
										src={a.href}
										title="{a.name}, live"
										loading="lazy"
										tabindex="-1"
										class:shown={framed}
										style:--s={frameWidth / 1440}
										onload={() => (framed = true)}
									></iframe>
								{/if}
							</a>
						{:else}
							<p class="desc">{a.desc}</p>
						{/if}
					</div>
					{#if a.uses.length}
						<ul class="chips" aria-label="Built with">
							{#each a.uses.slice(0, 3) as u (u)}
								<li class:lit={litPkgs?.has(u)}>
									<a class="chip" href={npmOf(u)}><span>{u}</span><span>{version(u)}</span></a>
								</li>
							{/each}
							{#if a.uses.length > 3}
								<li class="more">+{a.uses.length - 3} more</li>
							{/if}
						</ul>
					{/if}
				</article>
			{/each}
		</section>
	</div>

	<section class="websites" id="websites" aria-labelledby="websites-h">
		<div class="strip"><h2 id="websites-h">Websites · {websites.length}</h2></div>
		<ul class="sites">
			{#each sites as w (w.id)}
				<li>
					{#if w.plates}
						<a class="shot" href={w.href} tabindex="-1" aria-hidden="true">
							<img src={w.plates.frames[0].src} alt="" width="1200" height="750" loading="lazy" />
						</a>
					{/if}
					<div class="site">
						<h3><a href={w.href}>{w.name}</a>{#if w.tag}<span>{w.tag}</span>{/if}</h3>
						<p>{w.desc}</p>
						<dl>
							{#each w.specs as [k, v] (k)}<div><dt>{k}</dt><dd>{v}</dd></div>{/each}
						</dl>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section class="folds" aria-label="More">
		<details id="templates">
			<summary>
				<h2>Templates · {templates.length}</h2>
				{@render toggle()}
			</summary>
			<div class="fold">
				<p class="lede">One-click Railway deploys: every template is open source and runs unmodified upstream images.</p>
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
</main>

<footer class="foot">
	<p>© 2026 Zaur</p>
	<a href="https://github.com/nomideusz">github.com/nomideusz</a>
	<a href="https://register.zaur.app">Get an @zaur.app address</a>
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
		grid-template-columns: 38.35vw 10.15vw 11.15vw 11.15vw 11.4vw 1fr;
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

	/* The programme: package names as the poster. */
	.programme {
		background: var(--orange);
		border-right: var(--rule-heavy) solid var(--ink);
	}
	.programme li + li .row {
		border-top: var(--rule) solid var(--orange-rule);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 5.135vw;
		padding: 0.15vw 1.64vw 0 1.39vw;
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
		padding-top: 0.45vw;
		font-variant-numeric: tabular-nums;
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

	/* The column: live projects, three in view, the rest a scroll away. */
	.projects {
		contain: size;
		overflow-y: auto;
		background: var(--lilac);
		scrollbar-width: thin;
		scrollbar-color: var(--ink) var(--lilac);
	}
	.proj {
		display: grid;
		grid-template-columns: 23.3vw 1fr;
	}
	.proj + .proj {
		border-top: var(--rule-heavy) solid var(--ink);
	}
	.proj:not(.bare) {
		height: calc(51.35vw / 3);
	}
	.body {
		padding: 1.2vw 1.15vw 0.9vw 1.19vw;
		border-right: var(--rule) solid var(--ink);
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 0.5vw;
		font-weight: 700;
		font-size: 1.5vw;
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
		width: 0.8vw;
		height: 0.8vw;
		border-radius: 50%;
		background: var(--live);
	}
	.dot.off {
		background: var(--quiet);
	}
	.where {
		display: flex;
		justify-content: space-between;
		gap: 1em;
		margin-top: 0.15vw;
		font-size: max(12px, 0.9vw);
	}
	.where span + span {
		font-size: max(12px, 0.78vw);
		text-align: right;
	}
	.window {
		position: relative;
		display: block;
		margin-top: 0.85vw;
		aspect-ratio: 541 / 299;
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
	.window iframe {
		position: absolute;
		inset: 0 auto auto 0;
		width: 1440px;
		height: calc(1440px * 299 / 541);
		border: 0;
		transform: scale(var(--s, 0.375));
		transform-origin: 0 0;
		pointer-events: none;
		visibility: hidden;
	}
	.window iframe.shown {
		visibility: visible;
	}
	.desc {
		margin-top: 0.8vw;
		max-width: 38ch;
		font-size: max(13px, 0.95vw);
	}
	.chips {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.48vw;
		padding: 6.33vw 1.35vw 1.07vw 0.66vw;
	}
	.bare .chips {
		padding-top: 1.07vw;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 1.2em;
		height: 2.39vw;
		min-height: 28px;
		padding: 0 0.55vw;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		font-size: max(12px, 1vw);
		white-space: nowrap;
		text-decoration: none;
	}
	.chips .lit .chip {
		background: var(--chip);
	}
	.more {
		padding-left: 0.6vw;
		font-size: max(12px, 0.95vw);
	}
	.pointing .proj:not(.lit) {
		color: color-mix(in srgb, var(--ink) 45%, var(--lilac));
	}
	.pointing .proj:not(.lit) .window,
	.pointing .proj:not(.lit) .chip {
		opacity: 0.35;
	}

	/* Folds: closed catalogs, opened in place. */
	.folds details {
		border-bottom: var(--rule) solid var(--ink);
		interpolate-size: allow-keywords;
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
		font-size: 1.125rem;
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
	.websites {
		border-bottom: var(--rule-heavy) solid var(--ink);
	}
	.strip {
		cursor: auto;
		border-bottom: var(--rule) solid var(--ink);
	}
	.sites {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.sites li {
		display: flex;
		flex-direction: column;
		border-right: var(--rule) solid var(--ink);
		border-bottom: var(--rule) solid var(--ink);
	}
	.sites li:nth-child(3n) {
		border-right: 0;
	}
	.sites li:nth-last-child(-n + 3):nth-child(3n + 1),
	.sites li:nth-last-child(-n + 3):nth-child(3n + 1) ~ li {
		border-bottom: 0;
	}
	.shot {
		display: block;
		border-bottom: var(--rule) solid var(--ink);
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
		font-weight: 700;
		font-size: max(1.25rem, 1.5vw);
		letter-spacing: -0.02em;
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
	.sites p {
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

	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 2rem;
		padding: 1.5rem 1.39vw 2rem;
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
			height: 11vw;
			padding: 0 1rem;
		}
		.name {
			font-size: 8.4vw;
		}
		.ver {
			font-size: 0.9375rem;
		}
		.projects {
			contain: none;
			overflow: visible;
		}
		.proj {
			grid-template-columns: 1fr;
		}
		.proj:not(.bare) {
			height: auto;
		}
		.body {
			padding: 1.25rem 1rem 0;
			border-right: 0;
		}
		h3 {
			gap: 0.5rem;
			font-size: 1.5rem;
		}
		.dot {
			width: 0.75rem;
			height: 0.75rem;
		}
		.window {
			margin-top: 1rem;
		}
		.desc {
			margin-top: 0.5rem;
		}
		.chips,
		.bare .chips {
			flex-flow: row wrap;
			gap: 0.5rem;
			padding: 1rem;
		}
		.chip {
			height: 2.25rem;
			padding: 0 0.6rem;
			font-size: 0.875rem;
		}
		.more {
			align-self: center;
			font-size: 0.875rem;
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
			padding: 0 1rem;
		}
		.sites {
			grid-template-columns: 1fr;
		}
		.sites li,
		.sites li:nth-last-child(-n + 3):nth-child(3n + 1),
		.sites li:nth-last-child(-n + 3):nth-child(3n + 1) ~ li {
			border-right: 0;
			border-bottom: var(--rule) solid var(--ink);
		}
		.sites li:last-child {
			border-bottom: 0;
		}
		.site {
			padding: 1rem 1rem 1.25rem;
		}
		.t-src {
			justify-self: start;
		}
		.foot {
			padding: 1.5rem 1rem 2rem;
		}
	}
</style>
