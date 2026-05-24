<script lang="ts">
	import { AlertCircle, ArrowLeft, MailX, WifiOff } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		message: string;
		onBack?: () => void;
	}

	let { message, onBack }: Props = $props();

	const isOffline = $derived(message.startsWith('Offline'));
	const isNotFound = $derived(message === 'Message not found');
</script>

<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-surface-raised p-8 text-center">
	<div class="rounded-full bg-surface-sunken p-4">
		{#if isOffline}
			<WifiOff class="size-8 text-fg-subtle" aria-hidden="true" />
		{:else if isNotFound}
			<MailX class="size-8 text-fg-subtle" aria-hidden="true" />
		{:else}
			<AlertCircle class="size-8 text-fg-subtle" aria-hidden="true" />
		{/if}
	</div>

	<div>
		<h2 class="text-lg font-medium text-fg">
			{#if isNotFound}
				Message not found
			{:else if isOffline}
				Offline
			{:else}
				Couldn't load message
			{/if}
		</h2>
		<p class="mx-auto mt-2 max-w-sm text-sm text-fg-muted">{message}</p>
	</div>

	{#if onBack}
		<Button variant="ghost" onclick={onBack}>
			<ArrowLeft class="size-4" aria-hidden="true" />
			Back to list
		</Button>
	{/if}
</div>
