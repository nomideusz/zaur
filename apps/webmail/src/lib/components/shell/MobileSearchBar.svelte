<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Search from '$lib/components/icons/Search.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { isSectionSearchRoute, topSearchSection, topSearchSuppressed } from '$lib/shell/app-nav';
	import { settings } from '$lib/stores/settings.svelte';

	/* The single mobile search input. It lives in the app shell (persistent across
	   list → results navigation), drives the section's results route via ?q, and is
	   the only search field — so there's never a second, different-looking input.
	   Desktop carries search in AppShellHeader, so this is phone-only. */

	const pathname = $derived(page.url.pathname);
	const section = $derived(topSearchSection(pathname));
	const visible = $derived(settings.showSearchBar && !!section && !topSearchSuppressed(pathname));
	const onResults = $derived(isSectionSearchRoute(pathname));

	let value = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	// Mirror the URL into the field when we're not the ones driving it (deep links,
	// back/forward, switching sections) — never clobber what the user is typing.
	$effect(() => {
		const urlQuery = onResults ? (page.url.searchParams.get('q') ?? '') : '';
		if (inputEl && document.activeElement === inputEl) return;
		value = urlQuery;
	});

	function commit(next: string) {
		if (!section) return;
		const trimmed = next.trim();
		if (trimmed) {
			void goto(`${section.searchPath}?q=${encodeURIComponent(trimmed)}`, {
				replaceState: onResults,
				keepFocus: true,
				noScroll: true
			});
		} else {
			void goto(section.homePath, { keepFocus: true, noScroll: true });
		}
	}

	function onInput() {
		if (timer) clearTimeout(timer);
		const next = value;
		timer = setTimeout(() => commit(next), 200);
	}

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (timer) clearTimeout(timer);
		commit(value);
		inputEl?.blur();
	}

	function clear() {
		if (timer) clearTimeout(timer);
		value = '';
		if (section) void goto(section.homePath, { noScroll: true });
		inputEl?.focus();
	}
</script>

{#if visible && section}
	<form class="z-mobile-search-bar md:hidden" role="search" onsubmit={onSubmit}>
		<div class="z-mobile-search-bar__field">
			<Search class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
			<input
				bind:this={inputEl}
				bind:value
				oninput={onInput}
				type="search"
				enterkeyhint="search"
				inputmode="search"
				autocomplete="off"
				class="z-mobile-search-bar__input"
				placeholder={section.placeholder}
				aria-label={section.placeholder}
			/>
			{#if value}
				<button
					type="button"
					class="z-mobile-search-bar__clear"
					aria-label="Clear search"
					onclick={clear}
				>
					<X class="size-4" aria-hidden="true" />
				</button>
			{/if}
		</div>
	</form>
{/if}
