<script lang="ts">
	// Which site this is, and the way to any other: real links, each with the key that
	// opens it beside it, as in any menu.
	import { afterNavigate } from '$app/navigation';
	import { siteName, siteNo } from '#lib/format';
	import { SITES } from '#lib/sites';
	import { viewHref, type Chart, type Who } from '#lib/view';

	let { site, who, days, chart, live, order }: { site: string | null; who: Who; days: number; chart: Chart; live: boolean; order: string[] } = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();
	let button = $state<HTMLButtonElement>();

	const known = $derived(!!site && SITES.some((s) => s.id === site));
	const keyOf = (id: string) => {
		const i = SITES.findIndex((s) => s.id === id);
		return i === 9 ? '0' : i < 9 ? String(i + 1) : '';
	};
	const links = () => [...(root?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];

	afterNavigate(() => (open = false));

	$effect(() => {
		if (!open) return;
		(root?.querySelector<HTMLAnchorElement>('a[aria-current]') ?? links()[0])?.focus();
	});

	function onkeydown(e: KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				open = true;
			}
			return;
		}
		if (e.key === 'Escape') {
			open = false;
			button?.focus();
			return;
		}
		const all = links();
		const at = all.indexOf(document.activeElement as HTMLAnchorElement);
		const to = e.key === 'ArrowDown' ? (at + 1) % all.length : e.key === 'ArrowUp' ? (at - 1 + all.length) % all.length : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1;
		if (to >= 0) {
			e.preventDefault();
			all[to]?.focus();
		}
	}
	const outside = (e: PointerEvent) => {
		if (open && !root?.contains(e.target as Node)) open = false;
	};
	const left = (e: FocusEvent) => {
		if (open && e.relatedTarget && !root?.contains(e.relatedTarget as Node)) open = false;
	};
	const cur = (on: boolean) => (on ? ('page' as const) : undefined);
</script>

<svelte:window onpointerdown={outside} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav class="menu" aria-label="Site" bind:this={root} {onkeydown} onfocusout={left}>
	<button class="field" type="button" bind:this={button} aria-expanded={open} onclick={() => (open = !open)}>
		<span class="now">
			{#if known}<span class="no count">{siteNo(site!)}</span>{siteName(site!)}{:else if site === 'all'}All sites{:else}Overview{/if}
		</span>
		<svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>
	</button>
	{#if open}
		<ul>
			<li>
				<a href={viewHref({ site: null, who, days, chart })} aria-current={cur(!site)}><span class="words">Overview</span><kbd class="key">O</kbd></a>
			</li>
			<li class="last-of-group">
				<a href={viewHref({ site: 'all', who, days, chart, live })} aria-current={cur(site === 'all')}><span class="words">All sites</span><kbd class="key">A</kbd></a>
			</li>
			{#each order as id (id)}
				<li>
					<a href={viewHref({ site: id, who, days, chart, live })} aria-current={cur(site === id)}>
						<span class="no count">{siteNo(id)}</span><span class="words">{siteName(id)}</span>
						{#if keyOf(id)}<kbd class="key">{keyOf(id)}</kbd>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</nav>

<style>
	.menu {
		position: relative;
	}
	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 190px;
		cursor: pointer;
	}
	button:hover,
	button[aria-expanded='true'] {
		background: var(--raised);
	}
	.now {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	svg {
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.15px;
	}
	.no {
		margin-right: 8px;
		font-size: 11px;
		color: var(--soft);
	}
	ul {
		position: absolute;
		z-index: 30;
		top: 100%;
		left: 0;
		width: 260px;
		margin: 4px 0 0;
		padding: 4px 0;
		list-style: none;
		background: var(--ground);
		border: 1px solid var(--ink);
	}
	.last-of-group {
		margin-bottom: 4px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--rule);
	}
	a {
		display: flex;
		align-items: center;
		height: 30px;
		padding: 0 6px 0 10px;
		text-decoration: none;
	}
	a:hover,
	a:focus-visible {
		background: var(--raised);
	}
	a:focus-visible {
		outline-offset: -2px;
	}
	a[aria-current] {
		font-weight: 500;
	}
	a[aria-current] .no {
		color: var(--ink);
	}
	.words {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Nothing to press on a phone. */
	@media (max-width: 720px) {
		.menu {
			flex: 1;
			min-width: 0;
		}
		button {
			width: 100%;
		}
		ul {
			width: calc(100vw - 2 * var(--page-x));
		}
		a {
			height: 44px;
		}
		.key {
			display: none;
		}
	}
	@media (hover: none) {
		.key {
			display: none;
		}
	}
</style>
