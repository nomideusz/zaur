<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils/cn';

	const links = [
		{ href: '/settings/display', label: 'Display' },
		{ href: '/settings/account', label: 'Account & security' }
	];

	let { children } = $props();
</script>

<div class="mx-auto flex w-full max-w-4xl flex-1 gap-8 p-6 md:p-8">
	<aside class="hidden w-48 shrink-0 md:block">
		<h1 class="mb-4 text-lg font-semibold text-fg">Settings</h1>
		<nav class="space-y-1">
			{#each links as link}
				<a
					href={link.href}
					class={cn(
						'block rounded-md px-3 py-2 text-sm transition-colors',
						$page.url.pathname === link.href
							? 'bg-surface-sunken font-medium text-fg'
							: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
					)}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</aside>

	<div class="min-w-0 flex-1">{@render children()}</div>
</div>
