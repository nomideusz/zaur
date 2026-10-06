<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from '$lib/Icon.svelte';
	import { kinds, kindOf } from '$lib/template-kinds';
	import mailDesktop from '$lib/plates/mail-desktop.webp';
	import mailPhone from '$lib/plates/mail-phone.webp';
	import musicDesktop from '$lib/plates/music-desktop.webp';

	const title = 'Zaur — apps, packages, templates';
	const description =
		'Everything I build in one place: Zaur apps, open-source npm packages, one-click Railway templates, and live websites.';

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
			plates: [
				{ src: mailDesktop, w: 1440, h: 900, alt: 'Zaur Mail on a desktop: folders on the left, the inbox list, and an open three-message thread.' },
				{ src: mailPhone, w: 585, h: 1266, alt: 'Zaur Mail on a phone: the inbox with unread and flagged messages.' }
			]
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
			desc: 'Your sky for the next 24 hours — real sun, moon, stars, and live weather on one quiet page.',
			href: 'https://dino.zaur.app',
			uses: ['zaur-world']
		},
		{
			id: 'music',
			name: 'Music',
			desc: 'A private, self-hosted music library and radio powered by Navidrome.',
			href: 'https://music.zaur.app',
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/music',
			plates: [
				{ src: musicDesktop, w: 1440, h: 460, alt: 'Zaur Music on a desktop: the library home with recently added albums.' }
			]
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
			href: 'https://newinternet.online',
			lead: true,
			uses: ['zaur-world', 'svelte-search', 'svelte-i18n', 'svelte-media', 'svelte-notify']
		},
		{
			id: 'pikastro',
			name: 'Pikastro',
			desc: 'The site of a colourful interior design studio in Kraków, with a custom CMS: the owner edits text and photos right on the live page.',
			href: 'https://pikastro.eu',
			lead: true,
			client: true,
			// No package wires, so it sits under the packages and evens out the canvas.
			middle: true
		},
		{
			id: 'kurcz',
			name: 'kurcz.pl',
			desc: 'Everything about muscle cramps: causes, first aid and prevention, as fast static pages.',
			href: 'https://kurcz.pl'
		}
	];

	const packages = [
		{
			name: '@nomideusz/zaur-world',
			desc: 'A living ambient sky — real sun times, weather, true star positions, eclipses, and a pixel dinosaur who lives in it. Zero dependencies.',
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
			source: 'https://github.com/nomideusz/zaur/tree/main/apps/webmail'
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

	const websites = [
		{
			id: 'recycling',
			name: 'recycling.kompi.pl',
			desc: 'Map of e-waste, battery, and fluorescent-lamp collection points across Poland.',
			href: 'https://recycling.kompi.pl'
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
			id: 'polaczenie',
			name: 'gabinet-polaczenie.pl',
			desc: 'Acupuncture clinic in Kraków offering treatments that complement conventional care.',
			href: 'https://gabinet-polaczenie.pl'
		},
		{
			id: 'radiobartek',
			name: 'radiobartek.com',
			desc: 'Internet radio station, self-hosted on AzuraCast.',
			href: 'https://radiobartek.com'
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
		dino: [
			['Engine', '@nomideusz/zaur-world'],
			['Shows', 'Sun, moon, stars, live weather'],
			['Window', 'The next 24 hours']
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
		kurcz: [
			['Built with', 'Astro, no JavaScript on article pages'],
			['Covers', 'Causes, first aid, prevention guides'],
			['Languages', 'Polish, English']
		],
		pikastro: [
			['CMS', 'Custom, click-to-edit on the page'],
			['Edits', 'Text and photos, with edit history'],
			['Storage', 'Netlify Blobs, no database'],
			['Languages', 'Polish, English']
		],
		music: [
			['Server', 'Navidrome, self-hosted'],
			['Client', 'Installable web app'],
			['Sign-in', 'Your Zaur account']
		]
	};

	// Part numbers: templates count up from the oldest, so a new card at the
	// top of the list gets the next number and existing ones never shift.
	const apps = products.map((p, i) => ({ ...p, part: `A${i + 1}`, specs: specs[p.id] ?? [], uses: p.uses ?? [] }));
	const pkgs = packages.map((p, i) => ({ ...p, part: `P${i + 1}`, id: p.name.split('/')[1] }));
	const skls = skills.map((s, i) => ({ ...s, part: `S${i + 1}` }));
	// Stack column: the services a template's own description names.
	const stackWords: [RegExp, string][] = [
		[/postgres|pgvector/i, 'Postgres'],
		[/mariadb|mysql/i, 'MariaDB'],
		[/mongodb/i, 'MongoDB'],
		[/redis/i, 'Redis'],
		[/clickhouse/i, 'ClickHouse'],
		[/elasticsearch/i, 'Elasticsearch'],
		[/bucket/i, 'Bucket'],
		[/backups?/i, 'Backups']
	];
	const stackOf = (desc: string) => stackWords.filter(([re]) => re.test(desc)).map(([, w]) => w);
	const tpls = templates.map((t, i) => ({
		...t,
		part: `T${templates.length - i}`,
		kind: kindOf(t.name),
		stack: stackOf(t.desc)
	}));

	let query = $state('');
	let search: HTMLInputElement;
	const needle = $derived(query.trim().toLowerCase());
	const hits = (...fields: (string | undefined)[]) =>
		!needle || fields.some((f) => f?.toLowerCase().includes(needle));

	const shownApps = $derived(apps.filter((a) => hits(a.part, a.name, a.desc, ...a.specs.flat())));

	// "Look inside": screenshots of apps that need an account to open.
	let viewer: HTMLDialogElement;
	let viewing = $state<(typeof apps)[number] | null>(null);
	const lookInside = (a: (typeof apps)[number]) => ((viewing = a), viewer.showModal());
	const shownPkgs = $derived(pkgs.filter((p) => hits(p.part, p.name, p.desc)));
	const shownSkills = $derived(skls.filter((s) => hits(s.part, s.name, s.desc)));
	const shownTpls = $derived(tpls.filter((t) => hits(t.part, t.name, t.desc, t.kind, ...t.stack)));
	const shownSites = $derived(websites.filter((w) => hits(w.name)));
	const groups = $derived(
		kinds
			.map(([kind]) => ({ kind, rows: shownTpls.filter((t) => t.kind === kind) }))
			.filter((g) => g.rows.length)
	);
	// Wires: one per real import, drawn only while both ends are on the canvas.
	const edges = $derived(
		shownApps.flatMap((a) =>
			a.uses.filter((id) => shownPkgs.some((p) => p.id === id)).map((to) => ({ from: a.id, to, key: `${a.id}>${to}` }))
		)
	);

	// Tracing: hovering or focusing a node lights its wires and the nodes they reach.
	let active = $state<string | null>(null);
	const reach = $derived.by(() => {
		if (!active) return null;
		const ids = new Set([active]);
		for (const e of edges) {
			if (e.from === active) ids.add(e.to);
			if (e.to === active) ids.add(e.from);
		}
		return ids;
	});
	const lit = (e: { from: string; to: string }) => e.from === active || e.to === active;

	// Nodes drag by their header on wide screens; the wires follow.
	let offsets = $state<Record<string, { x: number; y: number }>>({});
	const moved = $derived(Object.keys(offsets).length > 0);
	let dragging = $state<string | null>(null);
	let graph = $state<HTMLElement>();
	let paths = $state<Record<string, string>>({});
	let ports = $state<{ x: number; y: number }[]>([]);
	let wide = $state(false);

	function grab(e: PointerEvent, id: string) {
		if (!wide || e.button !== 0 || (e.target as HTMLElement).closest('a, button')) return;
		const head = e.currentTarget as HTMLElement;
		const from = offsets[id] ?? { x: 0, y: 0 };
		head.setPointerCapture(e.pointerId);
		dragging = id;
		const move = (m: PointerEvent) => {
			offsets[id] = { x: from.x + m.clientX - e.clientX, y: from.y + m.clientY - e.clientY };
		};
		const drop = () => {
			dragging = null;
			head.removeEventListener('pointermove', move);
			head.removeEventListener('pointerup', drop);
			head.removeEventListener('pointercancel', drop);
		};
		head.addEventListener('pointermove', move);
		head.addEventListener('pointerup', drop);
		head.addEventListener('pointercancel', drop);
	}

	// Port to port, measured from the rendered nodes. Packages sit between their
	// consumers, so a wire leaves and enters on whichever side faces the other end.
	function route() {
		if (!graph || !wide) return;
		const g = graph.getBoundingClientRect();
		const box = (id: string) => graph!.querySelector(`[data-node="${id}"]`)?.getBoundingClientRect();
		const next: Record<string, string> = {};
		const dots = new Map<string, { x: number; y: number }>();
		for (const e of edges) {
			const a = box(e.from);
			const b = box(e.to);
			if (!a || !b) continue;
			const right = a.left + a.width / 2 < b.left + b.width / 2;
			const p = { x: (right ? a.right : a.left) - g.left, y: a.top + 22 - g.top };
			const q = { x: (right ? b.left : b.right) - g.left, y: b.top + 22 - g.top };
			const dx = Math.max(48, Math.abs(q.x - p.x) * 0.45) * (right ? 1 : -1);
			next[e.key] = `M${p.x} ${p.y}C${p.x + dx} ${p.y} ${q.x - dx} ${q.y} ${q.x} ${q.y}`;
			dots.set(`${p.x},${p.y}`, p).set(`${q.x},${q.y}`, q);
		}
		paths = next;
		ports = [...dots.values()];
	}

	$effect(() => {
		void [edges, offsets[dragging ?? ''], wide, Object.keys(offsets).length];
		tick().then(route);
	});

	const total = $derived(shownApps.length + shownPkgs.length + shownSkills.length + shownTpls.length);

	const index = $derived([
		{ href: '#apps', label: 'Apps', count: shownApps.length },
		{ href: '#packages', label: 'Packages', count: shownPkgs.length },
		{ href: '#skills', label: 'Skills', count: shownSkills.length },
		{ href: '#templates', label: 'Templates', count: shownTpls.length },
		{ href: '#websites', label: 'Websites', count: shownSites.length }
	]);

	// Split text around the search term so matches can be marked without {@html}.
	function pieces(text: string) {
		if (!needle) return [{ text, hit: false }];
		const out: { text: string; hit: boolean }[] = [];
		const lower = text.toLowerCase();
		let at = 0;
		for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, at)) {
			if (i > at) out.push({ text: text.slice(at, i), hit: false });
			out.push({ text: text.slice(i, i + needle.length), hit: true });
			at = i + needle.length;
		}
		if (at < text.length) out.push({ text: text.slice(at), hit: false });
		return out;
	}

	// Live stock data: current version, runtime dependencies and licence, read
	// from the npm registry in the visitor's browser.
	let stock = $state<Record<string, { version: string; deps: number; license?: string }>>({});
	let registryDown = $state(false);

	// szkolyjogi.pl search clicks, served by static-server.mjs from Search Console.
	let traffic = $state<{ clicksPerDay: number; monthAgo: number | null } | null>(null);
	let trafficDown = $state(false);

	onMount(() => {
		const mq = matchMedia('(min-width: 861px)');
		const sync = () => {
			wide = mq.matches;
			if (!wide) offsets = {};
		};
		sync();
		mq.addEventListener('change', sync);
		// Live data and font loading change node heights, so the wires re-route.
		const ro = new ResizeObserver(() => route());
		if (graph) for (const el of [graph, ...graph.querySelectorAll('.col, .stack')]) ro.observe(el);
		document.fonts?.ready.then(route);

		fetch('/api/traffic')
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((t) => (traffic = t))
			.catch(() => (trafficDown = true));

		for (const p of packages) {
			fetch(`https://registry.npmjs.org/${p.name}/latest`)
				.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
				.then((j) => {
					stock[p.name] = {
						version: j.version,
						deps: Object.keys(j.dependencies ?? {}).length,
						license: j.license
					};
				})
				.catch(() => (registryDown = true));
		}

		return () => {
			mq.removeEventListener('change', sync);
			ro.disconnect();
		};
	});

	let copied = $state('');
	let copiedTimer: ReturnType<typeof setTimeout>;
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = text;
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (copied = ''), 1600);
		} catch {
			search?.focus();
		}
	}

	function onkeydown(e: KeyboardEvent) {
		const t = e.target as HTMLElement;
		if (e.key === '/' && !t.closest('input, textarea, [contenteditable]')) {
			e.preventDefault();
			search.focus();
		}
	}
