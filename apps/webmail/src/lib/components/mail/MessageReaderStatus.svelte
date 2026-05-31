<script lang="ts">
	import AlertCircle from '$lib/components/icons/AlertCircle.svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import MailX from '$lib/components/icons/MailX.svelte';
	import WifiOff from '$lib/components/icons/WifiOff.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		message: string;
		onBack?: () => void;
		onRetry?: () => void;
	}

	let { message, onBack, onRetry }: Props = $props();

	const isOffline = $derived(message.startsWith('Offline'));
	const isNotFound = $derived(message.startsWith('Message not found'));
	const isServerDown = $derived(
		message.includes('502') || message.toLowerCase().includes('mail server unavailable')
	);
	const title = $derived.by(() => {
		if (isNotFound) return 'This message is not available';
		if (isOffline) return 'You are offline';
		if (isServerDown) return 'Mail server unavailable';
		return 'Message could not load';
	});
	const description = $derived.by(() => {
		if (isNotFound) return 'It may have been moved or deleted on another device.';
		if (isOffline) return 'Reconnect to the internet and try opening this message again.';
		return message;
	});
</script>

<div class="z-mail-pane-surface flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
	<div class="p-2 text-fg-subtle">
		{#if isOffline}
			<WifiOff class="size-8" aria-hidden="true" />
		{:else if isNotFound}
			<MailX class="size-8" aria-hidden="true" />
		{:else}
			<AlertCircle class="size-8" aria-hidden="true" />
		{/if}
	</div>

	<div>
		<h2 class="text-lg font-semibold text-fg">
			{title}
		</h2>
		<p class="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
			{description}
		</p>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2">
		{#if onRetry}
			<Button variant="primary" onclick={onRetry}>Try again</Button>
		{/if}
		{#if onBack}
			<Button variant="ghost" onclick={onBack}>
				<ArrowLeft class="size-4" aria-hidden="true" />
				Back to list
			</Button>
		{/if}
	</div>
</div>
