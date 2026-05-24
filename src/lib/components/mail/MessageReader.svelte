<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Archive,
		ArrowLeft,
		ChevronDown,
		ChevronUp,
		Forward,
		Mail,
		MailOpen,
		MoreHorizontal,
		Reply,
		ReplyAll,
		Shield,
		Star,
		Trash2
	} from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MessageBody from '$lib/components/mail/MessageBody.svelte';
	import MessageAttachments from '$lib/components/mail/MessageAttachments.svelte';
	import MoveToMenu from '$lib/components/mail/MoveToMenu.svelte';
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
		onBack?: () => void;
		onMoved?: () => void;
	}

	let { thread, mailboxRouteId, onBack, onMoved }: Props = $props();

	let showImagesOnce = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let quickReply = $state('');
	let quickReplySending = $state(false);
	let moreOpen = $state(false);

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));

	const latest = $derived(thread.at(-1));
	const subject = $derived(latest?.subject ?? '(no subject)');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const allowExternal = $derived(!settings.blockExternalContent || showImagesOnce);
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

	$effect(() => {
		thread.map((m) => m.id).join(',');
		showImagesOnce = false;
		const latestId = thread.at(-1)?.id;
		expandedIds = latestId ? new Set([latestId]) : new Set();
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

	async function withClient(action: (client: NonNullable<typeof auth.client>) => Promise<void>) {
		if (!auth.client || !latest) return;
		try {
			await action(auth.client);
			onMoved?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Action failed';
			toast.show(message, 'error');
		}
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

	function archiveMessage() {
		moreOpen = false;
		if (!latest) return;
		void withClient((client) => mail.moveMessage(client, latest, 'archive'));
	}

	function deleteMessage() {
		moreOpen = false;
		if (!latest) return;
		if (currentMailbox?.role === 'trash') {
			const count = 1;
			if (!confirm(`Permanently delete ${count === 1 ? 'this message' : `${count} messages`}? This cannot be undone.`)) {
				return;
			}
		}
		void withClient((client) => mail.deleteMessage(client, latest, mailboxRouteId));
	}

	function moveMessage(targetRouteId: string) {
		moreOpen = false;
		if (!auth.client || !latest) return;
		void withClient((client) => mail.moveMessageToMailbox(client, latest, targetRouteId));
	}

	function toggleStar() {
		if (!auth.client || !latest) return;
		void mail.toggleStar(auth.client, latest);
	}

	function composeTo(email: string) {
		goto(`/mail/compose?to=${encodeURIComponent(email)}`);
	}

	function toggleLatestRead() {
		if (!auth.client || !latest) return;
		void mail.markAsRead(auth.client, latest, latest.unread);
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
			const result = await compose.send(auth.client, auth.username, senderName);
			if (result === 'sent') {
				quickReply = '';
				toast.show('Reply sent', 'success');
				void mail.loadMessage(auth.client, mailboxRouteId, latest.threadId);
			} else if (result === 'queued') {
				quickReply = '';
				toast.show('Reply queued — will send when back online', 'info');
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

<svelte:window onclick={() => (moreOpen = false)} />

<article class="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-raised" style="view-transition-name: message-reader;">
	<header class="shrink-0 border-b border-border px-4 py-3 md:px-6">
		<div class="flex items-start gap-2">
			{#if onBack}
				<IconButton label="Back to list" class="mt-0.5 md:hidden" onclick={onBack}>
					<ArrowLeft class="size-4" />
				</IconButton>
			{/if}

			<div class="min-w-0 flex-1">
				<div class="max-w-(--z-reader-measure)">
				<h1 class="line-clamp-2 text-lg font-semibold leading-snug text-fg md:text-xl">{subject}</h1>

				{#if thread.length > 1}
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
			</div>

			<div class="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
				<IconButton label={latest?.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
					<Star
						class={cn('size-4', latest?.starred && 'fill-star text-star')}
						aria-hidden="true"
					/>
				</IconButton>
				{#if latest}
					<IconButton
						label={latest.unread ? 'Mark as read' : 'Mark as unread'}
						onclick={toggleLatestRead}
					>
						{#if latest.unread}
							<MailOpen class="size-4" />
						{:else}
							<Mail class="size-4" />
						{/if}
					</IconButton>
				{/if}
				<IconButton label="Reply" onclick={reply}>
					<Reply class="size-4" />
				</IconButton>
				<IconButton label="Reply all" onclick={replyAll}>
					<ReplyAll class="size-4" />
				</IconButton>
				<IconButton label="Forward" onclick={forward}>
					<Forward class="size-4" />
				</IconButton>

				<div class="hidden items-center gap-0.5 md:flex">
					<IconButton label="Archive" onclick={archiveMessage}>
						<Archive class="size-4" />
					</IconButton>
					{#if latest && auth.client}
						<MoveToMenu
							message={latest}
							currentMailboxRouteId={mailboxRouteId}
							client={auth.client}
							{onMoved}
						/>
					{/if}
					<IconButton label={deleteLabel} onclick={deleteMessage}>
						<Trash2 class="size-4" />
					</IconButton>
				</div>

				<div class="relative md:hidden">
					<IconButton
						label="More actions"
						onclick={(e) => {
							e.stopPropagation();
							moreOpen = !moreOpen;
						}}
					>
						<MoreHorizontal class="size-4" />
					</IconButton>

					{#if moreOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-md"
							onpointerdown={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-surface-sunken"
								onclick={() => {
									moreOpen = false;
									toggleLatestRead();
								}}
							>
								{#if latest?.unread}
									<MailOpen class="size-4 shrink-0" aria-hidden="true" />
									Mark as read
								{:else}
									<Mail class="size-4 shrink-0" aria-hidden="true" />
									Mark as unread
								{/if}
							</button>
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-surface-sunken"
								onclick={archiveMessage}
							>
								<Archive class="size-4 shrink-0" aria-hidden="true" />
								Archive
							</button>
							{#if moveTargets.length}
								<p class="px-3 py-1.5 text-xs font-medium text-fg-subtle">Move to</p>
								{#each moveTargets as mailbox (mailbox.id)}
									<button
										type="button"
										class="block w-full truncate px-3 py-2 text-left text-sm text-fg hover:bg-surface-sunken"
										onclick={() => moveMessage(mailbox.id)}
									>
										{mailbox.name}
									</button>
								{/each}
							{/if}
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-sunken"
								onclick={deleteMessage}
							>
								<Trash2 class="size-4 shrink-0" aria-hidden="true" />
								{deleteLabel}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

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

	{#if hasBlockedExternal && !allowExternal}
		<div class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-surface px-4 py-2 text-xs text-fg-muted md:px-6">
			<Shield class="size-3.5 shrink-0" aria-hidden="true" />
			<span>External images blocked.</span>
			<button type="button" class="text-accent hover:underline" onclick={() => (showImagesOnce = true)}>
				Show once
			</button>
			<span class="text-fg-subtle">·</span>
			<a href="/settings/display" class="text-accent hover:underline">Display settings</a>
		</div>
	{/if}

	<div class="min-h-0 flex-1 overflow-y-auto">
		{#each thread as message, index (message.id)}
			<section class={cn(index > 0 && 'border-t border-border')}>
				{#if isExpanded(message)}
					<div class="px-4 py-5 md:px-6">
						<div class="w-full max-w-(--z-reader-measure)">
						<div class="mb-4 flex flex-wrap items-start gap-3">
							<Avatar name={message.from.name} email={message.from.email} class="size-9 text-sm" />
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<div class="min-w-0 text-sm">
										<p class="font-medium text-fg">{message.from.name}</p>
										<button
											type="button"
											class="text-left text-fg-muted hover:text-accent hover:underline"
											onclick={() => composeTo(message.from.email)}
										>
											{message.from.email}
										</button>
										<button
											type="button"
											class="mt-1 text-xs text-accent hover:underline"
											onclick={() => saveContact(message)}
										>
											Save contact
										</button>
										<button
											type="button"
											class="mt-1 ml-3 text-xs text-fg-subtle hover:text-accent hover:underline"
											onclick={() => copyEmail(message.from.email)}
										>
											Copy email
										</button>
									</div>
									<div class="flex items-center gap-2">
										<p class="text-xs text-fg-subtle">{formatWhen(message.receivedAt)}</p>
										{#if thread.length > 1}
											<button
												type="button"
												class="rounded p-1 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
												aria-label="Collapse message"
												onclick={() => toggleMessage(message)}
											>
												<ChevronUp class="size-4" />
											</button>
										{/if}
									</div>
								</div>
								{#if message.to.length}
									<p class="mt-1 text-xs text-fg-subtle">
										To {message.to.map((addr) => addr.name || addr.email).join(', ')}
									</p>
								{/if}
								{#if message.cc.length}
									<p class="mt-0.5 text-xs text-fg-subtle">
										Cc {message.cc.map((addr) => addr.name || addr.email).join(', ')}
									</p>
								{/if}
							</div>
						</div>

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
						class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-sunken/70 md:px-6"
						onclick={() => toggleMessage(message)}
					>
						<Avatar name={message.from.name} email={message.from.email} />
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">
								<span class="font-medium text-fg">{message.from.name}</span>
								<span class="ml-2 text-fg-muted">{message.preview || message.bodyText.slice(0, 120)}</span>
							</p>
						</div>
						<span class="shrink-0 text-xs text-fg-subtle">{formatWhen(message.receivedAt)}</span>
						<ChevronDown class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
					</button>
				{/if}
			</section>
		{/each}
	</div>

	{#if latest && auth.client}
		<footer class="shrink-0 border-t border-border bg-surface/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
			<div class="flex w-full max-w-(--z-reader-measure) gap-2">
				<textarea
					class="z-input min-h-10 flex-1 resize-none py-2 leading-relaxed"
					style="font-size: var(--z-reader-text)"
					rows="2"
					placeholder="Write a quick reply…"
					bind:value={quickReply}
					disabled={quickReplySending}
					onkeydown={onQuickReplyKeydown}
				></textarea>
				<div class="flex shrink-0 flex-col items-end gap-1">
					<Button disabled={!quickReply.trim() || quickReplySending} onclick={sendQuickReply}>
						{quickReplySending ? 'Sending…' : 'Send'}
					</Button>
					<span class="hidden text-xs text-fg-subtle sm:inline">Ctrl+Enter</span>
					<Button variant="ghost" class="!px-2 text-xs" onclick={reply}>Full reply</Button>
				</div>
			</div>
		</footer>
	{/if}
</article>
