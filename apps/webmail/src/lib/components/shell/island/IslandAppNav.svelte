<script lang="ts">
	import { page } from '$app/stores';
	import UserMenu from '$lib/components/shell/UserMenu.svelte';
	import { activeMobileNavItem, mobileNavItems } from '$lib/shell/app-nav';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** Close the nav drawer after picking an app (drawer context). */
		onNavigate?: () => void;
	}

	let { onNavigate }: Props = $props();

	const items = $derived(mobileNavItems());
	const activeId = $derived(activeMobileNavItem($page.url.pathname)?.id);

	function handleNavigate(itemId: string) {
		// Search redirects to the in-place list search — surface the input it needs.
		if (itemId === 'search') {
			mobileIsland.searchBarOpen = true;
			mobileIsland.searchBarFocusPending = true;
		}
		onNavigate?.();
		mobileIsland.closeNavDrawer();
	}
</script>

<div class="z-nav-drawer__header">
	<nav class="z-nav-drawer__apps" aria-label="Apps">
		<div class="z-mobile-island__nav">
			{#each items as item (item.id)}
				{@const Icon = item.icon}
				{@const isActive = item.id === activeId}
				<a
					href={item.href}
					class={cn('z-mobile-island__nav-link', isActive && 'z-mobile-island__nav-link--active')}
					aria-current={isActive ? 'page' : undefined}
					onclick={() => handleNavigate(item.id)}
				>
					<Icon class="size-5 shrink-0" aria-hidden="true" />
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
	<UserMenu compact />
</div>
