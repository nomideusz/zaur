<script lang="ts">
	import { PenSquare, Mail } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		title?: string;
		description?: string;
		showCompose?: boolean;
		showSettings?: boolean;
	}

	let {
		title = 'Select a message',
		description = 'Choose a conversation from the list to read it here, or start writing something new.',
		showCompose = true,
		showSettings = true
	}: Props = $props();

	const showComposeButton = $derived(showCompose && !settings.hideEmptyReaderPrompts);
	const showSettingsButton = $derived(showSettings && !settings.hideEmptyReaderPrompts);
	const showPrompts = $derived(!settings.hideEmptyReaderPrompts);
</script>

<div
	class={cn(
		'flex min-h-0 flex-1 flex-col items-center justify-center bg-surface-raised text-center',
		settings.compactEmptyReader ? 'gap-3 p-4' : 'gap-4 p-8'
	)}
>
	{#if showPrompts}
		<div class={cn('rounded-full bg-surface-sunken', settings.compactEmptyReader ? 'p-3' : 'p-4')}>
			<Mail class={cn('text-fg-subtle', settings.compactEmptyReader ? 'size-6' : 'size-8')} aria-hidden="true" />
		</div>
		<div>
			<h2 class={cn('font-medium text-fg', settings.compactEmptyReader ? 'text-base' : 'text-lg')}>{title}</h2>
			{#if !settings.hideEmptyReaderDescription}
				<p class={cn('mx-auto mt-2 max-w-sm text-fg-muted', settings.compactEmptyReader ? 'text-xs' : 'text-sm')}>
					{description}
				</p>
			{/if}
		</div>
	{/if}
	{#if showComposeButton || showSettingsButton}
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#if showComposeButton}
				<Button href="/mail/compose">
					<PenSquare class="size-4" aria-hidden="true" />
					Compose
				</Button>
			{/if}
			{#if showSettingsButton}
				<Button href="/settings/display" variant="ghost">Display settings</Button>
			{/if}
		</div>
	{/if}
</div>
