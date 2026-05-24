<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Archive,
		ArrowLeft,
		ChevronDown,
		ChevronUp,
		Forward,
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

	const senderName = $derived(settings.resolvedDisplayName(auth.displayName ?? auth.username));

	const latest = $derived(thread.at(-1));
	const subject = $derived(latest?.subject ?? '(no subject)');
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

	function toggleStar() {
		if (!auth.client || !latest) return;
		void mail.toggleStar(auth.client, latest);
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

<article class="flex flex-1 flex-col overflow-hidden bg-surface-raised" style="view-transition-name: message-reader;">
	<header class="border-b border-border px-6 py-4">
		<div class="mb-3 flex items-center gap-2 md:hidden">
			{#if onBack}
				<IconButton label="Back to list" onclick={onBack}>
					<ArrowLeft class="size-4" />
				</IconButton>
			{/if}
		</div>

		<h1 class="text-xl font-semibold leading-snug text-fg">{subject}</h1>

		{#if thread.length > 1}
			<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
				<span>{thread.length} messages</span>
				{#if collapsedCount > 0}
					<button type="button" class="text-accent hover:underline" onclick={expandAll}>
						Expand all
					</button>
				{:else if thread.length > 1}
					<button type="button" class="text-accent hover:underline" onclick={collapseToLatest}>
						Collapse earlier
					</button>
				{/if}
			</div>
		{/if}

		<div class="mt-3 flex flex-wrap items-center justify-end gap-1">
			<IconButton label={latest?.starred ? 'Unstar' : 'Star'} onclick={toggleStar}>
				<Star
					class={cn('size-4', latest?.starred && 'fill-star text-star')}
					aria-hidden="true"
				/>
			</IconButton>
			<IconButton label="Reply" onclick={reply}>
				<Reply class="size-4" />
			</IconButton>
			<IconButton label="Reply all" onclick={replyAll}>
				<ReplyAll class="size-4" />
			</IconButton>
			<IconButton label="Forward" onclick={forward}>
				<Forward class="size-4" />
			</IconButton>
			<IconButton
				label="Archive"
				onclick={() => latest && withClient((client) => mail.moveMessage(client, latest, 'archive'))}
			>
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
			<IconButton
				label="Delete"
				onclick={() =>
					latest &&
					withClient((client) => mail.deleteMessage(client, latest, mailboxRouteId))}
			>
				<Trash2 class="size-4" />
			</IconButton>
		</div>
	</header>

	{#if hasBlockedExternal && !allowExternal}
		<div class="flex items-center gap-2 border-b border-border bg-surface px-6 py-2 text-xs text-fg-muted">
			<Shield class="size-3.5 shrink-0" aria-hidden="true" />
			External images blocked ·
			<button type="button" class="text-accent hover:underline" onclick={() => (showImagesOnce = true)}>
				Show images once
			</button>
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto">
		{#each thread as message, index (message.id)}
			<section class={cn(index > 0 && 'border-t border-border')}>
				{#if isExpanded(message)}
					<div class="px-6 py-5">
						<div class="mb-4 flex flex-wrap items-start gap-3">
							<Avatar name={message.from.name} email={message.from.email} class="size-9 text-sm" />
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<div class="min-w-0 text-sm">
										<p class="font-medium text-fg">{message.from.name}</p>
										<p class="text-fg-muted">{message.from.email}</p>
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
				{:else}
					<button
						type="button"
						class="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-surface-sunken/70"
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
		<footer class="shrink-0 border-t border-border bg-surface/80 px-6 py-4">
			<div class="mx-auto flex max-w-(--z-reader-measure) gap-2">
				<textarea
					class="z-input min-h-10 flex-1 resize-none py-2 text-sm leading-relaxed"
					rows="2"
					placeholder="Write a quick reply…"
					bind:value={quickReply}
					disabled={quickReplySending}
					onkeydown={onQuickReplyKeydown}
				></textarea>
				<div class="flex shrink-0 flex-col gap-1">
					<Button disabled={!quickReply.trim() || quickReplySending} onclick={sendQuickReply}>
						{quickReplySending ? 'Sending…' : 'Send'}
					</Button>
					<Button variant="ghost" class="!px-2 text-xs" onclick={reply}>Full reply</Button>
				</div>
			</div>
		</footer>
	{/if}
</article>
