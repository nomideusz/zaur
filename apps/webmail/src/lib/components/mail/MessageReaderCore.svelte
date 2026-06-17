<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { Collapsible } from '@ark-ui/svelte/collapsible';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Paperclip from '$lib/components/icons/Paperclip.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import ThreadMessageActions from '$lib/components/mail/ThreadMessageActions.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { readerPrimaryContact, shouldShowContactEmail } from '$lib/mail/reader-contact';
	import { readerDeliveredTo, userOwnedAddresses } from '$lib/mail/reader-delivered-to';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import {
		importantMarker,
		IMPORTANT_MARKER_HOVER_DELAY_MS,
		shouldCommitImportantMarkerPick
	} from '$lib/mail/important-marker.svelte';
	import ImportantSubjectHighlight from '$lib/components/mail/ImportantSubjectHighlight.svelte';
	import { shouldPresentImportantColors } from '$lib/mail/mailboxes';
	import { formatMessageListWhen } from '$lib/utils/dates';
	import { createImportantMarkerTouchPick } from '$lib/mail/important-marker-touch';
	import { mailListBackHref } from '$lib/mail/routes';
	import { hasPreciseHover, isMobileLayout } from '$lib/utils/pointer-env';
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
	let readerSubjectElMobile = $state<HTMLHeadingElement | null>(null);

	function getReaderSubjectEl(): HTMLHeadingElement | null {
		if (typeof window === 'undefined') return readerSubjectEl ?? readerSubjectElMobile;
		return isMobileLayout() ? readerSubjectElMobile : readerSubjectEl;
	}

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
	const listHref = $derived.by(() => {
		const returnTo = $page.url.searchParams.get('returnTo');
		if (returnTo?.startsWith('/mail/search')) return returnTo;
		return mailListBackHref(mailboxRouteId);
	});


	/* Mobile island renders back + thread actions while a thread is open. */
	$effect(() => {
		const generation = mobileIsland.setReader({
			listHref,
			thread,
			mailboxRouteId,
			onMoved,
			onBackToList
		});
		return () => mobileIsland.clearReader(generation);
	});
	const allowExternal = $derived(
		!settings.blockExternalContent || (pane?.showImagesOnce ?? localShowImagesOnce)
	);
	const ownedAddresses = $derived(userOwnedAddresses(auth.username, auth.identities));

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

	/** Drive each thread message's Ark Collapsible open state from `expandedIds`. */
	function setMessageOpen(message: MessageDetail, open: boolean) {
		const next = new Set(expandedIds);
		if (open) next.add(message.id);
		else next.delete(message.id);
		expandedIds = next;
	}

	function showImagesOnce() {
		if (pane) pane.setShowImagesOnce(true);
		else localShowImagesOnce = true;
	}

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function shouldPersistReaderRainbowPick(event: PointerEvent): boolean {
		const related = event.relatedTarget;
		if (related === null) return false;
		if (related instanceof Node && !document.contains(related)) return false;
		return true;
	}

	let readerRainbowTimeout: ReturnType<typeof setTimeout> | null = null;
	let readerSamplingRainbow = $state(false);
	let readerMarkerSampleStartedAt = 0;

	$effect(() => {
		return () => {
			if (readerRainbowTimeout) {
				clearTimeout(readerRainbowTimeout);
				readerRainbowTimeout = null;
			}
		};
	});

	function persistReaderRainbowPick(event: PointerEvent) {
		if (readerRainbowTimeout) {
			clearTimeout(readerRainbowTimeout);
			readerRainbowTimeout = null;
		}

		const subjectEl = getReaderSubjectEl();

		if (!readerSamplingRainbow) {
			if (subjectMessageId && subjectEl) {
				importantMarker.resetFromElement(subjectEl, subjectMessageId);
			}
			return;
		}

		readerSamplingRainbow = false;
		if (
			!settings.reduceMotion &&
			hasPreciseHover() &&
			subjectImportant &&
			subjectMessageId &&
			subjectEl &&
			shouldPersistReaderRainbowPick(event)
		) {
			importantMarker.stopHoverSample(subjectMessageId);
			if (shouldCommitImportantMarkerPick(readerMarkerSampleStartedAt)) {
				importantMarker.pickFromElement(subjectEl, subjectMessageId);
			} else {
				importantMarker.resetFromElement(subjectEl, subjectMessageId);
			}
		} else if (subjectMessageId && subjectEl) {
			importantMarker.stopHoverSample(subjectMessageId);
			importantMarker.resetFromElement(subjectEl, subjectMessageId);
		}

		readerMarkerSampleStartedAt = 0;
	}

	function startReaderRainbowSample() {
		const subjectEl = getReaderSubjectEl();
		if (settings.reduceMotion || !hasPreciseHover() || !subjectImportant || !subjectMessageId || !subjectEl) {
			return;
		}
		if (readerRainbowTimeout) clearTimeout(readerRainbowTimeout);
		readerSamplingRainbow = false;
		readerMarkerSampleStartedAt = 0;

		readerRainbowTimeout = setTimeout(() => {
			const el = getReaderSubjectEl();
			if (!el || !subjectMessageId) return;
			readerSamplingRainbow = true;
			readerMarkerSampleStartedAt = Date.now();
			importantMarker.startHoverSample(el, subjectMessageId);
		}, IMPORTANT_MARKER_HOVER_DELAY_MS);
	}

	const readerMarkerTouch = createImportantMarkerTouchPick({
		canPick: () =>
			!hasPreciseHover() &&
			!settings.reduceMotion &&
			!!subjectImportant &&
			!!subjectMessageId &&
			!!getReaderSubjectEl()
	});
