<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resyncPush } from '#lib/push';
	import { makeRecipient } from '#lib/compose/recipients';
	import { isMeetGroupId, meetingJoinPath } from '@zaur/mail-core/utils/meet';
	import { switchAccount, whoami } from '../session.remote';
	import { mailboxes, sharedMailboxes, threads, thread, quota, bulk, emptyFolder, labelCounts, copyAttachments,
		type BulkAction, type ListFilter, search as searchRemote
	} from '../mail.remote';
	import { cancelScheduled } from '../compose.remote';
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
	import { buildRowGroups, selectedEmailIds } from '#lib/mail/rows';
	import { mailboxOfUrl } from '#lib/mail/folders';
	import { patchQuery, readerThread } from '#lib/mail/reader-thread.svelte.ts';
	import { backLayer, inOrder } from '#lib/back-layer.svelte.ts';
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
	import { compose } from '#lib/compose/store.svelte.ts';
	import { viewport } from '#lib/viewport.svelte.ts';
	import type { ComposeContact } from '#lib/compose/types';
	import type { MessageDetail } from '@zaur/mail-core';
	import type { ThreadListDTO } from '#lib/mail/types';

	/**
	 * What the address bar says. Not `page.url`: the shallow patches that mirror
	 * the folder and the thread leave that at the URL the page loaded on, so
	 * after Back from another section it no longer says where you were.
	 */
	const address = () => new URLSearchParams(browser ? location.search : page.url.search);

	let selectedMailboxId = $state<string | null>(null);
	/** A mailbox someone shares with you (`?shared=`, its JMAP account), or null for yours. */
	let mailAccount = $state<string | null>(address().get('shared'));
	/** '' means "showing a folder"; anything else means the list shows results. */
	let searchQuery = $state('');
	let topBar = $state<ReturnType<typeof TopBar> | null>(null);
	let phoneBar = $state<ReturnType<typeof PhoneMailBar> | null>(null);
	let statusLine = $state<ReturnType<typeof StatusLine> | null>(null);
	const defaultFilter = (): ListFilter => (prefs.unseenByDefault ? 'unseen' : 'all');
	let listFilter = $state<ListFilter>(defaultFilter());
	let cursorId = $state<string | null>(null);
	let selection = $state<Set<string>>(new Set());
	// The app column is the layout's; floating compose panels are placed against it.
	const shell = getShell()!;
	const rootEl = $derived(shell.frame);
	let rootW = $state(0);
	let rootH = $state(0);
	let bulkBusy = $state(false);
	/**
	 * Below 1024px the sidebar is an overlay drawer, not a column — and a history
	 * entry, so Back closes it rather than leaving Mail.
	 */
	const drawer = backLayer('drawer', () => viewport.compact);
	const drawerOpen = $derived(viewport.compact && drawer.open);
	let drawerEl = $state<HTMLElement | null>(null);
	let mainEl = $state<HTMLElement | null>(null);

	const sidebarVisible = $derived(viewport.compact ? drawerOpen : prefs.sidebarOpen);

	function toggleSidebar() {
		if (!viewport.compact) setPref('sidebarOpen', !prefs.sidebarOpen);
		else if (drawerOpen) void drawer.hide();
		else void drawer.show();
	}

	// The drawer is modal: focus goes in with it and back to its toggle after,
	// and the panes under the scrim are out of reach of Tab and screen readers.
	$effect(() => {
		if (!drawerOpen || !drawerEl || !mainEl) return;
		const opener = document.activeElement as HTMLElement | null;
		const panes = mainEl.querySelectorAll<HTMLElement>(':scope > :not([data-drawer])');
		for (const pane of panes) pane.inert = true;
		// Where you are, or else the first thing on show (the header's Close is a phone's only).
		const first = [...drawerEl.querySelectorAll<HTMLElement>('button, a')];
		(first.find((el) => el.ariaCurrent === 'true') ?? first.find((el) => el.offsetParent))?.focus({ preventScroll: true });
		return () => {
			for (const pane of panes) pane.inert = false;
			if (opener?.isConnected) opener.focus({ preventScroll: true });
		};
	});

	const reader = readerThread();
	const openThreadId = $derived(reader.id);

	// A thread on a phone is a screen with its own way back; the section tabs step out with the list.
	$effect(() => {
		shell.tabs = !openThreadId;
		return () => (shell.tabs = true);
	});

	/** Search the open folder, or every folder. It stays as picked until the page reloads. */
	let searchAll = $state(false);

	async function selectMailbox(id: string, account: string | null = mailAccount) {
		// History first. Closing the drawer (or a phone's reader) is a step back onto
		// the entry of the folder being left, and the list follows the address it
		// lands on: a folder shown before that would be taken back by it.
		if (drawerOpen || page.state.reader) await Promise.all([drawer.hide(), reader.close()]);
		showMailbox(id, account);
		folderToUrl(id);
		void reader.close();
	}

	/** The list turns to a folder. Keeping the address in step is the caller's. */
	function showMailbox(id: string, account: string | null) {
		selectedMailboxId = id;
		mailAccount = account;
		cursorId = null;
		selection = new Set();
		// A folder you picked is a folder you want to see, not results filtered by it
		// or narrowed to a label it may not hold.
		searchQuery = '';
		listFilter = defaultFilter();
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
		void drawer.hide();
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
	/** Asked and answered: nobody is signed in. Not the moment before the answer, which every cold start has. */
	const signedOut = $derived(who.ready && !who.current);
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
		if (signedOut) goto('/login', { replace: true });
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
	 * Handled once per link: the next one (a notification tapped while Mail is
	 * open arrives as a navigation, not a load) is taken up again.
	 */
	let accountLinkHandled = false;
	$effect(() => {
		// Read first: a run that stops at the flag must still be waiting on the next URL.
		const key = page.url.searchParams.get('account');
		if (!session || accountLinkHandled || key === null) return;
		accountLinkHandled = true;
		untrack(() => {
			const url = new URL(page.url.href);
			url.searchParams.delete('account');
			const known = session.accounts.some((account) => account.key === key);
			if (known && key !== session.key) void useAccount(key, url.pathname + url.search);
			else void goto(url, { replace: true, reset: false }).finally(() => (accountLinkHandled = false));
		});
	});

	const mailboxesResource = $derived(session ? mailboxes() : undefined);
	const sharedResource = $derived(session ? sharedMailboxes() : undefined);
	const sharedList = $derived(sharedResource?.current);
	const activeShared = $derived(mailAccount ? (sharedList?.find((one) => one.id === mailAccount) ?? null) : null);
	/** The folders of the mailbox being shown: yours, or the shared one's. */
	const mailboxList = $derived(mailAccount ? activeShared?.mailboxes : (mailboxesResource?.current ?? undefined));
	/** Whichever folder list is on screen — what a move or a read changes. */
	const foldersResource = $derived(mailAccount ? sharedResource : mailboxesResource);

	// A share that was taken back (or a stale link) falls back to your own inbox.
	$effect(() => {
		if (!mailAccount || !sharedList || activeShared) return;
		untrack(() => {
			mailAccount = null;
			selectedMailboxId = null;
			patchQuery({ shared: null, folder: null });
		});
	});

	/**
	 * The address moved and no pick here moved it — a tapped notification, the
	 * Mail tab, Back or Forward (also onto this page from another section): what
	 * it says is what is shown, as on a load. `page.url` is only the signal: it
	 * is set anew by every real navigation and every step through history,
	 * never by the shallow patches that mirror a pick. Nothing is written back;
	 * the address is already right. Without this a notification tapped while
	 * Drafts is open would open its thread as a draft.
	 */
	$effect(() => {
		const link = page.url;
		untrack(() => {
			const params = address();
			// A link's own `?thread=` is opened further down (it may be a draft, and
			// opening marks it read); an entry gone back to shows what it showed.
			if (!link.searchParams.has('thread')) reader.show(params.get('thread'));
			// Nothing picked yet: the first pick is the effect below's.
			if (!selectedMailboxId) return;
			const target = mailboxOfUrl(params, mailboxesResource?.current, sharedList);
			if (target && (target.id !== selectedMailboxId || target.account !== mailAccount)) {
				showMailbox(target.id, target.account);
			}
		});
	});

	/**
	 * `?folder=<mailbox id>` is the open folder — a reload or a shared link lands
	 * there — and the inbox is the URL without it. An unknown id opens the inbox.
	 */
	$effect(() => {
		if (selectedMailboxId || !mailboxList) return;
		const linked = address().get('folder');
		const inbox = mailboxList.find((mailbox) => mailbox.kind === 'inbox');
		const pick = mailboxList.find((mailbox) => mailbox.id === linked) ?? inbox ?? mailboxList[0];
		selectedMailboxId = pick?.id ?? null;
		if (linked !== null && pick?.id !== linked) untrack(() => folderToUrl(pick?.id ?? null));
	});

	function folderToUrl(id: string | null) {
		const inbox = mailboxList?.find((mailbox) => mailbox.kind === 'inbox');
		patchQuery({ folder: id && id !== inbox?.id ? id : null, shared: mailAccount });
	}

	const activeMailbox = $derived.by(() => {
		const box = mailboxList?.find((mailbox) => mailbox.id === selectedMailboxId) ?? null;
		// Whose Inbox it is goes wherever its name is shown.
		return box && activeShared ? { ...box, name: `${box.name} · ${activeShared.name}` } : box;
	});
	const inboxUnseen = $derived(mailboxesResource?.current?.find((box) => box.kind === 'inbox')?.unread ?? 0);
	/** Every mail query and action takes this: absent for your own mailbox. */
	const account = $derived(mailAccount ?? undefined);

	function stepMailbox(delta: number) {
		if (!mailboxList || mailboxList.length === 0) return;
		const currentIndex = mailboxList.findIndex((m) => m.id === selectedMailboxId);
		void selectMailbox(mailboxList[(currentIndex + delta + mailboxList.length) % mailboxList.length]!.id);
	}

	const searching = $derived(searchQuery.trim().length > 0);
	/** Results from every folder: the rows' own folders count, not the open one. */
	const acrossFolders = $derived(searching && searchAll);

	/**
	 * "Load more" asks for a longer list of the same view; any other view
	 * starts again at one page.
	 */
	const listKey = $derived(`${mailAccount}|${activeMailbox?.id}|${listFilter}|${searchQuery}|${searchAll}`);
	let longer = $state({ key: '', limit: 0 });
	const listLimit = $derived(longer.key === listKey ? longer.limit : prefs.pageSize);

	function loadMore() {
		longer = { key: listKey, limit: listLimit + prefs.pageSize };
	}

	const threadsResource = $derived(
		session && activeMailbox && !searching
			? threads({ mailboxId: activeMailbox.id, filter: listFilter, limit: listLimit, kind: activeMailbox.kind, account })
			: undefined
	);

	/**
	 * Search starts in the open folder, which is what the placeholder says; the
	 * results can widen it to every folder.
	 */
	const searchResource = $derived(
		session && searching
			? searchRemote({
					query: searchQuery,
					mailboxId: searchAll ? undefined : activeMailbox?.id,
					limit: listLimit,
					account
				})
			: undefined
	);

	/**
	 * A folder's list is kept from the last visit, and only the open one follows
	 * live changes — so coming back to one shows what it held and asks again.
	 */
	$effect(() => {
		void listKey;
		untrack(() => {
			if (threadsResource?.ready) void threadsResource.refresh();
		});
	});

	/** The same for a folder that is not open: a move into or out of it re-asks its first page. */
	function refreshFolder(mailboxId: string) {
		void threads({
			mailboxId,
			filter: listFilter,
			limit: prefs.pageSize,
			kind: mailboxList?.find((box) => box.id === mailboxId)?.kind,
			account
		})
			.refresh()
			.catch(() => {});
	}

	const labelCountsResource = $derived(
		session && activeMailbox ? labelCounts({ mailboxId: activeMailbox.id, account }) : undefined
	);
	// Whatever moves a folder's unread count moves its labels' too, and every
	// path that changes one (push, a read, a move) refreshes the folder list.
	$effect(() => {
		if (!mailboxList) return;
		untrack(() => void labelCountsResource?.refresh());
	});

	/** Whichever of the two is driving the list right now. */
	const listResource = $derived(searching ? searchResource : threadsResource);
	/**
	 * What the list shows. A longer list is a new query, so while it loads the
	 * shorter one stays up rather than blanking the list under a scrolled reader.
	 */
	let shownList = $state.raw<{ key: string; data: ThreadListDTO } | null>(null);
	$effect(() => {
		const data = listResource?.current;
		if (data) shownList = { key: listKey, data };
	});
	const listData = $derived(
		listResource?.current ?? (shownList?.key === listKey ? shownList.data : undefined)
	);
	const threadResource = $derived(
		session && openThreadId ? thread({ threadId: openThreadId, account }) : undefined
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
		const rows = listData?.rows;
		if (!rows || !activeMailbox) return undefined;
		const isMe = (email: string) => myEmails.has(email.trim().toLowerCase());
		return buildRowGroups(rows, activeMailbox.kind, isMe);
	});

	const flatRows = $derived((rowGroups ?? []).flatMap((group) => group.rows));
	const flatRowIds = $derived(flatRows.map((row) => row.threadId));

	// --- compose ---

	/** A draft save touches only Drafts; a send (or its undo) lands anywhere — Sent, Scheduled, the thread you replied in. */
	function afterMailMutation(anyList = false) {
		void mailboxesResource?.refresh();
		if (anyList || activeMailbox?.kind === 'drafts') void listResource?.refresh();
	}

	// Compose's transport is the layout's; it tells whichever Mail page is up.
	$effect(() => {
		shell.mailChanged = afterMailMutation;
		return () => {
			if (shell.mailChanged === afterMailMutation) shell.mailChanged = undefined;
		};
	});

	/**
	 * Compose suggestions: the address book first (every address on every
	 * card, labelled by the card's own label), then whoever wrote to this
	 * folder recently, then the people webmail 1.0 remembered in this browser
	 * (same origin once mail2 serves its domain), most-written-to first. One
	 * list, deduplicated on the address, so a saved person is never also
	 * offered as "Recent".
	 */
	const contactsResource = $derived(session ? contactsRemote() : undefined);
	const webmailCorrespondents = $derived.by(() => {
		const accountId = contactsResource?.current?.accountId;
		if (!accountId) return [];
		try {
			const list = JSON.parse(localStorage.getItem(`zaur:contacts:v2:${accountId}`) ?? '[]');
			return (Array.isArray(list) ? list : [])
				.filter((entry) => typeof entry?.email === 'string')
				.sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0)) as { email: string; name?: string }[];
		} catch {
			return [];
		}
	});
	$effect(() => {
		const rows = listData?.rows;
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
		for (const entry of webmailCorrespondents) add(entry.name ?? '', entry.email, 'Recent');
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
			if (mailbox) {
				void mailboxesResource?.refresh();
				void sharedResource?.refresh();
			}
			if (contact) void contactsResource?.refresh();
		});
		return () => live.stop();
	});

	// What the last visit left behind: drafts that a dead connection kept on
	// this device go up when it returns. (The outbox is the layout's to drain.)
	$effect(() => {
		if (!session) return;
		const recover = () => void compose.recoverLocalDrafts();
		recover();
		window.addEventListener('online', recover);
		return () => window.removeEventListener('online', recover);
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
		// After the identities load, or the draft has no From and no signature.
		if (!session || composeLinkHandled || identitiesResource?.loading !== false) return;
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
		patchQuery({ to: null, invite: null });
	});

	async function openReply(
		mode: 'reply' | 'replyAll' | 'forward',
		message: MessageDetail,
		anchor: AnchorRect | null
	) {
		const position = panelPosition(anchor);
		// A forward is sent from your mailbox, so a shared one's files are copied into it first.
		if (mailAccount && mode === 'forward' && message.attachments.length > 0) {
			const copied = await copyAttachments({
				account: mailAccount,
				blobIds: message.attachments.map((part) => part.blobId)
			}).catch(() => ({}) as Record<string, string>);
			const attachments = message.attachments
				.filter((part) => copied[part.blobId])
				.map((part) => ({ ...part, blobId: copied[part.blobId]! }));
			if (attachments.length < message.attachments.length) {
				compose.pushToast({ text: 'Some attachments could not be brought along', tone: 'error' });
			}
			message = { ...message, attachments };
		}
		compose.reply(message, myEmails, mode, position);
	}

	const selectedIds = $derived(selectedEmailIds(listData?.rows, selection));

	function markThreadRead(threadId: string) {
		const ids = selectedEmailIds(listData?.rows, new Set([threadId])).filter(
			(id) => listData?.rows.find((row) => row.id === id)?.unread
		);
		if (ids.length === 0) return;
		return bulk({ action: 'read', emailIds: ids, account })
			.then(() => {
				void listResource?.refresh();
				void foldersResource?.refresh();
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
			? selectedEmailIds(listData?.rows, scope)
			: selectedIds;
		if (emailIds.length === 0 || bulkBusy) return;
		// Results from every folder have no one folder to leave: a move replaces
		// where each message lives, and a delete only ever goes to Trash.
		let payload = { action, emailIds, mailboxId, sourceMailboxId: acrossFolders ? undefined : activeMailbox?.id, account };
		if (action === 'delete' && (acrossFolders || activeMailbox?.kind !== 'trash')) {
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
		const destinationKind =
			payload.action === 'move' ? mailboxList?.find((box) => box.id === payload.mailboxId)?.kind : undefined;
		const verbs: Partial<Record<BulkAction, string>> = {
			move: 'moved',
			important: 'marked important',
			unimportant: 'marked not important'
		};
		const verb =
			destinationKind === 'junk'
				? 'marked as spam'
				: destinationKind === 'trash'
					? 'moved to Trash'
					: destinationKind === 'archive'
						? 'archived'
						: (verbs[payload.action] ?? 'updated');
		// Where each moved message came from, so Undo can put it back: the folder,
		// or across folders each row's own.
		const origins = new Map<string, string[]>();
		if (payload.action === 'move') {
			for (const id of emailIds) {
				const from = acrossFolders
					? listData?.rows.find((row) => row.id === id)?.mailboxId
					: activeMailbox?.id;
				if (from && from !== payload.mailboxId) origins.set(from, [...(origins.get(from) ?? []), id]);
			}
		}
		// Leaving Scheduled cancels the send (see `bulk`), which moving back would not restore.
		const unscheduled = [...origins.keys()].some(
			(id) => mailboxList?.find((box) => box.id === id)?.kind === 'scheduled'
		);
		const undoable = origins.size > 0 && !unscheduled;
		bulkBusy = true;
		try {
			const { count } = await bulk(payload);
			// A thread that just left the folder can't stay open in the reader.
			if (leavesFolder && openThreadId && scope.has(openThreadId)) reader.close();
			// The cursor steps to the row that takes the place of the one that left, so `e` `e` `e` works down a list.
			if (leavesFolder && cursorId && scope.has(cursorId)) {
				const at = flatRowIds.indexOf(cursorId);
				const stays = (id: string) => !scope.has(id);
				cursorId = flatRowIds.slice(at + 1).find(stays) ?? flatRowIds.slice(0, at).findLast(stays) ?? null;
			}
			if (!threadIds) selection = new Set();
			void listResource?.refresh();
			void foldersResource?.refresh();
			// The folder that just received these keeps a cached list of its own, so
			// without this, opening it straight after a move shows it as it was
			// before — which reads as a move that did not happen.
			if (payload.action === 'move' && payload.mailboxId) refreshFolder(payload.mailboxId);
			// The server destroys only what is still in this folder; a row that had
			// gone stale names a message that lives elsewhere now, and stays there.
			if (payload.action === 'delete' && count === 0) {
				compose.pushToast({ text: `Not deleted — no longer in ${activeMailbox?.name ?? 'this folder'}`, tone: 'info' });
				return;
			}
			// A row is a conversation, and that is what was acted on — "2 messages
			// moved" for one row reads as one too many. A destroy counts what it
			// destroyed, message by message, as its confirmation did.
			const said =
				payload.action === 'delete'
					? `${count} ${count === 1 ? 'message' : 'messages'} deleted`
					: `${scope.size} ${scope.size === 1 ? 'conversation' : 'conversations'} ${verb}`;
			const text = `${said}${unscheduled ? ' — not sent' : ''}`;
			const destination = payload.mailboxId!;
			compose.pushToast(
				undoable
					? { text, tone: 'success', actionLabel: 'Undo', action: () => void undoMove(origins, destination, payload.account) }
					: { text, tone: 'success' }
			);
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : 'Action failed',
				tone: 'error'
			});
		} finally {
			bulkBusy = false;
		}
	}

	/** Trash and Spam: every message in the folder, gone for good. */
	async function emptyOpenFolder() {
		const box = activeMailbox;
		if (!box || bulkBusy) return;
		const n = box.total;
		if (!confirm(`Delete ${n === 1 ? 'the message' : `all ${n} messages`} in ${box.name} forever? This can't be undone.`)) return;
		bulkBusy = true;
		try {
			const { count } = await emptyFolder({ mailboxId: box.id, account });
			reader.close();
			selection = new Set();
			void listResource?.refresh();
			compose.pushToast({ text: `${box.name} emptied — ${count} ${count === 1 ? 'message' : 'messages'} deleted`, tone: 'success' });
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : `Could not empty ${box.name}`,
				tone: 'error'
			});
		} finally {
			bulkBusy = false;
		}
	}

	/** Stops a scheduled send; the message, now back in Drafts, opens to be edited. */
	async function cancelSend(message: MessageDetail) {
		try {
			await cancelScheduled({ emailId: message.id });
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : 'Could not cancel the send',
				tone: 'error'
			});
			return;
		}
		reader.close();
		compose.reopenDraft(draftSeed(message), panelPosition());
		void listResource?.refresh();
		void mailboxesResource?.refresh();
		compose.pushToast({ text: 'Send cancelled — it is a draft again', tone: 'info' });
	}

	/** A move's Undo: each message back to the folder it came from. */
	async function undoMove(origins: Map<string, string[]>, from: string, account: string | undefined) {
		try {
			await Promise.all(
				[...origins].map(([mailboxId, emailIds]) =>
					bulk({ action: 'move', emailIds, mailboxId, sourceMailboxId: from, account })
				)
			);
			void listResource?.refresh();
			void foldersResource?.refresh();
			// The folder they were taken back out of must stop listing them: a row
			// left there would offer to delete a message that is no longer in it.
			refreshFolder(from);
		} catch (cause) {
			compose.pushToast({
				text: cause instanceof Error ? cause.message : 'Could not undo the move',
				tone: 'error'
			});
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
	 * `/?thread=<id>` opens that thread, in `?folder=`'s folder or the inbox:
	 * where a new-mail notification points, and what a reload with a thread open
	 * lands on. Taken off the URL before the reader opens, which puts it back —
	 * on a phone as its own entry, so Back returns to the plain list. Once per
	 * link, and in turn with the other history changes (a folder switch the
	 * same link caused is patching the URL too).
	 */
	let threadLinkHandled = false;
	$effect(() => {
		// Read first, as above. An `?account=` on the same link is settled before
		// the thread (it may reload into another account).
		const threadId = page.url.searchParams.has('account') ? null : page.url.searchParams.get('thread');
		if (!session || threadLinkHandled || !activeMailbox || threadId === null) return;
		// A reload inside a phone's reader: its entry, kept across the reload, already shows the thread.
		if (page.state.reader === threadId) return;
		threadLinkHandled = true;
		// Untracked: opening marks the thread read, and a command bumps its own state.
		// A real (replacing) navigation, not replaceState: on a phone the reader pushes
		// a shallow entry relative to the page's URL, which must already be clean.
		untrack(() => {
			void inOrder(() => {
				const url = new URL(location.href);
				url.searchParams.delete('thread');
				return goto(url, { replace: true, reset: false });
			}).then(() => {
				threadLinkHandled = false;
				return openRow(threadId);
			});
		});
	});

	// A subscribed browser checks in on every load, so its push row does not age out.
	onMount(() => {
		resyncPush().catch(() => {});
	});

	async function openRow(threadId: string) {
		// The row you opened is where the keyboard is: `e` files what you are
		// reading, `j` goes to the one after it. A phone has no cursor to show.
		if (!viewport.phone) cursorId = threadId;
		// The reader hides the top bar on a phone, and with it the drawer's only
		// toggle — so the drawer never survives into a thread.
		if (drawerOpen) await drawer.hide();
		const rowMailbox = listData?.rows.find((row) => row.threadId === threadId)?.mailboxId;
		const kind = acrossFolders
			? mailboxList?.find((mailbox) => mailbox.id === rowMailbox)?.kind
			: activeMailbox?.kind;
		// Someone else's draft is read, not picked up: it is theirs to finish.
		if (kind !== 'drafts' || mailAccount) {
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
		// Whoever handled the key already owns it: a popover closing on Escape, a row opening on Enter.
		if (event.defaultPrevented) return;
		const target = event.target as HTMLElement | null;
		if (event.key === 'Escape' && drawerOpen) {
			event.preventDefault();
			void drawer.hide();
			return;
		}
		// An open menu, popover or link dialog keeps Escape and what is typed into it (type-ahead).
		const inLayer = !!target?.closest?.('[data-scope][data-part="content"], [data-trix-dialog], dialog');
		if (event.key === 'Escape' && !inLayer) {
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

		// The drawer is modal; a select takes letters as type-ahead, like a field.
		if (inLayer || drawerOpen) return;
		// A compose panel owns the keyboard wherever in it the focus is (its title bar, a button), and
		// still does when focus fell out of it to <body>: letters meant for a message archived mail.
		if (target?.closest?.('[role="dialog"]') || (target === document.body && compose.holdsKeys())) return;
		if (target && (target.matches?.('input, textarea, select') || target.isContentEditable)) return;
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
				// Enter on a link or a button presses it; `o` is the key that always opens.
				if (event.key === 'Enter' && target?.closest?.('a[href], button, [role="button"], [role="separator"], summary')) break;
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
			case 'i': {
				event.preventDefault();
				const important = selection.size > 0
					? flatRows.filter((row) => selection.has(row.threadId)).every((row) => row.important)
					: (cursorRow?.important ?? false);
				runRowShortcut(important ? 'unimportant' : 'important');
				break;
			}
			case 'u': {
				event.preventDefault();
				const seen = selection.size > 0
					? flatRows.filter((row) => selection.has(row.threadId)).every((row) => !row.unread)
					: !(cursorRow?.unread ?? false);
				runRowShortcut(seen ? 'unread' : 'read');
				break;
			}
			case 'e':
				event.preventDefault();
				if (archiveTarget) runRowShortcut('move', archiveTarget.id);
				break;
			// The thread in the reader: reply, reply all, forward — from its latest message, as its toolbar does.
			case 'r':
			case 'a':
			case 'f': {
				const latest = threadResource?.current?.at(-1);
				if (!latest) break;
				event.preventDefault();
				void openReply(event.key === 'r' ? 'reply' : event.key === 'a' ? 'replyAll' : 'forward', latest, null);
				break;
			}
			// Deliberately shift-# and not Delete: in Trash this one destroys.
			case '#':
				event.preventDefault();
				runRowShortcut('delete');
				break;
			case '[':
				event.preventDefault();
				toggleSidebar();
				break;
			case '?':
				event.preventDefault();
				statusLine?.showKeys();
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
<!-- A pinned tab says how much is waiting in the inbox, and which folder it is on. -->
<svelte:head><title>{inboxUnseen > 0 ? `(${inboxUnseen}) ` : ''}{activeMailbox?.name ?? 'Mail'} · Zaur Mail</title></svelte:head>

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

{#if signedOut}
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
			waiting={compose.outboxCount}
		/>
	{/if}
	<main
		bind:this={mainEl}
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
					data-drawer
					tabindex="-1"
					class="absolute inset-0 z-40 bg-[var(--z-scrim)] lg:hidden"
					aria-label="Close folder list"
					onclick={() => void drawer.hide()}
				></button>
			{/if}
			<div
				bind:this={drawerEl}
				data-drawer
				role={viewport.compact ? 'dialog' : undefined}
				aria-label={viewport.compact ? 'Mailboxes' : undefined}
				class="max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[280px] max-lg:max-w-[85%] max-lg:shadow-[var(--z-shadow-panel)]"
			>
				<Sidebar
					mailboxes={mailboxesResource?.current ?? undefined}
					shared={sharedList}
					activeAccount={mailAccount}
					activeMailboxId={selectedMailboxId}
					onSelectMailbox={selectMailbox}
					filter={listFilter}
					onFilter={pickLabel}
					labelCounts={labelCountsResource?.current}
					onClose={viewport.compact ? () => drawer.hide() : undefined}
					onNewMessage={() => void drawer.hide().then(() => openCompose())}
					onDropThread={mailAccount
						? undefined
						: (mailboxId, threadId) => void runBulk('move', mailboxId, selection.has(threadId) ? undefined : [threadId])}
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
			loading={listResource?.loading ?? true}
			error={listResource?.error}
			hasMore={listData?.hasMore ?? false}
			onLoadMore={loadMore}
			{searchAll}
			onSearchAll={(all) => (searchAll = all)}
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
			onEmpty={() => void emptyOpenFolder()}
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
			onCancelSend={mailAccount ? undefined : (message) => void cancelSend(message)}
			shared={activeShared}
		/>
	</main>

	{#each compose.drafts as draft (draft.id)}
		{#if draft.stage !== 'minimized'}
			<ComposePanel {draft} {rootW} {rootH} />
		{/if}
	{/each}
	<ComposeDock />
{/if}

<StatusLine
	bind:this={statusLine}
	waiting={compose.outboxCount}
	mailboxName={activeMailbox?.name ?? null}
	unseen={activeMailbox?.unread ?? 0}
	quota={quotaResource?.current}
/>
