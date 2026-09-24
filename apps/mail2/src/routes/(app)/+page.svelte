<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { resyncPush } from '#lib/push';
	import { makeRecipient } from '#lib/compose/recipients';
	import { isMeetGroupId, meetingJoinPath } from '@zaur/mail-core/utils/meet';
	import { switchAccount, whoami } from '../session.remote';
	import { mailboxes, threads, thread, quota, bulk, labelCounts, type BulkAction, type ListFilter,
		search as searchRemote
	} from '../mail.remote';
	import {
		send as sendRemote,
		cancelScheduled,
		saveDraft as saveDraftRemote,
		deleteDraft as deleteDraftRemote
	} from '../compose.remote';
	import { contacts as contactsRemote } from '../contacts.remote';
	import { contactDisplayName } from '@zaur/mail-core';
	import TopBar from '#lib/components/mail/TopBar.svelte';
	import PhoneMailBar from '#lib/components/mail/PhoneMailBar.svelte';
	import { getShell } from '#lib/shell.svelte.ts';
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
	import { LiveUpdates } from '#lib/mail/live';
	import {
		prefs,
		setPref,
		adoptAccountPrefs,
		LIST_MIN,
		LIST_MAX,
		DEFAULT_PREFS
	} from '#lib/settings.svelte.ts';
	import { accountPrefs, identities, setAccountPrefs } from '../settings.remote';
	import { openingPosition, type AnchorRect } from '#lib/compose/layout';
	import { draftSeed } from '#lib/compose/quote';
	import { uploadFile } from '#lib/compose/attachments';
	import { compose } from '#lib/compose/store.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';
	import type { ComposeContact } from '#lib/compose/types';
	import type { MessageDetail } from '@zaur/mail-core';

	let selectedMailboxId = $state<string | null>(null);
	/** '' means "showing a folder"; anything else means the list shows results. */
	let searchQuery = $state('');
	let topBar = $state<ReturnType<typeof TopBar> | null>(null);
	let phoneBar = $state<ReturnType<typeof PhoneMailBar> | null>(null);
	let listFilter = $state<ListFilter>(prefs.unseenByDefault ? 'unseen' : 'all');
	let cursorId = $state<string | null>(null);
	let selection = $state<Set<string>>(new Set());
	// The app column is the layout's; floating compose panels are placed against it.
	const shell = getShell()!;
	const rootEl = $derived(shell.frame);
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
		// A folder you picked is a folder you want to see, not results filtered by it.
		searchQuery = '';
	}

	function setFilter(value: ListFilter) {
		listFilter = value;
		cursorId = null;
	}

	/**
	 * A label picked in the sidebar is a view you want to see: the filter the
	 * list header hides during a search, so the search goes, and so does the drawer.
	 */
	function pickLabel(value: ListFilter) {
		setFilter(value);
		drawerOpen = false;
		if (searchQuery) runSearch('');
	}

	function runSearch(next: string) {
		if (next === searchQuery) {
			void searchResource?.refresh();
			return;
		}
		searchQuery = next;
		cursorId = null;
		selection = new Set();
		reader.close();
	}

	const who = whoami();
	const session = $derived(who.current ?? null);
	const identitiesResource = $derived(session ? identities() : undefined);
	// Aliases are me too: reply-all leaves them out, and compose offers them in From.
	const myEmails = $derived(
		new Set([
			...(session?.accounts ?? []).map((account) => account.username.toLowerCase()),
			...(identitiesResource?.current ?? []).map((identity) => identity.email.toLowerCase())
		])
	);
	$effect(() => compose.setIdentities(identitiesResource?.current ?? []));

	// Session gone (expired/revoked mid-use) → own login page.
	$effect(() => {
		if (who.ready && !who.current) goto('/login', { replaceState: true });
	});

	/**
	 * The active account lives in the shared session, so a switch here changes it
	 * for every open tab. Each change reloads: this tab to start clean in the new
	 * account, the others (told over a BroadcastChannel) so none keeps showing,
	 * or composing in, the account that is no longer active.
	 */
	let accountChannel: BroadcastChannel | null = null;
	onMount(() => {
		if (typeof BroadcastChannel === 'undefined') return;
		accountChannel = new BroadcastChannel('zaur-mail2-account');
		accountChannel.onmessage = () => location.reload();
		return () => accountChannel?.close();
	});

	async function useAccount(key: string, then = '/') {
		try {
			await switchAccount({ key });
		} catch {
			compose.pushToast({ text: 'Could not switch accounts', tone: 'error' });
			return;
		}
		accountChannel?.postMessage('changed');
		location.assign(then);
	}

	/**
	 * `?account=<key>`: a notification for another signed-in account switches to
	 * it first (the reload keeps `?thread=`). Unknown or already active: dropped.
	 */
	let accountLinkHandled = false;
	$effect(() => {
		if (!session || accountLinkHandled) return;
		const key = page.url.searchParams.get('account');
		if (key === null) return;
		accountLinkHandled = true;
		untrack(() => {
			const url = new URL(page.url.href);
			url.searchParams.delete('account');
			const known = session.accounts.some((account) => account.key === key);
			if (known && key !== session.key) void useAccount(key, url.pathname + url.search);
			else void goto(url, { replaceState: true, reset: false });
		});
	});

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

	const searching = $derived(searchQuery.trim().length > 0);

	const threadsResource = $derived(
		session && activeMailbox && !searching
			? threads({ mailboxId: activeMailbox.id, filter: listFilter, limit: prefs.pageSize, kind: activeMailbox.kind })
			: undefined
	);

	/**
	 * Search is scoped to the open folder, which is what the placeholder says and
	 * what makes the results openable by the same code path as a folder row.
	 */
	const searchResource = $derived(
		session && searching
			? searchRemote({
					query: searchQuery,
					mailboxId: activeMailbox?.id,
					limit: prefs.pageSize
				})
			: undefined
	);

	const labelCountsResource = $derived(
		session && activeMailbox ? labelCounts({ mailboxId: activeMailbox.id }) : undefined
	);
	// Whatever moves a folder's unread count moves its labels' too, and every
	// path that changes one (push, a read, a move) refreshes the folder list.
	$effect(() => {
		if (!mailboxList) return;
		untrack(() => void labelCountsResource?.refresh());
	});

	/** Whichever of the two is driving the list right now. */
	const listResource = $derived(searching ? searchResource : threadsResource);
	const threadResource = $derived(
		session && openThreadId ? thread({ threadId: openThreadId }) : undefined
	);
	const quotaResource = $derived(session ? quota() : undefined);
	const accountPrefsResource = $derived(session ? accountPrefs() : undefined);

	/**
	 * Preferences that belong to the account, adopted once its copy arrives.
	 * `listWidth` and `sidebarOpen` stay on the device on purpose — see
	 * `ACCOUNT_PREF_KEYS`.
	 */
	$effect(() => {
		if (!session || accountPrefsResource?.loading !== false) return;
		adoptAccountPrefs(accountPrefsResource.current ?? null, (changed) => {
			void setAccountPrefs(changed).catch(() => {
				// A preference that failed to travel is not worth interrupting for;
				// it is still correct on this device and will go up on the next change.
			});
		});
	});

	const rowGroups = $derived.by(() => {
		const rows = listResource?.current?.rows;
		if (!rows || !activeMailbox) return undefined;
		const isMe = (email: string) => myEmails.has(email.trim().toLowerCase());
		return buildRowGroups(rows, activeMailbox.kind, isMe);
	});

	const flatRows = $derived((rowGroups ?? []).flatMap((group) => group.rows));
	const flatRowIds = $derived(flatRows.map((row) => row.threadId));

	// --- compose ---

	function afterMailMutation() {
		void mailboxesResource?.refresh();
		if (activeMailbox?.kind === 'drafts') void listResource?.refresh();
	}

	compose.setTransport({
		get account() {
			return session?.key ?? null;
		},
		send: async (payload) => {
			const result = await sendRemote(payload);
			afterMailMutation();
			return result;
		},
		cancelScheduled: (emailId) => cancelScheduled({ emailId }),
		uploadAttachment: uploadFile,
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

	/**
	 * Compose suggestions: the address book first (every address on every
	 * card, labelled by the card's own label), then whoever wrote to this
	 * folder recently, for the people not yet saved. One list, deduplicated on
	 * the address, so a saved person is never also offered as "Recent".
	 */
	const contactsResource = $derived(session ? contactsRemote() : undefined);
	$effect(() => {
		const rows = listResource?.current?.rows;
		const book = contactsResource?.current?.contacts ?? [];
		const seen = new Set<string>();
		const suggestions: ComposeContact[] = [];
		const add = (name: string, email: string, meta: string) => {
			const address = email.trim();
			if (!address.includes('@')) return;
			const key = address.toLowerCase();
			if (seen.has(key) || myEmails.has(key)) return;
			seen.add(key);
			suggestions.push({ name, email: address, meta });
		};
		for (const contact of book) {
			for (const email of contact.emails) {
				add(contactDisplayName(contact), email.address, email.label || 'Contact');
			}
		}
		for (const row of rows ?? []) add(row.from.name, row.from.email ?? '', 'Recent');
		compose.setContacts(suggestions);
	});

	/**
	 * Push: Stalwart tells us what changed, we re-run the queries that cover it.
	 * The thread in the reader is deliberately not refreshed on every Email
	 * change — the pane you are reading should not reflow under you — but a
	 * mailbox you are looking at should show mail as it lands.
	 */
	$effect(() => {
		if (!session) return;
		const live = new LiveUpdates();
		live.start(({ email, mailbox, contact }) => {
			if (email) void listResource?.refresh();
			if (mailbox) void mailboxesResource?.refresh();
			if (contact) void contactsResource?.refresh();
		});
		return () => live.stop();
	});

	$effect(() => {
		if (!session) return;
		const drain = () => {
			void compose.recoverLocalDrafts();
			void compose.drainOutbox().then((sent) => {
				if (sent > 0) listResource?.refresh();
			});
		};
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

	/**
	 * `/?to=ada@example.com` opens a draft to that address — the Contacts pane's
	 * "Write" link. `/?invite=zaur-…` opens one inviting to that Meet call — the
	 * call's "Email an invite". The parameter is consumed once and taken off the
	 * URL, so a reload does not open a second draft.
	 */
	let composeLinkHandled = false;
	$effect(() => {
		if (!session || composeLinkHandled) return;
		const to = page.url.searchParams.get('to');
		const invite = page.url.searchParams.get('invite');
		if (to === null && invite === null) return;
		composeLinkHandled = true;
		if (to !== null) {
			const recipient = makeRecipient(to, 'Contact');
			compose.newDraft({
				...panelPosition(),
				to: recipient ? [recipient] : [],
				focusTarget: recipient ? 'subject' : 'to'
			});
		} else if (invite && isMeetGroupId(invite)) {
			compose.newDraft({
				...panelPosition(),
				subject: 'Join me on Zaur Meet',
				body: `Join me on Zaur Meet:\n${page.url.origin}${meetingJoinPath(invite)}\n\nNo account needed: open the link, type your name and join.`,
				focusTarget: 'to'
			});
		}
		const url = new URL(page.url.href);
		url.searchParams.delete('to');
		url.searchParams.delete('invite');
		replaceState(url, page.state);
	});

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

	const selectedIds = $derived(selectedEmailIds(listResource?.current?.rows, selection));

	function markThreadRead(threadId: string) {
		const ids = selectedEmailIds(listResource?.current?.rows, new Set([threadId])).filter(
			(id) => listResource?.current?.rows.find((row) => row.id === id)?.unread
		);
		if (ids.length === 0) return;
		return bulk({ action: 'read', emailIds: ids })
			.then(() => {
				void listResource?.refresh();
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
			? selectedEmailIds(listResource?.current?.rows, scope)
			: selectedIds;
		if (emailIds.length === 0 || bulkBusy) return;
		let payload = { action, emailIds, mailboxId, sourceMailboxId: activeMailbox?.id };
		if (action === 'delete' && activeMailbox?.kind !== 'trash') {
			const trash = mailboxList?.find((box) => box.kind === 'trash');
			if (trash) payload = { ...payload, action: 'move', mailboxId: trash.id };
		}
		if (payload.action === 'delete') {
			const n = emailIds.length;
			if (!confirm(`Delete ${n === 1 ? 'this message' : `${n} messages`} forever? This can't be undone.`)) return;
		}
		const leavesFolder = payload.action === 'move' || payload.action === 'delete';
		// Marking spam *is* a move to Junk — the toast should say what was meant,
		// not how it was carried out.
		const toJunk =
			payload.action === 'move' &&
			mailboxList?.find((box) => box.id === payload.mailboxId)?.kind === 'junk';
		const verb =
			payload.action === 'delete'
				? 'deleted'
				: toJunk
					? 'marked as spam'
					: payload.action === 'move'
						? 'moved'
						: 'updated';
		bulkBusy = true;
		try {
			const { count } = await bulk(payload);
			// A thread that just left the folder can't stay open in the reader.
			if (leavesFolder && openThreadId && scope.has(openThreadId)) reader.close();
			if (!threadIds) selection = new Set();
			void listResource?.refresh();
			void mailboxesResource?.refresh();
			// The folder that just received these keeps a cached list of its own, so
			// without this, opening it straight after a move shows it as it was
			// before — which reads as a move that did not happen.
			if (payload.action === 'move' && payload.mailboxId) {
				void threads({
					mailboxId: payload.mailboxId,
					filter: listFilter,
					limit: prefs.pageSize
				})
					.refresh()
					.catch(() => {});
			}
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

	/**
	 * `/?thread=<id>` opens that thread in the inbox: where a new-mail
	 * notification points. Taken off the URL before the reader opens, so Back
	 * returns to the plain inbox and a reload does not reopen it.
	 */
	let threadLinkHandled = false;
	$effect(() => {
		if (!session || threadLinkHandled || !activeMailbox) return;
		// An `?account=` on the same link is settled first (it may reload into another account).
		if (page.url.searchParams.has('account')) return;
		const threadId = page.url.searchParams.get('thread');
		if (threadId === null) return;
		threadLinkHandled = true;
		// Untracked: opening marks the thread read, and a command bumps its own state.
		// A real (replacing) navigation, not replaceState: on a phone the reader pushes
		// a shallow entry relative to the page's URL, which must already be clean.
		untrack(() => {
			const url = new URL(page.url.href);
			url.searchParams.delete('thread');
			void goto(url, { replaceState: true, reset: false }).then(() => openRow(threadId));
		});
	});

	// A subscribed browser checks in on every load, so its push row does not age out.
	onMount(() => {
		resyncPush().catch(() => {});
	});

	async function openRow(threadId: string) {
		// The reader hides the top bar on a phone, and with it the drawer's only
		// toggle — so the drawer never survives into a thread.
		drawerOpen = false;
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
			case '/':
				event.preventDefault();
				if (viewport.phone) void phoneBar?.focusSearch();
				else topBar?.focusSearch();
				break;
			case 'Escape':
				if (selection.size > 0) selection = new Set();
				else if (searchQuery) runSearch('');
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head><title>Mail · Zaur Mail</title></svelte:head>

<!--
	A phone reading a thread gets one bar, not two: the reader's own toolbar
	is taller there and carries everything that screen can do, so the shell's
	bar steps out. While the list is up, PhoneMailBar is that one bar — folder,
	filter, search, compose and, once something is selected, the bulk actions —
	and TopBar hides the shell header below `md` so the two never stack.
-->
<TopBar
	bind:this={topBar}
	class={openThreadId ? 'max-md:hidden' : ''}
	{searchQuery}
	onSearch={runSearch}
	mailboxes={mailboxList}
	activeMailbox={activeMailbox}
	onSelectMailbox={selectMailbox}
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
	{#if !openThreadId}
		<PhoneMailBar
			bind:this={phoneBar}
			mailboxes={mailboxList}
			{activeMailbox}
			sidebarOpen={sidebarVisible}
			onToggleSidebar={toggleSidebar}
			{searchQuery}
			onSearch={runSearch}
			filter={listFilter}
			onFilter={setFilter}
			rows={flatRows}
			{selection}
			onSetSelection={(ids) => (selection = ids)}
			onBulk={(action, mailboxId) => void runBulk(action, mailboxId)}
			busy={bulkBusy}
			onNewMessage={(anchor) => openCompose(anchor)}
		/>
	{/if}
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
					class="absolute inset-0 z-40 bg-[var(--z-scrim)] lg:hidden"
					aria-label="Close folder list"
					onclick={() => (drawerOpen = false)}
				></button>
			{/if}
			<div
				class="max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[280px] max-lg:max-w-[85%] max-lg:shadow-[var(--z-shadow-panel)]"
			>
				<Sidebar
					mailboxes={mailboxList}
					activeMailboxId={selectedMailboxId}
					onSelectMailbox={selectMailbox}
					filter={listFilter}
					onFilter={pickLabel}
					labelCounts={labelCountsResource?.current}
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
			{searchQuery}
			onClearSearch={() => runSearch('')}
			mailbox={activeMailbox}
			mailboxes={mailboxList}
			groups={rowGroups}
			loading={threadsResource?.loading ?? true}
			error={threadsResource?.error}
			filter={listFilter}
			{cursorId}
			{openThreadId}
			{selection}
			onFilter={setFilter}
			onSetSelection={(ids) => (selection = ids)}
			onToggleSelect={toggleSelect}
			onOpen={(threadId) => void openRow(threadId)}
			onBulk={(action, mailboxId, threadIds) => void runBulk(action, mailboxId, threadIds)}
			busy={bulkBusy}
			onRetry={() => listResource?.refresh()}
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
			mailboxKind={activeMailbox?.kind ?? null}
			{archiveTarget}
			mailboxes={mailboxList}
			currentMailboxId={activeMailbox?.id ?? null}
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