</script>

{#snippet hl(text: string)}{#each pieces(text) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}{/snippet}

{#snippet appNode(a: (typeof apps)[number])}
	{@const o = offsets[a.id]}
	<article
		class="node node--app"
		class:node--lead={a.lead}
		class:dim={reach && !reach.has(a.id)}
		class:held={dragging === a.id}
		id={a.id}
		data-node={a.id}
		aria-labelledby="{a.id}-name"
		style:translate={o ? `${o.x}px ${o.y}px` : null}
		onpointerenter={() => (active = a.id)}
		onpointerleave={() => (active = null)}
		onfocusin={() => (active = a.id)}
		onfocusout={() => (active = null)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions (dragging is a pointer-only extra) -->
	<header class="node__head" onpointerdown={(e) => grab(e, a.id)}>
			<span class="part">{@render hl(a.part)}</span>
			<h3 id="{a.id}-name">{@render hl(a.name)}</h3>
			<span class="host">{new URL(a.href).host}</span>
		</header>
		<div class="node__body">
			{#if a.client}<p class="tag">Client work</p>{/if}
			<p class="node__desc">{@render hl(a.desc)}</p>
			{#if a.id === 'szkolyjogi'}
				<div class="readout">
					<span class="dot" class:dot--off={!traffic}></span>
					<p>
						<strong>{traffic ? traffic.clicksPerDay : trafficDown ? '—' : '…'}</strong>
						search clicks a day{#if traffic?.monthAgo && traffic.monthAgo < traffic.clicksPerDay}, up from {traffic.monthAgo} a month ago{/if}
						<small>Google Search Console, last 7 days</small>
					</p>
				</div>
			{/if}
			<dl class="props">
				{#each a.specs as [k, v] (k)}
					<div><dt>{k}</dt><dd>{@render hl(v)}</dd></div>
				{/each}
			</dl>
			{#if a.uses.length}
				<p class="imports">
					<span>Imports</span>
					{#each a.uses as u (u)}<a class="port-chip mono" href="#pkg-{u}">{u}</a>{/each}
				</p>
			{/if}
			{#if a.plates}
				<p class="node__note">Needs a Zaur address. <a href="#register">Get one free</a>.</p>
				<div class="actions">
					<a class="btn" href={a.href}>Sign in to {a.name} <Icon name="out" /></a>
					<button type="button" class="btn btn--quiet" onclick={() => lookInside(a)}>Look inside</button>
					<a class="node__link" href={a.source}>Source</a>
				</div>
			{:else}
				<div class="actions"><a class="btn" href={a.href}>Open {a.name} <Icon name="out" /></a></div>
			{/if}
		</div>
	</article>
{/snippet}

<svelte:window {onkeydown} />

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://zaur.app/" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<link rel="canonical" href="https://zaur.app/" />
</svelte:head>

<div class="board">
	<header class="bar">
		<a class="logo" href="/" aria-label="Zaur home">ZAUR</a>
		<nav class="bar__nav" aria-label="Sections">
			{#each index as s (s.href)}
				<a href={s.href} class:empty={!s.count}>{s.label} <span class="n">{s.count}</span></a>
			{/each}
		</nav>
		<div class="finder" role="search">
			<label class="visually-hidden" for="find">Find anything on the canvas</label>
			<Icon name="search" />
			<input
				id="find"
				type="search"
				bind:this={search}
				bind:value={query}
				placeholder="postgres, svelte, browser, T42…"
				autocomplete="off"
				spellcheck="false"
			/>
			<kbd aria-hidden="true">/</kbd>
		</div>
		<a class="bar__mail" href="mailto:nom@zaur.app">nom@zaur.app</a>
	</header>

	<main class="canvas">
		<section class="hello" aria-labelledby="hello-title">
			<h1 id="hello-title">I build software and keep it running.</h1>
			<p class="hello__lede">
				Apps, open-source packages and one-click deploy templates, all made and run by me. Every
				connection is real: an app is wired only to the packages it actually imports.
			</p>
			<p class="hello__meta" aria-live="polite">
				<span class="count">
					{#if needle}{total} of {apps.length + pkgs.length + skls.length + tpls.length} nodes match{:else}{apps.length + pkgs.length + skls.length + tpls.length} nodes{/if}
				</span>
				{#if wide}<span>Hover a node to trace its wires. Drag one by its header.</span>{/if}
				{#if moved}
					<button type="button" class="link" onclick={() => (offsets = {})}>Put the nodes back</button>
				{/if}
			</p>
		</section>

		{#if !total && !shownSites.length}
			<div class="nothing">
				<p>Nothing on the canvas matches “{query.trim()}”.</p>
				<button type="button" class="btn btn--light" onclick={() => ((query = ''), search.focus())}>Clear the search</button>
			</div>
		{/if}

		<div class="graph" class:tracing={reach} bind:this={graph} hidden={!shownApps.length && !shownPkgs.length && !shownSkills.length}>
			<svg class="wires" aria-hidden="true">
				{#each edges as e, i (e.key)}
					{#if paths[e.key]}
						<path d={paths[e.key]} pathLength="1" class:lit={reach && lit(e)} style:--i={i} />
					{/if}
				{/each}
			</svg>

			<section class="col col--apps" id="apps" aria-labelledby="apps-title" hidden={!shownApps.length}>
				<h2 class="frame-label" id="apps-title">Apps <span class="n">{shownApps.length}</span></h2>
				<div class="stack stack--lead">
					{#each shownApps.filter((a) => a.lead && !a.middle) as a (a.id)}{@render appNode(a)}{/each}
				</div>
				<p class="frame-label frame-label--more" aria-hidden="true">More apps</p>
				<div class="stack">
					{#each shownApps.filter((a) => !a.lead) as a (a.id)}{@render appNode(a)}{/each}
				</div>
			</section>

			<section class="col col--pkgs" id="packages" aria-labelledby="packages-title" hidden={!shownPkgs.length && !shownSkills.length && !shownApps.some((a) => a.middle)}>
				<h2 class="frame-label" id="packages-title">
					Packages <span class="n">{shownPkgs.length}</span>
					<span class="frame-note">Live from npm{#if registryDown}; the registry didn't answer, so some figures are missing{/if}</span>
				</h2>
				{#each shownPkgs as p (p.id)}
					{@const s = stock[p.name]}
					{@const cmd = `pnpm add ${p.name}`}
					{@const o = offsets[p.id]}
					<article
						class="node node--pkg"
						class:dim={reach && !reach.has(p.id)}
						class:held={dragging === p.id}
						id="pkg-{p.id}"
						data-node={p.id}
						aria-labelledby="pkg-{p.id}-name"
						style:translate={o ? `${o.x}px ${o.y}px` : null}
						onpointerenter={() => (active = p.id)}
						onpointerleave={() => (active = null)}
						onfocusin={() => (active = p.id)}
						onfocusout={() => (active = null)}
					>
						<!-- svelte-ignore a11y_no_static_element_interactions (dragging is a pointer-only extra) -->
						<header class="node__head" onpointerdown={(e) => grab(e, p.id)}>
							<span class="part">{@render hl(p.part)}</span>
							<h3 id="pkg-{p.id}-name">{@render hl(p.id)}</h3>
							<span class="ver mono" class:ver--off={!s}>{s ? `v${s.version}` : registryDown ? '—' : '…'}</span>
						</header>
						<div class="node__body">
							<p class="node__desc">{@render hl(p.desc)}</p>
							<p class="facts">
								<span class:zero={s?.deps === 0}>{s ? `${s.deps} ${s.deps === 1 ? 'dep' : 'deps'}` : '… deps'}</span>
								<span>{s?.license ?? '…'}</span>
							</p>
							<button type="button" class="cmd" onclick={() => copy(cmd)} aria-label="Copy “{cmd}”">
								<code>{cmd}</code>
								<span class="cmd__state">{#if copied === cmd}<Icon name="check" /> Copied{:else}<Icon name="copy" /> Copy{/if}</span>
							</button>
							<p class="links">
								<a href={p.npm}>npm</a>
								{#if p.demo}<a href={p.demo}>Demo</a>{/if}
								{#if p.source}<a href={p.source}>Source</a>{/if}
							</p>
						</div>
					</article>
				{/each}
				{#each shownApps.filter((a) => a.middle) as a (a.id)}{@render appNode(a)}{/each}
				{#each shownSkills as s (s.name)}
					<article class="node node--skill" id="skills" aria-labelledby="skill-{s.part}" class:dim={!!reach}>
						<header class="node__head">
							<span class="part">{@render hl(s.part)}</span>
							<h3 id="skill-{s.part}">{@render hl(s.name)}</h3>
							<span class="host">Agent skill</span>
						</header>
						<div class="node__body">
							<p class="node__desc">{@render hl(s.desc)}</p>
							<div class="actions"><a class="btn btn--quiet" href={s.source}>Source <Icon name="out" /></a></div>
						</div>
					</article>
				{/each}
			</section>

			<svg class="ports" aria-hidden="true">
				{#each ports as p (`${p.x},${p.y}`)}<circle cx={p.x} cy={p.y} r="5.5" />{/each}
			</svg>
		</div>

		<section class="frame" id="templates" aria-labelledby="templates-title" hidden={!shownTpls.length}>
			<div class="frame__top">
				<h2 class="frame-label" id="templates-title">Railway templates <span class="n">{shownTpls.length}</span></h2>
				<p>
					One-click deploys, many with the admin created on first boot and nightly backups to a
					Railway bucket. New to Railway? <a href="https://railway.com?referralCode=sLjDXb">Get $20 of credit</a>
					(a referral link, so I may earn a commission).
				</p>
			</div>
			<div class="tpl-groups" class:searching={needle}>
				{#each groups as g (g.kind)}
					<section class="node node--tpl" aria-label="{g.kind} templates">
						<header class="node__head">
							<h3>{@render hl(g.kind)} <span class="n">{g.rows.length}</span></h3>
						</header>
						<ul class="tpl-list">
							{#each g.rows as t (t.name)}
								<li class="tpl" id={t.part}>
									<span class="part">{@render hl(t.part)}</span>
									<p class="tpl__text">
										<span class="tpl__name">{@render hl(t.name)}</span>
										<span class="tpl__desc" title={t.desc}>{@render hl(t.desc)}</span>
									</p>
									<span class="tpl__act">
										<a href={t.deploy} class="deploy" aria-label="Deploy {t.name} on Railway">Deploy</a>
										<a href={t.source} class="tpl__src" aria-label="{t.name} source">Source</a>
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</section>

		<section class="sites" id="websites" aria-labelledby="websites-title" hidden={!shownSites.length}>
			<h2 class="frame-label" id="websites-title">Websites <span class="n">{shownSites.length}</span></h2>
			<p>
				A mix of products, client work and experiments:
				{#each shownSites as w, i (w.id)}
					<a href={w.href}>{@render hl(w.name)}</a>{i < shownSites.length - 1 ? ', ' : '.'}
				{/each}
			</p>
		</section>

		<footer class="close">
			<p class="close__line">
				Need something that isn't on the canvas, or want to work together?
				<a href="mailto:nom@zaur.app">nom@zaur.app</a>
			</p>
			<p class="close__small">
				© 2026 Zaur · <a href="https://github.com/nomideusz">github.com/nomideusz</a> ·
				<a href="https://register.zaur.app">Get an @zaur.app address</a>
			</p>
		</footer>
	</main>

	<dialog class="plates" bind:this={viewer} aria-labelledby="plates-title" closedby="any" onclose={() => (viewing = null)}>
		{#if viewing}
			<div class="plates__head">
				<h2 id="plates-title">Inside {viewing.name}</h2>
				<button type="button" class="btn btn--quiet" onclick={() => viewer.close()}>Close</button>
			</div>
			<p class="plates__note">Screenshots from a demo account.{#if viewing.id === 'mail'}{' Every message and sender is made up.'}{/if}</p>
			<div class="plates__row">
				{#each viewing.plates ?? [] as pl (pl.src)}
					<img src={pl.src} width={pl.w} height={pl.h} alt={pl.alt} loading="lazy" decoding="async" />
				{/each}
			</div>
		{/if}
	</dialog>
</div>
