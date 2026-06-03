<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Mail from '$lib/components/icons/Mail.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import MessageReaderMobileBar from '$lib/components/mail/MessageReaderMobileBar.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { contentPagePadClass } from '$lib/mail/layout';
	import { readerPrimaryContact, shouldShowContactEmail } from '$lib/mail/reader-contact';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
	import { shouldPresentImportantColors } from '$lib/mail/mailboxes';
	import { LABEL_RESTORE_NEW } from '$lib/mail/new-mail';
	import { formatMessageListWhen } from '$lib/utils/dates';
	import { createImportantRainbowTouchPick } from '$lib/mail/important-rainbow-touch';
	import { mailListBackHref, mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import { hasPreciseHover } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Return to the mailbox list after triage (Important / Not important). */
		onBackToList?: () => void;
		/** Reduced chrome when the list rail is hidden. */
		minimalChrome?: boolean;
	}

	let { thread, mailboxRouteId, onMoved, onBackToList, minimalChrome = false }: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);
	let localShowImagesOnce = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let scrollPane = $state<HTMLDivElement | null>(null);
	let readerSubjectEl = $state<HTMLHeadingElement | null>(null);

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const subjectAnchorId = $derived(actionMessage?.id ?? latest?.id);
	const subject = $derived(latest?.subject ?? '(no subject)');
	const subjectImportant = $derived(
		!!(actionMessage?.important ?? thread.some((message) => message.important)) &&
			shouldPresentImportantColors(
				mail.mailboxByRouteId(mailboxRouteId)?.role,
				settings.showImportantColors
			)
	);
	const subjectMessageId = $derived(subjectAnchorId ?? '');
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const listHref = $derived.by(() => {
		const returnTo = $page.url.searchParams.get('returnTo');
		if (returnTo?.startsWith('/mail/search')) return returnTo;
		return mailListBackHref(mailboxRouteId);
	});
	const primaryReplyLabel = $derived(
		settings.defaultReplyMode === 'reply-all' ? 'Reply all' : 'Reply'
	);

	function wordCount(text: string | undefined): number {
		if (!text) return 0;
		return text.trim().split(/\s+/).filter(Boolean).length;
	}
	const totalWords = $derived(
		thread.reduce((sum, message) => sum + wordCount(message.bodyText || message.preview), 0)
	);
	const readMinutes = $derived(Math.max(1, Math.round(totalWords / 220)));
	const showReadTime = $derived(totalWords >= 200);

	const allowExternal = $derived(
		!settings.blockExternalContent || (pane?.showImagesOnce ?? localShowImagesOnce)
	);
	const hasBlockedExternal = $derived(
		thread.some((message) =>
			renderMessageBody({
				bodyHtml: message.bodyHtml,
				bodyText: message.bodyText,
				allowExternal: false
			}).blockedExternal
		)
	);

	$effect(() => {
		$page.params.threadId;
		thread.map((m) => m.id).join(',');
		settings.expandAllThreadMessages;
		if (pane) pane.setShowImagesOnce(false);
		else localShowImagesOnce = false;
		if (settings.expandAllThreadMessages) {
			expandedIds = new Set(thread.map((message) => message.id));
		} else {
			const latestId = thread.at(-1)?.id;
			const urlMessageId = $page.url.searchParams.get('messageId');
			expandedIds = urlMessageId ? new Set([urlMessageId]) : (latestId ? new Set([latestId]) : new Set());
		}
	});

	function messageScrollContainer(): HTMLElement | null {
		if (typeof document === 'undefined') return scrollPane;
		const mobilePane = document.querySelector(
			'.z-mail-pane--mobile-fullscreen .z-pane-scroll--mobile-reader'
		);
		if (mobilePane instanceof HTMLElement) return mobilePane;
		return document.getElementById('main-content');
	}

	$effect(() => {
		$page.params.threadId;
		thread.map((m) => m.id).join(',');
		const paneEl = messageScrollContainer();
		if (!paneEl) return;
		void tick().then(() => {
			paneEl.scrollTop = 0;
		});
	});

	function isMe(email: string): boolean {
		const cleanEmail = email.trim().toLowerCase();
		if (auth.username && auth.username.trim().toLowerCase() === cleanEmail) {
			return true;
		}
		return auth.identities.some((identity) => identity.email?.trim().toLowerCase() === cleanEmail);
	}

	function isExpanded(message: MessageDetail) {
		return expandedIds.has(message.id);
	}

	function toggleMessage(message: MessageDetail) {
		const next = new Set(expandedIds);
		if (next.has(message.id)) next.delete(message.id);
		else next.add(message.id);
		expandedIds = next;
	}

	function showImagesOnce() {
		if (pane) pane.setShowImagesOnce(true);
		else localShowImagesOnce = true;
	}

	function reply() {
		if (!latest) return;
		compose.startReply(latest);
		goto('/mail/compose?mode=reply');
	}

	function replyAll() {
		if (!latest || !auth.username) return;
		compose.startReplyAll(latest, thread, auth.username);
		goto('/mail/compose?mode=reply-all');
	}

	function forward() {
		if (!latest) return;
		compose.startForward(latest);
		goto('/mail/compose?mode=forward');
	}

	function primaryReply() {
		if (settings.defaultReplyMode === 'reply-all') replyAll();
		else reply();
	}

	async function sendDraft() {
		if (!auth.client || !auth.username || !latest) return;

		compose.openDraft(latest);
		const senderName = settings.resolvedDisplayName(auth.displayName ?? auth.username);
		const destination = mailListHref(INBOX_MAILBOX_ROUTE_ID);
		const result = await compose.send(auth.client, auth.username, senderName, {
			onUndo: () => goto(`/mail/compose?draft=${latest.id}`),
			onComplete: (outcome) => {
				if (outcome === 'sent') goto(destination);
				else if (outcome === 'queued') goto(settings.preferredMailHref());
			}
		});
		if (result === 'pending' || result === 'sent') goto(destination);
		else if (result === 'queued') goto(settings.preferredMailHref());
		else if (result === false) goto(`/mail/compose?draft=${latest.id}`);
	}

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	async function triageUnsee() {
		if (!auth.client || !actionMessage || actionMessage.unread) return;
		onBackToList?.();
		try {
			await mail.markMessageNew(auth.client, actionMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not mark as unread';
			toast.show(message, 'error');
		}
	}

	function shouldPersistReaderRainbowPick(event: PointerEvent): boolean {
		const related = event.relatedTarget;
		if (related === null) return false;
		if (related instanceof Node && !document.contains(related)) return false;
		return true;
	}

	function persistReaderRainbowPick(event: PointerEvent) {
		if (settings.reduceMotion || !hasPreciseHover() || !subjectImportant || !subjectMessageId || !readerSubjectEl) {
			return;
		}
		if (!shouldPersistReaderRainbowPick(event)) return;
		importantRainbow.pickFromElement(readerSubjectEl, subjectMessageId);
	}

	function startReaderRainbowSample() {
		if (settings.reduceMotion || !hasPreciseHover() || !subjectImportant || !subjectMessageId || !readerSubjectEl) {
			return;
		}
		importantRainbow.startHoverSample(readerSubjectEl, subjectMessageId);
	}

	const readerRainbowTouch = createImportantRainbowTouchPick({
		canPick: () =>
			!hasPreciseHover() &&
			!settings.reduceMotion &&
			!!subjectImportant &&
			!!subjectMessageId &&
			!!readerSubjectEl
	});
</script>

<article
	class="z-mail-pane-surface z-mail-pane-surface--flow"
	style="view-transition-name: message-reader;"
>
	{#if mail.selectedError}
		<div
			class={cn(
				'shrink-0 px-4 py-2 md:px-6',
				mail.selectedError.startsWith('Offline')
					? 'text-fg-muted'
					: 'text-danger'
			)}
			style="font-size: var(--z-reader-text); line-height: var(--z-reader-leading);"
		>
			{mail.selectedError}
		</div>
	{/if}

	<div class="z-pane-scroll z-pane-scroll--mobile-reader z-pane-scroll--flow" bind:this={scrollPane}>
		<div class={contentPagePadClass()}>
		<div class="z-reader-column">
			<div class="z-mail-text-nav z-reader-sticky-nav">
				<div class="z-mail-text-nav__row">
					<div class="z-mail-text-nav__links min-w-0 shrink-0 flex items-center">
						<a class="z-mail-text-nav__link inline-flex items-center gap-1.5" href={listHref}>
							<ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
							<span>Back</span>
						</a>
						{#if actionMessage && !actionMessage.unread}
							<button
								type="button"
								class="z-mail-text-nav__link inline-flex items-center gap-1.5 ml-4"
								onclick={() => void triageUnsee()}
							>
								<Mail class="size-4 shrink-0" aria-hidden="true" />
								<span>{LABEL_RESTORE_NEW}</span>
							</button>
						{/if}
					</div>
					{#if !mail.hasSelection && latest}
						<div class="z-mail-text-nav__links flex items-center">
							{#if isDraft}
								<a
									class="z-mail-text-nav__link inline-flex items-center gap-1.5"
									href="/mail/compose?draft={latest.id}"
								>
									<Pencil class="size-4 shrink-0" aria-hidden="true" />
									<span>Edit draft</span>
								</a>
								<button
									type="button"
									class="z-mail-text-nav__action hidden md:inline-flex items-center gap-1.5"
									onclick={() => void sendDraft()}
								>
									<Send class="size-4 shrink-0" aria-hidden="true" />
									<span>Send</span>
								</button>
							{:else if thread.length > 1}
								<button
									type="button"
									class="z-mail-text-nav__action inline-flex items-center gap-1.5"
									onclick={primaryReply}
								>
									{#if settings.defaultReplyMode === 'reply-all'}
										<ReplyAll class="size-4 shrink-0" aria-hidden="true" />
									{:else}
										<Reply class="size-4 shrink-0" aria-hidden="true" />
									{/if}
									<span>{primaryReplyLabel}</span>
								</button>
							{/if}
							<MessageThreadActions
								{thread}
								{mailboxRouteId}
								{onMoved}
								header
								primaryReplyMode={settings.defaultReplyMode}
							/>
						</div>
					{/if}
				</div>
			</div>
				{#if hasBlockedExternal && !allowExternal}
					<div class="z-mail-external-banner">
						<Shield class="size-3.5 shrink-0" aria-hidden="true" />
						<span>External images blocked.</span>
						<button type="button" class="z-mail-text-nav__link" onclick={showImagesOnce}>
							Show once
						</button>
						<span class="z-mail-external-banner__dot">·</span>
						<a href="/settings/appearance" class="z-mail-text-nav__link">Settings</a>
					</div>
				{/if}

			{#if thread.length > 1}
				<div class="z-reader-subject-row mb-6">
					<h1
						bind:this={readerSubjectEl}
						class={cn(
							'z-type-reader-title z-reader-subject-heading',
							subjectImportant && 'z-mail-list-subject--important',
							subjectImportant &&
								subjectMessageId &&
								importantRainbow.hasPicked(subjectMessageId) &&
								'z-mail-list-subject--important-picked'
						)}
						style={subjectImportant && subjectMessageId
							? importantRainbow.cssVars(subjectMessageId)
							: undefined}
						onpointerenter={startReaderRainbowSample}
						onpointerleave={persistReaderRainbowPick}
						onpointerdown={(event) => {
							if (!subjectMessageId) return;
							readerRainbowTouch.onPointerDown(subjectMessageId, event);
						}}
						onpointermove={readerRainbowTouch.onPointerMove}
						onpointerup={(event) => {
							if (!subjectMessageId) return;
							readerRainbowTouch.onPointerUp(subjectMessageId, event);
						}}
						onpointercancel={readerRainbowTouch.onPointerCancel}
					>
						{subject}
					</h1>
				</div>
			{/if}

			<div class="z-reader-thread-list">
			{#each thread as message (message.id)}
				{@const contact = readerPrimaryContact(message, mailboxRouteId, isMe)}
				{@const showContactEmail = shouldShowContactEmail(contact.displayName, contact.email)}
				<section class={cn('z-reader-thread', (thread.length === 1 || isExpanded(message)) ? 'z-reader-thread--expanded' : 'z-reader-thread--collapsed')}>
					{#if thread.length === 1 || isExpanded(message)}
						{#if thread.length === 1}
							<header class="z-reader-chrome">
								<div class="z-reader-chrome__meta">
									<div class="z-reader-chrome__from">
										<div class="min-w-0">
											<p class="z-reader-from truncate">{contact.displayName}</p>
											{#if showContactEmail}
												{#if !contact.isMe}
													<button
														type="button"
														class="z-reader-link mt-0.5 block max-w-full truncate text-left"
														onclick={() => composeTo(contact.email)}
													>
														{contact.email}
													</button>
												{:else}
													<p class="z-reader-meta mt-0.5">{contact.email}</p>
												{/if}
											{/if}
										</div>
									</div>

									<div class="z-reader-chrome__aside">
										<time class="z-reader-meta text-xs block" datetime={message.receivedAt}>
											{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
										</time>
										{#if showReadTime && !minimalChrome}
											<div class="z-reader-chrome__time text-xs">~{readMinutes} min</div>
										{/if}
									</div>
								</div>
							</header>
							<div class="z-reader-subject-row mt-4 mb-6">
								<h1
									bind:this={readerSubjectEl}
									class={cn(
										'z-type-reader-title z-reader-subject-heading !m-0',
										subjectImportant && 'z-mail-list-subject--important',
										subjectImportant &&
											subjectMessageId &&
											importantRainbow.hasPicked(subjectMessageId) &&
											'z-mail-list-subject--important-picked'
									)}
									style={subjectImportant && subjectMessageId
										? importantRainbow.cssVars(subjectMessageId)
										: undefined}
									onpointerenter={startReaderRainbowSample}
									onpointerleave={persistReaderRainbowPick}
									onpointerdown={(event) => {
										if (!subjectMessageId) return;
										readerRainbowTouch.onPointerDown(subjectMessageId, event);
									}}
									onpointermove={readerRainbowTouch.onPointerMove}
									onpointerup={(event) => {
										if (!subjectMessageId) return;
										readerRainbowTouch.onPointerUp(subjectMessageId, event);
									}}
									onpointercancel={readerRainbowTouch.onPointerCancel}
								>
									{subject}
								</h1>
							</div>
						{:else}
							<header class="z-reader-message-head">
								<div class="z-reader-chrome__meta">
									<div class="z-reader-chrome__from">
										<div class="min-w-0">
											<button
												type="button"
												class="z-reader-from truncate text-left block w-full hover:underline decoration-fg/20"
												onclick={() => toggleMessage(message)}
												aria-expanded={true}
												aria-label={`Collapse message from ${contact.displayName}`}
											>
												{contact.displayName}
											</button>
											{#if showContactEmail}
												{#if !contact.isMe}
													<button
														type="button"
														class="z-reader-link mt-0.5 block max-w-full truncate text-left"
														onclick={() => composeTo(contact.email)}
													>
														{contact.email}
													</button>
												{:else}
													<p class="z-reader-meta mt-0.5">{contact.email}</p>
												{/if}
											{/if}
										</div>
									</div>

									<button
										type="button"
										class="z-reader-chrome__aside text-right hover:underline decoration-fg/20"
										onclick={() => toggleMessage(message)}
										aria-label="Collapse message"
									>
										<time class="z-reader-meta text-xs block" datetime={message.receivedAt}>
											{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
										</time>
										{#if message.id === latest?.id && !minimalChrome}
											<span class="z-reader-latest-badge mt-0.5">Latest</span>
										{/if}
									</button>
								</div>
							</header>
						{/if}

						<div class="z-reader-content w-full">
							<div class="z-reader-body">
								<MessageBody
									bodyHtml={message.bodyHtml}
									bodyText={message.bodyText}
									{allowExternal}
								/>
							</div>

							{#if message.attachments.length}
								<MessageAttachments attachments={message.attachments} />
							{/if}

							{#if thread.length === 1 && !isDraft}
								<div class="z-reader-bottom-actions mt-8 pt-6 border-t border-border flex items-center gap-3">
									<Button onclick={reply}>
										<Reply class="size-4" aria-hidden="true" />
										<span>Reply</span>
									</Button>
									<Button variant="ghost" onclick={replyAll}>
										<ReplyAll class="size-4" aria-hidden="true" />
										<span>Reply all</span>
									</Button>
									<Button variant="ghost" onclick={forward}>
										<Forward class="size-4" aria-hidden="true" />
										<span>Forward</span>
									</Button>
								</div>
							{/if}
						</div>
					{:else}
						<button
							type="button"
							class="z-reader-thread-toggle"
							aria-expanded={false}
							aria-label={`Expand message from ${contact.displayName}`}
							onclick={() => toggleMessage(message)}
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline justify-between gap-4">
									<p class="z-reader-from truncate">{contact.displayName}</p>
									<time class="z-reader-meta text-xs tabular-nums shrink-0" datetime={message.receivedAt}>
										{formatMessageListWhen(message.receivedAt, false, settings.timeFormat)}
									</time>
								</div>
								{#if message.preview}
									<p class="z-reader-meta mt-0.5 truncate pr-8">{message.preview}</p>
								{/if}
							</div>
						</button>
					{/if}
				</section>
			{/each}
			</div>

		</div>
		</div>
	</div>

	{#if latest}
		<MessageReaderMobileBar {thread} {mailboxRouteId} {onMoved} {minimalChrome} />
	{/if}
</article>
