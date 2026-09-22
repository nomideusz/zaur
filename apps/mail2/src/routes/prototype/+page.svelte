<script lang="ts">
	import TopBar from '#lib/components/mail/TopBar.svelte';
	import PhoneMailBar from '#lib/components/mail/PhoneMailBar.svelte';
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
	import { readerThread } from '#lib/mail/reader-thread.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';
	import type { MailboxDTO } from '#lib/mail/types';
	import type { MessageDetail, MessagePreview } from '@zaur/mail-core';
	import type { ListFilter } from '../mail.remote';

	let listWidth = $state(480);
	let sidebarOpen = $state(true);
	let drawerOpen = $state(false);
	let selectedMailboxId = $state<string>('inbox');
	let listFilter = $state<ListFilter>('all');
	let searchQuery = $state('');
	let topBar = $state<ReturnType<typeof TopBar> | null>(null);
	const reader = readerThread('t1');
	const openThreadId = $derived(reader.id);
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
			id: 'm1-earlier',
			threadId: 't1',
			mailboxId: 'inbox',
			from: { name: 'Annie Hobday', email: 'annie@hobday.design' },
			subject: 'Pick up daughter from football practice',
			preview: 'Are we still on for the 16:30 session?',
			receivedAt: todayISO(8, 45),
			unread: false,
			starred: false,
			important: false,
			hasAttachment: false
		},
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

	// Search on the reference page is a naive contains — enough to drive the UI
	// without a server. The real thing parses operators in @zaur/mail-core.
	const filteredPreviews = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (q) {
			return mockMessagesPreview.filter((m) =>
				`${m.from.name} ${m.from.email} ${m.subject} ${m.preview}`.toLowerCase().includes(q)
			);
		}
		return listFilter === 'unseen' ? mockMessagesPreview.filter((m) => m.unread) : listFilter === 'flagged' ? mockMessagesPreview.filter((m) => m.starred) : mockMessagesPreview;
	});

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
		// Phone compose is a full-screen sheet — there is no window to place.
		if (viewport.phone) {
			compose.newDraft();
			return;
		}
		compose.newDraft(
			openingPosition(
				{ left: 300, top: 60, right: 350, bottom: 90 },
				rootW,
				rootH,
				compose.openPanels().length
			)
		);
	}

	function toggleSidebar() {
		if (viewport.compact) drawerOpen = !drawerOpen;
		else sidebarOpen = !sidebarOpen;
	}

	const sidebarVisible = $derived(viewport.compact ? drawerOpen : sidebarOpen);

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
<div class="z-screen flex w-full flex-col items-center justify-center overflow-hidden bg-[var(--z-ground)] text-[var(--z-ink)]">
	<div
		bind:this={rootEl}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-[var(--z-surface)]"
	>
		<TopBar
			bind:this={topBar}
			{searchQuery}
			onSearch={(next) => {
				searchQuery = next;
				cursorId = null;
			}}
			mailboxes={mockMailboxes}
			{activeMailbox}
			onSelectMailbox={(id) => {
				selectedMailboxId = id;
				cursorId = null;
			}}
			sidebarOpen={sidebarVisible}
			onToggleSidebar={toggleSidebar}
			onPrevMailbox={selectPrevMailbox}
			onNextMailbox={selectNextMailbox}
		/>

		{#if !openThreadId}
			<PhoneMailBar
				mailboxes={mockMailboxes}
				{activeMailbox}
				sidebarOpen={sidebarVisible}
				onToggleSidebar={toggleSidebar}
				{searchQuery}
				onSearch={(next) => {
					searchQuery = next;
					cursorId = null;
				}}
				filter={listFilter}
				onFilter={(value) => {
					listFilter = value;
					cursorId = null;
				}}
				rows={rowGroups.flatMap((group) => group.rows)}
				{selection}
				onSetSelection={(ids) => (selection = ids)}
				onBulk={() => {}}
				onNewMessage={() => openCompose()}
			/>
		{/if}

		<main
			class="z-shell relative min-h-0 flex-1"
			data-sidebar={sidebarVisible ? 'open' : 'closed'}
			style:--z-list-w="{listWidth}px"
		>
			{#if sidebarVisible}
				{#if viewport.compact}
					<button
						type="button"
						class="absolute inset-0 z-40 bg-[var(--z-scrim)] lg:hidden"
						aria-label="Close folder list"
						onclick={() => (drawerOpen = false)}
					></button>
				{/if}
				<div
					class="max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[280px] max-lg:max-w-[85%] max-lg:shadow-xl"
				>
					<Sidebar
						mailboxes={mockMailboxes}
						activeMailboxId={selectedMailboxId}
						onSelectMailbox={(id) => {
							selectedMailboxId = id;
							drawerOpen = false;
							cursorId = null;
						}}
						onClose={viewport.compact ? () => (drawerOpen = false) : undefined}
						onNewMessage={() => {
							drawerOpen = false;
							openCompose();
						}}
					/>
				</div>
			{/if}

			<MailList
				class={openThreadId ? 'max-md:hidden' : ''}
				mailbox={activeMailbox}
				mailboxes={mockMailboxes}
				groups={rowGroups}
				{searchQuery}
				onClearSearch={() => (searchQuery = '')}
				onBulk={() => {}}
				loading={false}
				error={null}
				filter={listFilter}
				{cursorId}
				{selection}
				onFilter={(value) => (listFilter = value)}
				onSetSelection={(ids) => (selection = ids)}
				onToggleSelect={(id) => {
					const next = new Set(selection);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					selection = next;
				}}
				onOpen={(id) => {
					reader.open(id);
					cursorId = id;
				}}
				onRetry={() => {}}
				onNewMessage={openCompose}
			/>

			<Splitter width={listWidth} onResize={(w) => (listWidth = w)} onReset={() => (listWidth = 480)} />

			<Reader
				class={openThreadId ? '' : 'max-md:hidden'}
				onBack={viewport.phone ? () => reader.close() : undefined}
				onAction={() => {}}
				threadState={rowGroups
					.flatMap((group) => group.rows)
					.find((row) => row.threadId === openThreadId) ?? null}
				archiveTarget={mockMailboxes.find((box) => box.kind === 'archive') ?? null}
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
