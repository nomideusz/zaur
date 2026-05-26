<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';
	import { Calendar, Home, Mail, Users } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const tools = $derived([
		{
			href: settings.preferredMailHref(),
			label: 'Mail',
			icon: Mail,
			active: (path: string) => path.startsWith('/mail')
		},
		...(!settings.mailOnlyNavigation
			? [
					{
						href: '/calendar',
						label: 'Calendar',
						icon: Calendar,
						active: (path: string) => path.startsWith('/calendar')
					},
					{
						href: '/contacts',
						label: 'Contacts',
						icon: Users,
						active: (path: string) => path.startsWith('/contacts')
					}
				]
			: []),
		...(!settings.skipHomeScreen
			? [{ href: '/', label: 'Home', icon: Home, active: (path: string) => path === '/' }]
			: [])
	]);
</script>

<nav aria-label="Tools" class="flex items-center gap-1 rounded-lg bg-surface-sunken/70 p-1">
	{#each tools as tool}
		{@const Icon = tool.icon}
		{@const isActive = tool.active($page.url.pathname)}
		<a
			href={tool.href}
			class={cn(
				'flex items-center rounded-md text-sm transition-all',
				settings.compactToolSwitcher ? 'gap-1.5 px-2 py-1' : 'gap-2 px-2.5 py-1.5',
				isActive
					? 'bg-surface-raised font-semibold text-fg shadow-sm'
					: 'text-fg-muted hover:bg-surface-raised/70 hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
			title={tool.label}
		>
			<Icon class="size-4" aria-hidden="true" />
			<span class={settings.toolIconsOnly ? 'sr-only' : 'hidden sm:inline'}>{tool.label}</span>
		</a>
	{/each}
</nav>
