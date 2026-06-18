<script lang="ts">
	import { page } from '$app/state';
	import Search from '$lib/components/icons/Search.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { topSearchSection, topSearchSuppressed } from '$lib/shell/app-nav';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	/* Shared mobile top search bar — tapping opens the section's dedicated search
	   screen. Desktop carries search in AppShellHeader, so this is phone-only. */

	const pathname = $derived(page.url.pathname);
	const section = $derived(topSearchSection(pathname));
	const visible = $derived(settings.showSearchBar && !!section && !topSearchSuppressed(pathname));

	function hide() {
		settings.setShowSearchBar(false);
		toast.showAction('Search bar hidden', 'info', {
			label: 'Undo',
			onClick: () => settings.setShowSearchBar(true)
		});
	}
</script>

{#if visible && section}
	<div class="z-mobile-search-bar md:hidden">
		<a
			href={section.searchHref}
			class="z-mobile-search-bar__field no-underline"
			data-sveltekit-preload-data="off"
		>
			<Search class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
			<span class="min-w-0 flex-1 truncate text-fg-subtle">{section.placeholder}</span>
		</a>
		<button
			type="button"
			class="z-mobile-search-bar__hide"
			aria-label="Hide search bar"
			onclick={hide}
		>
			<X class="size-4" aria-hidden="true" />
		</button>
	</div>
{/if}
