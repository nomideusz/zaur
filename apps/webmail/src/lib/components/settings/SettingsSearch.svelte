<script lang="ts">
	import Search from '$lib/components/icons/Search.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { goto } from '$lib/utils/navigation';
	import { focusFirstItem, rovingFocus } from '$lib/utils/roving-focus';

	let input = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLDivElement | null>(null);
	const resultsId = 'settings-search-results';

	const results = $derived(settingsSearch.filtered());

	function selectEntry(entry: (typeof results)[number]) {
		settingsSearch.setQuery('');
		if (input) input.value = '';
		const target = `${entry.href}#${entry.id}`;
		void goto(target).then(() => {
			requestAnimationFrame(() => settingsSearch.scrollTo(entry.id));
		});
	}

	function onInput(e: Event) {
		settingsSearch.setQuery((e.currentTarget as HTMLInputElement).value);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			settingsSearch.setQuery('');
			if (input) input.value = '';
			input?.blur();
		} else if (e.key === 'ArrowDown' && results.length) {
			e.preventDefault();
			focusFirstItem(listEl);
		}
	}
</script>

<div class="relative">
	<label class="sr-only" for="settings-search">Search settings</label>
	<div class="z-settings-search-field relative">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
			aria-hidden="true"
		/>
		<input
			id="settings-search"
			bind:this={input}
			type="search"
			class="z-settings-search-input"
			placeholder="Search settings…"
			autocomplete="off"
			aria-controls={results.length ? resultsId : undefined}
			oninput={onInput}
			onkeydown={onKeydown}
		/>
	</div>

	{#if results.length}
		<!-- Results are pre-filtered by the registry; this list only needs roving focus
		     (bits Command with shouldFilter=false). Items are buttons → native activation. -->
		<div
			bind:this={listEl}
			id={resultsId}
			role="listbox"
			aria-label="Settings search results"
			use:rovingFocus
			class="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-md"
		>
			<div class="max-h-72 overflow-y-auto py-1">
				{#each results as entry (entry.id + entry.href)}
					<button
						type="button"
						data-roving-item
						class="z-overflow-menu-item w-full text-left outline-none focus:bg-surface-sunken hover:bg-surface-sunken"
						onclick={() => selectEntry(entry)}
					>
						{entry.title}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
