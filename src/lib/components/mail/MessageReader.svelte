<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Archive,
		ArrowLeft,
		Forward,
		Reply,
		ReplyAll,
		Shield,
		Star,
		Trash2
	} from 'lucide-svelte';
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

	$effect(() => {
		thread.map((m) => m.id).join(',');
		showImagesOnce = false;
	});

	function formatWhen(iso: string) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(iso));
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
			<p class="mt-1 text-xs text-fg-subtle">{thread.length} messages</p>
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
			<section class={cn('px-6 py-5', index > 0 && 'border-t border-border')}>
				<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 text-sm">
						<p class="font-medium text-fg">{message.from.name}</p>
						<p class="text-fg-muted">{message.from.email}</p>
						{#if message.to.length}
							<p class="mt-1 text-xs text-fg-subtle">
								To {message.to.map((addr) => addr.name || addr.email).join(', ')}
							</p>
						{/if}
					</div>
					<p class="text-xs text-fg-subtle">{formatWhen(message.receivedAt)}</p>
				</div>

				{#if message.attachments.length}
					<MessageAttachments attachments={message.attachments} />
				{/if}

				<MessageBody
					bodyHtml={message.bodyHtml}
					bodyText={message.bodyText}
					{allowExternal}
				/>
			</section>
		{/each}
	</div>
</article>