</script>

{#snippet readerSubjectContent()}
	{#if subjectImportant && subjectMessageId}
		{#key importantMarker.highlightInstanceKey(subjectMessageId)}
			<ImportantSubjectHighlight
				messageId={subjectMessageId}
				instanceKey={importantMarker.highlightInstanceKey(subjectMessageId)}
				surface="reader"
			>
				{subject}
			</ImportantSubjectHighlight>
		{/key}
	{:else}
		{subject}
	{/if}
{/snippet}

{#snippet readerSubjectDesktop()}
	<h1
		bind:this={readerSubjectEl}
		class="z-type-reader-title hidden min-w-0 flex-1 break-words md:block"
		onpointerenter={startReaderRainbowSample}
		onpointerleave={persistReaderRainbowPick}
		onpointerdown={(event) => {
			if (!subjectMessageId) return;
			readerMarkerTouch.onPointerDown(subjectMessageId, event);
		}}
		onpointermove={readerMarkerTouch.onPointerMove}
		onpointerup={(event) => {
			if (!subjectMessageId) return;
			readerMarkerTouch.onPointerUp(subjectMessageId, event);
		}}
		onpointercancel={readerMarkerTouch.onPointerCancel}
	>
		{@render readerSubjectContent()}
	</h1>
{/snippet}

{#snippet readerSubjectMobile()}
	<h1
		bind:this={readerSubjectElMobile}
		class="z-reader-inline-subject md:hidden"
		onpointerenter={startReaderRainbowSample}
		onpointerleave={persistReaderRainbowPick}
		onpointerdown={(event) => {
			if (!subjectMessageId) return;
			readerMarkerTouch.onPointerDown(subjectMessageId, event);
		}}
		onpointermove={readerMarkerTouch.onPointerMove}
		onpointerup={(event) => {
			if (!subjectMessageId) return;
			readerMarkerTouch.onPointerUp(subjectMessageId, event);
		}}
		onpointercancel={readerMarkerTouch.onPointerCancel}
	>
		{@render readerSubjectContent()}
	</h1>
{/snippet}

<!-- Shared expanded body: mobile subject (latest only), message body, attachments. -->
{#snippet threadBody(message: MessageDetail)}
	{#if message.id === latest?.id}
		{@render readerSubjectMobile()}
	{/if}

	<div class="z-reader-body mt-4">
		<MessageBody bodyHtml={message.bodyHtml} bodyText={message.bodyText} {allowExternal} />
	</div>

	{#if message.attachments.length}
		<div class="mt-4">
			<MessageAttachments attachments={message.attachments} />
		</div>
	{/if}
{/snippet}

<article
	class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: message-reader;"
>
	<div class="z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<!--
		Desktop only — on phones the island carries back + thread actions.
		Mirrors the compose header: Back | subject | actions on a 3-col grid.
	-->
	<header
		class="z-reader-header grid grid-cols-[auto_minmax(0,1fr)_auto] shrink-0 items-center gap-2 border-b border-border/80 px-4 py-2.5 min-w-0 max-md:hidden"
	>
		<a href={listHref} class="z-back-btn" aria-label="Back to list">
			<ArrowLeft class="size-4" aria-hidden="true" />
		</a>
		{@render readerSubjectDesktop()}
		{#if latest}
			<div
				class={cn(
					'shrink-0',
					mail.hasSelection && 'pointer-events-none invisible'
				)}
				aria-hidden={mail.hasSelection ? 'true' : undefined}
			>
				<MessageThreadActions {thread} {mailboxRouteId} {onMoved} {onBackToList} />
			</div>
		{/if}
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
		class="z-pane-scroll min-h-0 flex-1 overflow-y-auto"
		bind:this={scrollPane}
	>
		{#if hasBlockedExternal && !allowExternal}
			<div class="z-mail-external-banner border-b border-border/80 px-4 py-2 text-xs">
				<Shield class="size-3.5 shrink-0" aria-hidden="true" />
				<span>External images blocked.</span>
				<button type="button" class="z-mail-external-banner__action" onclick={showImagesOnce}>
					Show once
				</button>
				<span class="z-mail-external-banner__dot" aria-hidden="true">·</span>
				<a href="/settings/account" class="z-mail-external-banner__action">Settings</a>
			</div>
		{/if}

		<div class="z-reader-thread-list divide-y divide-border">
			{#each thread as message (message.id)}
				{@const contact = readerPrimaryContact(message, mailboxRouteId, isMe)}
				{@const showContactEmail = shouldShowContactEmail(contact.displayName, contact.email)}
				{@const deliveredTo = settings.showDeliveredToInReader
					? readerDeliveredTo(message, ownedAddresses)
					: null}
				{#if thread.length === 1}
					<!-- Single message: full reader, always expanded. -->
					<section class="z-reader-thread z-reader-thread--expanded">
						<div class="px-4" style="padding-block: var(--z-space-reader-content);">
							<div class="z-reader-chrome__meta">
								<div class="z-reader-chrome__from">
									<p class="z-reader-from truncate">{contact.displayName}</p>
									{#if showContactEmail}
										{#if !contact.isMe}
											<button
												type="button"
												class="z-reader-meta mt-0.5 block max-w-full truncate text-left hover:text-fg"
												onclick={() => composeTo(contact.email)}
											>
												{contact.email}
											</button>
										{:else}
											<p class="z-reader-meta mt-0.5 truncate">{contact.email}</p>
										{/if}
									{/if}
									{#if deliveredTo}
										<p class="z-reader-delivered-to mt-0.5 truncate" title="{deliveredTo.prefix} {deliveredTo.addresses}">
											{deliveredTo.prefix} {deliveredTo.addresses}
										</p>
									{/if}
								</div>
								<time class="z-reader-chrome__time shrink-0 tabular-nums" datetime={message.receivedAt}>
									{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
								</time>
							</div>

							{@render threadBody(message)}
						</div>
					</section>
				{:else}
					{@const expanded = isExpanded(message)}
					<!--
						Multi-message thread: Ark Collapsible per message. unmountOnExit keeps
						collapsed message bodies out of the DOM (matching the previous render).
					-->
					<Collapsible.Root
						open={expanded}
						onOpenChange={(details) => setMessageOpen(message, details.open)}
						lazyMount
						unmountOnExit
						class={cn(
							'z-reader-thread',
							expanded ? 'z-reader-thread--expanded' : 'z-reader-thread--collapsed'
						)}
					>
						<div
							class="flex items-start gap-2 px-4 transition-colors hover:bg-surface-sunken/30"
							style="padding-block: var(--z-space-reader-content-compact);"
						>
							<Collapsible.Trigger
								class="block min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
								aria-label={`${expanded ? 'Collapse' : 'Expand'} message from ${contact.displayName}`}
							>
								<div class="z-reader-chrome__meta">
									<div class="z-reader-chrome__from">
										<p class="z-reader-from truncate">{contact.displayName}</p>
										{#if expanded}
											{#if showContactEmail}
												<p class="z-reader-meta mt-0.5 truncate">{contact.email}</p>
											{/if}
											{#if deliveredTo}
												<p class="z-reader-delivered-to mt-0.5 truncate" title="{deliveredTo.prefix} {deliveredTo.addresses}">
													{deliveredTo.prefix} {deliveredTo.addresses}
												</p>
											{/if}
										{:else}
											<div class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
												{#if message.hasAttachment}
													<Paperclip class="size-3.5 shrink-0" aria-hidden="true" />
												{/if}
												{#if message.preview.trim()}
													<span class="truncate">{message.preview}</span>
												{/if}
											</div>
										{/if}
									</div>
									<time class="z-reader-chrome__time shrink-0 tabular-nums" datetime={message.receivedAt}>
										{formatMessageListWhen(message.receivedAt, expanded, settings.timeFormat)}
									</time>
								</div>
							</Collapsible.Trigger>

							{#if expanded}
								<div class="shrink-0">
									<ThreadMessageActions {message} {thread} menuId={`thread-msg-actions-${message.id}`} />
								</div>
							{/if}
						</div>

						<Collapsible.Content>
							<div class="px-4" style="padding-bottom: var(--z-space-reader-content);">
								{@render threadBody(message)}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}
			{/each}
		</div>
	</div>
	</div>

</article>
