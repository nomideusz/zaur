<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import MessageReaderMobileBar from '$lib/components/mail/MessageReaderMobileBar.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { contentPagePadClass, contentShellClass } from '$lib/mail/layout';
	import { readerPrimaryContact, shouldShowContactEmail } from '$lib/mail/reader-contact';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
	import { createImportantRainbowTouchPick } from '$lib/mail/important-rainbow-touch';
	import { shouldShowImportantRainbow } from '$lib/mail/mailboxes';
	import { hasPreciseHover } from '$lib/utils/pointer-env';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Reduced chrome when the list rail is hidden. */
		minimalChrome?: boolean;
	}

	let { thread, mailboxRouteId, onMoved, minimalChrome = false }: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);
	let localShowImagesOnce = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let quickReply = $state('');
	let quickReplySending = $state(false);
	let quickReplyOpen = $state(false);
	let scrollPane = $state<HTMLDivElement | null>(null);
	let readerSubjectEl = $state<HTMLHeadingElement | null>(null);

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const subjectAnchorId = $derived(actionMessage?.id ?? latest?.id);
	const subject = $derived(latest?.subject ?? '(no subject)');
	const subjectImportant = $derived(
		!!(actionMessage?.important ?? thread.some((message) => message.important)) &&
			shouldShowImportantRainbow(mail.mailboxByRouteId(mailboxRouteId)?.role)
	);
	const subjectMessageId = $derived(subjectAnchorId ?? '');
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const mailHomeHref = $derived(settings.preferredMailHref());
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
		quickReplyOpen = false;
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

	function primaryReply() {
		if (settings.defaultReplyMode === 'reply-all') replyAll();
		else reply();
	}

	function headerReply() {
		if (
			settings.showQuickReply &&
			browser &&
			window.matchMedia('(max-width: 767px)').matches
		) {
			quickReplyOpen = true;
			return;
		}
		primaryReply();
	}

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	async function sendQuickReply() {
		if (!auth.client || !auth.username || !latest) return;

		const text = quickReply.trim();
		if (!text || quickReplySending) return;

		quickReplySending = true;
		compose.startReply(latest);

		const quoteMarker = /\n\n---\n/;
		const idx = compose.body.search(quoteMarker);
		const quote = idx >= 0 ? compose.body.slice(idx) : '';
		const signature = settings.composeBodyWithSignature('').trim();
		compose.body = signature ? `${text}\n\n${signature}${quote}` : `${text}${quote}`;

		try {
			const result = await compose.send(auth.client, auth.username, senderName, {
				onUndo: () => {
					const idx = compose.body.search(quoteMarker);
					quickReply = idx >= 0 ? compose.body.slice(0, idx).trimEnd() : compose.body.trim();
				},
				onComplete: (outcome) => {
					if (outcome === 'sent') {
						toast.show('Reply sent', 'success');
						void mail.loadMessage(auth.client!, mailboxRouteId, latest.threadId, { force: true });
					} else if (outcome === 'queued') {
						toast.show('Reply queued — will send when back online', 'info');
					}
				}
			});
			if (result === 'sent') {
				quickReply = '';
				void mail.loadMessage(auth.client, mailboxRouteId, latest.threadId, { force: true });
			} else if (result === 'pending' || result === 'queued') {
				quickReply = '';
			}
		} finally {
			quickReplySending = false;
		}
	}

	function onQuickReplyKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void sendQuickReply();
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
				'shrink-0 border-b px-4 py-2 text-xs md:px-6',
				mail.selectedError.startsWith('Offline')
					? 'border-border bg-surface text-fg-muted'
					: 'border-danger/20 bg-danger/5 text-danger'
			)}
		>
			{mail.selectedError}
		</div>
	{/if}

	<div class="z-pane-scroll z-pane-scroll--mobile-reader z-pane-scroll--flow" bind:this={scrollPane}>
		<div class={contentPagePadClass()}>
		<div class="z-reader-column">
			<div class="z-mail-text-nav z-reader-sticky-nav">
					<div class="z-mail-text-nav__row">
						<a class="z-mail-text-nav__link" href={mailHomeHref}>Back to mail</a>
						{#if !mail.hasSelection && latest}
							<div class="z-mail-text-nav__actions flex shrink-0 items-center gap-1.5">
								{#if isDraft}
									<a
										class="z-mail-text-nav__action"
										href="/mail/compose?draft={latest.id}"
									>
										Edit draft
									</a>
								{:else}
									<button type="button" class="z-mail-text-nav__action" onclick={headerReply}>
										{primaryReplyLabel}
									</button>
								{/if}
								<MessageThreadActions
									{thread}
									{mailboxRouteId}
									{onMoved}
									header
									showDraftSend={isDraft}
								/>
							</div>
						{/if}
					</div>
				</div>
				{#if hasBlockedExternal && !allowExternal}
					<div class="z-mail-external-banner">
						<Shield class="size-3.5 shrink-0" aria-hidden="true" />
						<span>External images blocked.</span>
						<button type="button" class="z-mail-external-banner__action" onclick={showImagesOnce}>
							Show once
						</button>
						<span class="z-mail-external-banner__dot">·</span>
						<a href="/settings/appearance" class="z-mail-external-banner__action">Settings</a>
					</div>
				{/if}
			{#each thread as message, index (message.id)}
				{@const contact = readerPrimaryContact(message, mailboxRouteId, isMe)}
				{@const showContactEmail = shouldShowContactEmail(contact.displayName, contact.email)}
				{@const showInlineSubject = message.id === subjectAnchorId}
				<section
					class={cn(index > 0 && 'border-t border-border/70')}
				>
					{#if isExpanded(message)}
						<div
							class={cn(
								index === 0 ? 'pb-4 pt-1.5' : 'py-4'
							)}
						>
						{#if thread.length === 1}
							<header class="z-reader-chrome z-reader-chrome--bordered">
								<div class="z-reader-chrome__meta">
									<div class="z-reader-chrome__from flex items-start gap-3">
										{#if settings.showAvatars}
											<Avatar
												name={contact.avatarName ?? contact.avatarEmail}
												email={contact.avatarEmail}
												class="size-9 text-sm"
											/>
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-1.5">
												<p class="z-reader-from truncate">{contact.displayName}</p>
											</div>
											{#if showContactEmail}
												{#if !contact.isMe}
													<button
														type="button"
														class="z-reader-meta mt-0.5 block max-w-full truncate text-left hover:text-accent hover:underline"
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
										{#if showReadTime && !minimalChrome}
											<div class="z-reader-chrome__time flex flex-col items-end gap-0.5">
												<span class="text-xs whitespace-nowrap text-fg-subtle">~{readMinutes} min read</span>
											</div>
										{/if}
									</div>
								</div>
							</header>
						{:else}
							<header class="z-reader-message-head">
								<button
									type="button"
									class="z-reader-thread-toggle py-3"
									aria-expanded={true}
									aria-label={`Collapse message from ${contact.displayName}`}
									onclick={() => toggleMessage(message)}
								>
									{#if settings.showAvatars}
										<Avatar
											name={contact.avatarName ?? contact.avatarEmail}
											email={contact.avatarEmail}
											class="size-9 text-sm"
										/>
									{/if}
									<div class="min-w-0 flex-1">
										<div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
											<span class="z-reader-from">{contact.displayName}</span>
											{#if message.id === latest?.id && !minimalChrome}
												<span class="z-reader-latest-badge">Latest</span>
											{/if}
										</div>
									</div>
									{#if !minimalChrome}
										<div class="z-reader-thread-meta">
											<ChevronUp class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
										</div>
									{/if}
								</button>

							{#if showContactEmail}
								<div class={cn('min-w-0', settings.showAvatars && 'pl-12')}>
									{#if !contact.isMe}
										<button
											type="button"
											class="z-reader-meta mt-0.5 block max-w-full truncate text-left hover:text-accent hover:underline"
											onclick={() => composeTo(contact.email)}
										>
											{contact.email}
										</button>
									{:else}
										<p class="z-reader-meta mt-0.5">{contact.email}</p>
									{/if}
								</div>
							{/if}
							</header>
						{/if}

						<div class="z-reader-content w-full">
							{#if showInlineSubject}
								<h1
									bind:this={readerSubjectEl}
									class={cn(
										'z-reader-subject-heading',
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
								>{subject}</h1>
							{/if}

							{#if message.attachments.length}
								<div class="mb-4">
									<MessageAttachments attachments={message.attachments} />
								</div>
							{/if}

							<div class="z-reader-body">
								<MessageBody
									bodyHtml={message.bodyHtml}
									bodyText={message.bodyText}
									{allowExternal}
								/>
							</div>
						</div>
					</div>
					{:else}
						<button
							type="button"
							class="z-reader-thread-toggle max-sm:items-start py-3"
							onclick={() => toggleMessage(message)}
					>
						{#if settings.showAvatars}
							<Avatar
								name={contact.avatarName ?? contact.avatarEmail}
								email={contact.avatarEmail}
								class="size-8"
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">
								<span class="font-medium text-fg">{contact.displayName}</span>
							</p>
						</div>
						{#if !minimalChrome && thread.length > 1}
							<div class="z-reader-thread-meta">
								<ChevronDown class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
							</div>
						{/if}
						</button>
					{/if}
				</section>
			{/each}

		</div>
		</div>
	</div>

	{#if latest && auth.client && settings.showQuickReply && mailboxRouteId !== 'drafts' && !minimalChrome}
		<footer class="hidden shrink-0 border-t border-border/80 bg-surface/80 md:block">
			<div class={cn(contentShellClass(), 'px-4 py-4 md:px-6')}>
				<div class="z-reader-column flex flex-col gap-2 sm:flex-row">
					<textarea
						class="z-input z-compose-editor min-h-10 flex-1 resize-none py-2 leading-relaxed"
						rows={2}
						placeholder="Write a quick reply…"
						aria-label="Quick reply"
						bind:value={quickReply}
						disabled={quickReplySending}
						onkeydown={onQuickReplyKeydown}
					></textarea>
					<div class="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start sm:gap-1">
						<Button class="max-sm:flex-1" disabled={!quickReply.trim() || quickReplySending} onclick={sendQuickReply}>
							{quickReplySending ? 'Sending…' : 'Send'}
						</Button>
						{#if !settings.hideComposeHints}
							<span class="hidden text-xs text-fg-subtle sm:inline">Ctrl+Enter</span>
						{/if}
					</div>
				</div>
			</div>
		</footer>
	{/if}

	{#if latest}
		<MessageReaderMobileBar
			{thread}
			{mailboxRouteId}
			{onMoved}
			{minimalChrome}
			bind:quickReply
			bind:quickReplyOpen
			{quickReplySending}
			onSendQuickReply={sendQuickReply}
		/>
	{/if}
</article>
