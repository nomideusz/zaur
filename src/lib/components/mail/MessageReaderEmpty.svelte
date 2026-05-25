<script lang="ts">
	import { PenSquare, Mail } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';

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

<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-surface-raised p-8 text-center">
	{#if showPrompts}
		<div class="rounded-full bg-surface-sunken p-4">
			<Mail class="size-8 text-fg-subtle" aria-hidden="true" />
		</div>
		<div>
			<h2 class="text-lg font-medium text-fg">{title}</h2>
			<p class="mx-auto mt-2 max-w-sm text-sm text-fg-muted">{description}</p>
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
