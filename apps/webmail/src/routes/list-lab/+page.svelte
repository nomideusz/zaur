<script lang="ts">
	// Dev-only fixture mounting the real MessageList with mock messages — no auth.
	// The toggle button enters/leaves bulk-select deterministically; long press on
	// a row exercises the real gesture path.
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { MessagePreview } from '$lib/types/mail';

	const msg = (n: number, over: Partial<MessagePreview> = {}): MessagePreview => ({
		id: `m${n}`,
		threadId: `t${n}`,
		mailboxId: 'inbox',
		from: { name: `Sender ${n}`, email: `sender${n}@example.com` },
		subject: `Subject ${n}`,
		preview: '',
		receivedAt: new Date(Date.UTC(2026, 5, n, 9, 30)).toISOString(),
		unread: false,
		starred: false,
		important: false,
		hasAttachment: false,
		...over
	});

	const messages: MessagePreview[] = [
		msg(1, {
			unread: true,
			hasAttachment: true,
			replied: true,
			subject:
				'A very long subject line that should truncate with an ellipsis instead of wrapping onto a second line when the row narrows'
		}),
		msg(2, { subject: 'Short subject' }),
		msg(3, { hasAttachment: true, subject: 'Invoice attached for March services' })
	];
</script>

<svelte:head>
	<title>list-lab</title>
</svelte:head>

<div class="z-mail-view flex h-dvh flex-col">
	<button
		type="button"
		data-testid="toggle-select"
		class="z-btn-ghost self-start px-3 py-2 text-sm"
		onclick={() => (mail.hasSelection ? mail.clearSelection() : mail.startSelection('m1'))}
	>
		Toggle selection
	</button>
	<MessageList {messages} mailboxName="Inbox" mailboxRouteId="inbox" />
</div>
