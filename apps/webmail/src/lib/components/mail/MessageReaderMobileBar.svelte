<script lang="ts">
	import { goto } from '$app/navigation';
	import Archive from '$lib/components/icons/Archive.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { page } from '$app/stores';
	import { mailListHref, INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		thread: MessageDetail[];
		mailboxRouteId: string;
		onMoved?: () => void;
		/** Fewer primary mobile actions when reading with adaptive focus. */
		minimalChrome?: boolean;
		quickReply?: string;
		quickReplyOpen?: boolean;
		quickReplySending?: boolean;
		onSendQuickReply?: () => void;
	}

	let {
		thread,
		mailboxRouteId,
		onMoved,
		minimalChrome = false,
		quickReply = $bindable(''),
		quickReplyOpen = $bindable(false),
		quickReplySending = false,
		onSendQuickReply
	}: Props = $props();

	let quickReplyInput = $state<HTMLTextAreaElement | null>(null);

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const primaryReplyLabel = $derived(
		settings.defaultReplyMode === 'reply-all' ? 'Reply all' : 'Reply'
	);
	const showQuickReplyPanel = $derived(
		!isDraft && settings.showQuickReply && quickReplyOpen && !!auth.client
	);
	const showMobileBar = $derived(
		!!latest &&
			!mail.hasSelection &&
			(isDraft || showQuickReplyPanel || (canArchive && !minimalChrome && !isDraft))
	);

	$effect(() => {
		if (!quickReplyOpen) return;
		requestAnimationFrame(() => {
			quickReplyInput?.focus();
			quickReplyInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
	});

	async function withClient(action: (client: NonNullable<typeof auth.client>) => Promise<void>) {
		if (!auth.client || !actionMessage) return;
		try {
			await action(auth.client);
			onMoved?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Action failed';
			toast.show(message, 'error');
		}
	}

	async function sendDraft() {
		if (!auth.client || !auth.username || !latest) return;

		compose.openDraft(latest);
		const senderName = settings.resolvedDisplayName(auth.displayName ?? auth.username);
		const destination = settings.returnToInboxAfterSend
			? mailListHref(INBOX_MAILBOX_ROUTE_ID)
			: mailListHref('sent');
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

	function archiveMessage() {
		if (!actionMessage) return;
		void withClient((client) => mail.moveMessage(client, actionMessage, 'archive'));
	}

	function closeQuickReply() {
		quickReplyOpen = false;
	}

	function openFullReply() {
		if (!latest) return;
		if (settings.defaultReplyMode === 'reply-all') {
			if (!auth.username) return;
			compose.startReplyAll(latest, thread, auth.username);
			goto('/mail/compose?mode=reply-all');
		} else {
			compose.startReply(latest);
			goto('/mail/compose?mode=reply');
		}
	}

	function onQuickReplyKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeQuickReply();
			return;
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			onSendQuickReply?.();
		}
	}
</script>

{#if showMobileBar}
	<div class="z-mobile-reader-bar md:hidden">
		{#if showQuickReplyPanel}
			<div class="z-mobile-reader-bar__compose">
				<div class="z-mobile-reader-bar__compose-head">
					<span class="text-sm font-medium text-fg">{primaryReplyLabel}</span>
					<IconButton label="Close quick reply" class="!min-h-8 !min-w-8" onclick={closeQuickReply}>
						<X class="size-4" aria-hidden="true" />
					</IconButton>
				</div>
				<textarea
					bind:this={quickReplyInput}
					class="z-input z-compose-editor min-h-[4.5rem] w-full resize-none py-2.5 leading-relaxed"
					rows={3}
					placeholder="Write your reply…"
					aria-label="Quick reply"
					bind:value={quickReply}
					disabled={quickReplySending}
					onkeydown={onQuickReplyKeydown}
					onfocus={() => quickReplyInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
				></textarea>
				<div class="flex items-center gap-2">
					<Button
						class="min-h-11 flex-1"
						disabled={!quickReply.trim() || quickReplySending}
						onclick={() => onSendQuickReply?.()}
					>
						{quickReplySending ? 'Sending…' : 'Send'}
					</Button>
					<Button variant="ghost" class="min-h-11 shrink-0" onclick={openFullReply}>Full reply</Button>
				</div>
			</div>
		{/if}

		<div class="z-mobile-reader-bar__actions">
			{#if isDraft}
				<Button class="min-h-11 w-full" onclick={() => void sendDraft()}>
					<Send class="size-4" aria-hidden="true" />
					Send
				</Button>
			{:else if showQuickReplyPanel}
				<Button variant="ghost" class="min-h-11 flex-1" onclick={closeQuickReply}>Done</Button>
			{:else if canArchive && !minimalChrome}
				<IconButton
					label="Archive"
					class={cn('z-mobile-reader-bar__icon-btn', 'text-fg')}
					onclick={archiveMessage}
				>
					<Archive class="size-5" aria-hidden="true" />
				</IconButton>
			{/if}
		</div>
	</div>
{/if}
