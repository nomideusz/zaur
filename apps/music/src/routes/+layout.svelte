<script lang="ts">
	import './layout.css';
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { afterNavigate, beforeNavigate, goto, onNavigate, snapshot } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { api, submit } from '#lib/api';
	import { notice } from '#lib/notice.svelte';
	import { player, wide } from '#lib/player.svelte';
	import { visit, way } from '#lib/visit.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import NowPanel from '#lib/components/NowPanel.svelte';
	import NowPlaying from '#lib/components/NowPlaying.svelte';
	import PlayerBar from '#lib/components/PlayerBar.svelte';
	import { sheetOpen } from '#lib/components/Sheet.svelte';
	import type { Playlist, User } from '#lib/types';

	let { children } = $props();
	// Who is signed in comes with each page's data: the root layout has no load of its own
	// (see visit.svelte.ts). An error page has no data, so there the last answer stands.
	let known: User | undefined;
	const user = $derived((known = page.data.user ?? known));
	let audio: HTMLAudioElement;
	let main: HTMLElement;
	let dock: HTMLElement;
	let line: HTMLElement;
	let bar: HTMLElement;

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
		// Pages set their own <title>, and not only when they are gone to (a playlist renamed, an
		// error page that loads after all): whenever they do, the playing song goes back in front.
		const titles = new MutationObserver(retitle);
		titles.observe(document.head, { subtree: true, childList: true, characterData: true });
		const detach = player.attach(audio);
		return () => (titles.disconnect(), detach());
	});

	// .main scrolls, not the window, so Kit's own scroll handling never sees it. A new page opens
	// at the top and Back returns to where you were; a page that only changes its query (sort
	// chips, Show more, search as you type — the reset="false" navigations) stays where it is.
	snapshot({ id: 'scroll', capture: () => main.scrollTop, restore: (top) => (main.scrollTop = top) });
	afterNavigate((navigation) => {
		const { from, to, type } = navigation;
		depth = type === 'enter' ? 0 : Math.max(0, depth + (navigation.type === 'popstate' ? navigation.delta : 1));
		if (from && type !== 'popstate' && from.url.pathname !== to?.url.pathname) main.scrollTop = 0;
		requestAnimationFrame(scrolled);
		if (!from || to?.url.pathname.startsWith('/playlist')) void loadPlaylists();
	});

	// The bar along the top: Back on a page reached from another, and the page's title once its
	// own heading has scrolled up under the bar, as in an app's navigation bar.
	let solid = $state(false);
	let heading = $state('');
	function scrolled() {
		const h1 = main.querySelector('h1');
		const under = main.getBoundingClientRect().top + bar.offsetHeight;
		// A heading only for screen readers (Search's) is 1px at the very top: there, any scroll counts.
		solid = h1 && h1.offsetWidth > 1 ? h1.getBoundingClientRect().bottom < under : main.scrollTop > 0;
		if (solid) heading = h1?.textContent?.trim() ?? '';
	}
	// Where Back goes when there is nothing in the app to go back to (opened here from a link).
	// A section that is not in the phone's tab row (Playlists, Favourites, Account) hangs off Home, there only.
	const up = $derived.by(() => {
		const [, first, deeper] = page.url.pathname.match(/^\/([^/]+)(\/.)?/) ?? [];
		if (deeper && ['album', 'artist', 'playlist'].includes(first)) return { href: `/${first}s`, phone: false };
		if (!deeper && ['playlists', 'favourites', 'account'].includes(first)) return { href: '/', phone: true };
	});
	// How many pages into the app this one is: a reload starts again at none, so Back goes up instead.
	// (A menu's or Now playing's own history entry is no page: Kit tells nobody about those.)
	let depth = 0;
	function back() {
		if (depth > 0) history.back();
		else if (up) void goto(up.href);
	}

	// A page slides in over the last one, as in a native app: a cross-fade where the browser can.
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Your own playlists, in the sidebar; again whenever a playlist page is gone to (made, renamed, deleted).
	let playlists = $state.raw<Playlist[]>([]);
	async function loadPlaylists() {
		const response = await api('/api/playlists').catch(() => undefined);
		if (response?.ok) playlists = await response.json();
	}

	// A link or a goto() is held until the page's data is in, then made again by visit(): out of
	// reach, the app stays where it is (see visit.svelte.ts). Back and Forward are Kit's alone.
	// ponytail: a second tap while Kit is still putting a fetched page up is not held (Kit asks
	// nobody then); the window is a few milliseconds, and the worst of it is the error page.
	beforeNavigate((navigation) => {
		const { from, to, willUnload, cancel } = navigation;
		if (navigation.type === 'popstate') way.drop();
		// Not for this: leaving the app, Back and Forward, a layer's own history entry, and the navigation visit() makes.
		if (willUnload || !to || navigation.type === 'popstate' || navigation.shallow || way.fetched(to.url)) return;
		// The same page again has nothing to fetch — unless a layer is up, which visit() closes.
		if (to.url.href === from?.url.href && !page.state.nowPlaying && !page.state.sheet) return;
		cancel();
		// A link keeps what it asks of Kit (the sort chips stay scrolled). The address is the one
		// it had when tapped: in Now playing it changes with the song.
		const link = navigation.type === 'link' && navigation.event.target instanceof Element ? navigation.event.target : null;
		const stay = link?.closest('[data-sveltekit-reset]')?.getAttribute('data-sveltekit-reset') === 'false';
		void visit(to.url.href, stay ? { reset: false } : undefined);
	});

	// A reload, or Forward, into the history entry a menu or a card had: nothing is open to go
	// with it, so step over it rather than leave a Back that does nothing.
	$effect(() => {
		if (page.state.sheet && !sheetOpen()) history.back();
	});

	// The song in the tab's title while it plays; the page's own is remembered and put back on pause.
	let pageTitle = '';
	function retitle() {
		if (!document.title.startsWith('▶ ')) pageTitle = document.title;
		const song = player.playing ? player.current : undefined;
		const title = song ? `▶ ${song.title}${song.artist ? ` — ${song.artist}` : ''} · Zaur Music` : pageTitle;
		// Only when it differs: setting it is itself a change to <head>, and would call this again.
		if (document.title !== title) document.title = title;
	}
	$effect(retitle);

	// The status line sits just above the dock, but a menu, a card and Now playing are in the
	// browser's top layer, over everything in the page. Shown again as a popover the line is put
	// on top of them, and it is lifted clear of whichever covers the dock.
	let lift = $state('');
	// Set instead of lift: the line hangs from the top, under Now playing's header.
	let drop = $state('');
	function place() {
		const open = [...document.querySelectorAll('dialog[open]')].map((dialog) => ({ dialog, box: dialog.getBoundingClientRect() }));
		line.hidePopover?.();
		if (open.length) line.showPopover?.();
		// Whichever reaches down to where the line would be (56px: the line and the gaps around it).
		const over = open.filter(({ box }) => box.bottom > innerHeight - dock.offsetHeight - 56).sort((a, b) => b.box.top - a.box.top)[0];
		// Full screen, Now playing has its controls at the bottom (on a small phone, Play is right
		// there): the line goes up top, under its header. The wide panel keeps it at its bottom edge.
		const head = over && over.box.top < 1 ? over.dialog.querySelector('header')?.getBoundingClientRect() : undefined;
		drop = head ? `${head.bottom + 4}px` : '';
		if (!over) lift = `${dock.offsetHeight}px`;
		// Above a sheet that rises from the bottom; inside the bottom edge of a tall one.
		else if (over.box.top > innerHeight / 3) lift = `${innerHeight - over.box.top}px`;
		else lift = `calc(${innerHeight - over.box.bottom + 6}px + env(safe-area-inset-bottom))`;
	}
	$effect(() => {
		// Again when a sheet opens or closes under a line that is still up.
		void page.state;
		if (notice.text) void tick().then(place);
	});

	interface Section {
		href: string;
		label: string;
		icon: IconName;
		/** Also in the phone's bottom row. */
		tab?: boolean;
	}
	const sections: Section[] = [
		{ href: '/', label: 'Home', icon: 'home', tab: true },
		{ href: '/search', label: 'Search', icon: 'search', tab: true },
		{ href: '/albums', label: 'Albums', icon: 'album', tab: true },
		{ href: '/artists', label: 'Artists', icon: 'artist', tab: true },
		{ href: '/playlists', label: 'Playlists', icon: 'playlist' },
		{ href: '/favourites', label: 'Favourites', icon: 'heart' }
	];
	// While a page loads, the one it is going to: the tapped section lights at once.
	const path = $derived((way.to ?? navigating.to?.url ?? page.url).pathname);
	// /album/x lights Albums, /artist/x Artists, /playlist/x Playlists.
	const isCurrent = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href.replace(/s$/, '')}/`));
	// The phone's row has no Playlists, Favourites or Account: they hang off Home, so Home is lit for them.
	const isCurrentTab = (href: string) =>
		isCurrent(href) || (href === '/' && ['/playlists', '/favourites', '/account'].some(isCurrent));

	async function openSearch() {
		// From Now playing, visit() closes the sheet first: Back is then the page, not the sheet again.
		// Already on Search, the same address again: nothing to fetch, only a layer to close.
		await visit(page.url.pathname === '/search' ? location.href : '/search');
		main.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
	}

	// What the pointer last pressed. A control focused by a click is only where the focus came to
	// rest, the way a clicked song row is; one reached with Tab is about to be used.
	// The control, not the glyph in it: the heart's is a new element once it has been clicked.
	let pressed: EventTarget | null = null;
	function press({ target }: PointerEvent) {
		pressed = target instanceof Element ? (target.closest('button, a, summary, input') ?? target) : target;
	}

	// The one rule for the keys. While a menu or a card is up they are its own, wherever in it
	// the focus is (Now playing is a dialog too, but the keys drive it), and typing is typing.
	// Otherwise a focused control keeps only the keys it uses itself: Space presses a button or
	// opens a <summary>, the arrows move a slider. Everything else is the player's.
	function shortcut(event: KeyboardEvent) {
		if (event.key === 'Tab') pressed = null;
		if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement;
		if (sheetOpen() || target.closest('input:not([type="range"]), textarea, select, [contenteditable]')) return;
		const resting = pressed instanceof Node && target.contains(pressed);
		const space = resting || !target.closest('button, summary');
		const arrows = !target.closest('input, [role="slider"]');
		let key = event.key.toLowerCase();
		if (event.shiftKey && key.startsWith('arrow')) key = `shift+${key}`;
		const keys: Record<string, (() => unknown) | false> = {
			'/': openSearch,
			p: () => player.previous(),
			n: () => player.next(),
			' ': space && (() => player.toggle()),
			arrowleft: arrows && (() => player.seekBy(-5)),
			arrowright: arrows && (() => player.seekBy(5)),
			'shift+arrowleft': arrows && (() => player.previous()),
			'shift+arrowright': arrows && (() => player.next())
		};
		// With nothing loaded there is nothing to drive; Space stays the browser's.
		const act = (key === '/' || player.current) && Object.hasOwn(keys, key) && keys[key];
		if (!act) return;
		event.preventDefault();
		// A held key is one press; only seeking repeats.
		if (!event.repeat || key.startsWith('arrow')) act();
	}
</script>

<svelte:window onkeydown={shortcut} onpointerdown={press} />

<div class="shell" class:paneled={wide.current && player.panel && player.current}>
	<aside class="side">
		<a class="brand" href="/">
			<Mark />
			<span>Zaur Music</span>
		</a>
		<nav aria-label="Sections">
			{#each sections as section (section.href)}
				<a href={section.href} class="navlink" aria-current={isCurrent(section.href) ? 'page' : undefined}>
					<Icon name={section.icon} />
					{section.label}
				</a>
			{/each}
			{#if playlists.length}
				<h2 class="z-caption">Your playlists</h2>
				{#each playlists as list (list.id)}
					<a href="/playlist/{list.id}" class="navlink list" aria-current={page.url.pathname === `/playlist/${list.id}` ? 'page' : undefined}>
						{list.name}
					</a>
				{/each}
			{/if}
		</nav>
		{#if user}
			<form class="account" method="POST" action="/auth/logout" onsubmit={submit}>
				<a class="who" href="/account" title="Account" aria-current={isCurrent('/account') ? 'page' : undefined}>
					<span class="name">{user.name}</span>
					<span class="email z-mono">{user.email}</span>
				</a>
				<button class="z-icon-btn !size-8 pointer-coarse:!size-11" type="submit" aria-label="Sign out" title="Sign out">
					<Icon name="logout" />
				</button>
			</form>
		{/if}
	</aside>

	<main class="main" class:backed={up} class:phone-back={up?.phone} bind:this={main} onscroll={scrolled}>
		<header class="top" class:solid bind:this={bar}>
			{#if up}
				<button class="z-icon-btn back !size-9 pointer-coarse:!size-11" type="button" aria-label="Back" title="Back" onclick={back}>
					<Icon name="chevron-left" class="size-5" />
				</button>
			{:else}<span></span>{/if}
			<!-- A tap on the title goes back to the top, like a tap on a phone's status bar. -->
			<button class="title" type="button" tabindex="-1" aria-hidden="true" onclick={() => main.scrollTo({ top: 0, behavior: 'smooth' })}>
				{heading}
			</button>
		</header>
		{@render children()}
	</main>
	{#if wide.current && player.panel}<NowPanel />{/if}
	{#if way.to || navigating.to}<div class="loading"></div>{/if}

	<div class="dock" bind:this={dock}>
		<!-- The live region is always there; what it says comes and goes. -->
		<div class="notice" role="status" popover="manual" bind:this={line} style:--lift={lift} style:top={drop || undefined} style:bottom={drop ? 'auto' : undefined}>
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
		/*
		 * iOS 26+ paints the status bar strip of an installed app with the background under the
		 * page's top edge, but only when a fixed or sticky box holds that edge; with none it lays
		 * its blur there instead. Sticky makes the shell that box and moves nothing: the window
		 * never scrolls, .main does. (The same fix as mail's .z-screen.)
		 */
		position: sticky;
		top: 0;
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
	/* Over the page's top edge, so it takes no room: clear until the page slides up under it. */
	.top {
		position: sticky;
		top: 0;
		z-index: 2;
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		align-items: center;
		height: calc(48px + env(safe-area-inset-top));
		margin-bottom: calc(-48px - env(safe-area-inset-top));
		padding: env(safe-area-inset-top) 6px 0;
		/* Clear, it lets taps through to the page; only Back takes them. */
		pointer-events: none;
		transition:
			background-color 0.15s,
			box-shadow 0.15s;
	}
	.top.solid {
		background: color-mix(in srgb, var(--z-surface) 80%, transparent);
		box-shadow: 0 1px 0 var(--z-hairline);
		backdrop-filter: blur(16px) saturate(1.6);
		-webkit-backdrop-filter: blur(16px) saturate(1.6);
		pointer-events: auto;
	}
	.back {
		border-radius: 999px;
		pointer-events: auto;
	}
	/* Over a cover, Back still has something under it. */
	.top:not(.solid) .back {
		background: color-mix(in srgb, var(--z-surface) 70%, transparent);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
	}
	.top .title {
		overflow: hidden;
		padding: 0;
		border: 0;
		background: none;
		color: var(--z-ink);
		font-size: 15px;
		font-weight: 650;
		white-space: nowrap;
		text-overflow: ellipsis;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.top.solid .title {
		opacity: 1;
	}
	/* A page with Back starts below it. */
	.backed > :global(.page) {
		padding-top: calc(48px + env(safe-area-inset-top));
	}
	/* A page is on its way: a line along the top, unless it is there before anyone could look. */
	.loading {
		grid-area: main;
		z-index: 3;
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
	/* The status line floats just above the dock (or the sheet over it) and takes no taps.
	   The rest undoes what a browser gives a popover: a centred, bordered box, hidden until shown. */
	.notice {
		position: fixed;
		inset: auto 12px calc(var(--lift, 0px) + 10px);
		z-index: 1;
		display: flex;
		justify-content: center;
		width: auto;
		height: auto;
		margin: 0;
		padding: 0;
		overflow: visible;
		border: 0;
		background: none;
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
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
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
		.top {
			grid-template-columns: 44px minmax(0, 1fr) 44px;
			padding-inline: 20px;
		}
		.top .title {
			text-align: left;
		}
		/* Playlists, Favourites and Account are in the sidebar here: nothing to go back up to. */
		.phone-back .top .back {
			visibility: hidden;
		}
		.backed:not(.phone-back) > :global(.page) {
			padding-top: 56px;
		}
		.phone-back > :global(.page) {
			padding-top: 28px;
		}
		.tabs {
			display: none;
		}
	}
	/* Wide: Now playing stands beside the page. */
	.shell > :global(.panel) {
		display: none;
	}
	@media (min-width: 1280px) {
		.shell.paneled {
			grid-template-columns: calc(232px + env(safe-area-inset-left)) minmax(0, 1fr) calc(320px + env(safe-area-inset-right));
			grid-template-areas: 'side main panel' 'dock dock dock';
		}
		.shell > :global(.panel) {
			grid-area: panel;
			display: flex;
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
	.side h2 {
		margin: 18px 10px 4px;
	}
	.navlink.list {
		display: block;
		overflow: hidden;
		height: 30px;
		line-height: 30px;
		color: var(--z-muted);
		white-space: nowrap;
		text-overflow: ellipsis;
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
		margin: -4px -6px;
		padding: 4px 6px;
		border-radius: 8px;
		text-decoration: none;
	}
	.who:hover,
	.who[aria-current='page'] {
		background: var(--z-hover);
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
