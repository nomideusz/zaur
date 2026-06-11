<script lang="ts">
	import { page } from '$app/stores';
	import Search from '$lib/components/icons/Search.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import { appNavItems } from '$lib/shell/app-nav';
	import { cn } from '$lib/utils/cn';

	const items = $derived([
		...appNavItems(),
		{
			id: 'search',
			href: '/mail/search',
			label: 'Search',
			icon: Search,
			isActive: (path: string) => path.startsWith('/mail/search')
		},
		{
			id: 'settings',
			href: '/settings/account',
			label: 'Settings',
			icon: Settings,
			isActive: (path: string) => path.startsWith('/settings')
		}
	]);
	const pathname = $derived($page.url.pathname);
	const onSearchRoute = $derived(pathname.startsWith('/mail/search'));

	/* Search lives under /mail/* — don't light up Mail while searching. */
	function itemActive(item: (typeof items)[number]): boolean {
		if (item.id === 'mail' && onSearchRoute) return false;
		return item.isActive(pathname);
	}
</script>

<footer class="z-app-mobile-nav shrink-0 md:hidden" aria-label="Apps">
	<nav class="z-app-mobile-nav__grid">
		{#each items as item (item.id)}
			{@const Icon = item.icon}
			{@const isActive = itemActive(item)}
			<a
				href={item.href}
				class={cn(
					'z-app-mobile-nav__link',
					isActive && 'z-app-mobile-nav__link--active'
				)}
				aria-current={isActive ? 'page' : undefined}
			>
				<Icon class="size-[1.125rem] shrink-0" aria-hidden="true" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</footer>
