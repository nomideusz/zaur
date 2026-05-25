<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';
	import { Calendar, Home, Mail, Users } from 'lucide-svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const tools = $derived([
		{ href: '/mail/inbox', label: 'Mail', icon: Mail, active: (path: string) => path.startsWith('/mail') },
		{ href: '/calendar', label: 'Calendar', icon: Calendar, active: (path: string) => path.startsWith('/calendar') },
		{ href: '/contacts', label: 'Contacts', icon: Users, active: (path: string) => path.startsWith('/contacts') },
		...(!settings.skipHomeScreen
			? [{ href: '/', label: 'Home', icon: Home, active: (path: string) => path === '/' }]
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
				'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
				isActive ? 'bg-surface-sunken font-medium text-fg' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
			title={tool.label}
		>
			<Icon class="size-4" aria-hidden="true" />
			<span class="hidden sm:inline">{tool.label}</span>
		</a>
	{/each}
</nav>
