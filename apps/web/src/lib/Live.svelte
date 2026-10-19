<script lang="ts">
	import { onMount } from 'svelte';

	// A site running inside the page, at a desktop or a phone width. A click hands
	// it the pointer so it can be used without leaving; when the pointer leaves,
	// the page gets its scroll back. The capture shows until the site has loaded.
	// A site that may not be framed passes whole-page captures instead (page,
	// pagePhone), which the same click lets the visitor scroll through.
	let { href, name, shot, phone, page, pagePhone }: { href: string; name: string; shot?: string; phone?: string; page?: string; pagePhone?: string } = $props();

	const DESKTOP = 1280;
	const PHONE = 390;
	let mobile = $state(false);
	let active = $state(false);
	let touch = $state(false);
	let loaded = $state(false);
	let w = $state(0);
	let h = $state(0);
	let screen: HTMLDivElement;
	const view = (m: boolean) => ((mobile = m), screen.scrollTo(0, 0));
	const host = $derived(new URL(href).host);
	const vw = $derived(mobile ? PHONE : DESKTOP);
	const s = $derived(w ? Math.min(1, w / vw) : 0.35);
	const left = $derived(Math.max(0, (w - vw * s) / 2));
	const still = $derived(mobile ? (phone ?? shot) : shot);
	const sheet = $derived(page && (mobile ? (pagePhone ?? page) : page));

	onMount(() => {
		mobile = matchMedia('(max-width: 600px)').matches;
		touch = matchMedia('(hover: none)').matches;
	});
</script>

<div class="live">
	<div class="bar">
		<span class="host">{host}</span>
		<span class="views" role="group" aria-label="Screen width">
			<button type="button" aria-pressed={!mobile} onclick={() => view(false)}>Desktop</button>
			<button type="button" aria-pressed={mobile} onclick={() => view(true)}>Mobile</button>
		</span>
		{#if active}<button type="button" class="done" onclick={() => (active = false)}>Done</button>{/if}
		<a href={href} target="_blank" rel="noopener">Open ↗</a>
	</div>
	<!-- Leaving only drops the pointer hand-off; the cover button is the control.
	     A finger lifting also "leaves", so only a mouse or pen hands it back. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="screen"
		bind:this={screen}
		class:scroll={sheet && active}
		bind:clientWidth={w}
		bind:clientHeight={h}
		onpointerleave={(e) => e.pointerType !== 'touch' && (active = false)}
	>
		{#if sheet}
			<img class="sheet" src={sheet} alt="{name}, the whole page" loading="lazy" style:margin-left="{left}px" style:width="{vw * s}px" />
		{:else}
			{#if !loaded && still}
				<img src={still} alt="" style:left="{left}px" style:width="{vw * s}px" />
			{/if}
			<iframe
				src={href}
				title="{name}, live"
				loading="lazy"
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
			<button type="button" class="cover" onclick={() => (active = true)} aria-label="Use {name} here">
				<span>{touch ? 'Tap' : 'Click'} {sheet ? 'to scroll through it' : 'to use it here'}</span>
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
	.scroll {
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
	}
	img.sheet {
		position: static;
		height: auto;
	}
	img {
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	iframe {
		border: 0;
		transform-origin: 0 0;
		visibility: hidden;
	}
	iframe.shown {
		visibility: visible;
	}
	.cover {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
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
	.cover:focus-visible span {
		opacity: 1;
	}
	/* A phone screen needs height more than width. */
	@media (max-width: 600px) {
		.screen {
			aspect-ratio: 3 / 4;
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
