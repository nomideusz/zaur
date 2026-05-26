<script lang="ts">
	import { Clock, Send, Trash2, X } from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { outbox } from '$lib/stores/outbox.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
	import type { OutboxDoc } from '$lib/db/types';

	let open = $state(false);

	const hasFailed = $derived(outbox.items.some((item) => item.status === 'failed'));

	function statusLabel(item: OutboxDoc) {
		if (item.status === 'sending') return 'Sending…';
		if (item.status === 'failed') return item.error ?? 'Failed';
		return 'Queued';
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
		label={outbox.pendingCount ? `${outbox.pendingCount} queued messages` : 'Outbox'}
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
				<p class={cn('font-medium text-fg', settings.compactOutboxMenu ? 'text-xs' : 'text-sm')}>Outbox</p>
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

			{#if hasFailed}
				<p
					class={cn(
						'px-3 text-xs text-fg-muted',
						settings.compactOutboxMenu ? 'py-1.5' : 'py-2',
						!settings.hidePaneBorders && 'border-t border-border'
					)}
				>
					Failed messages retry automatically when online.
				</p>
			{/if}
		</div>
	{/if}
</div>
