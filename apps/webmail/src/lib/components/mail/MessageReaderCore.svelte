<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import MessageReaderMobileBar from '$lib/components/mail/MessageReaderMobileBar.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { getWebmailModeContext } from '$lib/modes/context';
	import { simpleContentPagePadClass } from '$lib/modes/simple/simple-content-layout';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { plainTextExcerpt, renderMessageBody } from '$lib/email/html';
	import { recordContact } from '$lib/utils/contact-index';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Simple mode: editorial reading focus with reduced chrome. */
		minimalChrome?: boolean;
	}

	let { thread, mailboxRouteId, onMoved, minimalChrome = false }: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);
	const mode = $derived(getWebmailModeContext());
	const useSimpleContentShell = $derived(mode.id === 'simple');

	let localShowImagesOnce = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let quickReply = $state('');
	let quickReplySending = $state(false);
	let scrollPane = $state<HTMLDivElement | null>(null);

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));

	const latest = $derived(thread.at(-1));
	const subject = $derived(latest?.subject ?? '(no subject)');
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const mailHomeHref = $derived(settings.preferredMailHref());
	const mailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const mailboxLabel = $derived(mailbox?.name ?? mailboxRouteId);
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
	const mailboxHref = $derived(`/mail/${mailboxRouteId}`);

	const nextUnread = $derived.by(() => {
		const list = mail.messages;
		const currentId = latest?.threadId;
		if (!list.length) return null;
		const startIndex = currentId
			? list.findIndex((message) => message.threadId === currentId)
			: -1;
		for (let i = startIndex + 1; i < list.length; i++) {
			if (list[i].unread) return list[i];
		}
		return null;
	});

	function openNextUnread() {
		if (!nextUnread) return;
		goto(`/mail/${mailboxRouteId}/${nextUnread.threadId}`);
	}

	const userDomain = $derived((auth.username ?? '').split('@')[1]?.toLowerCase() ?? '');
	function isExternalSender(email: string): boolean {
		if (!settings.warnExternalSenders || !userDomain) return false;
		const domain = email.split('@')[1]?.toLowerCase();
		return !!domain && domain !== userDomain;
	}
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
	const collapsedCount = $derived(Math.max(0, thread.length - expandedIds.size));
	const threadRowX = $derived(
		useSimpleContentShell
			? ''
			: settings.compactCollapsedThreads || settings.compactReaderBody
				? 'px-4 md:px-5'
				: 'px-4 md:px-6'
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
		if (!useSimpleContentShell || typeof document === 'undefined') return scrollPane;
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
		if (!paneEl || thread.length < 2) return;
		void tick().then(() => {
			paneEl.scrollTop = paneEl.scrollHeight;
		});
	});

	function formatWhen(iso: string) {
		const timeOpts: Intl.DateTimeFormatOptions =
			settings.timeFormat === '12h'
				? { timeStyle: 'short', hour12: true }
				: settings.timeFormat === '24h'
					? { timeStyle: 'short', hour12: false }
					: { timeStyle: 'short' };
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', ...timeOpts }).format(
			new Date(iso)
		);
	}

	function senderLabel(message: MessageDetail) {
		const name = message.from.name?.trim();
		const email = message.from.email;
		if (!name || name === email) return email;
		return name;
	}

	function isMe(email: string): boolean {
		const cleanEmail = email.trim().toLowerCase();
		if (auth.username && auth.username.trim().toLowerCase() === cleanEmail) {
			return true;
		}
		return auth.identities.some((identity) => identity.email?.trim().toLowerCase() === cleanEmail);
	}

	function getPrimaryContact(message: MessageDetail) {
		const isFromMe = isMe(message.from.email);
		if (isFromMe && mailboxRouteId !== 'inbox' && message.to && message.to.length > 0) {
			const recipient = message.to[0];
			const name = recipient.name?.trim() || recipient.email;
			return {
				name,
				email: recipient.email,
				avatarName: recipient.name || recipient.email,
				avatarEmail: recipient.email,
				displayName: `To: ${name}`,
				isMe: isMe(recipient.email)
			};
		}
		const name = senderLabel(message);
		return {
			name: message.from.name,
			email: message.from.email,
			avatarName: message.from.name,
			avatarEmail: message.from.email,
			displayName: name,
			isMe: isFromMe
		};
	}

	function collapsedPreview(message: MessageDetail) {
		const preview = message.preview?.trim();
		if (preview) return preview;
		return plainTextExcerpt(message.bodyText);
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

	function expandAll() {
		expandedIds = new Set(thread.map((message) => message.id));
	}

	function collapseToLatest() {
		const latestId = thread.at(-1)?.id;
		expandedIds = latestId ? new Set([latestId]) : new Set();
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

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function saveContact(contact: { name: string; email: string }) {
		const accountId = auth.client?.getAccountId();
		if (!accountId) return;
		recordContact(accountId, contact.name, contact.email);
		toast.show(`${contact.name} added to contacts`, 'success');
	}

	async function copyEmail(email: string) {
		try {
			await navigator.clipboard.writeText(email);
			toast.show('Email copied', 'success');
		} catch {
			toast.show('Could not copy email', 'error');
		}
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
</script>

<article
	class={cn(
		'z-mail-pane-surface',
		useSimpleContentShell ? 'z-mail-pane-surface--flow' : 'min-h-0 flex-1 overflow-hidden'
	)}
	style="view-transition-name: message-reader;"
>
	{#if !useSimpleContentShell}
		<h1 class="sr-only">{subject}</h1>
	{/if}

	{#if mail.selectedError}
		<div
			class={cn(
				'shrink-0',
				settings.compactReaderInlineError
					? 'px-3 py-1 text-[11px] md:px-4'
					: 'px-4 py-2 text-xs md:px-6',
				!settings.hideReaderPaneBorders && 'border-b',
				mail.selectedError.startsWith('Offline')
					? 'border-border bg-surface text-fg-muted'
					: 'border-danger/20 bg-danger/5 text-danger'
			)}
		>
			{mail.selectedError}
		</div>
	{/if}

	{#if hasBlockedExternal && !allowExternal && !settings.hideExternalContentBanner}
		<div
			class={cn(
				'flex shrink-0 flex-wrap items-center bg-surface text-fg-muted md:px-6',
				settings.compactExternalContentBanner ? 'gap-x-1.5 gap-y-1 px-3 py-1.5 text-[11px]' : 'gap-x-2 gap-y-1 px-4 py-2 text-xs',
				!settings.hideReaderPaneBorders && 'border-b border-border/80'
			)}
		>
			<Shield class={cn('shrink-0', settings.compactExternalContentBanner ? 'size-3' : 'size-3.5')} aria-hidden="true" />
			<span>External images blocked.</span>
			<button type="button" class="text-accent hover:underline" onclick={showImagesOnce}>
				Show once
			</button>
			<span class="text-fg-subtle">·</span>
			<a href="/settings/appearance" class="text-accent hover:underline">Settings</a>
		</div>
	{/if}

	<div
		class={cn(
			'z-pane-scroll z-pane-scroll--mobile-reader',
			useSimpleContentShell
				? 'z-pane-scroll--flow'
				: 'min-h-0 flex-1 overflow-y-auto'
		)}
		bind:this={scrollPane}
	>
		<div
			class={cn(
				useSimpleContentShell && simpleContentPagePadClass(settings.compactSettingsLayout)
			)}
		>
		<div
			class={cn(
				'z-reader-column',
				threadRowX,
				minimalChrome && 'z-reader-column--aligned'
			)}
		>
			{#if useSimpleContentShell}
				<div class="z-mail-text-nav z-reader-sticky-nav">
					<div class="z-mail-text-nav__row">
						<h1 class="z-mail-text-nav__title z-mail-text-nav__title--truncate">{subject}</h1>
						{#if !mail.hasSelection}
							{#if isDraft && latest}
								<a
									class="z-mail-text-nav__action"
									href="/mail/compose?draft={latest.id}"
								>
									Edit draft
								</a>
							{:else if !isDraft}
								<button type="button" class="z-mail-text-nav__action" onclick={reply}>
									{primaryReplyLabel}
								</button>
							{/if}
						{/if}
					</div>
					<div class="z-mail-text-nav__links">
						<a class="z-mail-text-nav__link" href={mailHomeHref}>Back to mail</a>
						{#if mailboxRouteId !== 'inbox'}
							<a class="z-mail-text-nav__link" href={mailboxHref}>{mailboxLabel}</a>
						{/if}
						<a class="z-mail-text-nav__link" href="/settings">Settings</a>
					</div>
				</div>
			{:else}
				<div
					class={cn(
						'sticky top-0 z-10 border-b border-border/60 bg-surface/95 text-xs text-fg-muted backdrop-blur-sm',
						settings.compactReaderHeader ? 'pb-1 pt-1.5' : 'pb-2 pt-2'
					)}
				>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						<a
							href={mailHomeHref}
							class="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
						>
							Back to mail
						</a>
						{#if mailboxRouteId !== 'inbox'}
							<a
								href={mailboxHref}
								class="text-accent underline underline-offset-2 hover:text-accent-hover"
							>
								Back to {mailboxLabel}
							</a>
						{/if}
					</div>
				</div>
			{/if}
			{#if thread.length > 1}
				<div class={cn('pb-1 pt-3', settings.compactReaderHeader && 'pt-2.5', minimalChrome && 'pt-2')}>
					<div
						class={cn(
							'z-reader-subject-row flex-col gap-2 sm:flex-row',
							!settings.hideThreadSummary && !minimalChrome && 'sm:items-start'
						)}
					>
						<div class="min-w-0 flex-1">
							{#if !settings.hideThreadSummary && !minimalChrome}
								<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
									<span>{thread.length} messages</span>
									{#if showReadTime}
										<span aria-hidden="true">·</span>
										<span>~{readMinutes} min read</span>
									{/if}
									{#if collapsedCount > 0}
										<button type="button" class="text-accent hover:underline" onclick={expandAll}>
											Expand all
										</button>
									{:else}
										<button
											type="button"
											class="text-accent hover:underline"
											onclick={collapseToLatest}
										>
											Collapse earlier
										</button>
									{/if}
								</div>
							{/if}
						</div>

						{#if !mail.hasSelection}
							<MessageThreadActions
								{thread}
								{mailboxRouteId}
								{onMoved}
								{minimalChrome}
								readerHeader
								class="hidden shrink-0 md:flex"
							/>
						{/if}
					</div>
				</div>
			{/if}

			{#each thread as message, index (message.id)}
				{@const contact = getPrimaryContact(message)}
				{@const showInlineSubject = thread.length === 1 || message.id === latest?.id}
				<section
					class={cn(
						index > 0 && !settings.hideReaderPaneBorders && 'border-t border-border/70',
						index === 0 && thread.length > 1 && 'pt-0.5',
						index === 0 && thread.length === 1 && 'pt-3'
					)}
				>
					{#if isExpanded(message)}
						<div
							class={cn(
								index === 0
									? settings.compactReaderBody
										? 'pb-3 pt-1'
										: 'pb-4 pt-1.5'
									: settings.compactReaderBody
										? 'py-3'
										: 'py-4'
							)}
						>
						{#if thread.length === 1}
							<header class="z-reader-chrome z-reader-chrome--bordered">
								<div class="z-reader-chrome__meta">
									<div class="z-reader-chrome__from flex items-start gap-3">
										{#if settings.showAvatars}
											<Avatar
												name={contact.avatarName}
												email={contact.avatarEmail}
												class={cn(
													settings.compactReaderAvatars ? 'size-8 text-xs' : 'size-9 text-sm'
												)}
											/>
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-1.5">
												<p class="z-reader-from truncate">{contact.displayName}</p>
												{#if isExternalSender(contact.email)}
													<span
														class="inline-flex shrink-0 items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
														title="Sender is outside {userDomain}"
													>
														External
													</span>
												{/if}
											</div>
											{#if !settings.hideReaderSenderEmail}
												{#if contact.email !== contact.displayName && !contact.isMe}
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
											{#if !settings.hideReaderRecipients && (message.to.length || message.cc.length)}
												<div class="z-reader-meta mt-1 space-y-0.5">
													{#if message.to.length}
														<p class="truncate">
															To {message.to.map((addr) => addr.name || addr.email).join(', ')}
														</p>
													{/if}
													{#if message.cc.length}
														<p class="truncate">
															Cc {message.cc.map((addr) => addr.name || addr.email).join(', ')}
														</p>
													{/if}
												</div>
											{/if}
											{#if settings.showReaderContactActions}
												<div class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
													<button
														type="button"
														class="text-xs font-medium text-accent hover:underline"
														onclick={() => saveContact(contact)}
													>
														Save contact
													</button>
													<button
														type="button"
														class="text-xs text-fg-subtle hover:text-accent hover:underline"
														onclick={() => copyEmail(contact.email)}
													>
														Copy email
													</button>
												</div>
											{/if}
										</div>
									</div>

									<div class="z-reader-chrome__aside">
										{#if !mail.hasSelection}
											<div class="z-reader-chrome__actions hidden shrink-0 md:block">
												<MessageThreadActions
													{thread}
													{mailboxRouteId}
													{onMoved}
													{minimalChrome}
													readerHeader
												/>
											</div>
										{/if}
										{#if (!settings.hideReaderTimestamps || showReadTime) && !minimalChrome}
											<div class="z-reader-chrome__time flex flex-col items-end gap-0.5">
												{#if !settings.hideReaderTimestamps}
													<time
														class="z-type-list-time whitespace-nowrap"
														datetime={message.receivedAt}
													>
														{formatWhen(message.receivedAt)}
													</time>
												{/if}
												{#if showReadTime}
													<span class="text-xs whitespace-nowrap text-fg-subtle">~{readMinutes} min read</span>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							</header>
						{:else}
							<header class="z-reader-message-head">
								<button
									type="button"
									class={cn(
										'z-reader-thread-toggle',
										settings.compactCollapsedThreads ? 'py-2' : 'py-3'
									)}
									aria-expanded={true}
									aria-label={`Collapse message from ${contact.displayName}`}
									onclick={() => toggleMessage(message)}
								>
									{#if settings.showAvatars}
										<Avatar
											name={contact.avatarName}
											email={contact.avatarEmail}
											class={cn(
												settings.compactReaderAvatars ? 'size-8 text-xs' : 'size-9 text-sm'
											)}
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
											{#if !settings.hideReaderTimestamps}
												<time
													class="z-type-list-time whitespace-nowrap"
													datetime={message.receivedAt}
												>
													{formatWhen(message.receivedAt)}
												</time>
											{/if}
											<ChevronUp class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
										</div>
									{/if}
								</button>

							{#if !settings.hideReaderSenderEmail || (settings.showReaderContactActions) || (!settings.hideReaderRecipients && (message.to.length || message.cc.length))}
								<div
									class={cn(
										'min-w-0',
										settings.showAvatars &&
											(settings.compactReaderAvatars ? 'pl-11' : 'pl-12')
									)}
								>
									{#if !settings.hideReaderSenderEmail && contact.email !== contact.displayName}
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

									{#if !settings.hideReaderRecipients && (message.to.length || message.cc.length)}
										<div class="z-reader-meta mt-1 space-y-0.5">
											{#if message.to.length}
												<p class="truncate">
													To {message.to.map((addr) => addr.name || addr.email).join(', ')}
												</p>
											{/if}
											{#if message.cc.length}
												<p class="truncate">
													Cc {message.cc.map((addr) => addr.name || addr.email).join(', ')}
												</p>
											{/if}
										</div>
									{/if}

									{#if settings.showReaderContactActions}
										<div class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
											<button
												type="button"
												class="text-xs font-medium text-accent hover:underline"
												onclick={() => saveContact(contact)}
											>
												Save contact
											</button>
											<button
												type="button"
												class="text-xs text-fg-subtle hover:text-accent hover:underline"
												onclick={() => copyEmail(contact.email)}
											>
												Copy email
											</button>
										</div>
									{/if}
								</div>
							{/if}
							</header>
						{/if}

						<div
							class={cn(
								'z-reader-content w-full',
								settings.compactReaderBody && 'z-reader-content--compact'
							)}
						>
							{#if showInlineSubject && !useSimpleContentShell}
								<p class="z-reader-inline-subject">{subject}</p>
							{/if}

							{#if message.attachments.length}
								<div class={cn(settings.compactReaderBody ? 'mb-3' : 'mb-4')}>
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
							class={cn(
								'z-reader-thread-toggle max-sm:items-start',
								settings.compactCollapsedThreads ? 'py-2' : 'py-3'
							)}
							onclick={() => toggleMessage(message)}
					>
						{#if settings.showAvatars}
							<Avatar
								name={contact.avatarName}
								email={contact.avatarEmail}
								class={cn(settings.compactReaderAvatars ? 'size-7' : 'size-8')}
							/>
						{/if}
						<div class="min-w-0 flex-1">
							{#if !settings.hideCollapsedThreadPreviews && collapsedPreview(message)}
								<p class={cn('truncate font-medium text-fg', settings.compactCollapsedThreads ? 'text-xs' : 'text-sm')}>
									{contact.displayName}
								</p>
								<p
									class={cn(
										'mt-0.5 truncate text-fg-muted',
										settings.compactCollapsedThreads ? 'text-[11px]' : 'text-xs'
									)}
								>
									{collapsedPreview(message)}
								</p>
							{:else}
								<p class={cn('truncate', settings.compactCollapsedThreads ? 'text-xs' : 'text-sm')}>
									<span class="font-medium text-fg">{contact.displayName}</span>
								</p>
							{/if}
						</div>
						{#if !minimalChrome}
							<div class="z-reader-thread-meta">
								{#if !settings.hideReaderTimestamps}
									<span class="z-type-list-time whitespace-nowrap">{formatWhen(message.receivedAt)}</span>
								{/if}
								{#if thread.length > 1}
									<ChevronDown class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
								{/if}
							</div>
						{/if}
						</button>
					{/if}
				</section>
			{/each}

			{#if nextUnread && !minimalChrome}
				<div class={cn('flex justify-center', settings.compactReaderBody ? 'py-4' : 'py-6')}>
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
						onclick={openNextUnread}
					>
						Next unread
						<ChevronRight class="size-4" aria-hidden="true" />
					</button>
				</div>
			{/if}
		</div>
		</div>
	</div>

	{#if latest && auth.client && settings.showQuickReply && mailboxRouteId !== 'drafts' && !minimalChrome}
		<footer
			class={cn(
				'hidden shrink-0 bg-surface/80 md:block',
				!settings.hideReaderPaneBorders && 'border-t border-border/80',
				settings.compactQuickReply ? 'py-2.5' : 'py-4'
			)}
		>
			<div class={cn('z-reader-column flex flex-col gap-2 sm:flex-row', threadRowX)}>
				<textarea
					class="z-input z-compose-editor min-h-10 flex-1 resize-none py-2 leading-relaxed"
					rows={settings.compactQuickReply ? 1 : 2}
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
					<Button variant="ghost" class="!px-2 text-xs max-sm:flex-1" onclick={reply}>Full reply</Button>
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
			{quickReplySending}
			onSendQuickReply={sendQuickReply}
		/>
	{/if}
</article>
