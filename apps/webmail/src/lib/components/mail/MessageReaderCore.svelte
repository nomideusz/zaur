<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
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
	}

	let { thread, mailboxRouteId, onMoved, onBackToList }: Props = $props();

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
		return scrollPane;
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
	class="z-mail-pane-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: message-reader;"
>
	<header class="flex shrink-0 flex-col gap-2 border-b border-border/80 px-4 py-2.5">
		<div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
			<div class="flex min-w-0 flex-wrap items-center gap-2">
				<a
					href={listHref}
					class="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted no-underline transition-colors hover:text-fg"
				>
					<ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
					<span>Back</span>
				</a>
				{#if actionMessage && !actionMessage.unread}
					<button
						type="button"
						class="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
						onclick={() => void triageUnsee()}
					>
						{LABEL_RESTORE_NEW}
					</button>
				{/if}
			</div>
			{#if !mail.hasSelection && latest}
				<div class="flex shrink-0 flex-wrap items-center gap-2">
					{#if isDraft}
						<Button variant="ghost" href="/mail/compose?draft={latest.id}">
							<Pencil class="size-4" aria-hidden="true" />
							Edit draft
						</Button>
						<Button onclick={() => void sendDraft()}>
							<Send class="size-4" aria-hidden="true" />
							Send
						</Button>
					{:else}
						<Button onclick={primaryReply}>
							{#if settings.defaultReplyMode === 'reply-all'}
								<ReplyAll class="size-4" aria-hidden="true" />
							{:else}
								<Reply class="size-4" aria-hidden="true" />
							{/if}
							{primaryReplyLabel}
						</Button>
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
		<h1
			bind:this={readerSubjectEl}
			class={cn(
				'truncate text-base font-semibold text-fg',
				subjectImportant && 'z-mail-list-subject--important',
				subjectImportant &&
					subjectMessageId &&
					importantRainbow.hasPicked(subjectMessageId) &&
					'z-mail-list-subject--important-picked'
			)}
			style={subjectImportant && subjectMessageId ? importantRainbow.cssVars(subjectMessageId) : undefined}
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
	</header>

	{#if mail.selectedError}
		<p
			class={cn(
				'shrink-0 px-4 py-2 text-sm',
				mail.selectedError.startsWith('Offline') ? 'text-fg-muted' : 'text-danger'
			)}
		>
			{mail.selectedError}
		</p>
	{/if}

	<div
		class="z-pane-scroll z-pane-scroll--mobile-reader min-h-0 flex-1 overflow-y-auto"
		bind:this={scrollPane}
	>
		{#if hasBlockedExternal && !allowExternal}
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/80 px-4 py-2 text-xs text-fg-muted">
				<Shield class="size-3.5 shrink-0" aria-hidden="true" />
				<span>External images blocked.</span>
				<button type="button" class="font-medium text-fg hover:underline" onclick={showImagesOnce}>
					Show once
				</button>
				<span aria-hidden="true">·</span>
				<a href="/settings/appearance" class="font-medium text-fg hover:underline">Settings</a>
			</div>
		{/if}

		<div class="z-reader-thread-list divide-y divide-border">
			{#each thread as message (message.id)}
				{@const contact = readerPrimaryContact(message, mailboxRouteId, isMe)}
				{@const showContactEmail = shouldShowContactEmail(contact.displayName, contact.email)}
				<section
					class={cn(
						'z-reader-thread',
						thread.length === 1 || isExpanded(message)
							? 'z-reader-thread--expanded'
							: 'z-reader-thread--collapsed'
					)}
				>
					{#if thread.length === 1 || isExpanded(message)}
						<div class="px-4 py-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-semibold text-fg">{contact.displayName}</p>
									{#if showContactEmail}
										{#if !contact.isMe}
											<button
												type="button"
												class="mt-0.5 block max-w-full truncate text-left text-xs text-fg-muted hover:text-fg"
												onclick={() => composeTo(contact.email)}
											>
												{contact.email}
											</button>
										{:else}
											<p class="mt-0.5 truncate text-xs text-fg-muted">{contact.email}</p>
										{/if}
									{/if}
								</div>
								{#if thread.length > 1}
									<button
										type="button"
										class="shrink-0 text-right text-xs text-fg-subtle hover:text-fg"
										onclick={() => toggleMessage(message)}
									>
										<time datetime={message.receivedAt}>
											{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
										</time>
									</button>
								{:else}
									<time class="shrink-0 text-xs tabular-nums text-fg-subtle" datetime={message.receivedAt}>
										{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
									</time>
								{/if}
							</div>

							<div class="z-reader-body mt-4 text-sm leading-relaxed text-fg">
								<MessageBody
									bodyHtml={message.bodyHtml}
									bodyText={message.bodyText}
									{allowExternal}
								/>
							</div>

							{#if message.attachments.length}
								<div class="mt-4">
									<MessageAttachments attachments={message.attachments} />
								</div>
							{/if}

						</div>
					{:else}
						<button
							type="button"
							class="z-reader-thread-toggle flex w-full px-4 py-3 text-left transition-colors hover:bg-surface-sunken/60"
							aria-expanded={false}
							aria-label={`Expand message from ${contact.displayName}`}
							onclick={() => toggleMessage(message)}
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline justify-between gap-3">
									<p class="truncate text-sm font-medium text-fg">{contact.displayName}</p>
									<time class="shrink-0 text-xs tabular-nums text-fg-subtle" datetime={message.receivedAt}>
										{formatMessageListWhen(message.receivedAt, false, settings.timeFormat)}
									</time>
								</div>
								{#if message.preview.trim()}
									<p class="mt-0.5 truncate text-xs text-fg-muted">{message.preview}</p>
								{/if}
							</div>
						</button>
					{/if}
				</section>
			{/each}
		</div>
	</div>

</article>
