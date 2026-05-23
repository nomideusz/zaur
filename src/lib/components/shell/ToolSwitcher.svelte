<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';
	import { Calendar, Home, Mail, Users } from 'lucide-svelte';

	const tools = [
		{ href: '/mail/inbox', label: 'Mail', icon: Mail, active: (path: string) => path.startsWith('/mail') },
		{ href: '/calendar', label: 'Calendar', icon: Calendar, active: () => false, soon: true },
		{ href: '/contacts', label: 'Contacts', icon: Users, active: () => false, soon: true },
		{ href: '/', label: 'Home', icon: Home, active: (path: string) => path === '/' }
	];
</script>

<nav aria-label="Tools" class="flex items-center gap-1">
	{#each tools as tool}
		{@const Icon = tool.icon}
		{@const isActive = tool.active($page.url.pathname)}
		<a
			href={tool.href}
			class={cn(
				'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
				isActive ? 'bg-surface-sunken font-medium text-fg' : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
				tool.soon && 'pointer-events-none opacity-40'
			)}
			aria-current={isActive ? 'page' : undefined}
		>
			<Icon class="size-4" aria-hidden="true" />
			<span class="hidden sm:inline">{tool.label}</span>
			{#if tool.soon}
				<span class="hidden text-[10px] uppercase tracking-wide text-fg-subtle lg:inline">Soon</span>
			{/if}
		</a>
	{/each}
</nav>
