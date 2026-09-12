<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { renderMessageBody } from '#lib/email/html';
	import type { MessageDetail } from '@zaur/mail-core';
	import EmailHtmlFrame from './EmailHtmlFrame.svelte';
	import { formatBytes, formatReaderTime, typeBadge } from '#lib/mail/rows';

	interface Props {
		messages: MessageDetail[] | undefined;
		loading: boolean;
		error: unknown;
		onRetry: () => void;
		onCompose: (
			mode: 'reply' | 'replyAll' | 'forward',
			message: MessageDetail,
			anchor: { left: number; top: number; right: number; bottom: number } | null
		) => void;
	}

	let { messages, loading, error, onRetry, onCompose }: Props = $props();

	let earlierExpanded = $state(false);

	$effect(() => {
		// Reset the collapse when a different thread loads.
		void messages?.[0]?.threadId;
		earlierExpanded = false;
	});

	const latest = $derived(messages && messages.length > 0 ? messages[messages.length - 1] : undefined);
	const earlier = $derived(messages && messages.length > 1 ? messages.slice(0, -1) : []);

	const rendered = $derived.by(() => {
		if (!latest) return undefined;
		const result = renderMessageBody({
			bodyHtml: latest.bodyHtml,
			bodyText: latest.bodyText,
			allowExternal: true
		});
		return { ...result, attachments: latest.attachments };
	});

	function recipientsLabel(message: MessageDetail): string {
		const others = [...message.to, ...message.cc].filter(
			(person) => person.email.toLowerCase() !== message.from.email.toLowerCase()
		);
		if (others.length === 0) return 'to me';
		const first = others[0]!;
		const rest = others.length - 1;
		return `to ${first.name || first.email}${rest > 0 ? `, +${rest}` : ''}`;
	}

	function anchorFrom(event: Event) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
	}
</script>

