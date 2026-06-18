<script lang="ts">
	// Ark combobox over the settings search registry — searches ALL settings pages
	// (static index + live rows) and jumps to the chosen setting. This is the only
	// place results are shown; inline row-hiding is disabled (see matchesRow) so a
	// match never appears both here and on the page behind.
	import { Combobox, createListCollection } from '@ark-ui/svelte/combobox';
	import { Highlight } from '@ark-ui/svelte/highlight';
	import { Portal } from '@ark-ui/svelte/portal';
	import Search from '$lib/components/icons/Search.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import type { SettingsSearchEntry } from '$lib/settings/search-index';
	import { goto } from '$lib/utils/navigation';

	let open = $state(false);

	const results = $derived(settingsSearch.filtered());
	const entryKey = (entry: SettingsSearchEntry) => `${entry.id}::${entry.href}`;

	const collection = $derived(
		createListCollection({
			items: results,
			itemToValue: entryKey,
			itemToString: (entry) => entry.title
		})
	);
	const byKey = $derived(new Map(results.map((entry) => [entryKey(entry), entry])));

	const popupOpen = $derived(open && results.length > 0);

	function selectEntry(entry: SettingsSearchEntry) {
		settingsSearch.setQuery('');
		open = false;
		const target = `${entry.href}#${entry.id}`;
		void goto(target).then(() => {
			requestAnimationFrame(() => settingsSearch.scrollTo(entry.id));
		});
	}

	function onInputValueChange(details: Combobox.InputValueChangeDetails) {
		if (details.reason === 'input-change') {
			settingsSearch.setQuery(details.inputValue);
			open = true;
		}
	}

	function onSelect(details: Combobox.SelectionDetails) {
		const entry = byKey.get(details.itemValue);
		if (entry) selectEntry(entry);
	}
</script>

<Combobox.Root
	{collection}
	inputValue={settingsSearch.query}
	open={popupOpen}
	allowCustomValue
	selectionBehavior="preserve"
	openOnClick
	positioning={{ placement: 'bottom-start', sameWidth: true }}
	onInputValueChange={onInputValueChange}
	onOpenChange={(d) => (open = d.open)}
	onSelect={onSelect}
	class="relative"
>
	<Combobox.Label class="sr-only">Search settings</Combobox.Label>
	<Combobox.Control class="z-settings-search-field relative">
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
			aria-hidden="true"
		/>
		<Combobox.Input
			type="search"
			class="z-settings-search-input"
			placeholder="Search all settings…"
			autocomplete="off"
			onkeydown={(e: KeyboardEvent) => {
				// Preserve the original Escape behaviour: clear the query, not just close.
				if (e.key === 'Escape') settingsSearch.setQuery('');
			}}
		/>
	</Combobox.Control>

	<Portal>
		<Combobox.Positioner>
			<Combobox.Content
				class="z-30 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface-raised py-1 shadow-md outline-none"
				aria-label="Settings search results"
			>
				{#each results as entry (entryKey(entry))}
					<Combobox.Item
						item={entry}
						class="z-overflow-menu-item w-full cursor-pointer text-left outline-none data-[highlighted]:bg-surface-sunken"
					>
						<Combobox.ItemText>
							<Highlight
								query={settingsSearch.query}
								text={entry.title}
								ignoreCase
								matchAll
								class="z-search-mark"
							/>
						</Combobox.ItemText>
					</Combobox.Item>
				{/each}
			</Combobox.Content>
		</Combobox.Positioner>
	</Portal>
</Combobox.Root>
