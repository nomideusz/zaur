<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';
	import Calendar from '$lib/components/icons/Calendar.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import { isMailPath } from '$lib/mail/routes';
	import { settings } from '$lib/stores/settings.svelte';

	const tools = $derived([
		{
			href: settings.preferredMailHref(),
			label: 'Mail',
			icon: Mail,
			active: (path: string) => isMailPath(path)
		},
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
	]);
</script>

<nav
	aria-label="Tools"
	class="relative z-10 flex shrink-0 items-center gap-1 rounded-lg border border-border/40 bg-surface-sunken/60 p-1"
>
	{#each tools as tool}
		{@const Icon = tool.icon}
		{@const isActive = tool.active($page.url.pathname)}
		<a
			href={tool.href}
			class={cn(
				'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold tracking-tight transition-all',
				isActive
					? 'bg-surface-raised text-accent shadow-sm border border-border/40'
					: 'text-fg-muted hover:bg-surface-raised/40 hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
			title={tool.label}
		>
			<Icon class="size-4" aria-hidden="true" />
			<span class="hidden sm:inline">{tool.label}</span>
		</a>
	{/each}
</nav>
