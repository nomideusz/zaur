<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Shield from '$lib/components/icons/Shield.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { readerPrimaryContact, shouldShowContactEmail } from '$lib/mail/reader-contact';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { importantRainbow } from '$lib/mail/important-rainbow.svelte';
	import { shouldPresentImportantColors } from '$lib/mail/mailboxes';
	import { formatMessageListWhen } from '$lib/utils/dates';
	import { createImportantRainbowTouchPick } from '$lib/mail/important-rainbow-touch';
	import { mailListBackHref } from '$lib/mail/routes';
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
	const listHref = $derived.by(() => {
		const returnTo = $page.url.searchParams.get('returnTo');
		if (returnTo?.startsWith('/mail/search')) return returnTo;
		return mailListBackHref(mailboxRouteId);
	});
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
	let readerSamplingRainbow = false;

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

		if (readerSamplingRainbow) {
			readerSamplingRainbow = false;
			if (settings.reduceMotion || !hasPreciseHover() || !subjectImportant || !subjectMessageId || !readerSubjectEl) {
				return;
			}
			if (!shouldPersistReaderRainbowPick(event)) return;
			importantRainbow.pickFromElement(readerSubjectEl, subjectMessageId);
		} else {
			// Restore saved color visual
			if (subjectMessageId && readerSubjectEl) {
				importantRainbow.resetFromElement(readerSubjectEl, subjectMessageId);
			}
		}
	}

	function startReaderRainbowSample() {
		if (settings.reduceMotion || !hasPreciseHover() || !subjectImportant || !subjectMessageId || !readerSubjectEl) {
			return;
		}
		if (readerRainbowTimeout) clearTimeout(readerRainbowTimeout);
		readerSamplingRainbow = false;

		readerRainbowTimeout = setTimeout(() => {
			if (!readerSubjectEl || !subjectMessageId) return;
			readerSamplingRainbow = true;
			importantRainbow.startHoverSample(readerSubjectEl, subjectMessageId);
		}, 300);
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
	class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: message-reader;"
>
	<div class="z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<header class="z-reader-header flex shrink-0 items-center gap-2 border-b border-border/80 px-4 py-2.5 min-w-0">
		<a
			href={listHref}
			class="z-btn-icon min-h-10 min-w-10 shrink-0 p-2.5 text-fg-muted no-underline transition-colors hover:text-fg md:hidden"
			aria-label="Back to list"
		>
			<ArrowLeft class="size-5" aria-hidden="true" />
		</a>
		<h1
			bind:this={readerSubjectEl}
			class={cn(
				'z-type-reader-title min-w-0 flex-1 truncate',
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
		class="z-pane-scroll z-pane-scroll--mobile-reader min-h-0 flex-1 overflow-y-auto"
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
				<a href="/settings/appearance" class="z-mail-external-banner__action">Settings</a>
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
								</div>
								{#if thread.length > 1}
									<button
										type="button"
										class="z-reader-chrome__time shrink-0 text-right hover:text-fg"
										onclick={() => toggleMessage(message)}
									>
										<time datetime={message.receivedAt}>
											{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
										</time>
									</button>
								{:else}
									<time class="z-reader-chrome__time shrink-0 tabular-nums" datetime={message.receivedAt}>
										{formatMessageListWhen(message.receivedAt, true, settings.timeFormat)}
									</time>
								{/if}
							</div>

							<div class="z-reader-body mt-4">
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
							class="z-reader-thread-toggle flex w-full px-4 text-left transition-colors hover:bg-surface-sunken/60"
							style="padding-block: var(--z-space-reader-content-compact);"
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
	</div>

</article>
