<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { player } from '#lib/player.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import NowPlaying from '#lib/components/NowPlaying.svelte';
	import PlayerBar from '#lib/components/PlayerBar.svelte';

	let { data, children } = $props();
	let audio: HTMLAudioElement;

	// onMount, not $effect: attaching restores the queue, and those reads must not subscribe.
	onMount(() => player.attach(audio));
	afterNavigate(() => (player.open = false));

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
	// /album/x lights Albums, /artist/x Artists, /playlist/x Playlists.
	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname === href || page.url.pathname.startsWith(`${href.replace(/s$/, '')}/`);
</script>

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

	<main class="main">
		{@render children()}
	</main>

	<div class="dock">
		<PlayerBar />
		<nav class="tabs" aria-label="Sections">
			{#each sections.filter((s) => s.tab) as section (section.href)}
				{@const current = isCurrent(section.href)}
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
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.dock {
		grid-area: dock;
	}
	.tabs {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		height: calc(56px + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
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
			grid-template-columns: 232px minmax(0, 1fr);
			grid-template-areas: 'side main' 'dock dock';
		}
		.side {
			grid-area: side;
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding: 16px 12px 12px;
			border-right: 1px solid var(--z-hairline);
			background: var(--z-surface);
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
		flex: 1;
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
