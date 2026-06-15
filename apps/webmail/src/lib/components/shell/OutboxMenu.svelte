<script lang="ts">
	import { Popover } from '@ark-ui/svelte/popover';
	import { Portal } from '@ark-ui/svelte/portal';
	import Clock from '$lib/components/icons/Clock.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { network } from '$lib/stores/network.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OutboxDoc } from '$lib/db/types';

	interface Props {
		display?: 'icon' | 'text';
	}

	let { display = 'icon' }: Props = $props();

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
</script>

<Popover.Root
	{open}
	onOpenChange={(details) => (open = details.open)}
	positioning={{ placement: 'bottom-end', gutter: 8, overflowPadding: 8 }}
	ids={{ content: 'outbox-menu' }}
>
	{#if display === 'text'}
		<Popover.Trigger
			class={cn(
				'z-btn-ghost h-9 w-full justify-between px-2 text-sm',
				open && 'bg-surface-sunken/70 text-fg'
			)}
		>
			<span class="truncate text-left">{outbox.pendingCount ? outboxLabel : 'Outbox'}</span>
			{#if outbox.pendingCount}
				<Badge count={outbox.pendingCount} variant="muted" class="ml-2 shrink-0" />
			{/if}
		</Popover.Trigger>
	{:else}
		<Popover.Trigger
			aria-label={outboxLabel}
			class={cn('z-btn-icon relative min-h-10 min-w-10 p-2.5', open && 'bg-surface-sunken/70 text-fg')}
		>
			<Send class="size-4" />
			{#if outbox.pendingCount}
				<span class="absolute -right-0.5 -top-0.5">
					<Badge count={outbox.pendingCount} />
				</span>
			{/if}
		</Popover.Trigger>
	{/if}

	<Portal>
		<Popover.Positioner>
			<Popover.Content
				aria-label="Outbox"
				class="z-50 w-[min(20rem,calc(100vw-1rem))] rounded-md border border-border bg-surface-raised shadow-md"
				onpointerdown={(e) => e.stopPropagation()}
			>
				<div class="flex items-center justify-between border-b border-border px-3 py-2">
					<div>
						<p class="text-sm font-medium text-fg">Outbox</p>
						{#if outbox.items.length}
							<p class="text-xs text-fg-subtle">{outboxLabel.replace('Outbox: ', '')}</p>
						{/if}
					</div>
					<IconButton label="Close outbox" onclick={() => (open = false)}>
						<X class="size-4" />
					</IconButton>
				</div>

				{#if !outbox.items.length}
					<p class="px-3 py-4 text-sm text-fg-muted">No queued messages</p>
				{:else}
					<ul class="max-h-72 overflow-y-auto py-1">
						{#each outbox.items as item (item.id)}
							<li class="border-b border-border px-3 py-2 last:border-b-0">
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
											onclick={async () => {
												const { confirm: askConfirm } = await import('$lib/stores/confirm.svelte');
												if (
													await askConfirm.ask({
														title: 'Discard queued message?',
														description: 'Discard this queued message?',
														confirmLabel: 'Discard',
														tone: 'danger'
													})
												) {
													outbox.discard(item.id);
												}
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
					<p class="border-t border-border px-3 py-2 text-xs text-fg-muted">
						{#if hasFailed}
							Failed messages retry automatically when online. Use retry to send one now.
						{:else if network.isOnline}
							Queued messages send automatically in the background.
						{:else}
							Queued messages will send as soon as this device is online.
						{/if}
					</p>
				{/if}
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover.Root>
