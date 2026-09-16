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
	import { readerThread } from '#lib/mail/reader-thread.svelte.ts';
	import { prefs, setPref, LIST_MIN, LIST_MAX, DEFAULT_PREFS } from '#lib/settings.svelte.ts';
	import { openingPosition, type AnchorRect } from '#lib/compose/layout';
	import { draftSeed } from '#lib/compose/quote';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';
	import type { ComposeContact } from '#lib/compose/types';
	import type { MessageDetail } from '@zaur/mail-core';

	let selectedMailboxId = $state<string | null>(null);
	let unseenOnly = $state(prefs.unseenByDefault);
	let cursorId = $state<string | null>(null);
	let selection = $state<Set<string>>(new Set());
	let rootEl = $state<HTMLDivElement | null>(null);
	let rootW = $state(0);
	let rootH = $state(0);
	let bulkBusy = $state(false);
	/** Below 1024px the sidebar is an overlay drawer, not a column. */
	let drawerOpen = $state(false);

	const sidebarVisible = $derived(viewport.compact ? drawerOpen : prefs.sidebarOpen);

	function toggleSidebar() {
		if (viewport.compact) drawerOpen = !drawerOpen;
		else setPref('sidebarOpen', !prefs.sidebarOpen);
	}

	const reader = readerThread();
	const openThreadId = $derived(reader.id);

	function selectMailbox(id: string) {
		selectedMailboxId = id;
		drawerOpen = false;
		reader.close();
		cursorId = null;
		selection = new Set();
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

	function stepMailbox(delta: number) {
		if (!mailboxList || mailboxList.length === 0) return;
		const currentIndex = mailboxList.findIndex((m) => m.id === selectedMailboxId);
		selectMailbox(mailboxList[(currentIndex + delta + mailboxList.length) % mailboxList.length]!.id);
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

	const flatRows = $derived((rowGroups ?? []).flatMap((group) => group.rows));
	const flatRowIds = $derived(flatRows.map((row) => row.threadId));

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

	/** Phone compose is a full-screen sheet — there is no window to place. */
	function panelPosition(anchor?: AnchorRect | null) {
		if (viewport.phone) return undefined;
		return openingPosition(
			anchor ?? newMessageAnchor(),
			rootW,
			rootH,
			compose.openPanels().length
		);
	}

	function openCompose(anchor?: AnchorRect | null) {
		compose.newDraft(panelPosition(anchor));
	}

	function openReply(
		mode: 'reply' | 'replyAll' | 'forward',
		message: MessageDetail,
		anchor: AnchorRect | null
	) {
		compose.reply(
			message,
			threadResource?.current ?? [message],
			myEmails,
			mode,
			panelPosition(anchor)
		);
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
	 *
	 * `threadIds` is how a single row acts on itself — its hover buttons and the
	 * cursor-row shortcuts. Without them the action runs on the selection, and
	 * only then does it clear it: a row acting alone leaves a selection intact.
	 */
	async function runBulk(action: BulkAction, mailboxId?: string, threadIds?: string[]) {
		const scope = threadIds ? new Set(threadIds) : selection;
		const emailIds = threadIds
			? selectedEmailIds(threadsResource?.current?.rows, scope)
			: selectedIds;
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
			if (leavesFolder && openThreadId && scope.has(openThreadId)) reader.close();
			if (!threadIds) selection = new Set();
			void threadsResource?.refresh();
			void mailboxesResource?.refresh();
			compose.pushToast({ text: `${count} ${count === 1 ? 'message' : 'messages'} ${verb}`, tone: 'success' });
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : 'Action failed',
				tone: 'error'
			});
		} finally {
			bulkBusy = false;
		}
	}

	/**
	 * The keyboard's half of the row's hover buttons: a selection wins if there
	 * is one, otherwise the action lands on the row under the cursor.
	 */
	function runRowShortcut(action: BulkAction, mailboxId?: string) {
		if (selection.size > 0) return void runBulk(action, mailboxId);
		if (!cursorId) return;
		void runBulk(action, mailboxId, [cursorId]);
	}

	const cursorRow = $derived(flatRows.find((row) => row.threadId === cursorId));
	/** The open thread's row — the reader's toolbar flips its icons off it. */
	const openRowState = $derived(flatRows.find((row) => row.threadId === openThreadId) ?? null);
	const archiveTarget = $derived(
		mailboxList?.find((box) => box.kind === 'archive' && box.id !== activeMailbox?.id) ?? null
	);

	async function openRow(threadId: string) {
		if (activeMailbox?.kind !== 'drafts') {
			reader.open(threadId);
			if (prefs.markReadOnOpen) void markThreadRead(threadId);
			return;
		}
		try {
			const messages = await thread({ threadId });
			const message = messages.at(-1);
			if (!message) return;
			compose.reopenDraft(draftSeed(message), panelPosition());
		} catch {
			compose.pushToast({ text: 'Could not open the draft', tone: 'error' });
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
		if (event.key === 'Escape' && drawerOpen) {
			event.preventDefault();
			drawerOpen = false;
			return;
		}
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
			case 's': {
				event.preventDefault();
				// Mirrors the bulk bar: act on the majority state of what is targeted.
				const starred = selection.size > 0
					? flatRows.filter((row) => selection.has(row.threadId)).every((row) => row.starred)
					: (cursorRow?.starred ?? false);
				runRowShortcut(starred ? 'unstar' : 'star');
				break;
			}
			case 'e':
				event.preventDefault();
				if (archiveTarget) runRowShortcut('move', archiveTarget.id);
				break;
			// Deliberately shift-# and not Delete: in Trash this one destroys.
			case '#':
				event.preventDefault();
				runRowShortcut('delete');
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

<!-- Ground behind the app column — only visible past the 1780px ceiling. -->
<div class="flex h-svh w-full flex-col items-center justify-center bg-[#ebeef2] overflow-hidden text-slate-900">
	<!-- App column: edge to edge until 1780px, then capped so the chrome at each
	     end stays within reach of the content in the middle. -->
	<div
		bind:this={rootEl}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-white"
	>
		<TopBar
			mailboxes={mailboxList}
			activeMailbox={activeMailbox}
			onSelectMailbox={selectMailbox}
			account={session ? { username: session.username, displayName: session.displayName } : null}
			onSignOut={signOut}
			sidebarOpen={sidebarVisible}
			onToggleSidebar={toggleSidebar}
			onPrevMailbox={() => stepMailbox(-1)}
			onNextMailbox={() => stepMailbox(1)}
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
				class="z-shell relative min-h-0 flex-1"
				data-sidebar={sidebarVisible ? 'open' : 'closed'}
				style:--z-list-w="{prefs.listWidth}px"
			>
				{#if sidebarVisible}
					<!-- Below 1024px the sidebar leaves the grid and slides over the
					     panes; the top bar stays visible so its toggle can dismiss it. -->
					{#if viewport.compact}
						<button
							type="button"
							class="absolute inset-0 z-40 bg-slate-900/25 lg:hidden"
							aria-label="Close folder list"
							onclick={() => (drawerOpen = false)}
						></button>
					{/if}
					<div
						class="max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[280px] max-lg:max-w-[85%] max-lg:shadow-xl"
					>
						<Sidebar
							mailboxes={mailboxList}
							activeMailboxId={selectedMailboxId}
							onSelectMailbox={selectMailbox}
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
					onBulk={(action, mailboxId, threadIds) => void runBulk(action, mailboxId, threadIds)}
					busy={bulkBusy}
					onRetry={() => threadsResource?.refresh()}
					onNewMessage={(anchor) => openCompose(anchor)}
				/>

				<Splitter width={prefs.listWidth} onResize={setListWidth} onReset={resetListWidth} />

				<Reader
					class={openThreadId ? '' : 'max-md:hidden'}
					messages={threadResource?.current}
					loading={threadResource?.loading ?? false}
					error={threadResource?.error}
					onRetry={() => threadResource?.refresh()}
					onCompose={openReply}
					onBack={viewport.phone ? () => reader.close() : undefined}
					onAction={(action, mailboxId) =>
						openThreadId && void runBulk(action, mailboxId, [openThreadId])}
					threadState={openRowState}
					{archiveTarget}
					inTrash={activeMailbox?.kind === 'trash'}
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
