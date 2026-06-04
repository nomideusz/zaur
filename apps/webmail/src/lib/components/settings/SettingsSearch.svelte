<script lang="ts">
	import { goto } from '$app/navigation';
	import Search from '$lib/components/icons/Search.svelte';
	import { settingsSearch } from '$lib/settings/search-registry.svelte';
	import { cn } from '$lib/utils/cn';

	let input = $state<HTMLInputElement | null>(null);
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

	function resultButtons(): HTMLButtonElement[] {
		const list = document.getElementById(resultsId);
		return list ? Array.from(list.querySelectorAll<HTMLButtonElement>('button')) : [];
	}

	function focusResult(index: number) {
		const buttons = resultButtons();
		if (!buttons.length) return;
		buttons[Math.max(0, Math.min(index, buttons.length - 1))]?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			settingsSearch.setQuery('');
			if (input) input.value = '';
			input?.blur();
		} else if (e.key === 'ArrowDown' && results.length) {
			e.preventDefault();
			focusResult(0);
		}
	}

	function onResultsKeydown(e: KeyboardEvent) {
		const buttons = resultButtons();
		const currentIndex = buttons.findIndex((button) => button === document.activeElement);
		if (e.key === 'Escape') {
			settingsSearch.setQuery('');
			if (input) input.value = '';
			input?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusResult((currentIndex + 1) % buttons.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusResult((currentIndex - 1 + buttons.length) % buttons.length);
		} else if (e.key === 'Home') {
			e.preventDefault();
			focusResult(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			focusResult(buttons.length - 1);
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
		<ul
			id={resultsId}
			class="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface-raised py-1 shadow-md"
			role="listbox"
			aria-label="Settings search results"
			onkeydown={onResultsKeydown}
		>
			{#each results as entry (entry.id + entry.href)}
				<li role="option" aria-selected="false">
					<button
						type="button"
						class="z-overflow-menu-item"
						onclick={() => selectEntry(entry)}
					>
						{entry.title}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
