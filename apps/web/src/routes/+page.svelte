<script lang="ts">
	import { onMount } from 'svelte';
	import Drawing from '$lib/Drawing.svelte';
	import Icon from '$lib/Icon.svelte';
	import { kinds, kindOf } from '$lib/template-kinds';

	const title = 'Zaur — apps, packages, templates';
	const description =
		'Everything I build in one place: Zaur apps, open-source npm packages, one-click Railway templates, and live websites.';

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
			desc: 'Your sky for the next 24 hours — real sun, moon, stars, and live weather on one quiet page.',
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
		mail: [
			['Server', 'Stalwart, self-hosted'],
			['Protocol', 'JMAP'],
			['Includes', 'Calendar, contacts, offline mode']
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
		music: [
			['Server', 'Navidrome, self-hosted'],
			['Client', 'Installable web app'],
			['Sign-in', 'Your Zaur account']
		]
	};

	// Part numbers: templates count up from the oldest, so a new card at the
	// top of the list gets the next number and existing ones never shift.
	const apps = products.map((p, i) => ({ ...p, part: `A${i + 1}`, specs: specs[p.id] ?? [] }));
	const pkgs = packages.map((p, i) => ({ ...p, part: `P${i + 1}` }));
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
	const shownPkgs = $derived(pkgs.filter((p) => hits(p.part, p.name, p.desc)));
	const shownSkills = $derived(skls.filter((s) => hits(s.part, s.name, s.desc)));
	const shownTpls = $derived(tpls.filter((t) => hits(t.part, t.name, t.desc, t.kind, ...t.stack)));
	const shownSites = $derived(websites.filter((w) => hits(w.name)));
	const groups = $derived(
		kinds
			.map(([kind]) => ({ kind, rows: shownTpls.filter((t) => t.kind === kind) }))
			.filter((g) => g.rows.length)
	);
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
	onMount(() => {
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

<div class="catalog">
	<header class="rail">
		<a class="wordmark" href="/" aria-label="Zaur home">ZAUR</a>
		<p class="rail__sub">Software catalog</p>
		<nav class="rail__index" aria-label="Catalog sections">
			{#each index as s (s.href)}
				<a href={s.href} class:empty={!s.count}>
					<span>{s.label}</span>
					<span class="rail__count">{s.count}</span>
				</a>
			{/each}
		</nav>
		<div class="rail__foot">
			<p>Questions and work</p>
			<a href="mailto:nom@zaur.app">nom@zaur.app</a>
			<a href="https://github.com/nomideusz">github.com/nomideusz</a>
		</div>
	</header>

	<main class="sheet">
		<section class="intro" aria-labelledby="intro-title">
			<h1 id="intro-title">Software, stocked and running.</h1>
			<p class="intro__lede">
				Apps, open-source packages and one-click deployment templates. I build and maintain
				every part in this catalog myself.
			</p>
			<div class="finder" role="search">
				<label for="find">Find a part</label>
				<div class="finder__field">
					<Icon name="search" />
					<input
						id="find"
						type="search"
						bind:this={search}
						bind:value={query}
						placeholder="postgres, browser, svelte, T42…"
						autocomplete="off"
						spellcheck="false"
					/>
					<kbd aria-hidden="true">/</kbd>
				</div>
				<p class="finder__count" aria-live="polite">
					{#if needle}
						{total} of {apps.length + pkgs.length + skls.length + tpls.length} parts match
					{:else}
						{apps.length + pkgs.length + skls.length + tpls.length} parts in stock
					{/if}
				</p>
			</div>
		</section>

		{#if !total && !shownSites.length}
			<div class="nothing">
				<p>Nothing in the catalog matches “{query.trim()}”.</p>
				<button type="button" class="order order--quiet" onclick={() => ((query = ''), search.focus())}>
					Clear the search
				</button>
			</div>
		{/if}

		<section class="section" id="apps" aria-labelledby="apps-title" hidden={!shownApps.length}>
			<div class="section__head">
				<h2 id="apps-title">Apps</h2>
				<p>Live services. Open them in your browser.</p>
			</div>
			<div class="parts">
				{#each shownApps as a (a.id)}
					<article class="part" id={a.id} aria-labelledby="{a.id}-name">
						<div class="part__drawing"><Drawing id={a.id} /></div>
						<div class="part__body">
							<p class="part__no"><span class="tab">{@render hl(a.part)}</span></p>
							<h3 class="part__name" id="{a.id}-name">{@render hl(a.name)}</h3>
							<p class="part__host">{new URL(a.href).host}</p>
							<p class="part__desc">{@render hl(a.desc)}</p>
							<dl class="spec">
								{#each a.specs as [k, v] (k)}
									<div><dt>{k}</dt><dd>{@render hl(v)}</dd></div>
								{/each}
							</dl>
							<a class="order" href={a.href}>Open {a.name} <Icon name="out" /></a>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section class="section" id="packages" aria-labelledby="packages-title" hidden={!shownPkgs.length}>
			<div class="section__head">
				<h2 id="packages-title">Packages</h2>
				<p>
					Published on npm under @nomideusz. Version, dependencies and licence are read live from the registry.
					{#if registryDown}<strong class="warn">The npm registry didn't answer, so some figures are missing.</strong>{/if}
				</p>
			</div>
			<table class="table table--pkgs">
				<thead>
					<tr>
						<th scope="col">Part</th>
						<th scope="col">Package</th>
						<th scope="col" class="num">Version</th>
						<th scope="col" class="num">Deps</th>
						<th scope="col">Licence</th>
						<th scope="col">Install</th>
					</tr>
				</thead>
				<tbody>
					{#each shownPkgs as p (p.name)}
						{@const s = stock[p.name]}
						{@const cmd = `pnpm add ${p.name}`}
						<tr>
							<td class="cell-no"><span class="tab">{@render hl(p.part)}</span></td>
							<td><div class="cell-main">
								<span class="code-name">{@render hl(p.name)}</span>
								<span class="cell-desc">{@render hl(p.desc)}</span>
								<span class="cell-links">
									<a href={p.npm}>npm</a>
									{#if p.demo}<a href={p.demo}>Demo</a>{/if}
									{#if p.source}<a href={p.source}>Source</a>{/if}
								</span>
							</div></td>
							<td class="num" data-label="Version">{s ? s.version : registryDown ? '—' : '…'}</td>
							<td class="num" data-label="Deps" class:zero={s?.deps === 0}>{s ? s.deps : registryDown ? '—' : '…'}</td>
							<td data-label="Licence">{s?.license ?? (registryDown ? '—' : '…')}</td>
							<td class="cell-install">
								<button type="button" class="cmd" onclick={() => copy(cmd)} aria-label="Copy “{cmd}”">
									<code>{cmd}</code>
									<span class="cmd__state">
										{#if copied === cmd}<Icon name="check" /> Copied{:else}<Icon name="copy" /> Copy{/if}
									</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="section section--short" id="skills" aria-labelledby="skills-title" hidden={!shownSkills.length}>
			<div class="section__head">
				<h2 id="skills-title">Skills</h2>
				<p>Instructions that teach coding agents how to do a job well.</p>
			</div>
			<table class="table">
				<tbody>
					{#each shownSkills as s (s.name)}
						<tr>
							<td class="cell-no"><span class="tab">{@render hl(s.part)}</span></td>
							<td><div class="cell-main">
								<span class="code-name">{@render hl(s.name)}</span>
								<span class="cell-desc">{@render hl(s.desc)}</span>
							</div></td>
							<td class="cell-act"><a class="order order--quiet" href={s.source}>Source <Icon name="out" /></a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="section" id="templates" aria-labelledby="templates-title" hidden={!shownTpls.length}>
			<div class="section__head">
				<h2 id="templates-title">Templates</h2>
				<p>
					One-click deploys on Railway, many with the admin created on first boot and nightly
					backups to a Railway bucket.
				</p>
				<p class="referral">
					New to Railway? <a href="https://railway.com?referralCode=sLjDXb">Get $20 of credit</a>.
					It's a referral link, so I may earn a commission if you sign up.
				</p>
			</div>
			<table class="table table--tpls" class:searching={needle}>
				<colgroup>
					<col class="col-no" />
					<col />
					<col class="col-stack" />
					<col class="col-act" />
				</colgroup>
				<thead>
					<tr>
						<th scope="col">Part</th>
						<th scope="col">Template</th>
						<th scope="col">Stack</th>
						<th scope="col"><span class="visually-hidden">Actions</span></th>
					</tr>
				</thead>
				{#each groups as g (g.kind)}
					<tbody>
						<tr class="group">
							<th scope="colgroup" colspan="4">{@render hl(g.kind)} <span>{g.rows.length}</span></th>
						</tr>
						{#each g.rows as t (t.name)}
							<tr id={t.part}>
								<td class="cell-no"><span class="tab">{@render hl(t.part)}</span></td>
								<td class="tpl-cell">
									<div class="tpl">
										<span class="tpl__name">{@render hl(t.name)}</span>
										<span class="tpl__desc" title={t.desc}>{@render hl(t.desc)}</span>
									</div>
								</td>
								<td class="tpl__stack">{@render hl(t.stack.join(' · '))}</td>
								<td class="tpl__act">
									<a href={t.deploy} class="deploy" aria-label="Deploy {t.name} on Railway">Deploy <Icon name="out" /></a>
									<a href={t.source} aria-label="{t.name} source">Source</a>
								</td>
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</section>

		<section class="sites" id="websites" aria-labelledby="websites-title" hidden={!shownSites.length}>
			<p>
				<strong id="websites-title">Websites</strong>, a mix of products, client work and experiments:
				{#each shownSites as w, i (w.id)}
					<a href={w.href}>{@render hl(w.name)}</a>{i < shownSites.length - 1 ? ', ' : '.'}
				{/each}
			</p>
		</section>

		<footer class="close">
			<p class="close__line">
				Need a part that isn't listed, or want to work together?
				<a href="mailto:nom@zaur.app">nom@zaur.app</a>
			</p>
			<p class="close__small">
				© 2026 Zaur · <a href="https://github.com/nomideusz">Source on GitHub</a> ·
				<a href="https://register.zaur.app">Get an @zaur.app address</a>
			</p>
		</footer>
	</main>
</div>
