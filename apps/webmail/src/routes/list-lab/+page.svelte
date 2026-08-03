<script lang="ts">
	// Dev-only fixture mounting the real MessageList with mock messages — no auth.
	// The toggle button enters/leaves bulk-select deterministically; long press on
	// a row exercises the real gesture path. Cursor buttons drive listCursorId for
	// keyboard-triage visuals without opening threads.
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
		msg(3, {
			hasAttachment: true,
			unread: true,
			important: true,
			subject: 'Invoice attached for March services'
		}),
		msg(4, { unread: true, subject: 'Quick question about the roadmap' }),
		msg(5, { important: true, subject: 'Highlighted follow-up' })
	];

	$effect(() => {
		mail.setSelectionList(messages);
		mail.ensureListCursor(messages[0]?.id ?? null);
	});
</script>

<svelte:head>
	<title>list-lab</title>
</svelte:head>

<div class="z-mail-view flex h-dvh flex-col">
	<div class="flex flex-wrap items-center gap-2 px-2 py-1">
		<button
			type="button"
			data-testid="toggle-select"
			class="z-btn-ghost self-start px-3 py-2 text-sm"
			onclick={() => (mail.hasSelection ? mail.clearSelection() : mail.startSelection('m1'))}
		>
			Toggle selection
		</button>
		<button
			type="button"
			data-testid="cursor-next"
			class="z-btn-ghost px-3 py-2 text-sm"
			onclick={() => mail.moveListCursor(1)}
		>
			Cursor next
		</button>
		<button
			type="button"
			data-testid="cursor-prev"
			class="z-btn-ghost px-3 py-2 text-sm"
			onclick={() => mail.moveListCursor(-1)}
		>
			Cursor prev
		</button>
		<span data-testid="cursor-id" class="text-xs text-fg-muted tabular-nums">
			{mail.listCursorId ?? 'none'}
		</span>
	</div>
	<MessageList {messages} mailboxName="Inbox" mailboxRouteId="inbox" />
</div>
