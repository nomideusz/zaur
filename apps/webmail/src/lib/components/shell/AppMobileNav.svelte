<script lang="ts">
	import { page } from '$app/stores';
	import Settings from '$lib/components/icons/Settings.svelte';
	import { appNavItems } from '$lib/shell/app-nav';
	import { cn } from '$lib/utils/cn';

	const items = $derived([
		...appNavItems(),
		{
			id: 'settings',
			href: '/settings/account',
			label: 'Settings',
			icon: Settings,
			isActive: (path: string) => path.startsWith('/settings')
		}
	]);
	const pathname = $derived($page.url.pathname);
</script>

<footer class="z-app-mobile-nav shrink-0 md:hidden" aria-label="Apps">
	<nav class="z-app-mobile-nav__grid">
		{#each items as item (item.id)}
			{@const Icon = item.icon}
			{@const isActive = item.isActive(pathname)}
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
