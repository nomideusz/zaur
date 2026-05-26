<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let input = $state<HTMLInputElement | null>(null);

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
		}
	}
</script>

<div class="relative">
	<label class="sr-only" for="settings-search">Search settings</label>
	<div class="relative">
		<Search
			class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
			aria-hidden="true"
		/>
		<input
			id="settings-search"
			bind:this={input}
			type="search"
			class="z-input w-full pl-9 md:max-w-xs"
			placeholder="Search settings…"
			autocomplete="off"
			oninput={onInput}
			onkeydown={onKeydown}
		/>
	</div>

	{#if results.length}
		<ul
			class="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-md md:max-w-xs"
			role="listbox"
		>
			{#each results as entry (entry.id + entry.href)}
				<li role="option" aria-selected="false">
					<button
						type="button"
						class={cn(
							'block w-full px-3 py-2 text-left transition-colors hover:bg-surface-sunken',
							'focus-visible:bg-surface-sunken focus-visible:outline-none'
						)}
						onclick={() => selectEntry(entry)}
					>
						<span class="block text-sm font-medium text-fg">{entry.title}</span>
						<span class="block truncate text-xs text-fg-muted">{entry.description}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
