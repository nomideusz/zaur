<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Search from '$lib/components/icons/Search.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import { topSearchSection } from '$lib/shell/app-nav';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	/* Slim drawer header: account menu (which carries the app links) + search.
	   The folder tree below is the drawer's main content. */

	function openSearch() {
		mobileIsland.searchBarOpen = true;
		mobileIsland.searchBarFocusPending = true;
		mobileIsland.closeNavDrawer();
		// Sections without a top search bar (settings) fall back to mail search.
		if (!topSearchSection($page.url.pathname)) void goto(settings.preferredMailHref());
	}
</script>

<div class="z-nav-drawer__header">
	<UserMenu compact apps />
	<span class="flex items-center gap-0.5">
		<a
			href="/settings"
			class="z-mobile-island__icon-btn no-underline"
			aria-label="Settings"
			onclick={() => mobileIsland.closeNavDrawer()}
		>
			<Settings class="size-[1.125rem]" aria-hidden="true" />
		</a>
		<button
			type="button"
			class="z-mobile-island__icon-btn"
			aria-label="Search"
			onclick={openSearch}
		>
			<Search class="size-[1.125rem]" aria-hidden="true" />
		</button>
	</span>
</div>
