<script lang="ts">
	import { page } from '$app/stores';
	import Menu from '$lib/components/icons/Menu.svelte';
	import { activeMobileNavItem } from '$lib/shell/app-nav';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const active = $derived(activeMobileNavItem($page.url.pathname));
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Apps and folders"
		aria-expanded={mobileIsland.navDrawerOpen}
		onclick={() => mobileIsland.openNavDrawer()}
	>
		<Menu class="size-[1.125rem]" aria-hidden="true" />
	</button>

	{#if active}
		{@const Icon = active.icon}
		<div class="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
			<Icon class="size-4 shrink-0 text-accent" aria-hidden="true" />
			<span class="truncate text-sm font-medium text-fg">{active.label}</span>
		</div>
	{/if}

	<div class="size-11 shrink-0" aria-hidden="true"></div>
</div>
