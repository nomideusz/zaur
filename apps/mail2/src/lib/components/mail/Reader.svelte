<script lang="ts">
	import { renderMessageBody } from '#lib/email/html';
	import type { MessageDetail } from '@zaur/mail-core';
	import EmailHtmlFrame from './EmailHtmlFrame.svelte';
	import { attachmentUrl, formatBytes, formatReaderTime, initials } from '#lib/mail/rows';
	import { attachmentKind } from '#lib/compose/attachments';
	import {
		CHANNELS,
		attachmentBadge,
		channelStyle,
		identityStyle,
		identityTone,
		messageChannel
	} from '#lib/mail/colors';
	import ActionIcon from './ActionIcon.svelte';
	import type { BulkAction } from '../../../routes/mail.remote';

	interface Props {
		/** The page hides this pane on a phone until a thread is open. */
		class?: string;
		messages: MessageDetail[] | undefined;
		loading: boolean;
		error: unknown;
		onRetry: () => void;
		onCompose: (
			mode: 'reply' | 'replyAll' | 'forward',
			message: MessageDetail,
			anchor: { left: number; top: number; right: number; bottom: number } | null
		) => void;
		/** Phone only: the reader is a screen there, so it needs a way back. */
		onBack?: () => void;
		/** The same four actions a row runs, on the thread being read. */
		onAction?: (action: BulkAction, mailboxId?: string) => void;
		/** How the thread stands in the list, so the toolbar can flip its icons. */
		threadState?: { starred: boolean; unread: boolean } | null;
		/** The folder the thread was opened from — it decides the channel for junk, trash, sent. */
		mailboxKind?: string | null;
		/** Archive is the one move worth a button — absent inside Archive itself. */
		archiveTarget?: { id: string } | null;
		/** In Trash, delete destroys; the bin says so by being red at rest. */
		inTrash?: boolean;
	}

	let {
		class: className = '',
		messages,
		loading,
		error,
		onRetry,
		onCompose,
		onBack,
		onAction,
		threadState = null,
		mailboxKind = null,
		archiveTarget = null,
		inTrash = false
	}: Props = $props();

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

	const starred = $derived(threadState?.starred ?? false);
	const unread = $derived(threadState?.unread ?? false);

	/** The thread's channel — the sender card wears it, so list and reader read as one object. */
	const channel = $derived(
		messageChannel({ mailboxKind, starred, important: latest?.important ?? false })
	);

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

	/** A lighter stroke for the time chip on the fill: the channel's stroke, thinned. */
	const timeBorder = $derived(`color-mix(in oklab, ${channel.stroke} 55%, var(--z-surface))`);
</script>

<section
	class="@container flex h-full min-h-0 flex-col bg-[var(--z-surface)] select-none {className}"
	aria-label="Message reader"
