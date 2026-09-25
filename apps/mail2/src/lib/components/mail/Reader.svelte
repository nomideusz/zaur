<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { Portal } from '@ark-ui/svelte/portal';
	import { renderMessageBody } from '#lib/email/html';
	import type { MessageAttachment, MessageDetail } from '@zaur/mail-core';
	import type { MailboxDTO } from '#lib/mail/types';
	import { prefs, setPref } from '#lib/settings.svelte.ts';
	import EmailHtmlFrame from './EmailHtmlFrame.svelte';
	import { attachmentUrl, formatBytes, formatReaderTime, initials, previewKind } from '#lib/mail/rows';
	import AttachmentPreview from './AttachmentPreview.svelte';
	import { attachmentKind } from '#lib/compose/attachments';
	import {
		CHANNELS,
		attachmentBadge,
		channelStyle,
		identityStyle,
		identityTone,
		mailboxChannel,
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
		/** Every folder: the menu's "Move to" list, and where spam goes. */
		mailboxes?: MailboxDTO[];
		/** The folder being read — it is not a destination for itself. */
		currentMailboxId?: string | null;
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
		mailboxes,
		currentMailboxId = null,
		inTrash = false
	}: Props = $props();

	let earlierExpanded = $state(false);

	$effect(() => {
		// Reset the collapse when a different thread loads.
		void messages?.[0]?.threadId;
		earlierExpanded = false;
		previewAt = null;
	});

	const latest = $derived(messages && messages.length > 0 ? messages[messages.length - 1] : undefined);
	const earlier = $derived(messages && messages.length > 1 ? messages.slice(0, -1) : []);

	/**
	 * Remote images stay off until asked for, message by message, unless the
	 * account says always: a tracking pixel is a remote image. Keyed by message
	 * id rather than reset in an effect, so the next message never renders once
	 * with the last one's yes.
	 */
	let imagesFor = $state<string | null>(null);
	const showImages = $derived(prefs.showRemoteImages || (!!latest && imagesFor === latest.id));

	const rendered = $derived.by(() => {
		if (!latest) return undefined;
		const result = renderMessageBody({
			bodyHtml: latest.bodyHtml,
			bodyText: latest.bodyText,
			allowExternal: showImages,
			// Its quote is the earlier messages again, and those are one tap above.
			foldQuotes: earlier.length > 0
		});
		return { ...result, attachments: latest.attachments };
	});

	/**
	 * The history, whole: each earlier message as it was sent, its own quote
	 * folded — that quote is the messages above it. Only worked out once asked for.
	 */
	const history = $derived(
		earlierExpanded
			? earlier.map((message) => ({
					message,
					...renderMessageBody({
						bodyHtml: message.bodyHtml,
						bodyText: message.bodyText,
						allowExternal: showImages,
						foldQuotes: true
					})
				}))
			: []
	);
	const blockedExternal = $derived(
		!!rendered?.blockedExternal || history.some((item) => item.blockedExternal)
	);

	/**
	 * What the preview can open, in the order the chips show them; the rest
	 * download. The whole thread's, so it pages from an old attachment to a new one.
	 */
	const previewable = $derived(
		(messages ?? []).flatMap((message) => message.attachments).filter((item) => previewKind(item))
	);
	let previewAt = $state<number | null>(null);
	const MAX_THUMB_BYTES = 5 * 1024 * 1024;
	const chipClass =
		'flex h-10 items-center gap-2.5 rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] px-[11px] shadow-[var(--z-shadow-tactile)] transition-[border-color] hover:border-[var(--z-faint)]';

	const starred = $derived(threadState?.starred ?? false);
	const unread = $derived(threadState?.unread ?? false);

	/** The thread's channel — the sender card wears it, so list and reader read as one object. */
	const channel = $derived(
		messageChannel({ mailboxKind, starred, important: latest?.important ?? false })
	);

	/** A chip only for state the message carries — see `messageChannel`. */
	const stateLabel = $derived(starred ? 'Flagged' : latest?.important ? 'Important' : null);

	function recipientsLabel(message: MessageDetail): string {
		const others = [...message.to, ...message.cc].filter(
			(person) => person.email.toLowerCase() !== message.from.email.toLowerCase()
		);
		if (others.length === 0) return 'to me';
		const first = others[0]!;
		const rest = others.length - 1;
		return `to ${first.name || first.email}${rest > 0 ? `, +${rest}` : ''}`;
	}

	/**
	 * Spam is a move, like Archive: Stalwart learns from the folder a message
	 * ends up in. Inside Junk the same button means the opposite and files it back
	 * to the inbox, which is the one way out of that folder worth a button.
	 */
	const inJunk = $derived(mailboxKind === 'junk');
	const spamTarget = $derived(
		(mailboxes ?? []).find((box) => box.kind === (inJunk ? 'inbox' : 'junk')) ?? null
	);
	/**
	 * Everywhere else this thread could go. A folder is not a destination for
	 * itself, and neither is one that already has a control of its own: Junk is
	 * the shield, Trash is the bin, and received mail does not go to Drafts or
	 * Sent. Archive is listed here rather than twice — it is a move like any
	 * other, it just also earns a button where the pane is wide enough.
	 */
	const moveTargets = $derived(
		(mailboxes ?? []).filter(
			(box) =>
				box.id !== currentMailboxId &&
				box.id !== spamTarget?.id &&
				!MOVE_EXCLUDED.has(box.kind)
		)
	);

	const MOVE_EXCLUDED = new Set(['drafts', 'sent', 'trash', 'junk']);

	let replyEl = $state<HTMLElement | null>(null);

	/**
	 * Where a draft opens from. The menu's items have no rect of their own — a
	 * menu is portalled out of the bar — so every way into compose is anchored on
	 * the one control that opened it.
	 */
	function replyAnchor() {
		const rect = replyEl?.getBoundingClientRect();
		if (!rect) return null;
		return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
	}
