<script lang="ts">
	import { goto } from '$app/navigation';
	import { whoami } from '../session.remote';
	import { mailboxes, threads, thread, quota, bulk, type BulkAction } from '../mail.remote';
	import {
		send as sendRemote,
		cancelScheduled,
		saveDraft as saveDraftRemote,
		deleteDraft as deleteDraftRemote
	} from '../compose.remote';
	import { logout } from '../login.remote';
	import TopBar from '#lib/components/mail/TopBar.svelte';
	import Sidebar from '#lib/components/mail/Sidebar.svelte';
	import MailList from '#lib/components/mail/MailList.svelte';
	import Reader from '#lib/components/mail/Reader.svelte';
	import Splitter from '#lib/components/mail/Splitter.svelte';
	import StatusLine from '#lib/components/mail/StatusLine.svelte';
	import ComposePanel from '#lib/components/compose/ComposePanel.svelte';
	import ComposeDock from '#lib/components/compose/ComposeDock.svelte';
	import Toasts from '#lib/components/compose/Toasts.svelte';
	import { buildRowGroups, selectedEmailIds } from '#lib/mail/rows';
	import { prefs, setPref, LIST_MIN, LIST_MAX, DEFAULT_PREFS } from '#lib/settings.svelte.ts';
	import { openingPosition, type AnchorRect } from '#lib/compose/layout';
	import { draftSeed } from '#lib/compose/quote';
	import { compose } from '#lib/compose/store.svelte.ts';
	import type { ComposeContact } from '#lib/compose/types';
	import type { MessageDetail } from '@zaur/mail-core';

	let activeCategories = $state<Set<string>>(new Set(['personal', 'work', 'team', 'finance']));
	let selectedMailboxId = $state<string | null>(null);
	let unseenOnly = $state(prefs.unseenByDefault);
	let openThreadId = $state<string | null>(null);
	let cursorId = $state<string | null>(null);
	let selection = $state<Set<string>>(new Set());
	let rootEl = $state<HTMLDivElement | null>(null);
	let rootW = $state(0);
	let rootH = $state(0);
	let bulkBusy = $state(false);

	function toggleSidebar() {
		setPref('sidebarOpen', !prefs.sidebarOpen);
	}

	function toggleCategory(categoryId: string) {
		const next = new Set(activeCategories);
		if (next.has(categoryId)) next.delete(categoryId);
		else next.add(categoryId);
		activeCategories = next;
	}

	const session = $derived(whoami()?.current ?? null);
	const myEmails = $derived(
		new Set((session?.accounts ?? []).map((account) => account.username.toLowerCase()))
	);

	// Session gone (expired/revoked mid-use) → own login page.
	$effect(() => {
		const current = whoami()?.current;
		if (whoami().ready && !current) goto('/login', { replaceState: true });
	});

	function signOut() {
		void logout().then(() => goto('/login', { replaceState: true }));
	}

	const mailboxesResource = $derived(session ? mailboxes() : undefined);
	const mailboxList = $derived(mailboxesResource?.current ?? undefined);

	// Default to the inbox once the folder list arrives.
	$effect(() => {
		if (selectedMailboxId || !mailboxList) return;
		const inbox = mailboxList.find((mailbox) => mailbox.kind === 'inbox');
		selectedMailboxId = (inbox ?? mailboxList[0])?.id ?? null;
	});

	const activeMailbox = $derived(
		mailboxList?.find((mailbox) => mailbox.id === selectedMailboxId) ?? null
	);

	function selectPrevMailbox() {
		if (!mailboxList || mailboxList.length === 0) return;
		const currentIndex = mailboxList.findIndex((m) => m.id === selectedMailboxId);
		const prevIndex = (currentIndex - 1 + mailboxList.length) % mailboxList.length;
		selectedMailboxId = mailboxList[prevIndex]!.id;
		openThreadId = null;
		cursorId = null;
		selection = new Set();
	}

	function selectNextMailbox() {
		if (!mailboxList || mailboxList.length === 0) return;
		const currentIndex = mailboxList.findIndex((m) => m.id === selectedMailboxId);
		const nextIndex = (currentIndex + 1) % mailboxList.length;
		selectedMailboxId = mailboxList[nextIndex]!.id;
		openThreadId = null;
		cursorId = null;
		selection = new Set();
	}

	const threadsResource = $derived(
		session && activeMailbox
			? threads({ mailboxId: activeMailbox.id, unseenOnly, limit: prefs.pageSize })
			: undefined
	);
	const threadResource = $derived(
		session && openThreadId ? thread({ threadId: openThreadId }) : undefined
	);
	const quotaResource = $derived(session ? quota() : undefined);

	const rowGroups = $derived.by(() => {
		const rows = threadsResource?.current?.rows;
		if (!rows || !activeMailbox) return undefined;
		const isMe = (email: string) => myEmails.has(email.trim().toLowerCase());
		return buildRowGroups(rows, activeMailbox.kind, isMe);
	});

	const flatRowIds = $derived((rowGroups ?? []).flatMap((group) => group.rows.map((row) => row.threadId)));

	// --- compose ---

	function afterMailMutation() {
		void mailboxesResource?.refresh();
		if (activeMailbox?.kind === 'drafts') void threadsResource?.refresh();
	}

	compose.setTransport({
		send: async (payload) => {
			const result = await sendRemote(payload);
			afterMailMutation();
			return result;
		},
		cancelScheduled: (emailId) => cancelScheduled({ emailId }),
		uploadAttachment: async (file) => {
			const response = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'Content-Type': file.type || 'application/octet-stream' },
				body: file
			});
			const payload = (await response.json().catch(() => ({}))) as {
				blobId?: string;
				size?: number;
				type?: string;
				error?: string;
			};
			if (!response.ok || !payload.blobId) {
				throw new Error(payload.error ?? `Upload failed (${response.status})`);
			}
			return {
				blobId: payload.blobId,
				name: file.name,
				type: payload.type ?? file.type,
				size: payload.size ?? file.size
			};
		},
		saveDraft: async (input) => {
			const result = await saveDraftRemote(input);
			afterMailMutation();
			return result;
		},
		deleteDraft: async (emailId) => {
			const result = await deleteDraftRemote({ emailId });
			afterMailMutation();
			return result;
		}
	});

	$effect(() => {
		const rows = threadsResource?.current?.rows;
		if (!rows) return;
		const seen = new Set<string>();
		const contacts: ComposeContact[] = [];
		for (const row of rows) {
			const email = row.from.email?.trim();
			if (!email || !email.includes('@')) continue;
			const key = email.toLowerCase();
			if (seen.has(key) || myEmails.has(key)) continue;
			seen.add(key);
			contacts.push({ name: row.from.name, email, meta: 'Recent' });
		}
		compose.setContacts(contacts);
	});

	$effect(() => {
		if (!session) return;
		const drain = () =>
			void compose.drainOutbox().then((sent) => {
				if (sent > 0) threadsResource?.refresh();
			});
		void drain();
		window.addEventListener('online', drain);
		return () => window.removeEventListener('online', drain);
	});

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

	function newMessageAnchor(): AnchorRect {
		const el = document.querySelector<HTMLElement>('[data-new-message]');
		if (!el) {
			return {
				left: Math.max(12, rootW - 584),
				top: 68,
				right: Math.max(24, rootW - 24),
				bottom: 102
			};
		}
		const rect = el.getBoundingClientRect();
		return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
	}

	function openCompose(anchor?: AnchorRect | null) {
		const position = openingPosition(
			anchor ?? newMessageAnchor(),
			rootW,
			rootH,
			compose.openPanels().length
		);
		compose.newDraft(position);
	}

	function openReply(
		mode: 'reply' | 'replyAll' | 'forward',
		message: MessageDetail,
		anchor: AnchorRect | null
	) {
		const position = openingPosition(
			anchor ?? newMessageAnchor(),
			rootW,
			rootH,
			compose.openPanels().length
		);
		compose.reply(message, threadResource?.current ?? [message], myEmails, mode, position);
	}

	const selectedIds = $derived(selectedEmailIds(threadsResource?.current?.rows, selection));

	function markThreadRead(threadId: string) {
		const ids = selectedEmailIds(threadsResource?.current?.rows, new Set([threadId])).filter(
			(id) => threadsResource?.current?.rows.find((row) => row.id === id)?.unread
		);
		if (ids.length === 0) return;
		return bulk({ action: 'read', emailIds: ids })
			.then(() => {
				void threadsResource?.refresh();
				void mailboxesResource?.refresh();
			})
			.catch(() => {});
	}

	/**
	 * Delete means "move to Trash" everywhere except Trash itself, where the
	 * only thing left to do is destroy.
	 */
	async function runBulk(action: BulkAction, mailboxId?: string) {
		const emailIds = selectedIds;
		if (emailIds.length === 0 || bulkBusy) return;
		let payload = { action, emailIds, mailboxId, sourceMailboxId: activeMailbox?.id };
		if (action === 'delete' && activeMailbox?.kind !== 'trash') {
			const trash = mailboxList?.find((box) => box.kind === 'trash');
			if (trash) payload = { ...payload, action: 'move', mailboxId: trash.id };
		}
		const leavesFolder = payload.action === 'move' || payload.action === 'delete';
		const verb =
			payload.action === 'delete' ? 'deleted' : payload.action === 'move' ? 'moved' : 'updated';
		bulkBusy = true;
		try {
			const { count } = await bulk(payload);
			// A thread that just left the folder can't stay open in the reader.
			if (leavesFolder && openThreadId && selection.has(openThreadId)) openThreadId = null;
			selection = new Set();
			void threadsResource?.refresh();
			void mailboxesResource?.refresh();
			compose.pushToast({ text: `${count} ${count === 1 ? 'message' : 'messages'} ${verb}` });
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : 'Action failed'
			});
		} finally {
			bulkBusy = false;
		}
	}

	async function openRow(threadId: string) {
		if (activeMailbox?.kind !== 'drafts') {
			openThreadId = threadId;
			if (prefs.markReadOnOpen) void markThreadRead(threadId);
			return;
		}
		try {
			const messages = await thread({ threadId });
			const message = messages.at(-1);
			if (!message) return;
			compose.reopenDraft(
				draftSeed(message),
				openingPosition(newMessageAnchor(), rootW, rootH, compose.openPanels().length)
			);
		} catch {
			compose.pushToast({ text: 'Could not open the draft' });
		}
	}

	function setListWidth(next: number) {
		setPref('listWidth', Math.min(LIST_MAX, Math.max(LIST_MIN, next)));
	}

	function resetListWidth() {
		setListWidth(DEFAULT_PREFS.listWidth);
	}

	function moveCursor(delta: number) {
		if (flatRowIds.length === 0) return;
		const index = cursorId ? flatRowIds.indexOf(cursorId) : -1;
		const next = index === -1
			? flatRowIds[delta > 0 ? 0 : flatRowIds.length - 1]!
			: flatRowIds[(index + delta + flatRowIds.length) % flatRowIds.length]!;
		cursorId = next;
	}

	function openCursor() {
		const target = cursorId ?? flatRowIds[0];
		if (target) void openRow(target);
	}

	function toggleSelect(threadId: string) {
		const next = new Set(selection);
		if (next.has(threadId)) next.delete(threadId);
		else next.add(threadId);
		selection = next;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			const front = compose.frontPanel();
			if (front) {
				event.preventDefault();
				compose.minimize(front.id);
				return;
			}
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			const front = compose.frontPanel();
			if (front) {
				event.preventDefault();
				void compose.sendDraft(front.id);
				return;
			}
		}

		const target = event.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
			return;
		}
		if (event.metaKey || event.ctrlKey || event.altKey) return;

		switch (event.key) {
			case 'c':
				event.preventDefault();
				openCompose();
				break;
			case 'j':
				event.preventDefault();
				moveCursor(1);
				break;
			case 'k':
				event.preventDefault();
				moveCursor(-1);
				break;
			case 'Enter':
			case 'o':
				event.preventDefault();
				openCursor();
				break;
			case 'x':
				event.preventDefault();
				if (cursorId) toggleSelect(cursorId);
				break;
			case '[':
				event.preventDefault();
				toggleSidebar();
				break;
			case 'Escape':
				if (selection.size > 0) selection = new Set();
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Outer background canvas: neutral light gray matching Hobday's portfolio presentation -->
<div class="flex h-svh w-screen flex-col items-center justify-center bg-[#ebeef2] p-2 sm:p-3 overflow-hidden text-slate-900">
	<!-- Desktop Window Shell Container -->
	<div
		bind:this={rootEl}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-window"
	>
		<TopBar
			mailboxes={mailboxList}
			activeMailbox={activeMailbox}
			onSelectMailbox={(id) => {
				selectedMailboxId = id;
				openThreadId = null;
				cursorId = null;
				selection = new Set();
			}}
			account={session ? { username: session.username, displayName: session.displayName } : null}
			onSignOut={signOut}
			sidebarOpen={prefs.sidebarOpen}
			onToggleSidebar={toggleSidebar}
			onPrevMailbox={selectPrevMailbox}
			onNextMailbox={selectNextMailbox}
		/>

		{#if !session}
			<div class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
				<p class="text-sm font-semibold text-slate-800">Session ended</p>
				<p class="max-w-[420px] text-[13px] leading-relaxed text-slate-500">
					Returning you to sign in…
				</p>
			</div>
		{:else}
			<main
				class="grid min-h-0 flex-1"
				style:grid-template-columns={prefs.sidebarOpen
					? `240px ${prefs.listWidth}px 1px minmax(0, 1fr)`
					: `${prefs.listWidth}px 1px minmax(0, 1fr)`}
			>
				{#if prefs.sidebarOpen}
					<Sidebar
						mailboxes={mailboxList}
						activeMailboxId={selectedMailboxId}
						onSelectMailbox={(id) => {
							selectedMailboxId = id;
							openThreadId = null;
							cursorId = null;
							selection = new Set();
						}}
						{activeCategories}
						onToggleCategory={toggleCategory}
						onNewMessage={() => openCompose()}
					/>
				{/if}

				<MailList
					mailbox={activeMailbox}
					mailboxes={mailboxList}
					groups={rowGroups}
					loading={threadsResource?.loading ?? true}
					error={threadsResource?.error}
					{unseenOnly}
					{cursorId}
					{selection}
					onToggleUnseenOnly={(value) => {
						unseenOnly = value;
						cursorId = null;
					}}
					onSetSelection={(ids) => (selection = ids)}
					onToggleSelect={toggleSelect}
					onOpen={(threadId) => void openRow(threadId)}
					onBulk={(action, mailboxId) => void runBulk(action, mailboxId)}
					busy={bulkBusy}
					onRetry={() => threadsResource?.refresh()}
					onNewMessage={(anchor) => openCompose(anchor)}
				/>

				<Splitter width={prefs.listWidth} onResize={setListWidth} onReset={resetListWidth} />

				<Reader
					messages={threadResource?.current}
					loading={threadResource?.loading ?? false}
					error={threadResource?.error}
					onRetry={() => threadResource?.refresh()}
					onCompose={openReply}
				/>
			</main>

			{#each compose.drafts as draft (draft.id)}
				{#if draft.stage !== 'minimized'}
					<ComposePanel {draft} {rootW} {rootH} />
				{/if}
			{/each}
			<ComposeDock />
		{/if}

		<Toasts />

		<StatusLine
			mailboxName={activeMailbox?.name ?? null}
			unseen={activeMailbox?.unread ?? 0}
			quota={quotaResource?.current}
		/>
	</div>
</div>
