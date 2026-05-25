<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const links = [
		{ href: '/settings/display', label: 'Display', hint: 'Layout, reading, navigation' },
		{ href: '/settings/mail', label: 'Mail', hint: 'Notifications, shortcuts' },
		{ href: '/settings/account', label: 'Account', hint: 'Profile, sign out' }
	];

	let { children } = $props();

	const mailHref = $derived(settings.preferredMailHref());
</script>

<div
	class={cn(
		'mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto md:flex-row',
		settings.compactSettingsLayout ? 'gap-4 p-4 md:gap-6 md:p-6' : 'gap-6 p-6 md:gap-8 md:p-8'
	)}
>
	<header class="md:hidden">
		{#if !settings.hideSettingsBackLink}
			<a
				href={mailHref}
				class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to mail
			</a>
		{/if}
		{#if !settings.hideSettingsPageTitle}
			<h1 class="mb-3 text-lg font-semibold text-fg">Settings</h1>
		{/if}
		<nav class="flex gap-1 overflow-x-auto pb-1">
			{#each links as link}
				<a
					href={link.href}
					class={cn(
						'shrink-0 rounded-md text-sm transition-colors',
						settings.compactSettingsNav ? 'px-2.5 py-1.5' : 'px-3 py-2',
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
		{#if !settings.hideSettingsBackLink}
			<a
				href={mailHref}
				class="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to mail
			</a>
		{/if}
		{#if !settings.hideSettingsPageTitle}
			<h1 class="mb-4 text-lg font-semibold text-fg">Settings</h1>
		{/if}
		<nav class="space-y-1">
			{#each links as link}
				<a
					href={link.href}
					class={cn(
						'block rounded-md px-3 transition-colors',
						settings.compactSettingsNav ? 'py-1.5' : 'py-2',
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
					{#if !settings.hideSettingsNavHints}
						<span class="block text-xs text-fg-muted">{link.hint}</span>
					{/if}
				</a>
			{/each}
		</nav>
	</aside>

	<div class="min-w-0 flex-1">{@render children()}</div>

	{#if !settings.hideSettingsNavHints}
		<p class="text-center text-xs text-fg-subtle md:text-left">Settings are saved locally in this browser.</p>
	{/if}
</div>
