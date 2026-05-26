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
	const isNotFound = $derived(message.startsWith('Message not found'));
	const title = $derived.by(() => {
		if (isNotFound) return 'This message is not available';
		if (isOffline) return 'You are offline';
		return 'Message could not load';
	});
	const description = $derived.by(() => {
		if (isNotFound) return 'It may have been moved or deleted on another device.';
		if (isOffline) return 'Reconnect to the internet and try opening this message again.';
		return message;
	});
</script>

<div
	class={cn(
		'z-mail-pane-surface min-h-0 flex-1 items-center justify-center text-center',
		settings.compactReaderStatus ? 'gap-3 p-4' : 'gap-4 p-8'
	)}
>
	<div class={cn('text-fg-subtle', settings.compactReaderStatus ? 'p-1' : 'p-2')}>
		{#if isOffline}
			<WifiOff class={cn(settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{:else if isNotFound}
			<MailX class={cn(settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{:else}
			<AlertCircle class={cn(settings.compactReaderStatus ? 'size-6' : 'size-8')} aria-hidden="true" />
		{/if}
	</div>

	<div>
		<h2 class={cn('font-semibold text-fg', settings.compactReaderStatus ? 'text-base' : 'text-lg')}>
			{title}
		</h2>
		{#if !settings.hideReaderStatusMessage}
			<p class={cn('mx-auto mt-2 max-w-sm text-fg-muted', settings.compactReaderStatus ? 'text-xs' : 'text-sm')}>
				{description}
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
