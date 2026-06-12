<script lang="ts">
	import { page } from '$app/stores';
	import { activeMobileNavItem, mobileNavItems } from '$lib/shell/app-nav';
	import { cn } from '$lib/utils/cn';

	const items = $derived(mobileNavItems());
	const activeId = $derived(activeMobileNavItem($page.url.pathname)?.id);
</script>

<nav class="z-mobile-island__nav" aria-label="Apps">
	{#each items as item (item.id)}
		{@const Icon = item.icon}
		{@const isActive = item.id === activeId}
		<a
			href={item.href}
			class={cn('z-mobile-island__nav-link', isActive && 'z-mobile-island__nav-link--active')}
			aria-current={isActive ? 'page' : undefined}
		>
			<Icon class="size-[1.125rem] shrink-0" aria-hidden="true" />
			<span>{item.label}</span>
		</a>
	{/each}
</nav>
