<script lang="ts">
	import TopBar from '#lib/components/mail/TopBar.svelte';
	import Sidebar from '#lib/components/mail/Sidebar.svelte';
	import MailList from '#lib/components/mail/MailList.svelte';
	import Reader from '#lib/components/mail/Reader.svelte';
	import Splitter from '#lib/components/mail/Splitter.svelte';
	import StatusLine from '#lib/components/mail/StatusLine.svelte';
	import ComposePanel from '#lib/components/compose/ComposePanel.svelte';
	import ComposeDock from '#lib/components/compose/ComposeDock.svelte';
	import Toasts from '#lib/components/compose/Toasts.svelte';
	import { buildRowGroups } from '#lib/mail/rows';
	import { openingPosition, type AnchorRect } from '#lib/compose/layout';
	import { compose } from '#lib/compose/store.svelte.ts';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { MessageDetail, MessagePreview } from '@zaur/mail-core';

	let listWidth = $state(480);
	let sidebarOpen = $state(true);
	let activeCategories = $state<Set<string>>(new Set(['personal', 'work', 'team', 'finance']));
	let selectedMailboxId = $state<string>('inbox');
	let unseenOnly = $state(false);
	let openThreadId = $state<string | null>('t1');
	let cursorId = $state<string | null>('t1');
	let selection = $state<Set<string>>(new Set());
	let rootEl = $state<HTMLDivElement | null>(null);
	let rootW = $state(0);
	let rootH = $state(0);

	const mockMailboxes: MailboxDTO[] = [
		{ id: 'inbox', name: 'Inbox', kind: 'inbox', role: 'inbox', unread: 3, total: 18, primary: true },
		{ id: 'drafts', name: 'Drafts', kind: 'drafts', role: 'drafts', unread: 0, total: 2, primary: false },
		{ id: 'sent', name: 'Sent', kind: 'sent', role: 'sent', unread: 0, total: 34, primary: false },
		{ id: 'archive', name: 'Archive', kind: 'archive', role: 'archive', unread: 0, total: 128, primary: false },
		{ id: 'junk', name: 'Junk', kind: 'junk', role: 'junk', unread: 1, total: 1, primary: false },
		{ id: 'trash', name: 'Trash', kind: 'trash', role: 'trash', unread: 0, total: 4, primary: false }
	];

	const activeMailbox = $derived(
		mockMailboxes.find((m) => m.id === selectedMailboxId) ?? mockMailboxes[0]!
	);

	const now = new Date();
	const todayISO = (h: number, m: number) => {
		const d = new Date(now);
		d.setHours(h, m, 0, 0);
		return d.toISOString();
	};
	const yesterdayISO = (h: number, m: number) => {
		const d = new Date(now);
		d.setDate(d.getDate() - 1);
		d.setHours(h, m, 0, 0);
		return d.toISOString();
	};

	const mockMessagesPreview: MessagePreview[] = [
		{
			id: 'm1',
			threadId: 't1',
			mailboxId: 'inbox',
			from: { name: 'Annie Hobday', email: 'annie@hobday.design' },
			subject: 'Pick up daughter from football practice',
			preview: 'Hey! Are you still able to pick up Emily around 16:30 today? The coach just confirmed…',
			receivedAt: todayISO(9, 30),
			unread: true,
			starred: true,
			important: true,
			hasAttachment: false
		},
		{
			id: 'm2',
			threadId: 't2',
			mailboxId: 'inbox',
			from: { name: 'Anthony Hobday', email: 'anthony@hobday.design' },
			subject: 'Early May bank holiday schedule & family plans',
			preview: 'Sharing the draft plan for the long weekend. The weather looks promising so far…',
			receivedAt: todayISO(9, 0),
			unread: true,
			starred: false,
			important: true,
			hasAttachment: true
		},
		{
			id: 'm3',
			threadId: 't3',
			mailboxId: 'inbox',
			from: { name: 'Pet Care Services', email: 'team@petcare.co.uk' },
			subject: 'Pet care confirmation for next week',
			preview: 'Your booking for Milo has been confirmed. Please see the attached health checklist…',
			receivedAt: todayISO(8, 15),
			unread: false,
			starred: false,
			important: false,
			hasAttachment: true
		},
		{
			id: 'm4',
			threadId: 't4',
			mailboxId: 'inbox',
			from: { name: 'Work Project Alpha', email: 'updates@zaur.app' },
			subject: 'Pick up son from piano lesson at 11:00',
			preview: 'Quick reminder: piano teacher moved the recital slot to 11:00 AM on Saturday.',
			receivedAt: yesterdayISO(17, 45),
			unread: false,
			starred: true,
			important: false,
			hasAttachment: false
		},
		{
			id: 'm5',
			threadId: 't5',
			mailboxId: 'inbox',
			from: { name: 'UK Holidays Bulletin', email: 'calendar@gov.uk' },
			subject: 'Upcoming UK Public & Bank Holidays 2026',
			preview: 'Official announcement regarding statutory bank holidays and regional observances…',
			receivedAt: yesterdayISO(14, 20),
			unread: false,
			starred: false,
			important: false,
			hasAttachment: true
		}
	];

	const mockThreads: Record<string, MessageDetail[]> = {
		t1: [
			{
				id: 'm1-earlier',
				threadId: 't1',
				mailboxId: 'inbox',
				from: { name: 'Annie Hobday', email: 'annie@hobday.design' },
				to: [{ name: 'You', email: 'you@zaur.app' }],
				cc: [],
				bcc: [],
				subject: 'Pick up daughter from football practice',
				preview: 'Are we still on for the 16:30 session?',
				bodyText: 'Hey, just checking if you or I should pick up Emily after football practice today. Let me know!',
				bodyHtml: undefined,
				receivedAt: todayISO(8, 45),
				unread: false,
				starred: false,
				important: false,
				hasAttachment: false,
				attachments: []
			},
			{
				id: 'm1',
				threadId: 't1',
				mailboxId: 'inbox',
				from: { name: 'Annie Hobday', email: 'annie@hobday.design' },
				to: [{ name: 'You', email: 'you@zaur.app' }],
				cc: [{ name: 'Coach Mark', email: 'coach@footballclub.org' }],
				bcc: [],
				subject: 'Pick up daughter from football practice',
				preview: 'Hey! Are you still able to pick up Emily around 16:30 today? The coach just confirmed…',
				bodyText:
					'Hey! Are you still able to pick up Emily around 16:30 today?\n\nThe coach just confirmed they will finish right on the pitch at 16:30. She has her shin guards and water bottle in her sports bag.\n\nLet me know if that works or if you want me to do the afternoon run instead!',
				bodyHtml:
					'<p>Hey! Are you still able to pick up Emily around <strong>16:30</strong> today?</p><p>The coach just confirmed they will finish right on the pitch at 16:30. She has her shin guards and water bottle in her sports bag.</p><p>Let me know if that works or if you want me to do the afternoon run instead!</p>',
				receivedAt: todayISO(9, 30),
				unread: true,
				starred: true,
				important: true,
				hasAttachment: true,
				attachments: [
					{
						blobId: 'b1',
						name: 'Practice_Schedule_May.pdf',
						type: 'application/pdf',
						size: 245000
					}
				]
			}
		],
		t2: [
			{
				id: 'm2',
				threadId: 't2',
				mailboxId: 'inbox',
				from: { name: 'Anthony Hobday', email: 'anthony@hobday.design' },
				to: [{ name: 'You', email: 'you@zaur.app' }],
				cc: [],
				bcc: [],
				subject: 'Early May bank holiday schedule & family plans',
				preview: 'Sharing the draft plan for the long weekend. The weather looks promising so far…',
				bodyText:
					'Sharing the draft plan for the Early May bank holiday weekend.\n\nWe have Annie and Anthony coming over on Sunday, and Monday is open for outdoor walk if the weather stays dry.\n\nSee the itinerary attached!',
				bodyHtml:
					'<p>Sharing the draft plan for the <strong>Early May bank holiday</strong> weekend.</p><p>We have Annie and Anthony coming over on Sunday, and Monday is open for outdoor walk if the weather stays dry.</p><p>See the itinerary attached!</p>',
				receivedAt: todayISO(9, 0),
				unread: true,
				starred: false,
				important: true,
				hasAttachment: true,
				attachments: [
					{
						blobId: 'b2',
						name: 'Bank_Holiday_Plan.pdf',
						type: 'application/pdf',
						size: 142000
					},
					{
						blobId: 'b3',
						name: 'Trail_Map.png',
						type: 'image/png',
						size: 1250000
					}
				]
			}
		]
	};

	const filteredPreviews = $derived(
		unseenOnly ? mockMessagesPreview.filter((m) => m.unread) : mockMessagesPreview
	);

	const rowGroups = $derived(
		buildRowGroups(filteredPreviews, activeMailbox.kind, (email) => email === 'you@zaur.app')
	);

	const currentThread = $derived(openThreadId ? mockThreads[openThreadId] ?? null : null);

	$effect(() => {
		const el = rootEl;
		if (!el) return;
		rootW = el.clientWidth;
		rootH = el.clientHeight;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			rootW = entry.contentRect.width;
			rootH = entry.contentRect.height;
		});
		observer.observe(el);
		return () => observer.disconnect();
	});

	function openCompose() {
		const pos = openingPosition(
			{ left: 300, top: 60, right: 350, bottom: 90 },
			rootW,
			rootH,
			compose.openPanels().length
		);
		compose.newDraft(pos);
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function toggleCategory(catId: string) {
		const next = new Set(activeCategories);
		if (next.has(catId)) next.delete(catId);
		else next.add(catId);
		activeCategories = next;
	}

	function selectPrevMailbox() {
		const idx = mockMailboxes.findIndex((m) => m.id === selectedMailboxId);
		const prev = (idx - 1 + mockMailboxes.length) % mockMailboxes.length;
		selectedMailboxId = mockMailboxes[prev]!.id;
	}

	function selectNextMailbox() {
		const idx = mockMailboxes.findIndex((m) => m.id === selectedMailboxId);
		const next = (idx + 1) % mockMailboxes.length;
		selectedMailboxId = mockMailboxes[next]!.id;
	}
</script>

<svelte:head>
	<title>Prototype · Zaur Mail 2.0 (Anthony Hobday Inspiration)</title>
</svelte:head>

<!-- Desktop Frame Canvas matching Hobday portfolio presentation -->
<div class="flex h-svh w-screen flex-col items-center justify-center bg-[#ebeef2] p-2 sm:p-3 overflow-hidden text-slate-900">
	<div
		bind:this={rootEl}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-window"
	>
		<TopBar
			mailboxes={mockMailboxes}
			{activeMailbox}
			onSelectMailbox={(id) => {
				selectedMailboxId = id;
				cursorId = null;
			}}
			account={{ username: 'anthony@zaur.app', displayName: 'Anthony Hobday' }}
			{sidebarOpen}
			onToggleSidebar={toggleSidebar}
			onPrevMailbox={selectPrevMailbox}
			onNextMailbox={selectNextMailbox}
		/>

		<main
			class="grid min-h-0 flex-1"
			style:grid-template-columns={sidebarOpen
				? `240px ${listWidth}px 1px minmax(0, 1fr)`
				: `${listWidth}px 1px minmax(0, 1fr)`}
		>
			{#if sidebarOpen}
				<Sidebar
					mailboxes={mockMailboxes}
					activeMailboxId={selectedMailboxId}
					onSelectMailbox={(id) => {
						selectedMailboxId = id;
						cursorId = null;
					}}
					{activeCategories}
					onToggleCategory={toggleCategory}
					onNewMessage={openCompose}
				/>
			{/if}

			<MailList
				mailbox={activeMailbox}
				mailboxes={mockMailboxes}
				groups={rowGroups}
				onBulk={() => {}}
				loading={false}
				error={null}
				{unseenOnly}
				{cursorId}
				{selection}
				onToggleUnseenOnly={(value) => (unseenOnly = value)}
				onSetSelection={(ids) => (selection = ids)}
				onToggleSelect={(id) => {
					const next = new Set(selection);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					selection = next;
				}}
				onOpen={(id) => {
					openThreadId = id;
					cursorId = id;
				}}
				onRetry={() => {}}
				onNewMessage={openCompose}
			/>

			<Splitter width={listWidth} onResize={(w) => (listWidth = w)} onReset={() => (listWidth = 480)} />

			<Reader
				messages={currentThread ?? undefined}
				loading={false}
				error={null}
				onRetry={() => {}}
				onCompose={(mode, msg, anchor) => {
					openCompose();
				}}
			/>
		</main>

		{#each compose.drafts as draft (draft.id)}
			{#if draft.stage !== 'minimized'}
				<ComposePanel {draft} {rootW} {rootH} />
			{/if}
		{/each}
		<ComposeDock />

		<Toasts />

		<StatusLine
			mailboxName={activeMailbox.name}
			unseen={activeMailbox.unread}
			quota={{ used: 1200000000, limit: 10000000000 }}
		/>
	</div>
</div>
