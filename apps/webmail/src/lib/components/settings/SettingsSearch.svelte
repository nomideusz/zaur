<script lang="ts">
	import { Command } from 'bits-ui';
	import Search from '$lib/components/icons/Search.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { goto } from '$lib/utils/navigation';

	let input = $state<HTMLInputElement | null>(null);
	let commandRoot = $state<ReturnType<typeof Command.Root> | null>(null);
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

	function focusFirstResult() {
		const items = commandRoot?.getValidItems();
		if (!items?.length) return;
		commandRoot?.updateSelectedToIndex(0);
		items[0]?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			settingsSearch.setQuery('');
			if (input) input.value = '';
			input?.blur();
		} else if (e.key === 'ArrowDown' && results.length) {
			e.preventDefault();
			focusFirstResult();
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
		<Command.Root
			bind:this={commandRoot}
			id={resultsId}
			shouldFilter={false}
			class="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-md"
			aria-label="Settings search results"
		>
			<Command.List class="max-h-72 overflow-y-auto py-1">
				<Command.Viewport>
					{#each results as entry (entry.id + entry.href)}
						<Command.Item
							value={`${entry.id}-${entry.href}`}
							keywords={[entry.title, entry.description ?? '']}
							class="z-overflow-menu-item data-selected:bg-surface-sunken"
							onSelect={() => selectEntry(entry)}
						>
							{entry.title}
						</Command.Item>
					{/each}
				</Command.Viewport>
			</Command.List>
		</Command.Root>
	{/if}
</div>