<section class="flex h-full min-h-0 flex-col bg-container" aria-label="Message reader">
	{#if error}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
			<p class="text-sm font-medium">Couldn't load the conversation</p>
			<p class="max-w-[320px] text-[13px] leading-relaxed text-ink-secondary">
				The mail server couldn't be reached.
			</p>
			<button
				type="button"
				class="mt-1 h-8 rounded-[8px] border border-border bg-container px-3.5 text-[13px] transition-colors duration-[160ms] hover:border-border-hover"
				onclick={onRetry}
			>
				Retry
			</button>
		</div>
	{:else if loading && !messages}
		<div class="flex flex-1 flex-col gap-5 px-8 pt-8" aria-hidden="true">
			<div class="h-7 w-2/3 animate-pulse rounded bg-canvas"></div>
			<div class="h-4 w-1/3 animate-pulse rounded bg-canvas"></div>
			<div class="mt-4 space-y-3">
				<div class="h-3.5 w-full animate-pulse rounded bg-canvas"></div>
				<div class="h-3.5 w-5/6 animate-pulse rounded bg-canvas"></div>
				<div class="h-3.5 w-4/6 animate-pulse rounded bg-canvas"></div>
			</div>
		</div>
	{:else if messages && messages.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<p class="max-w-[320px] text-center text-[13px] leading-relaxed text-ink-secondary">
				This conversation has no messages.
			</p>
		</div>
	{:else if latest && rendered}
		<div class="flex h-[50px] shrink-0 items-center gap-2 border-b border-divider px-[26px]">
			<div class="flex items-center">
				<button
					type="button"
					class="inline-flex h-[30px] items-center rounded-l-[8px] border border-line bg-container px-3 text-[13px] transition-colors duration-[160ms] hover:bg-canvas"
					onclick={(event) => latest && onCompose('reply', latest, anchorFrom(event))}
				>
					Reply
				</button>
				<Menu.Root positioning={{ placement: 'bottom-end', gutter: 6, overflowPadding: 12 }} lazyMount unmountOnExit>
					<Menu.Trigger
						class="inline-flex h-[30px] w-8 items-center justify-center rounded-r-[8px] border border-line border-l-0 bg-container transition-colors duration-[160ms] hover:bg-canvas"
						aria-label="More actions"
					>
						<svg class="size-4 text-ink-muted" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
							<circle cx="8" cy="3.5" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="8" cy="12.5" r="1.3" />
						</svg>
					</Menu.Trigger>
					<Portal>
						<Menu.Positioner>
							<Menu.Content class="z-40 w-[196px] rounded-[10px] border border-line bg-container p-1.5 shadow-menu">
								{#each [['Reply all', 'replyAll'], ['Forward', 'forward']] as [action, mode] (action)}
									<Menu.Item
										value={action}
										class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider"
										onSelect={() => latest && onCompose(mode as 'replyAll' | 'forward', latest, null)}
									>
										{action}
									</Menu.Item>
								{/each}
								{#each ['Archive', 'Highlight', 'Mark unseen', 'Move to junk'] as action (action)}
									<Menu.Item
										value={action}
										class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] data-highlighted:bg-divider"
										title="Arrives with the write path"
									>
										{action}
									</Menu.Item>
								{/each}
								<Menu.Item
									value="trash"
									class="cursor-default rounded-[7px] px-2.5 py-2 text-[13px] text-danger data-highlighted:bg-divider"
									title="Arrives with the write path"
								>
									Trash
								</Menu.Item>
							</Menu.Content>
						</Menu.Positioner>
					</Portal>
				</Menu.Root>
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-[34px] pt-8 pb-2">
			<div class="mx-auto flex max-w-[660px] flex-col gap-[22px]">
				<h1 class="text-[25px] leading-[1.28] font-medium tracking-[-0.02em]">
					{latest.subject}
				</h1>

				<div class="flex items-baseline gap-2">
					<span class="text-sm font-medium">{latest.from.name || latest.from.email}</span>
					<span class="min-w-0 flex-1 truncate text-xs text-ink-secondary">
						{latest.from.email}{latest.from.email ? ' — ' : ''}{recipientsLabel(latest)}
					</span>
					<time class="shrink-0 text-xs text-ink-secondary tabular-nums" datetime={latest.receivedAt}>
						{formatReaderTime(latest.receivedAt)}
					</time>
				</div>
				<div class="h-px bg-divider"></div>

				{#if earlier.length > 0 && !earlierExpanded}
					<button
						type="button"
						class="flex w-full items-center gap-4 rounded-[10px] border border-line-light bg-surface-subtle px-4 py-3 text-left transition-colors duration-[160ms] hover:border-border-hover"
						onclick={() => (earlierExpanded = true)}
					>
						<span class="shrink-0 font-mono text-[11px] tracking-[0.06em] text-ink-tertiary uppercase">
							{earlier.length} earlier message{earlier.length === 1 ? '' : 's'}
						</span>
						<span class="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
							{earlier[earlier.length - 1]!.preview || earlier[earlier.length - 1]!.subject}
						</span>
					</button>
				{/if}

				{#if earlierExpanded}
					{#each earlier as message (message.id)}
						<div class="flex flex-col gap-2 border-l-2 border-divider py-2 pl-4">
							<div class="flex items-baseline gap-2">
								<span class="text-[13px] font-medium text-ink-muted">{message.from.name || message.from.email}</span>
								<time class="text-xs font-normal text-ink-secondary tabular-nums" datetime={message.receivedAt}>
									{formatReaderTime(message.receivedAt)}
								</time>
							</div>
							<div class="text-sm leading-[1.65] text-ink-body whitespace-pre-wrap">
								{message.bodyText}
							</div>
						</div>
					{/each}
				{/if}

				<div class="max-w-[33em]">
					<EmailHtmlFrame html={rendered.html} plain={!rendered.isHtml} />
				</div>

				{#if rendered.attachments.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each rendered.attachments as attachment (attachment.blobId)}
							<div class="flex h-[46px] w-fit items-center gap-3 rounded-[10px] border border-line-light px-3.5" title={`${attachment.name} — downloads arrive in a later slice`}>
								<span class="flex size-6 items-center justify-center rounded-[5px] bg-divider font-mono text-[9px] text-ink-muted">
									{typeBadge(attachment.type)}
								</span>
								<span class="max-w-48 truncate text-[13px]">{attachment.name}</span>
								<span class="text-[11px] text-ink-secondary tabular-nums">{formatBytes(attachment.size)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<p class="text-sm font-medium">Nothing selected</p>
				<p class="mt-1 text-[13px] text-ink-secondary">
					Pick a message, or press <kbd class="rounded bg-divider px-1 font-mono text-xs">j</kbd> to walk the list.
				</p>
			</div>
		</div>
	{/if}
</section>
