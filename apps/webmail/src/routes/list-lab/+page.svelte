<script lang="ts">
	// Dev-only fixture mounting the real MessageList with mock messages — no auth.
	// The toggle button enters/leaves bulk-select deterministically; long press on
	// a row exercises the real gesture path. Cursor buttons drive listCursorId for
	// keyboard-triage visuals without opening threads.
	//
	// Dates are newest-first after collapseMessagesByThread sorts — put the
	// geometry fixture (long subject + icons) on the newest message.
	import { onMount } from 'svelte';
	import MessageList from '$lib/components/mail/MessageList.svelte';
	import { nextScrubSelection } from '$lib/mail/scrub-select';
	import { mail } from '$lib/stores/mail.svelte';
	import type { Mailbox, MessagePreview } from '$lib/types/mail';

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
		msg(1, { subject: 'Older normal message' }),
		msg(2, { subject: 'Short subject' }),
		msg(3, {
			hasAttachment: true,
			unread: true,
			important: true,
			subject: 'Invoice attached for March services'
		}),
		msg(4, { unread: true, subject: 'Quick question about the roadmap' }),
		msg(5, {
			unread: true,
			hasAttachment: true,
			replied: true,
			subject:
				'A very long subject line that should wrap to two lines on phones before ellipsis, without overflowing the row'
		})
	];

	const labMailboxes: Mailbox[] = [
		{ id: 'inbox', jmapId: 'jmap-inbox', name: 'Inbox', role: 'inbox', unread: 3, total: 5 },
		{ id: 'archive', jmapId: 'jmap-archive', name: 'Archive', role: 'archive', unread: 0, total: 0 },
		{ id: 'junk', jmapId: 'jmap-junk', name: 'Spam', role: 'junk', unread: 0, total: 0 },
		{ id: 'trash', jmapId: 'jmap-trash', name: 'Trash', role: 'trash', unread: 0, total: 0 }
	];

	onMount(() => {
		mail.mailboxes = labMailboxes;
		mail.currentMailboxRouteId = 'inbox';
		return () => {
			mail.mailboxes = [];
			mail.currentMailboxRouteId = null;
			mail.clearSelection();
		};
	});

	/** Deterministic scrub path for e2e — adds m4 then m3 after a seed selection. */
	function simulateScrub() {
		if (!mail.hasSelection) mail.startSelection('m5');
		const ordered = mail.selectionList.map((message) => message.id);
		for (const id of ['m4', 'm3']) {
			const next = nextScrubSelection(ordered, mail.selectedMessageIds, id, 'add');
			if (!mail.selectedMessageIds.has(id) && next.has(id)) {
				mail.toggleMessageSelection(id);
			}
		}
	}
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
			onclick={() => (mail.hasSelection ? mail.clearSelection() : mail.startSelection('m5'))}
		>
			Toggle selection
		</button>
		<button
			type="button"
			data-testid="simulate-scrub"
			class="z-btn-ghost px-3 py-2 text-sm"
			onclick={simulateScrub}
		>
			Simulate scrub
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
		<span data-testid="selection-count" class="text-xs text-fg-muted tabular-nums">
			sel:{mail.selectedMessageIds.size}
		</span>
	</div>
	<MessageList {messages} mailboxName="Inbox" mailboxRouteId="inbox" />
</div>
