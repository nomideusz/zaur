<script lang="ts">
	// Plain inline filter for settings: typing narrows the visible rows in place
	// (via settingsSearch.query → each row's `matchesRow`). No dropdown — the popup
	// used to list the same matches the page was already filtering to, so every
	// result appeared twice.
	import Search from '$lib/components/icons/Search.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';

	let inputEl = $state<HTMLInputElement | null>(null);

	function clear() {
		settingsSearch.setQuery('');
		inputEl?.focus();
	}
</script>

<div class="z-settings-search-field relative">
	<Search
		class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
		aria-hidden="true"
	/>
	<input
		bind:this={inputEl}
		type="search"
		class="z-settings-search-input"
		placeholder="Search settings…"
		aria-label="Search settings"
		autocomplete="off"
		enterkeyhint="search"
		inputmode="search"
		value={settingsSearch.query}
		oninput={(e) => settingsSearch.setQuery(e.currentTarget.value)}
		onkeydown={(e) => {
			if (e.key === 'Escape') clear();
		}}
	/>
	{#if settingsSearch.query}
		<button
			type="button"
			class="z-settings-search-clear absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fg-subtle hover:text-fg"
			aria-label="Clear search"
			onclick={clear}
		>
			<X class="size-4" aria-hidden="true" />
		</button>
	{/if}
</div>
