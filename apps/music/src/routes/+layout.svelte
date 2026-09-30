<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { afterNavigate, beforeNavigate, goto, snapshot } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { notice, notify } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import NowPlaying from '#lib/components/NowPlaying.svelte';
	import PlayerBar from '#lib/components/PlayerBar.svelte';

	let { data, children } = $props();
	let audio: HTMLAudioElement;
	let main: HTMLElement;

	// Where this window was opened: the launch below that matches it is the one that opened it.
	let opened = page.url.href;

	// onMount, not $effect: attaching restores the queue, and those reads must not subscribe.
	onMount(() => {
		// An installed app that is already open is handed shares and shortcuts here
		// (the manifest's launch_handler) rather than reloaded, which would stop the music. Chromium only.
		(window as { launchQueue?: { setConsumer(fn: (launch: { targetURL?: string }) => void): void } }).launchQueue?.setConsumer(
			({ targetURL }) => {
				const first = targetURL === opened;
				opened = '';
				if (targetURL && !first) void goto(targetURL);
			}
		);
		return player.attach(audio);
	});

	// .main scrolls, not the window, so Kit's own scroll handling never sees it. A new page opens
	// at the top and Back returns to where you were; a page that only changes its query (sort
	// chips, Show more, search as you type — the reset="false" navigations) stays where it is.
	snapshot({ id: 'scroll', capture: () => main.scrollTop, restore: (top) => (main.scrollTop = top) });
	afterNavigate(({ from, to, type }) => {
		if (from && type !== 'popstate' && from.url.pathname !== to?.url.pathname) main.scrollTop = 0;
		retitle();
	});

	// Offline, a page cannot load its data and Kit would fall back to a full page load: the
	// browser's error page in place of the app, and the music gone with it. Stay put instead.
	beforeNavigate(({ to, willUnload, cancel }) => {
		if (navigator.onLine || willUnload || !to) return;
		cancel();
		notify("You're offline");
	});

	// The song in the tab's title while it plays. Pages set their own <title>, so theirs is
	// remembered after every navigation and put back on pause.
	let pageTitle = '';
	function retitle() {
		if (!document.title.startsWith('▶ ')) pageTitle = document.title;
		const song = player.playing ? player.current : undefined;
		document.title = song ? `▶ ${song.title}${song.artist ? ` — ${song.artist}` : ''} · Zaur Music` : pageTitle;
	}
	$effect(retitle);

	interface Section {
		href: string;
		label: string;
		icon: IconName;
		/** Also in the phone's bottom row (five fit). */
		tab?: boolean;
	}
	const sections: Section[] = [
		{ href: '/', label: 'Home', icon: 'home', tab: true },
		{ href: '/search', label: 'Search', icon: 'search', tab: true },
		{ href: '/albums', label: 'Albums', icon: 'album', tab: true },
		{ href: '/artists', label: 'Artists', icon: 'artist', tab: true },
		{ href: '/playlists', label: 'Playlists', icon: 'playlist' },
		{ href: '/favourites', label: 'Favourites', icon: 'heart' },
		{ href: '/add', label: 'Add', icon: 'add', tab: true }
	];
	// While a page loads, the one it is going to: the tapped section lights at once.
	const path = $derived((navigating.to?.url ?? page.url).pathname);
	// /album/x lights Albums, /artist/x Artists, /playlist/x Playlists.
	const isCurrent = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href.replace(/s$/, '')}/`));
	// The phone's row has no Playlists or Favourites: they hang off Home, so Home is lit for them.
	const isCurrentTab = (href: string) => isCurrent(href) || (href === '/' && (isCurrent('/playlists') || isCurrent('/favourites')));

	async function openSearch() {
		if (page.url.pathname !== '/search') await goto('/search');
		main.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
	}

	function shortcut(event: KeyboardEvent) {
		if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement;
		// Typing, or a menu that has the keyboard.
		if (target.closest('input, textarea, select, [contenteditable], dialog')) return;
		// Space and the arrows already mean something on a button, a link or a slider.
		const free = !target.closest('button, a, [role="slider"]');
		let key = event.key.toLowerCase();
		if (event.shiftKey && key.startsWith('arrow')) key = `shift+${key}`;
		const keys: Record<string, (() => unknown) | false> = {
			'/': openSearch,
			p: () => player.previous(),
			n: () => player.next(),
			' ': free && (() => player.toggle()),
			arrowleft: free && (() => player.seekBy(-5)),
			arrowright: free && (() => player.seekBy(5)),
			'shift+arrowleft': free && (() => player.previous()),
			'shift+arrowright': free && (() => player.next())
		};
		// With nothing loaded there is nothing to drive; Space stays the browser's.
		const act = (key === '/' || player.current) && Object.hasOwn(keys, key) && keys[key];
		if (!act) return;
		event.preventDefault();
		act();
	}
</script>

<svelte:window onkeydown={shortcut} />

<div class="shell">
	<aside class="side">
		<a class="brand" href="/">
			<Mark />
			<span>Zaur Music</span>
		</a>
		<nav aria-label="Sections">
			{#each sections as section (section.href)}
				<a href={section.href} class="navlink" aria-current={isCurrent(section.href) ? 'page' : undefined}>
					<Icon name={section.icon} />
					{section.href === '/add' ? 'Add from YouTube' : section.label}
				</a>
			{/each}
		</nav>
		<form class="account" method="POST" action="/auth/logout">
			<span class="who">
				<span class="name">{data.user.name}</span>
				<span class="email z-mono">{data.user.email}</span>
			</span>
			<button class="z-icon-btn !size-8" type="submit" aria-label="Sign out" title="Sign out">
				<Icon name="logout" />
			</button>
		</form>
	</aside>

	<main class="main" bind:this={main}>
		{@render children()}
	</main>
	{#if navigating.to}<div class="loading"></div>{/if}

	<div class="dock">
		<!-- The live region is always there; what it says comes and goes. -->
		<div class="notice" role="status">
			{#if notice.text}
				<p class="z-railed" transition:fade={{ duration: 120 }}>{notice.text}</p>
			{/if}
		</div>
		<PlayerBar />
		<nav class="tabs" aria-label="Sections">
			{#each sections.filter((s) => s.tab) as section (section.href)}
				{@const current = isCurrentTab(section.href)}
				<a href={section.href} aria-current={current ? 'page' : undefined}>
					<span class="pill"><Icon name={section.icon} class="size-[18px]" /></span>
					{section.label}
				</a>
			{/each}
		</nav>
	</div>
</div>

<NowPlaying />
<audio bind:this={audio} preload="metadata"></audio>

<style>
	.shell {
		display: grid;
		/* minmax(0, …): an auto column grows to the playing title's full width. */
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: minmax(0, 1fr) auto;
		grid-template-areas: 'main' 'dock';
		height: 100dvh;
		background: var(--z-canvas);
	}
	.side {
		display: none;
	}
	.main {
		grid-area: main;
		min-height: 0;
		/* The notch in landscape: the canvas runs under it, the page does not. */
		padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	/* A page is on its way: a line along the top, unless it is there before anyone could look. */
	.loading {
		grid-area: main;
		z-index: 1;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--z-accent), transparent) 0 0 / 40% 100% no-repeat;
		animation: loading 1.1s linear 150ms infinite backwards;
		pointer-events: none;
	}
	@keyframes loading {
		from {
			background-position-x: -70%;
		}
		to {
			background-position-x: 170%;
		}
	}
	.dock {
		position: relative;
		grid-area: dock;
		/* The home indicator and the notch, whichever of the bar and the tabs is showing. */
		padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
		background: var(--z-surface);
	}
	/* The status line floats just above the dock, over Now playing too, and takes no taps. */
	.notice {
		position: absolute;
		right: 12px;
		bottom: calc(100% + 10px);
		left: 12px;
		z-index: calc(var(--z-panel) + 1);
		display: flex;
		justify-content: center;
		pointer-events: none;
	}
	.notice p {
		--z-rail: var(--z-accent);
		--z-rail-inset: 9px;
		max-width: 380px;
		margin: 0;
		padding: 9px 14px 9px 18px;
		border: 1px solid var(--z-line);
		border-radius: 10px;
		background: var(--z-surface);
		color: var(--z-body);
		font-size: 13px;
		font-weight: 500;
		box-shadow: var(--z-shadow-menu);
	}
	.tabs {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		height: 56px;
		border-top: 1px solid var(--z-line);
		background: var(--z-surface);
	}
	.tabs a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		color: var(--z-muted);
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
	}
	.tabs .pill {
		display: grid;
		place-items: center;
		width: 48px;
		height: 28px;
		border-radius: 999px;
	}
	.tabs a[aria-current='page'] {
		color: var(--z-accent-ink);
	}
	.tabs a[aria-current='page'] .pill {
		background: var(--z-accent-soft);
	}

	@media (min-width: 768px) {
		.shell {
			grid-template-columns: calc(232px + env(safe-area-inset-left)) minmax(0, 1fr);
			grid-template-areas: 'side main' 'dock dock';
		}
		.side {
			grid-area: side;
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding: 16px 12px 12px calc(12px + env(safe-area-inset-left));
			/* A phone on its side is too short for the list and the account: scroll, don't clip. */
			overflow-y: auto;
			border-right: 1px solid var(--z-hairline);
			background: var(--z-surface);
		}
		.main {
			padding-left: 0;
		}
		.tabs {
			display: none;
		}
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 8px 18px;
		color: var(--z-ink);
		font-size: 16px;
		font-weight: 700;
		text-decoration: none;
	}
	.side nav {
		display: flex;
		flex: 1 0 auto;
		flex-direction: column;
		gap: 2px;
	}
	.navlink {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 34px;
		padding: 0 10px;
		border-radius: 8px;
		color: var(--z-strong);
		font-weight: 500;
		text-decoration: none;
	}
	.navlink:hover {
		background: var(--z-hover);
	}
	.navlink[aria-current='page'] {
		background: var(--z-accent-tint);
		color: var(--z-accent-ink);
		font-weight: 600;
	}
	.account {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 8px;
		padding: 10px 8px 0;
		border-top: 1px solid var(--z-hairline);
	}
	.who {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}
	.name,
	.email {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.name {
		color: var(--z-ink);
		font-weight: 600;
	}
	.email {
		color: var(--z-soft);
		font-size: 11.5px;
	}
</style>
