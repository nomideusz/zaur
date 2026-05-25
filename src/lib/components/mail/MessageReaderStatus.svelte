<script lang="ts">
	import { AlertCircle, ArrowLeft, MailX, WifiOff } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		message: string;
		onBack?: () => void;
	}

	let { message, onBack }: Props = $props();

	const isOffline = $derived(message.startsWith('Offline'));
	const isNotFound = $derived(message === 'Message not found');
</script>

<div
	class={cn(
		'flex min-h-0 flex-1 flex-col items-center justify-center bg-surface-raised text-center',
		settings.compactReaderStatus ? 'gap-3 p-4' : 'gap-4 p-8'
	)}
>
	<div class={cn('rounded-full bg-surface-sunken', settings.compactReaderStatus ? 'p-3' : 'p-4')}>
		{#if isOffline}
			<WifiOff class={cn('text-fg-subtle', settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{:else if isNotFound}
			<MailX class={cn('text-fg-subtle', settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{:else}
			<AlertCircle class={cn('text-fg-subtle', settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{/if}
	</div>

	<div>
		<h2 class={cn('font-medium text-fg', settings.compactReaderStatus ? 'text-base' : 'text-lg')}>
			{#if isNotFound}
				Message not found
			{:else if isOffline}
				Offline
			{:else}
				Couldn't load message
			{/if}
		</h2>
		{#if !settings.hideReaderStatusMessage}
			<p class={cn('mx-auto mt-2 max-w-sm text-fg-muted', settings.compactReaderStatus ? 'text-xs' : 'text-sm')}>
				{message}
			</p>
		{/if}
	</div>

	{#if onBack && !settings.hideReaderStatusBackButton}
		<Button variant="ghost" onclick={onBack}>
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to list
		</Button>
	{/if}
</div>
