<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	const links = [
		{ href: '/settings/display', label: 'Display', hint: 'Theme, list, reading' },
		{ href: '/settings/mail', label: 'Mail', hint: 'Notifications, shortcuts' },
		{ href: '/settings/account', label: 'Account', hint: 'Profile, sign out' }
	];

	let { children } = $props();
</script>

<div class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:flex-row md:gap-8 md:p-8">
	<header class="md:hidden">
		<a
			href="/mail/inbox"
			class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
		>
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to mail
		</a>
		<h1 class="mb-3 text-lg font-semibold text-fg">Settings</h1>
		<nav class="flex gap-1 overflow-x-auto pb-1">
			{#each links as link}
				<a
					href={link.href}
					class={cn(
						'shrink-0 rounded-md px-3 py-2 text-sm transition-colors',
						$page.url.pathname === link.href
							? 'bg-surface-sunken font-medium text-fg'
							: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
					)}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</header>

	<aside class="hidden w-52 shrink-0 md:block">
		<a
			href="/mail/inbox"
			class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
		>
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to mail
		</a>
		<h1 class="mb-4 text-lg font-semibold text-fg">Settings</h1>
		<nav class="space-y-1">
			{#each links as link}
				<a
					href={link.href}
					class={cn(
						'block rounded-md px-3 py-2 transition-colors',
						$page.url.pathname === link.href
							? 'bg-surface-sunken'
							: 'hover:bg-surface-sunken'
					)}
				>
					<span
						class={cn(
							'block text-sm',
							$page.url.pathname === link.href ? 'font-medium text-fg' : 'text-fg'
						)}
					>
						{link.label}
					</span>
					<span class="block text-xs text-fg-muted">{link.hint}</span>
				</a>
			{/each}
		</nav>
	</aside>

	<div class="min-w-0 flex-1">{@render children()}</div>
</div>
