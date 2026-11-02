<script lang="ts">
	// What just ran, newest first: the package, the call and what it returned.
	// A log, not an announcement: a screen reader reads it on request, not at every
	// slider step, and each demo says its result in words of its own.
	let {
		lines,
		label,
		empty = ''
	}: {
		lines: { id: number; pkg: string; call: string; out: string; stopped?: boolean }[];
		label: string;
		empty?: string;
	} = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (it scrolls, so a keyboard must reach it) -->
<ol class="tape" role="log" aria-live="off" aria-label={label} tabindex="0">
	{#each lines as l (l.id)}
		<li class:stopped={l.stopped}>
			<span class="pkg">{l.pkg}</span>
			<code>{l.call}</code>
			<b>→ {l.out}</b>
		</li>
	{:else}
		<li class="none">{empty}</li>
	{/each}
</ol>

<style>
	.tape {
		height: 100%;
		min-height: 12rem;
		margin: 0;
		padding: 0;
		overflow: auto;
		background: var(--ink);
		color: var(--paper);
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		list-style: none;
		scrollbar-color: var(--bar-rule) var(--ink);
	}
	.tape:focus-visible {
		outline-color: var(--orange);
		outline-offset: -3px;
	}
	li {
		padding: 0.5rem 1rem 0.55rem;
		border-bottom: 1px solid var(--bar-rule);
		overflow-wrap: anywhere;
	}
	.pkg {
		display: block;
		color: color-mix(in srgb, var(--paper) 62%, transparent);
		font-size: 0.8125rem;
	}
	code {
		font: inherit;
	}
	b {
		display: block;
		font-weight: 700;
	}
	/* The ledger refusing a replay is the package's whole point: it is the one thing in orange. */
	.stopped b {
		color: var(--orange);
	}
	.none {
		border: 0;
		color: color-mix(in srgb, var(--paper) 62%, transparent);
	}
</style>
