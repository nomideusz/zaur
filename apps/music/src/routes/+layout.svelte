<script lang="ts">
	import './layout.css';
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { afterNavigate, beforeNavigate, goto, snapshot } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { submit } from '#lib/api';
	import { notice } from '#lib/notice.svelte';
	import { player } from '#lib/player.svelte';
	import { visit, way } from '#lib/visit.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import NowPlaying from '#lib/components/NowPlaying.svelte';
	import PlayerBar from '#lib/components/PlayerBar.svelte';
	import { sheetOpen } from '#lib/components/Sheet.svelte';
	import type { User } from '#lib/types';

	let { children } = $props();
	// Who is signed in comes with each page's data: the root layout has no load of its own
	// (see visit.svelte.ts). An error page has no data, so there the last answer stands.
	let known: User | undefined;
	const user = $derived((known = page.data.user ?? known));
	let audio: HTMLAudioElement;
	let main: HTMLElement;
	let dock: HTMLElement;
	let line: HTMLElement;

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
	afterNavigate(({ from, to, type }) => {
		if (from && type !== 'popstate' && from.url.pathname !== to?.url.pathname) main.scrollTop = 0;
	});

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
	const path = $derived((way.to ?? navigating.to?.url ?? page.url).pathname);
	// /album/x lights Albums, /artist/x Artists, /playlist/x Playlists.
	const isCurrent = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href.replace(/s$/, '')}/`));
	// The phone's row has no Playlists or Favourites: they hang off Home, so Home is lit for them.
	const isCurrentTab = (href: string) => isCurrent(href) || (href === '/' && (isCurrent('/playlists') || isCurrent('/favourites')));

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
		{#if user}
			<form class="account" method="POST" action="/auth/logout" onsubmit={submit}>
				<span class="who">
					<span class="name">{user.name}</span>
					<span class="email z-mono">{user.email}</span>
				</span>
				<button class="z-icon-btn !size-8 pointer-coarse:!size-11" type="submit" aria-label="Sign out" title="Sign out">
					<Icon name="logout" />
				</button>
			</form>
		{/if}
	</aside>

	<main class="main" bind:this={main}>
		{@render children()}
	</main>
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