</script>

<section
	class="@container flex h-full min-h-0 flex-col bg-[var(--z-surface)] select-none {className}"
	aria-label="Message reader"
>
	<!--
		The bar over the message. On a phone it is the *only* bar: the shell's top
		bar steps out while a thread is open (see `+page.svelte`), because a mark,
		a drawer toggle and a search field are not what a screen you are reading on
		is for. So this one is taller there, and its targets are thumb-sized rather
		than pointer-sized.

		The way back has to survive the loading, error and empty states too, so the
		toolbar outlives the message it acts on.
	-->
	{#if onBack || latest || loading || error}
		<div
			class="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-[var(--z-hairline)] px-6 max-md:h-[60px] max-md:gap-2 max-md:px-2.5"
		>
			{#if onBack}
				<!--
					Back owns the left edge on its own. Its arrow and Reply's arrow point
					the same way, so the two are never neighbours: everything that answers
					the message sits at the far end of the bar, under the thumb.
				-->
				<button
					type="button"
					class="btn-tactile !size-11 !p-0 md:hidden"
					onclick={onBack}
					aria-label="Back to the message list"
				>
					<svg class="size-[18px] text-[var(--z-strong)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			{/if}

			<!-- The distance that keeps Back and Reply apart. On a desk there is no
			     Back to keep away from, so the `md:order-*` classes below put the bar
			     back the way it was: Reply leading, the icons trailing. -->
			<div class="grow md:order-2" aria-hidden="true"></div>

			<!--
				The same icons the list uses, on the thread you are reading. Flag, spam
				and the bin are here at every width — junk mail is what you most often
				open a message only to get rid of, so it outranks Archive for the space.
				Mark-unread and Archive step into the menu once the pane is too narrow
				for five, which is every phone and a tablet's second pane.
			-->
			{#if onAction && latest}
				<div class="z-group shrink-0 md:order-3" role="group" aria-label="Message actions">
					<button
						type="button"
						class="z-icon-btn max-md:!size-10 {starred ? '!bg-[var(--z-ch-flagged-fill)] !text-[var(--z-ch-flagged-solid)]' : ''}"
						aria-label={starred ? 'Remove flag' : 'Flag'}
						aria-pressed={starred}
						title={starred ? 'Remove flag (s)' : 'Flag (s)'}
						onclick={() => onAction(starred ? 'unstar' : 'star')}
					>
						<ActionIcon name={starred ? 'star-filled' : 'star'} class="size-[15px] max-md:size-[17px]" />
					</button>
					<button type="button" class="z-icon-btn @max-md:hidden" aria-label={unread ? 'Mark read' : 'Mark unread'} title={unread ? 'Mark read' : 'Mark unread'} onclick={() => onAction(unread ? 'read' : 'unread')}>
						<ActionIcon name={unread ? 'mail-open' : 'mail'} class="size-[15px]" />
					</button>
					{#if archiveTarget}
						<button type="button" class="z-icon-btn @max-md:hidden" aria-label="Archive" title="Archive (e)" onclick={() => onAction('move', archiveTarget.id)}>
							<ActionIcon name="archive" class="size-[15px]" />
						</button>
					{/if}
					{#if spamTarget}
						<button
							type="button"
							class="z-icon-btn max-md:!size-10 hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)]"
							aria-label={inJunk ? 'Not spam' : 'Mark as spam'}
							title={inJunk ? `Not spam — move to ${spamTarget.name}` : `Mark as spam — move to ${spamTarget.name}`}
							onclick={() => onAction('move', spamTarget.id)}
						>
							<ActionIcon name={inJunk ? 'not-spam' : 'spam'} class="size-[15px] max-md:size-[17px]" />
						</button>
					{/if}
					<button
						type="button"
						class="z-icon-btn max-md:!size-10 hover:!bg-[var(--z-ch-discard-hover)] hover:!text-[var(--z-ch-discard-solid)] {inTrash ? '!text-[var(--z-ch-discard-solid)]' : ''}"
						aria-label={inTrash ? 'Delete forever' : 'Delete'}
						title={inTrash ? 'Delete forever (#)' : 'Delete (#)'}
						onclick={() => onAction('delete')}
					>
						<ActionIcon name="trash" class="size-[15px] max-md:size-[17px]" />
					</button>
				</div>

				<!-- Phone: a hairline, so the bin at the group's end never reads as the
				     near half of the reply button beside it. -->
				<div class="h-7 w-px shrink-0 bg-[var(--z-hairline)] md:hidden" aria-hidden="true"></div>
			{/if}

			{#if latest}
				<!--
					Reply, split in two. The near half answers; the caret opens
					everything else this message can have done to it — Reply all and
					Forward, then the filing actions and the folder list — so the next
					action to be added costs a menu line rather than bar width.

					On a desk it leads the bar, sitting over the left-aligned column it
					answers; on a phone it trails it, as far from the back arrow as the
					bar goes. Whether it spells "Reply" is a `@container` question, not a
					viewport one — a tablet's second pane is as narrow as a phone. How
					*big* the targets are stays viewport-driven: a narrow pane on a desk
					is still being pointed at, not tapped.
				-->
				<div
					bind:this={replyEl}
					class="flex shrink-0 items-stretch rounded-[8px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)] md:order-1"
				>
					<button
						type="button"
						class="flex h-7 items-center gap-[7px] rounded-l-[7px] px-[11px] text-[13px] font-medium text-[var(--z-body)] transition-colors hover:bg-[var(--z-tactile-bg-hover)] max-md:h-11 max-md:w-11 max-md:justify-center max-md:px-0"
						title="Reply"
						aria-label="Reply"
						onclick={() => latest && onCompose('reply', latest, replyAnchor())}
					>
						<svg class="size-3.5 shrink-0 text-[var(--z-strong)] max-md:size-[18px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path d="M6 3.5L1.5 8 6 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M1.5 8H10a4 4 0 014 4v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
						</svg>
						<span class="@max-md:hidden">Reply</span>
					</button>

					<!-- Hangs from the caret rather than back over the list: the bar's
					     left edge is the message column's left edge. A phone has no room
					     to the right of it, and the popper shifts it back in. -->
					<Menu.Root positioning={{ placement: 'bottom-start', gutter: 8, overflowPadding: 12 }} lazyMount unmountOnExit>
						<Menu.Trigger
							class="flex h-7 w-[26px] items-center justify-center rounded-r-[7px] border-l border-[var(--z-line)] text-[var(--z-strong)] transition-colors hover:bg-[var(--z-tactile-bg-hover)] max-md:h-11 max-md:w-9"
							aria-label="More message actions"
							title="More actions"
						>
							<ActionIcon name="chevron" class="size-3 text-[var(--z-faint)] max-md:size-[15px]" />
						</Menu.Trigger>
						<Portal>
							<Menu.Positioner>
								<Menu.Content class="z-menu z-40 w-56">
									<Menu.Item value="reply-all" class="z-menu-item" onSelect={() => latest && onCompose('replyAll', latest, replyAnchor())}>
										Reply all
									</Menu.Item>
									<Menu.Item value="forward" class="z-menu-item" onSelect={() => latest && onCompose('forward', latest, replyAnchor())}>
										Forward
									</Menu.Item>

									{#if onAction}
										<div class="my-1 h-px bg-[var(--z-hairline)]" aria-hidden="true"></div>
										<Menu.Item value="seen" class="z-menu-item" onSelect={() => onAction(unread ? 'read' : 'unread')}>
											{unread ? 'Mark read' : 'Mark unread'}
										</Menu.Item>
										{#if spamTarget}
											<Menu.Item value="spam" class="z-menu-item" onSelect={() => onAction('move', spamTarget.id)}>
												{inJunk ? 'Not spam' : 'Mark as spam'}
											</Menu.Item>
										{/if}

										<!-- Every other folder, drawn like the top bar's switcher: the
										     same swatch, so a destination reads as the row it will
										     become. -->
										{#if moveTargets.length > 0}
											<div class="my-1 h-px bg-[var(--z-hairline)]" aria-hidden="true"></div>
											<div class="z-menu-caption">Move to</div>
											{#each moveTargets as mailbox (mailbox.id)}
												{@const channel = mailboxChannel(mailbox.kind)}
												<Menu.Item value="move:{mailbox.id}" class="z-menu-item" onSelect={() => onAction('move', mailbox.id)}>
													<span class="flex min-w-0 items-center gap-[9px]">
														<span
															class="inline-block size-2.5 shrink-0 rounded-[3px] border"
															style:background-color={channel.fill}
															style:border-color={channel.stroke}
															aria-hidden="true"
														></span>
														<span class="truncate">{mailbox.name}</span>
													</span>
												</Menu.Item>
											{/each}
										{/if}
									{/if}
								</Menu.Content>
							</Menu.Positioner>
						</Portal>
					</Menu.Root>
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
					grown up. That handoff is what makes list and reader read as one
					object rather than two panes.

					The card never stacks: when it did, the date slid under the sender on
					a narrow pane and moved again on a wide one. It belongs in the corner
					the eye goes to for it, so the row stays a row and the address line
					truncates instead.
				-->
				<div
					class="z-railed z-hue-wash flex items-start justify-between gap-3 rounded-[10px] border py-3 pr-3 pl-[18px]"
					style="{channelStyle(channel)};--z-rail-inset:10px"
				>
					<div class="flex min-w-0 items-start gap-[11px]">
						{#if prefs.showAvatars}
							<span class="z-avatar !size-[34px] !text-[12px] @max-md:!size-8 @max-md:!text-[11px]" style={identityStyle(latest.from.email || latest.from.name)} aria-hidden="true">
								{initials(latest.from.name || latest.from.email, latest.from.email)}
							</span>
						{/if}
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<span class="truncate text-[14px] font-bold text-[var(--z-ink)]">{latest.from.name || latest.from.email}</span>
								{#if stateLabel}<span class="z-chip @max-md:hidden">{stateLabel}</span>{/if}
							</div>
							<div class="z-mono mt-0.5 truncate text-[11px]" style:color={channel.ink}>
								{latest.from.email} · {recipientsLabel(latest)}
							</div>
						</div>
					</div>
					<!--
						Top right of the card, at every width, and drawn the way the list
						row draws its time: plain mono, no pill. A white chip on the wash
						was the brightest thing in the card and read as a control — the
						date is the one number you look up mid-read, not something to
						press.

						The state chip the name has no room for on a narrow pane falls in
						under it.
					-->
					<div class="flex shrink-0 flex-col items-end gap-1.5 pt-px">
						<time
							class="z-mono text-[11.5px] font-medium"
							style:color={channel.ink}
							datetime={latest.receivedAt}
						>
							{formatReaderTime(latest.receivedAt)}
						</time>
						{#if stateLabel}<span class="z-chip @md:hidden">{stateLabel}</span>{/if}
					</div>
				</div>

				<!-- The count here and the count chip on the list row are the same
				     number about the same thread, so they are the same chip. -->
				{#if earlier.length > 0 && !earlierExpanded}
					<button
						type="button"
						class="z-card group flex w-full items-center justify-between gap-4 px-3.5 py-2.5 text-left transition-colors hover:border-[var(--z-line)] hover:bg-[var(--z-hover)]"
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

						{#each history as item (item.message.id)}
							{@const message = item.message}
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
								<div class="mt-1.5 text-[13px] leading-[1.6] text-[var(--z-strong)]">
									<EmailHtmlFrame html={item.html} plain={!item.isHtml} />
								</div>
								{#if message.attachments.length > 0}
									<div class="mt-2.5">{@render chips(message.attachments)}</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if blockedExternal && !showImages}
					<div class="flex items-center gap-3 rounded-[10px] border border-[var(--z-hairline)] bg-[var(--z-sunken)] py-2 pr-2 pl-3.5 text-[12.5px] leading-snug text-[var(--z-muted)]">
						<span class="min-w-0 flex-1">Remote images are hidden, so the sender can't see that you opened this.</span>
						<button type="button" class="shrink-0 text-[12px] font-semibold text-[var(--z-muted)] transition-colors hover:text-[var(--z-ink)]" onclick={() => setPref('showRemoteImages', true)}>
							Always
						</button>
						<button type="button" class="btn-tactile !h-7 shrink-0 !px-2.5 !text-[12px]" onclick={() => (imagesFor = latest.id)}>
							Show images
						</button>
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
						{@render chips(rendered.attachments)}
					</div>
				{/if}
			</div>
		</div>

		{#if previewAt !== null && previewable.length > 0}
			<AttachmentPreview items={previewable} bind:index={previewAt} onClose={() => (previewAt = null)} />
		{/if}
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

{#snippet chips(attachments: MessageAttachment[])}
	<div class="flex flex-wrap gap-[9px]">
		{#each attachments as attachment (attachment.blobId)}
			{@const badge = attachmentBadge(attachment.type)}
			{@const url = attachmentUrl(attachment.blobId, attachment.name, attachment.type)}
			{@const at = previewable.indexOf(attachment)}
			{#snippet chip()}
				<!-- An image is its own badge, up to a size worth fetching for 22px. -->
				{#if previewKind(attachment) === 'image' && attachment.size <= MAX_THUMB_BYTES}
					<img src={url} alt="" loading="lazy" class="size-[22px] shrink-0 rounded-[5px] border border-[var(--z-line)] object-cover" />
				{:else}
					<span
						class="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border text-[9px] font-bold uppercase"
						style:background-color={badge.bg}
						style:border-color={badge.border}
						style:color={badge.text}
					>
						{attachmentKind(attachment.name, attachment.type)}
					</span>
				{/if}
				<span class="max-w-48 truncate text-[13px] font-medium text-[var(--z-body)]">{attachment.name}</span>
				<span class="z-mono text-[10.5px] text-[var(--z-soft)]">{formatBytes(attachment.size)}</span>
			{/snippet}
			{#if at >= 0}
				<button type="button" class={chipClass} title="Open {attachment.name}" onclick={() => (previewAt = at)}>
					{@render chip()}
				</button>
			{:else}
				<a href={url} download={attachment.name} class={chipClass} title="Download {attachment.name}">
					{@render chip()}
				</a>
			{/if}
		{/each}
	</div>
{/snippet}
