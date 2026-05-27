<script lang="ts">
	import Clock from '$lib/components/icons/Clock.svelte';
import Send from '$lib/components/icons/Send.svelte';
import Trash2 from '$lib/components/icons/Trash2.svelte';
import X from '$lib/components/icons/X.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { network } from '$lib/stores/network.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OutboxDoc } from '$lib/db/types';

	let open = $state(false);

	const hasFailed = $derived(outbox.items.some((item) => item.status === 'failed'));
	const sendingCount = $derived(outbox.items.filter((item) => item.status === 'sending').length);
	const failedCount = $derived(outbox.items.filter((item) => item.status === 'failed').length);
	const queuedCount = $derived(outbox.items.filter((item) => item.status === 'pending').length);
	const outboxLabel = $derived.by(() => {
		if (!outbox.pendingCount) return 'Outbox';
		const parts = [
			sendingCount ? `${sendingCount} sending` : null,
			queuedCount ? `${queuedCount} queued` : null,
			failedCount ? `${failedCount} failed` : null
		].filter(Boolean);
		return `Outbox: ${parts.join(', ')}`;
	});

	function statusLabel(item: OutboxDoc) {
		if (item.status === 'sending') return 'Sending…';
		if (item.status === 'failed') return item.error ? `Failed: ${item.error}` : 'Failed';
		return network.isOnline ? 'Queued for next retry' : 'Queued until you are back online';
	}

	function recipientPreview(item: OutboxDoc) {
		return item.to.split(',')[0]?.trim() || 'No recipient';
	}

	function onMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="relative">
	<IconButton
		label={outboxLabel}
		class="relative"
		ariaExpanded={open}
		ariaControls="outbox-menu"
		ariaHaspopup="dialog"
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		<Send class="size-4" />
		{#if outbox.pendingCount}
			<span class="absolute -right-0.5 -top-0.5">
				<Badge count={outbox.pendingCount} />
			</span>
		{/if}
	</IconButton>

	{#if open}
		<div
			id="outbox-menu"
			role="dialog"
			aria-label="Outbox"
			tabindex="-1"
			class="absolute right-0 z-30 mt-1 w-[min(20rem,calc(100vw-1rem))] rounded-md border border-border bg-surface-raised shadow-md"
			onpointerdown={(e) => e.stopPropagation()}
			onkeydown={onMenuKeydown}
		>
			<div
				class={cn(
					'flex items-center justify-between px-3',
					settings.compactOutboxMenu ? 'py-1.5' : 'py-2',
					!settings.hidePaneBorders && 'border-b border-border'
				)}
			>
				<div>
					<p class={cn('font-medium text-fg', settings.compactOutboxMenu ? 'text-xs' : 'text-sm')}>Outbox</p>
					{#if outbox.items.length}
						<p class="text-xs text-fg-subtle">{outboxLabel.replace('Outbox: ', '')}</p>
					{/if}
				</div>
				<IconButton label="Close outbox" onclick={() => (open = false)}>
					<X class="size-4" />
				</IconButton>
			</div>

			{#if !outbox.items.length}
				<p class={cn('px-3 text-sm text-fg-muted', settings.compactOutboxMenu ? 'py-3' : 'py-4')}>
					No queued messages
				</p>
			{:else}
				<ul class="max-h-72 overflow-y-auto py-1">
					{#each outbox.items as item (item.id)}
						<li
							class={cn(
								'px-3',
								settings.compactOutboxMenu ? 'py-1.5' : 'py-2',
								!settings.hidePaneBorders && 'border-b border-border last:border-b-0'
							)}
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-fg">
										{item.subject || '(no subject)'}
									</p>
									<p class="truncate text-xs text-fg-subtle">To {recipientPreview(item)}</p>
									{#if item.attempts > 0}
										<p class="mt-0.5 text-[11px] text-fg-subtle">
											Attempt {item.attempts}
										</p>
									{/if}
									<p
										class="mt-1 text-xs {item.status === 'failed'
											? 'text-red-600 dark:text-red-400'
											: 'text-fg-muted'}"
									>
										{statusLabel(item)}
									</p>
								</div>
								<div class="flex shrink-0 gap-1">
									{#if item.status === 'failed'}
										<IconButton label="Retry send" onclick={() => outbox.retry(item.id)}>
											<Clock class="size-4" />
										</IconButton>
									{/if}
									<IconButton
										label="Discard queued message"
										onclick={() => {
											if (confirm('Discard this queued message?')) outbox.discard(item.id);
										}}
									>
										<Trash2 class="size-4" />
									</IconButton>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#if hasFailed || outbox.items.length}
				<p
					class={cn(
						'px-3 text-xs text-fg-muted',
						settings.compactOutboxMenu ? 'py-1.5' : 'py-2',
						!settings.hidePaneBorders && 'border-t border-border'
					)}
				>
					{#if hasFailed}
						Failed messages retry automatically when online. Use retry to send one now.
					{:else if network.isOnline}
						Queued messages send automatically in the background.
					{:else}
						Queued messages will send as soon as this device is online.
					{/if}
				</p>
			{/if}
		</div>
	{/if}
</div>
