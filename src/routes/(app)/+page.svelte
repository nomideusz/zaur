<script lang="ts">
	import { goto } from '$app/navigation';
	import { Calendar, Mail, Settings, Users } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	$effect(() => {
		if (settings.skipHomeScreen) {
			goto(settings.preferredMailHref(), { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Home · ZAUR</title>
</svelte:head>

<div
	class={cn(
		'mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center overflow-y-auto',
		settings.compactHomeScreen ? 'gap-5 p-5' : 'gap-8 p-8'
	)}
>
	<div>
		<h1 class={cn('font-semibold text-fg', settings.compactHomeScreen ? 'text-xl' : 'text-2xl')}>
			Welcome back
		</h1>
		{#if !settings.hideHomeScreenSubtitle && !settings.compactHomeScreen}
			<p class="mt-1 text-sm text-fg-muted">Choose a tool to get started.</p>
		{/if}
	</div>

	<div class={cn('grid sm:grid-cols-2 lg:grid-cols-4', settings.compactHomeScreen ? 'gap-3' : 'gap-4')}>
		<a
			href="/mail/inbox"
			class={cn(
				'z-panel group rounded-xl transition-shadow hover:shadow-md',
				settings.compactHomeScreen ? 'p-4' : 'p-5'
			)}
		>
			<Mail class={cn('text-accent', settings.compactHomeScreen ? 'size-5' : 'size-6')} aria-hidden="true" />
			<h2 class={cn('font-medium text-fg group-hover:text-accent', settings.compactHomeScreen ? 'mt-2' : 'mt-3')}>
				Mail
			</h2>
			{#if !settings.hideHomeCardDescriptions && !settings.compactHomeScreen}
				<p class="mt-1 text-xs text-fg-muted">Read and send messages</p>
			{/if}
		</a>

		<a
			href="/calendar"
			class={cn(
				'z-panel group rounded-xl transition-shadow hover:shadow-md',
				settings.compactHomeScreen ? 'p-4' : 'p-5'
			)}
		>
			<Calendar class={cn('text-accent', settings.compactHomeScreen ? 'size-5' : 'size-6')} aria-hidden="true" />
			<h2 class={cn('font-medium text-fg group-hover:text-accent', settings.compactHomeScreen ? 'mt-2' : 'mt-3')}>
				Calendar
			</h2>
			{#if !settings.hideHomeCardDescriptions && !settings.compactHomeScreen}
				<p class="mt-1 text-xs text-fg-muted">Events and scheduling</p>
			{/if}
		</a>

		<a
			href="/contacts"
			class={cn(
				'z-panel group rounded-xl transition-shadow hover:shadow-md',
				settings.compactHomeScreen ? 'p-4' : 'p-5'
			)}
		>
			<Users class={cn('text-accent', settings.compactHomeScreen ? 'size-5' : 'size-6')} aria-hidden="true" />
			<h2 class={cn('font-medium text-fg group-hover:text-accent', settings.compactHomeScreen ? 'mt-2' : 'mt-3')}>
				Contacts
			</h2>
			{#if !settings.hideHomeCardDescriptions && !settings.compactHomeScreen}
				<p class="mt-1 text-xs text-fg-muted">People and address books</p>
			{/if}
		</a>

		<a
			href="/settings/display"
			class={cn(
				'z-panel group rounded-xl transition-shadow hover:shadow-md',
				settings.compactHomeScreen ? 'p-4' : 'p-5'
			)}
		>
			<Settings class={cn('text-accent', settings.compactHomeScreen ? 'size-5' : 'size-6')} aria-hidden="true" />
			<h2 class={cn('font-medium text-fg group-hover:text-accent', settings.compactHomeScreen ? 'mt-2' : 'mt-3')}>
				Settings
			</h2>
			{#if !settings.hideHomeCardDescriptions && !settings.compactHomeScreen}
				<p class="mt-1 text-xs text-fg-muted">Theme, mail, and account</p>
			{/if}
		</a>
	</div>

	{#if !settings.hideHomeOpenInboxButton}
		<Button href="/mail/inbox">Open inbox</Button>
	{/if}
</div>
