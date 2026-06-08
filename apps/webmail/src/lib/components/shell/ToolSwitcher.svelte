<script lang="ts">
	import { page } from '$app/stores';
	import { appNavItems } from '$lib/shell/app-nav';
	import { cn } from '$lib/utils/cn';

	const tools = $derived(appNavItems());
	const pathname = $derived($page.url.pathname);
</script>

<nav aria-label="Apps" class="flex items-center gap-1">
	{#each tools as tool (tool.id)}
		{@const Icon = tool.icon}
		{@const isActive = tool.isActive(pathname)}
		<a
			href={tool.href}
			class={cn(
				'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
				isActive ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
		>
			<Icon class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
			<span>{tool.label}</span>
		</a>
	{/each}
</nav>
