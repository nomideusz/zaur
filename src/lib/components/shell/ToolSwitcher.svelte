<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';
	import { Calendar, Mail, Users } from 'lucide-svelte';
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
			: [])
	]);
</script>

<nav aria-label="Tools" class="flex items-center gap-1">
	{#each tools as tool}
		{@const Icon = tool.icon}
		{@const isActive = tool.active($page.url.pathname)}
		<a
			href={tool.href}
			class={cn(
				'flex items-center rounded-sm text-sm transition-colors',
				settings.compactToolSwitcher ? 'gap-1.5 px-2 py-1' : 'gap-2 px-2.5 py-1.5',
				isActive
					? 'font-medium text-fg underline decoration-fg/30 decoration-2 underline-offset-[0.35rem]'
					: 'text-fg-muted hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
			title={tool.label}
		>
			<Icon class="size-5" aria-hidden="true" />
			<span class={settings.toolIconsOnly ? 'sr-only' : 'hidden sm:inline'}>{tool.label}</span>
		</a>
	{/each}
</nav>
