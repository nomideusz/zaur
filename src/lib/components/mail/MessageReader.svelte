<script lang="ts">
	import { goto } from '$app/navigation';
	import { ChevronDown, ChevronUp, Shield } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { MAIL_PANE_CTX, type MailPaneContext } from '$lib/components/mail/mail-pane-context';
	import { getContext } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { renderMessageBody } from '$lib/email/html';
	import { recordContact } from '$lib/utils/contact-index';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
	}

	let { thread, mailboxRouteId, onMoved }: Props = $props();

	const pane = getContext<MailPaneContext | undefined>(MAIL_PANE_CTX);

	let localShowImagesOnce = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let quickReply = $state('');
	let quickReplySending = $state(false);

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));

	const latest = $derived(thread.at(-1));
	const subject = $derived(latest?.subject ?? '(no subject)');
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
		settings.compactCollapsedThreads || settings.compactReaderBody
			? 'px-4 md:px-5'
			: 'px-4 md:px-6'
	);

	$effect(() => {
		thread.map((m) => m.id).join(',');
		settings.expandAllThreadMessages;
		if (pane) pane.setShowImagesOnce(false);
		else localShowImagesOnce = false;
		if (settings.expandAllThreadMessages) {
			expandedIds = new Set(thread.map((message) => message.id));
		} else {
			const latestId = thread.at(-1)?.id;
			expandedIds = latestId ? new Set([latestId]) : new Set();
		}
	});

	function formatWhen(iso: string) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(iso));
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

	function saveContact(message: MessageDetail) {
		const accountId = auth.client?.getAccountId();
		if (!accountId) return;
		recordContact(accountId, message.from.name, message.from.email);
		toast.show(`${message.from.name} added to contacts`, 'success');
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
						void mail.loadMessage(auth.client!, mailboxRouteId, latest.threadId);
					} else if (outcome === 'queued') {
						toast.show('Reply queued — will send when back online', 'info');
					}
				}
			});
			if (result === 'sent') {
				quickReply = '';
				void mail.loadMessage(auth.client, mailboxRouteId, latest.threadId);
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
	class="z-mail-pane-surface min-h-0 flex-1 overflow-hidden"
	style="view-transition-name: message-reader;"
>
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

	<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
		<div
			class={cn(
				threadRowX,
				settings.compactReaderHeader ? 'pb-2 pt-3' : 'pb-3 pt-4',
				!settings.hideReaderPaneBorders && 'border-b border-border'
			)}
		>
			<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
				<div class="min-w-0 max-w-(--z-reader-measure) flex-1">
					<h1
						class={cn(
							'z-type-reader-title',
							settings.compactReaderHeader ? 'text-base md:text-lg' : 'text-lg md:text-xl'
						)}
					>
						{subject}
					</h1>

					{#if thread.length > 1 && !settings.hideThreadSummary}
						<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
							<span>{thread.length} messages</span>
							{#if collapsedCount > 0}
								<button type="button" class="text-accent hover:underline" onclick={expandAll}>
									Expand all
								</button>
							{:else}
								<button type="button" class="text-accent hover:underline" onclick={collapseToLatest}>
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
						class="hidden shrink-0 md:flex"
					/>
				{/if}
			</div>
		</div>

		{#each thread as message, index (message.id)}
			<section class={cn(index > 0 && !settings.hideReaderPaneBorders && 'border-t border-border/70')}>
				{#if isExpanded(message)}
					<div class={cn(threadRowX, settings.compactReaderBody ? 'py-3' : 'py-5')}>
						<div class="mb-4 flex items-start gap-3 max-sm:flex-wrap">
							{#if settings.showAvatars}
								<Avatar
									name={message.from.name}
									email={message.from.email}
									class={cn(settings.compactReaderAvatars ? 'size-8 text-xs' : 'size-9 text-sm')}
								/>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-fg">{message.from.name}</p>
								{#if !settings.hideReaderSenderEmail}
									<button
										type="button"
										class="text-left text-sm text-fg-muted hover:text-accent hover:underline"
										onclick={() => composeTo(message.from.email)}
									>
										{message.from.email}
									</button>
								{/if}
								{#if settings.showReaderContactActions}
									<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
										<button
											type="button"
											class="text-xs text-accent hover:underline"
											onclick={() => saveContact(message)}
										>
											Save contact
										</button>
										<button
											type="button"
											class="text-xs text-fg-subtle hover:text-accent hover:underline"
											onclick={() => copyEmail(message.from.email)}
										>
											Copy email
										</button>
									</div>
								{/if}
								{#if !settings.hideReaderRecipients && message.to.length}
									<p class="mt-1 text-xs text-fg-subtle">
										To {message.to.map((addr) => addr.name || addr.email).join(', ')}
									</p>
								{/if}
								{#if !settings.hideReaderRecipients && message.cc.length}
									<p class="mt-0.5 text-xs text-fg-subtle">
										Cc {message.cc.map((addr) => addr.name || addr.email).join(', ')}
									</p>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-2 self-start max-sm:ml-11 max-sm:w-[calc(100%-2.75rem)] max-sm:justify-between">
								{#if !settings.hideReaderTimestamps}
									<span class="whitespace-nowrap text-xs text-fg-subtle">{formatWhen(message.receivedAt)}</span>
								{/if}
								{#if thread.length > 1 && !settings.hideThreadCollapseButtons}
									<button
										type="button"
										class="flex size-4 shrink-0 items-center justify-center rounded text-fg-subtle hover:bg-surface-sunken hover:text-fg"
										aria-label="Collapse message"
										onclick={() => toggleMessage(message)}
									>
										<ChevronUp class="size-4" />
									</button>
								{/if}
							</div>
						</div>

						<div class="w-full max-w-(--z-reader-measure)">
						{#if message.attachments.length}
							<MessageAttachments attachments={message.attachments} />
						{/if}

						<MessageBody
							bodyHtml={message.bodyHtml}
							bodyText={message.bodyText}
							{allowExternal}
						/>
						</div>
					</div>
				{:else}
					<button
						type="button"
						class={cn(
							'flex w-full items-center gap-3 text-left transition-colors hover:bg-surface-sunken/70 max-sm:items-start',
							threadRowX,
							settings.compactCollapsedThreads ? 'py-2' : 'py-3'
						)}
						onclick={() => toggleMessage(message)}
					>
						{#if settings.showAvatars}
							<Avatar
								name={message.from.name}
								email={message.from.email}
								class={cn(settings.compactReaderAvatars ? 'size-7' : 'size-8')}
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<p class={cn('truncate', settings.compactCollapsedThreads ? 'text-xs' : 'text-sm')}>
								<span class="font-medium text-fg">{message.from.name}</span>
								{#if !settings.hideCollapsedThreadPreviews}
									<span class="ml-2 text-fg-muted">{message.preview || message.bodyText.slice(0, 120)}</span>
								{/if}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2 max-sm:flex-col max-sm:items-end max-sm:gap-1">
							{#if !settings.hideReaderTimestamps}
								<span class="whitespace-nowrap text-xs text-fg-subtle">{formatWhen(message.receivedAt)}</span>
							{/if}
							{#if thread.length > 1 && !settings.hideThreadCollapseButtons}
								<ChevronDown class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
							{/if}
						</div>
					</button>
				{/if}
			</section>
		{/each}
	</div>

	{#if latest && auth.client && settings.showQuickReply && mailboxRouteId !== 'drafts'}
		<footer class={cn('shrink-0 bg-surface/80 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6', !settings.hideReaderPaneBorders && 'border-t border-border/80', settings.compactQuickReply ? 'py-2.5' : 'py-4')}>
			<div class="flex w-full max-w-(--z-reader-measure) flex-col gap-2 sm:flex-row">
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
</article>
