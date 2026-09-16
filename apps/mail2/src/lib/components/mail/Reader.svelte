<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { renderMessageBody } from '#lib/email/html';
	import type { MessageDetail } from '@zaur/mail-core';
	import EmailHtmlFrame from './EmailHtmlFrame.svelte';
	import { formatBytes, formatReaderTime, typeBadge, initials } from '#lib/mail/rows';
	import { attachmentBadge, getHobdayTheme, HOBDAY_THEMES } from '#lib/mail/colors';
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

	const senderTheme = $derived(
		latest ? getHobdayTheme(latest.from.email || latest.from.name) : HOBDAY_THEMES.blue
	);

	const starred = $derived(threadState?.starred ?? false);
	const unread = $derived(threadState?.unread ?? false);

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

<section
	class="@container flex h-full min-h-0 flex-col bg-white select-none {className}"
	aria-label="Message reader"
>
	<!-- On a phone the way back has to survive the loading, error and empty
	     states too, so the toolbar outlives the message it acts on. -->
	{#if onBack || latest || loading || error}
		<!-- Reader Action Toolbar: Hobday-style tactile buttons -->
		<div class="flex h-[46px] shrink-0 items-center justify-between border-b border-[#e2e8f0] px-8 max-md:px-3">
			<div class="flex items-center gap-2">
				{#if onBack}
					<button
						type="button"
						class="btn-tactile !h-[30px] !px-2 md:hidden"
						onclick={onBack}
						aria-label="Back to the message list"
					>
						<svg class="size-4 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
				{/if}

{#if latest}
				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5 max-md:!h-[30px] max-md:!px-2.5"
					title="Reply"
					aria-label="Reply"
					onclick={(event) => latest && onCompose('reply', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M1.5 8H10a4 4 0 014 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<span class="max-md:hidden">Reply</span>
				</button>

				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5 max-md:!h-[30px] max-md:!px-2.5"
					title="Reply all"
					aria-label="Reply all"
					onclick={(event) => latest && onCompose('replyAll', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M10 3.5L5.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span class="max-md:hidden">Reply all</span>
				</button>

				<button
					type="button"
					class="btn-tactile !h-[28px] gap-1.5 max-md:!h-[30px] max-md:!px-2.5"
					title="Forward"
					aria-label="Forward"
					onclick={(event) => latest && onCompose('forward', latest, anchorFrom(event))}
				>
					<svg class="size-3.5 text-slate-700" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M10 3.5L14.5 8 10 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
						<path d="M14.5 8H6a4 4 0 00-4 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<span class="max-md:hidden">Forward</span>
				</button>
				{/if}
			</div>

			<!--
				The same four icons the list uses, on the thread you are reading —
				so archiving what is open does not mean going back for it.
			-->
			{#if onAction && latest}
				<div
					class="flex shrink-0 items-center rounded-[6px] border border-[#cbd5e1] bg-white p-0.5 shadow-2xs"
					role="group"
					aria-label="Message actions"
				>
					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] transition-colors {starred
							? 'text-amber-500 hover:bg-amber-50'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
						aria-label={starred ? 'Remove highlight' : 'Highlight'}
						aria-pressed={starred}
						title={starred ? 'Remove highlight (s)' : 'Highlight (s)'}
						onclick={() => onAction(starred ? 'unstar' : 'star')}
					>
						<ActionIcon name={starred ? 'star-filled' : 'star'} />
					</button>

					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
						aria-label={unread ? 'Mark read' : 'Mark unread'}
						title={unread ? 'Mark read' : 'Mark unread'}
						onclick={() => onAction(unread ? 'read' : 'unread')}
					>
						<ActionIcon name={unread ? 'mail-open' : 'mail'} />
					</button>

					{#if archiveTarget}
						<button
							type="button"
							class="flex size-[24px] items-center justify-center rounded-[4px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
							aria-label="Archive"
							title="Archive (e)"
							onclick={() => onAction('move', archiveTarget.id)}
						>
							<ActionIcon name="archive" />
						</button>
					{/if}

					<button
						type="button"
						class="flex size-[24px] items-center justify-center rounded-[4px] transition-colors hover:bg-red-50 hover:text-red-600 {inTrash
							? 'text-red-600'
							: 'text-slate-600'}"
						aria-label={inTrash ? 'Delete forever' : 'Delete'}
						title={inTrash ? 'Delete forever (#)' : 'Delete (#)'}
						onclick={() => onAction('delete')}
					>
						<ActionIcon name="trash" />
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center p-6">
			<p class="text-sm font-semibold text-slate-800">Couldn't load the conversation</p>
			<p class="max-w-[320px] text-[13px] leading-relaxed text-slate-500">
				The mail server couldn't be reached.
			</p>
			<button
				type="button"
				class="btn-tactile mt-2"
				onclick={onRetry}
			>
				Retry
			</button>
		</div>
	{:else if loading && !messages}
		<div class="flex flex-1 flex-col gap-5 px-8 pt-8 @max-md:px-4 @max-md:pt-6" aria-hidden="true">
			<div class="h-7 w-2/3 animate-pulse rounded bg-slate-100"></div>
			<div class="h-4 w-1/3 animate-pulse rounded bg-slate-100"></div>
			<div class="mt-4 space-y-3">
				<div class="h-3.5 w-full animate-pulse rounded bg-slate-100"></div>
				<div class="h-3.5 w-5/6 animate-pulse rounded bg-slate-100"></div>
				<div class="h-3.5 w-4/6 animate-pulse rounded bg-slate-100"></div>
			</div>
		</div>
	{:else if messages && messages.length === 0}
		<div class="flex flex-1 items-center justify-center p-6">
			<p class="max-w-[320px] text-center text-[13px] leading-relaxed text-slate-500">
				This conversation has no messages.
			</p>
		</div>
	{:else if latest && rendered}
		<!-- Reader Content Area. The column is left-aligned, not centred: centring
		     it walks the message away from the list it came from and from the
		     Reply buttons above it as the pane gets wider. Slack pools on the
		     right instead, where nothing needs to be reachable. -->
		<div class="min-h-0 flex-1 overflow-y-auto px-8 py-6 select-text @max-md:px-4 @max-md:py-4 overscroll-contain">
			<div class="flex max-w-[680px] flex-col gap-6">
				<!-- Conversation Subject -->
				<h1 class="text-[24px] font-bold leading-tight tracking-tight text-slate-900 @max-md:text-[19px]">
					{latest.subject}
				</h1>

				<!--
					The row you clicked, grown up: the same rail in the same hue, over
					the same 7% wash. It is what makes the handoff from list to reader
					read as one thing rather than two panes that happen to agree.
				-->
				<div
					class="z-railed z-hue-wash flex items-start justify-between gap-3.5 rounded-[10px] border py-3.5 pr-3.5 pl-[18px] @max-md:flex-col @max-md:gap-2.5"
					style:--z-accent={senderTheme.border}
				>
					<div class="flex items-start gap-3 min-w-0">
						<!-- Sender Avatar Badge (Hobday style) -->
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-[6px] text-xs font-bold"
							style:background-color={senderTheme.bg}
							style:border="1px solid {senderTheme.border}"
							style:color={senderTheme.text}
						>
							{initials(latest.from.name || latest.from.email, latest.from.email)}
						</div>

						<div class="min-w-0 space-y-0.5">
							<div class="flex items-center gap-2 truncate">
								<span class="text-[14px] font-bold text-slate-900 truncate">
									{latest.from.name || latest.from.email}
								</span>
								{#if latest.from.name && latest.from.email}
									<span class="text-xs text-slate-500 truncate">
										&lt;{latest.from.email}&gt;
									</span>
								{/if}
							</div>
							<div class="text-xs text-slate-500 truncate">
								{recipientsLabel(latest)}
							</div>
						</div>
					</div>

					<time
						class="shrink-0 rounded-[4px] border border-[#cbd5e1] bg-white px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums shadow-2xs"
						datetime={latest.receivedAt}
					>
						{formatReaderTime(latest.receivedAt)}
					</time>
				</div>

				<!--
					The count here and the count chip on the list row are the same
					number about the same thread, so they are the same chip. It used
					to be an amber banner, which in this shell means "warning" —
					earlier history is not a warning.
				-->
				{#if earlier.length > 0 && !earlierExpanded}
					<button
						type="button"
						class="group flex w-full items-center justify-between gap-4 rounded-[10px] border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-left shadow-2xs transition-colors hover:border-[#cbd5e1] hover:bg-slate-50"
						onclick={() => (earlierExpanded = true)}
					>
						<span class="flex min-w-0 items-center gap-2">
							<span
								class="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[4px] border px-1 font-mono text-[10px] font-semibold tabular-nums"
								style:background-color={senderTheme.badgeBg}
								style:border-color={senderTheme.badgeBorder}
								style:color={senderTheme.badgeText}
							>
								{earlier.length}
							</span>
							<span class="truncate text-[13px] font-medium text-slate-700">
								Earlier {earlier.length === 1 ? 'message' : 'messages'} in this conversation
							</span>
						</span>
						<span class="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-slate-500 transition-colors group-hover:text-slate-900">
							Expand history
							<ActionIcon name="chevron" class="size-3" />
						</span>
					</button>
				{/if}

				{#if earlierExpanded}
					<div class="flex flex-col gap-2">
						<!-- Expanding used to be one-way; the history can be put back. -->
						<div class="flex items-center gap-2.5" role="separator">
							<span class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
								History
							</span>
							<span class="h-px flex-1 bg-[#e2e8f0]"></span>
							<button
								type="button"
								class="shrink-0 text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
								onclick={() => (earlierExpanded = false)}
							>
								Collapse
							</button>
						</div>

						{#each earlier as message (message.id)}
							{@const theme = getHobdayTheme(message.from.email || message.from.name)}
							<!-- Each earlier message is a row of the thread, railed by its own sender. -->
							<div
								class="z-railed space-y-2 rounded-[10px] border border-[#e2e8f0] bg-white py-3 pr-3.5 pl-[18px]"
								style:--z-accent={theme.border}
								style:--z-rail-strength="0.32"
							>
								<div class="flex items-baseline justify-between gap-2">
									<div class="flex items-baseline gap-2 truncate">
										<span class="text-[13px] font-semibold text-slate-800">
											{message.from.name || message.from.email}
										</span>
										<span class="truncate text-xs text-slate-500">&lt;{message.from.email}&gt;</span>
									</div>
									<time class="shrink-0 text-[11.5px] font-medium text-slate-400 tabular-nums" datetime={message.receivedAt}>
										{formatReaderTime(message.receivedAt)}
									</time>
								</div>
								<div class="text-[13.5px] leading-relaxed whitespace-pre-wrap text-slate-700">
									{message.bodyText}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Message Body Frame -->
				<div class="text-[14px] leading-relaxed text-slate-800">
					<EmailHtmlFrame html={rendered.html} plain={!rendered.isHtml} />
				</div>

				<!-- Attachments with Hobday-style color-coded file badges -->
				{#if rendered.attachments.length > 0}
					<div>
						<!-- The list's group divider, to the letter: label, rule, count. -->
						<div class="mb-2.5 flex items-center gap-2.5">
							<span class="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
								Attachments
							</span>
							<span class="h-px flex-1 bg-[#e2e8f0]"></span>
							<span class="text-xs font-semibold text-slate-400 tabular-nums">
								{rendered.attachments.length}
							</span>
						</div>
						<div class="flex flex-wrap gap-2.5">
							{#each rendered.attachments as attachment (attachment.blobId)}
								{@const badge = attachmentBadge(attachment.type)}
								<div
									class="flex h-11 items-center gap-3 rounded-[8px] border border-[#cbd5e1] bg-white px-3 shadow-2xs"
									title={attachment.name}
								>
									<span
										class="flex size-6 items-center justify-center rounded-[4px] text-[10px] font-bold uppercase"
										style:background-color={badge.bg}
										style:border="1px solid {badge.border}"
										style:color={badge.text}
									>
										{typeBadge(attachment.type)}
									</span>
									<span class="max-w-44 truncate text-[13px] font-medium text-slate-800">{attachment.name}</span>
									<span class="text-xs text-slate-400 tabular-nums font-medium">{formatBytes(attachment.size)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Empty Selection Placeholder -->
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<div class="max-w-[280px]">
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
					<svg class="size-6" viewBox="0 0 16 16" fill="none">
						<rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.3" />
						<path d="M2 5l6 4 6-4" stroke="currentColor" stroke-width="1.3" />
					</svg>
				</div>
				<p class="text-sm font-semibold text-slate-800">No message selected</p>
				<p class="mt-1 text-xs text-slate-500 leading-relaxed max-md:hidden">
					Select an email to read, or navigate with <kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[11px] font-medium text-slate-600">j</kbd> and <kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[11px] font-medium text-slate-600">k</kbd>.
				</p>
			</div>
		</div>
	{/if}
</section>
