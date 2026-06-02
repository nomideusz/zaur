<script lang="ts">
	import Archive from '$lib/components/icons/Archive.svelte';
	import Send from '$lib/components/icons/Send.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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
	}

	let { thread, mailboxRouteId, onMoved, minimalChrome = false }: Props = $props();

	const latest = $derived(thread.at(-1));
	const actionMessage = $derived(
		threadActionMessage(thread, $page.url.searchParams.get('messageId'), mail.messages)
	);
	const isDraft = $derived(mailboxRouteId === 'drafts');
	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const canArchive = $derived(mail.canArchiveFrom(currentMailbox));
	const showMobileBar = $derived(
		!!latest &&
			!mail.hasSelection &&
			(isDraft || (canArchive && !minimalChrome && !isDraft))
	);

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

	function archiveMessage() {
		if (!actionMessage) return;
		void withClient((client) => mail.moveMessage(client, actionMessage, 'archive'));
	}
</script>

{#if showMobileBar}
	<div class="z-mobile-reader-bar md:hidden">
		<div class="z-mobile-reader-bar__actions">
			{#if isDraft}
				<Button class="min-h-11 w-full" onclick={() => void sendDraft()}>
					<Send class="size-4" aria-hidden="true" />
					Send
				</Button>
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