>
	<!-- On a phone the way back has to survive the loading, error and empty
	     states too, so the toolbar outlives the message it acts on. -->
	{#if onBack || latest || loading || error}
		<div class="flex h-[46px] shrink-0 items-center justify-between gap-2.5 border-b border-[var(--z-hairline)] px-6 max-md:h-[52px] max-md:px-3">
			<div class="flex items-center gap-2 max-md:gap-1.5">
				{#if onBack}
					<button type="button" class="btn-tactile !size-8 !p-0 md:hidden" onclick={onBack} aria-label="Back to the message list">
						<svg class="size-4 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				{/if}

				{#if latest}
					<!-- Reply set: labelled on a desk, icon-only on a phone. -->
					<button type="button" class="btn-tactile !h-7 max-md:!size-8 max-md:!p-0" title="Reply" aria-label="Reply" onclick={(event) => latest && onCompose('reply', latest, anchorFrom(event))}>
						<svg class="size-3.5 text-[var(--z-strong)] max-md:size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M1.5 8H10a4 4 0 014 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
						<span class="max-md:hidden">Reply</span>
					</button>
					<button type="button" class="btn-tactile !h-7 max-md:!size-8 max-md:!p-0" title="Reply all" aria-label="Reply all" onclick={(event) => latest && onCompose('replyAll', latest, anchorFrom(event))}>
						<svg class="size-3.5 text-[var(--z-strong)] max-md:size-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M10 3.5L5.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<span class="max-md:hidden">Reply all</span>
					</button>
					<button type="button" class="btn-tactile !h-7 max-md:hidden" title="Forward" aria-label="Forward" onclick={(event) => latest && onCompose('forward', latest, anchorFrom(event))}>
						<svg class="size-3.5 text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M10 3.5L14.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M14.5 8H6a4 4 0 00-4 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
						Forward
					</button>
				{/if}
			</div>

			<!-- The same four icons the list uses, on the thread you are reading. -->
			{#if onAction && latest}
				<div class="z-group" role="group" aria-label="Message actions">
					<button
						type="button"
						class="z-icon-btn max-md:!size-7 {starred ? '!bg-[var(--z-ch-flagged-fill)] !text-[var(--z-ch-flagged-solid)]' : ''}"
						aria-label={starred ? 'Remove flag' : 'Flag'}
						aria-pressed={starred}
						title={starred ? 'Remove flag (s)' : 'Flag (s)'}
						onclick={() => onAction(starred ? 'unstar' : 'star')}
					>
						<ActionIcon name={starred ? 'star-filled' : 'star'} class="size-[15px]" />
					</button>
					<button type="button" class="z-icon-btn max-md:!size-7 max-md:hidden" aria-label={unread ? 'Mark read' : 'Mark unread'} title={unread ? 'Mark read' : 'Mark unread'} onclick={() => onAction(unread ? 'read' : 'unread')}>
						<ActionIcon name={unread ? 'mail-open' : 'mail'} class="size-[15px]" />
					</button>
					{#if archiveTarget}
						<button type="button" class="z-icon-btn max-md:!size-7" aria-label="Archive" title="Archive (e)" onclick={() => onAction('move', archiveTarget.id)}>
							<ActionIcon name="archive" class="size-[15px]" />
						</button>
					{/if}
					<button
						type="button"
						class="z-icon-btn max-md:!size-7 hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)] {inTrash ? '!text-[var(--z-ch-discard-solid)]' : ''}"
						aria-label={inTrash ? 'Delete forever' : 'Delete'}
						title={inTrash ? 'Delete forever (#)' : 'Delete (#)'}
						onclick={() => onAction('delete')}
					>
						<ActionIcon name="trash" class="size-[15px]" />
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="p-6">
			<div class="z-railed flex items-start gap-[9px] rounded-[10px] border border-[var(--z-ch-discard-stroke)] bg-[var(--z-ch-discard-fill)] py-[11px] pr-3 pl-[18px]" style:--z-rail="var(--z-ch-discard-solid)" style:--z-rail-inset="10px" role="alert">
				<svg class="mt-px size-[15px] shrink-0 text-[var(--z-ch-discard-ink)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" />
					<path d="M8 5v3.6M8 10.7v.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
				</svg>
				<div class="min-w-0 flex-1">
					<span class="block text-[13px] font-semibold text-[var(--z-ch-discard-ink)]">Couldn't load the conversation</span>
					<span class="mt-0.5 block text-[12.5px] leading-normal text-[var(--z-ch-discard-ink)]">The mail server couldn't be reached.</span>
				</div>
				<button type="button" class="btn-tactile !h-7 shrink-0 !border-[var(--z-ch-discard-line)] !px-2.5 !text-[12px] !font-semibold !text-[var(--z-ch-discard-ink)]" onclick={onRetry}>Retry</button>
			</div>
		</div>
	{:else if loading && !messages}
		<div class="z-skeleton flex flex-1 flex-col gap-5 px-6 pt-6 @max-md:px-4" aria-hidden="true">
			<div class="h-7 w-2/3 rounded-[6px] bg-[var(--z-sunken)]"></div>
			<div class="flex items-center gap-[11px] rounded-[10px] border border-[var(--z-hairline)] p-3">
				<span class="size-[34px] shrink-0 rounded-[8px] bg-[var(--z-sunken)]"></span>
				<div class="flex flex-1 flex-col gap-2">
					<span class="block h-3 w-1/3 rounded-[4px] bg-[var(--z-sunken)]"></span>
					<span class="block h-[11px] w-1/2 rounded-[4px] bg-[var(--z-sunken)]"></span>
				</div>
			</div>
			<div class="mt-2 space-y-3">
				<div class="h-3.5 w-full rounded-[4px] bg-[var(--z-sunken)]"></div>
				<div class="h-3.5 w-5/6 rounded-[4px] bg-[var(--z-sunken)]"></div>
				<div class="h-3.5 w-4/6 rounded-[4px] bg-[var(--z-sunken)]"></div>
			</div>
		</div>
	{:else if messages && messages.length === 0}
		<div class="flex flex-1 items-center justify-center p-6">
			<p class="max-w-[320px] text-center text-[13px] leading-relaxed text-[var(--z-muted)]">This conversation has no messages.</p>
		</div>
	{:else if latest && rendered}
		<!-- The column is left-aligned, not centred: centring walks the message away
		     from the list it came from and from the Reply buttons above it. -->
		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6 select-text @max-md:px-4 @max-md:py-4 overscroll-contain">
			<div class="flex max-w-[680px] flex-col gap-5">
				<h1 class="text-[24px] leading-[1.15] font-bold tracking-[-0.02em] text-[var(--z-ink)] @max-md:text-[19px]">
					{latest.subject}
				</h1>

				<!--
					The sender card wears the thread's channel — the row you clicked,
					grown up — and the avatar carries the person. That handoff is what
					makes list and reader read as one object rather than two panes.
				-->
				<div
					class="z-railed z-hue-wash flex items-start justify-between gap-3 rounded-[10px] border py-3 pr-3 pl-[18px] @max-md:flex-col @max-md:gap-[9px]"
					style="{channelStyle(channel)};--z-rail-inset:10px"
				>
					<div class="flex min-w-0 items-start gap-[11px]">
						<span class="z-avatar !size-[34px] !text-[12px] @max-md:!size-8 @max-md:!text-[11px]" style={identityStyle(latest.from.email || latest.from.name)} aria-hidden="true">
							{initials(latest.from.name || latest.from.email, latest.from.email)}
						</span>
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<span class="truncate text-[14px] font-bold text-[var(--z-ink)]">{latest.from.name || latest.from.email}</span>
								<span class="z-chip @max-md:hidden">{channel.label}</span>
							</div>
							<div class="z-mono mt-0.5 truncate text-[11px]" style:color={channel.ink}>
								{latest.from.email} · {recipientsLabel(latest)}
							</div>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<span class="z-chip md:hidden">{channel.label}</span>
						<time
							class="z-mono shrink-0 rounded-[6px] border bg-[var(--z-surface)] px-2 py-[3px] text-[11px] font-medium"
							style:border-color={timeBorder}
							style:color={channel.ink}
							datetime={latest.receivedAt}
						>
							{formatReaderTime(latest.receivedAt)}
						</time>
					</div>
				</div>

				<!-- The count here and the count chip on the list row are the same
				     number about the same thread, so they are the same chip. -->
				{#if earlier.length > 0 && !earlierExpanded}
					<button
						type="button"
						class="group flex w-full items-center justify-between gap-4 rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] px-3.5 py-2.5 text-left shadow-[var(--z-shadow-tactile)] transition-colors hover:border-[var(--z-line)] hover:bg-[var(--z-hover)]"
						onclick={() => (earlierExpanded = true)}
					>
						<span class="flex min-w-0 items-center gap-[9px]">
							<span class="z-count" style="{channelStyle(channel)};background:{channel.fill}">{earlier.length}</span>
							<span class="truncate text-[13px] font-medium text-[var(--z-strong)]">
								Earlier {earlier.length === 1 ? 'message' : 'messages'} in this conversation
							</span>
						</span>
						<span class="flex shrink-0 items-center gap-[5px] text-[12px] font-semibold text-[var(--z-soft)] transition-colors group-hover:text-[var(--z-ink)]">
							Expand history
							<ActionIcon name="chevron" class="size-3" />
						</span>
					</button>
				{/if}

				{#if earlierExpanded}
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2.5" role="separator">
							<span class="z-caption">History</span>
							<span class="h-px flex-1 bg-[var(--z-hairline)]"></span>
							<button type="button" class="shrink-0 text-[12px] font-semibold text-[var(--z-muted)] transition-colors hover:text-[var(--z-ink)]" onclick={() => (earlierExpanded = false)}>
								Collapse
							</button>
						</div>

						{#each earlier as message (message.id)}
							{@const tone = identityTone(message.from.email || message.from.name)}
							<!-- Each earlier message is railed by its own sender at a third
							     strength, so the thread reads as a stack of one object. -->
							<div
								class="z-railed rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-surface)] py-[11px] pr-3 pl-[18px]"
								style:--z-rail={tone.stroke}
								style:--z-rail-strength="0.34"
							>
								<div class="flex items-baseline justify-between gap-2">
									<span class="truncate text-[13px] font-semibold text-[var(--z-body)]">{message.from.name || message.from.email}</span>
									<time class="z-mono shrink-0 text-[10.5px] text-[var(--z-soft)]" datetime={message.receivedAt}>
										{formatReaderTime(message.receivedAt)}
									</time>
								</div>
								<div class="mt-1.5 text-[13px] leading-[1.6] whitespace-pre-wrap text-[var(--z-strong)]">
									{message.bodyText}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="text-[14px] leading-[1.65] text-[var(--z-body)]">
					<EmailHtmlFrame html={rendered.html} plain={!rendered.isHtml} />
				</div>

				{#if rendered.attachments.length > 0}
					<div>
						<!-- The list's group divider, to the letter: label, rule, count. -->
						<div class="mb-2.5 flex items-center gap-2.5">
							<span class="z-caption">Attachments</span>
							<span class="h-px flex-1 bg-[var(--z-hairline)]"></span>
							<span class="z-mono text-[11px] font-semibold text-[var(--z-soft)]">{rendered.attachments.length}</span>
						</div>
						<div class="flex flex-wrap gap-[9px]">
							{#each rendered.attachments as attachment (attachment.blobId)}
								{@const badge = attachmentBadge(attachment.type)}
								<a
									href={attachmentUrl(attachment.blobId, attachment.name, attachment.type)}
									download={attachment.name}
									class="flex h-10 items-center gap-2.5 rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] px-[11px] shadow-[var(--z-shadow-tactile)] transition-[border-color] hover:border-[var(--z-faint)]"
									title="Download {attachment.name}"
								>
									<span
										class="flex size-[22px] items-center justify-center rounded-[5px] border text-[9px] font-bold uppercase"
										style:background-color={badge.bg}
										style:border-color={badge.border}
										style:color={badge.text}
									>
										{attachmentKind(attachment.name, attachment.type)}
									</span>
									<span class="max-w-48 truncate text-[13px] font-medium text-[var(--z-body)]">{attachment.name}</span>
									<span class="z-mono text-[10.5px] text-[var(--z-soft)]">{formatBytes(attachment.size)}</span>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<div class="flex max-w-[280px] flex-col items-center gap-[5px]">
				<span class="z-tile mb-1.5 !size-11 !rounded-[12px]" style={channelStyle(CHANNELS.correspondence)}>
					<svg class="size-[22px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3" />
						<path d="M2 5l6 4 6-4" stroke="currentColor" stroke-width="1.3" />
					</svg>
				</span>
				<p class="text-[14px] font-bold text-[var(--z-ink)]">No message selected</p>
				<p class="text-[12.5px] leading-[1.7] text-[var(--z-muted)] max-md:hidden">
					Pick a conversation, or move with <kbd class="z-kbd !text-[var(--z-strong)]">j</kbd> <kbd class="z-kbd !text-[var(--z-strong)]">k</kbd>
				</p>
			</div>
		</div>
	{/if}
</section>
