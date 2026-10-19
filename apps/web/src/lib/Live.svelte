<script lang="ts">
	import { onMount, tick } from 'svelte';

	// A site running inside the page, at a desktop or a phone width. A click hands
	// it the pointer so it can be used without leaving; when the pointer leaves,
	// the page gets its scroll back. The capture shows until the site has loaded.
	// A demo can name the address it stands in for (label).
	let { href, name, label, shot, phone }: { href: string; name: string; label?: string; shot?: string; phone?: string } = $props();

	const DESKTOP = 1280;
	const PHONE = 390;
	let mobile = $state(false);
	let active = $state(false);
	let touch = $state(false);
	let loaded = $state(false);
	// The site is put in its frame only when the window comes near the screen, so
	// the first windows load alone instead of racing every site on the page.
	let near = $state(false);
	let w = $state(0);
	let h = $state(0);
	let screen: HTMLDivElement;
	let cover = $state<HTMLButtonElement>();
	let done = $state<HTMLButtonElement>();
	// Keyboard focus follows the hand-off: into the bar's Done, then back.
	const use = async () => {
		if (!loaded) return;
		active = true;
		await tick();
		done?.focus();
	};
	const finish = async () => {
		active = false;
		await tick();
		cover?.focus();
	};
	const host = $derived(label ?? new URL(href).host);
	const vw = $derived(mobile ? PHONE : DESKTOP);
	const s = $derived(w ? Math.min(1, w / vw) : 0.35);
	const left = $derived(Math.max(0, (w - vw * s) / 2));
	const still = $derived(mobile ? (phone ?? shot) : shot);

	onMount(() => {
		mobile = matchMedia('(max-width: 600px)').matches;
		touch = matchMedia('(hover: none)').matches;
		const io = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				near = true;
				io.disconnect();
			},
			{ rootMargin: '50% 0px' }
		);
		io.observe(screen);
		return () => io.disconnect();
	});
</script>

<div class="live">
	<div class="bar">
		<span class="host"><span class="dot" class:on={loaded} aria-hidden="true"></span>{host}</span>
		<span class="views" role="group" aria-label="{name}: screen width">
			<button type="button" aria-pressed={!mobile} onclick={() => (mobile = false)}>Desktop</button>
			<button type="button" aria-pressed={mobile} onclick={() => (mobile = true)}>Mobile</button>
		</span>
		{#if active}<button type="button" class="done" bind:this={done} onclick={finish}>Done</button>{/if}
		<a href={href} target="_blank" rel="noopener">Open ↗</a>
	</div>
	<!-- Leaving only drops the pointer hand-off; the cover button is the control.
	     A finger lifting also "leaves", so only a mouse or pen hands it back. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="screen"
		bind:this={screen}
		bind:clientWidth={w}
		bind:clientHeight={h}
		onpointerleave={(e) => e.pointerType !== 'touch' && (active = false)}
	>
		{#if !loaded && still}
			<img src={still} alt="" loading="lazy" decoding="async" style:left="{left}px" style:width="{vw * s}px" />
		{/if}
		{#if near}
			<iframe
				src={href}
				title="{name}, live"
				class:shown={loaded}
				inert={!active}
				style:left="{left}px"
				style:width="{vw}px"
				style:height="{h / s}px"
				style:transform="scale({s})"
				onload={() => (loaded = true)}
			></iframe>
		{/if}
		{#if !active}
			<button type="button" class="cover" class:wait={!loaded} bind:this={cover} aria-disabled={!loaded} onclick={use} aria-label={loaded ? `Use ${name} here` : `${name} is loading`}>
				<span>
					{#if !loaded}{still ? 'Loading the live site…' : 'Loading…'}
					{:else}{touch ? 'Tap' : 'Click'} to use it here{/if}
				</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.live {
		display: flex;
		flex-direction: column;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0.6rem;
		border-bottom: var(--rule) solid var(--ink);
		font-size: 0.8125rem;
	}
	.host {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Quiet and blinking while the site loads, Live Green once it runs. */
	.dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-right: 0.45rem;
		border-radius: 50%;
		background: var(--quiet);
		vertical-align: 0.05em;
		animation: wait 1s steps(2, jump-none) infinite;
	}
	.dot.on {
		background: var(--live);
		animation: none;
	}
	@keyframes wait {
		to {
			opacity: 0.25;
		}
	}
	.views {
		display: flex;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
	}
	.views button,
	.done {
		padding: 0.3rem 0.6rem;
		border: 0;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.done {
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
	}
	.views button + button {
		border-left: var(--rule) solid var(--ink);
	}
	.views button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.bar a {
		padding: 0.3rem 0;
		white-space: nowrap;
	}
	.screen {
		position: relative;
		flex: 1;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background: var(--lilac);
	}
	img,
	iframe {
		position: absolute;
		top: 0;
		display: block;
		background: var(--paper);
	}
	/* A capture keeps its own proportions; a taller screen shows it at the top. */
	img {
		height: auto;
	}
	iframe {
		border: 0;
		transform-origin: 0 0;
		visibility: hidden;
	}
	iframe.shown {
		visibility: visible;
	}
	/* The label sits in a corner, so a touch screen that always shows it still
	   shows the site. */
	.cover {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: end start;
		padding: 0.6rem;
		border: 0;
		background: none;
		cursor: pointer;
	}
	.cover span {
		padding: 0.35rem 0.7rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.875rem;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.cover:hover span,
	.cover:focus-visible span,
	.wait span {
		opacity: 1;
	}
	.wait {
		cursor: progress;
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
	/* A phone screen needs height more than width, but not the whole screen. */
	@media (max-width: 600px) {
		.screen {
			aspect-ratio: 4 / 5;
		}
	}
	@media (hover: none) {
		.cover span {
			opacity: 1;
		}
		.views button,
		.done,
		.bar a {
			min-height: 2.25rem;
		}
		.bar a {
			display: inline-grid;
			align-items: center;
		}
	}
</style>
