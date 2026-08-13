<script lang="ts">
	import { errorMessage } from '@zaur/mail-core/utils/errors';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ShortcutsHelpDialog from '$lib/components/mail/ShortcutsHelpDialog.svelte';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { resolveMailboxRouteByShortcut } from '$lib/mail/folder-shortcuts';
	import { selectStarFilter, triageMode } from '$lib/mail/keyboard-triage';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { mailListBackHref, mailListHref, mailThreadHref, parseMailContext } from '$lib/mail/routes';
	import { replyFromAddress } from '$lib/mail/reader-delivered-to';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { isTypingTarget } from '$lib/utils/keyboard';
	import type { MessagePreview } from '$lib/types/mail';

	let helpOpen = $state(false);

	function listMessages(): MessagePreview[] {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx) return [];
		return ctx.kind === 'search' ? search.results : mail.messages;
	}

	function currentMessage(): MessagePreview | null {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx?.threadId) return null;
		const messages = listMessages();
		return (
			messages.find((message) => message.threadId === ctx.threadId) ??
			mail.messages.find((message) => message.threadId === ctx.threadId) ??
			null
		);
	}

	function cursorMessage(): MessagePreview | null {
		const id = mail.listCursorId;
		if (!id) return null;
		return listMessages().find((message) => message.id === id) ?? null;
	}

	function openMessage(message: MessagePreview) {
		const ctx = parseMailContext($page.url.pathname);
		const mailbox =
			ctx?.kind === 'search' ? message.mailboxId : (ctx?.mailboxRouteId ?? message.mailboxId);
		if (!mailbox) return;
		mail.setListCursor(message.id);
		const params = new URLSearchParams();
		params.set('messageId', message.id);
		goto(mailThreadHref(mailbox, message.threadId, params));
	}

	/** Reader mode: j/k still open next/prev thread. */
	function navigateReader(delta: number) {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx) return;

		const messages = listMessages();
		if (!messages.length) return;

		const currentId = ctx.threadId;
		let index = currentId
			? messages.findIndex((message) => message.threadId === currentId)
			: -1;

		if (index === -1) {
			index = delta > 0 ? -1 : messages.length;
		}

		const next = messages[index + delta];
		if (!next) return;
		openMessage(next);
	}

	function moveListCursor(delta: number, rangeSelect: boolean) {
		const prevId = mail.listCursorId;
		const nextId = mail.moveListCursor(delta);
		if (!nextId) return;

		if (rangeSelect) {
			if (!mail.hasSelection && prevId) {
				mail.selectMessageAt(nextId, { shift: true, activeMessageId: prevId });
			} else {
				mail.selectMessageAt(nextId, {
					shift: true,
					activeMessageId: mail.selectionAnchorId ?? prevId
				});
			}
		}
	}

	function navigateNextNew() {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx) return;

		const newMessages = listMessages().filter((message) => message.unread);
		if (!newMessages.length) return;

		const current = currentMessage() ?? cursorMessage();
		const currentIndex = current
			? newMessages.findIndex((message) => message.id === current.id)
			: -1;
		const next = newMessages[currentIndex + 1] ?? newMessages[0];
		if (!next) return;

		const mode = triageMode({ hasThread: !!ctx.threadId, hasSelection: mail.hasSelection });
		if (mode === 'reader') {
			openMessage(next);
			return;
		}
		mail.setListCursor(next.id);
	}

	async function withLatest(
		action: (message: MessagePreview) => Promise<void> | void,
		options?: { leaveThread?: boolean }
	) {
		const message = currentMessage() ?? mail.selectedThread.at(-1);
		if (!message || !auth.client) return;
		const ctx = parseMailContext($page.url.pathname);
		try {
			await action(message);
			if (options?.leaveThread && ctx?.threadId) {
				const routeId = ctx.mailboxRouteId ?? message.mailboxId;
				goto(mailListBackHref(routeId));
			}
		} catch (error) {
			toast.show(errorMessage(error, 'Action failed'), 'error');
		}
	}

	async function withCursorOrSelection(
		single: (message: MessagePreview) => Promise<void> | void,
		bulk: () => Promise<void> | void
	) {
		if (!auth.client) return;
		try {
			if (mail.hasSelection) {
				await bulk();
				return;
			}
			const message = cursorMessage();
			if (!message) return;
			await single(message);
		} catch (error) {
			toast.show(errorMessage(error, 'Action failed'), 'error');
		}
	}

	function openCompose(mode?: 'reply' | 'reply-all') {
		const thread = mail.selectedThread;
		const latest = thread.at(-1);
		if (!latest) return;

		const resolved =
			mode ?? (settings.defaultReplyMode === 'reply-all' ? 'reply-all' : 'reply');

		if (resolved === 'reply') {
			compose.startReply(latest, replyFromAddress(latest, auth.username, auth.identities));
			goto('/mail/compose?mode=reply');
			return;
		}

		if (!auth.username) return;
		compose.startReplyAll(
			latest,
			thread,
			auth.username,
			replyFromAddress(latest, auth.username, auth.identities)
		);
		goto('/mail/compose?mode=reply-all');
	}

	async function forwardSelectedMessage() {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx?.threadId || !auth.client) return;

		let latest = mail.selectedThread.at(-1);
		const routeId =
			ctx.mailboxRouteId ??
			latest?.mailboxId ??
			mail.messages.find((message) => message.threadId === ctx.threadId)?.mailboxId;
		if (!routeId) return;

		const needsLoad =
			!latest ||
			mail.selectedThreadId !== ctx.threadId ||
			(latest.hasAttachment && latest.attachments.length === 0);

		if (needsLoad) {
			await mail.loadMessage(auth.client, routeId, ctx.threadId);
			latest = mail.selectedThread.at(-1);
		}

		if (!latest) return;
		compose.startForward(latest, replyFromAddress(latest, auth.username, auth.identities));
		goto('/mail/compose?mode=forward');
	}

	async function markSeenTarget(message: MessagePreview) {
		if (!auth.client || !message.unread) return;
		await mail.markMessageDone(auth.client, message);
	}

	async function toggleUnseenTarget(message: MessagePreview) {
		if (!auth.client) return;
		if (message.unread) await mail.markMessageDone(auth.client, message);
		else await mail.markMessageNew(auth.client, message);
	}

	async function archiveTarget(message: MessagePreview) {
		if (!auth.client) return;
		await mail.moveMessage(auth.client, message, 'archive');
	}

	async function trashTarget(message: MessagePreview, routeId: string) {
		if (!auth.client) return;
		const mailbox = mail.mailboxByRouteId(routeId);
		const permanent = mailbox?.role === 'trash';
		if (!(await settings.confirmDeleteMessage(1, permanent))) return;
		await mail.deleteMessage(auth.client, message, routeId);
	}

	onMount(() => {
		let pendingGotoPrefix = false;
		let pendingGotoPrefixTimer: ReturnType<typeof setTimeout> | null = null;
		let pendingSelectStar = false;
		let pendingSelectStarTimer: ReturnType<typeof setTimeout> | null = null;
		let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
		let lastPrefetchId: string | null = null;

		function clearGotoPrefix() {
			pendingGotoPrefix = false;
			if (pendingGotoPrefixTimer) {
				clearTimeout(pendingGotoPrefixTimer);
				pendingGotoPrefixTimer = null;
			}
		}

		function clearSelectStar() {
			pendingSelectStar = false;
			if (pendingSelectStarTimer) {
				clearTimeout(pendingSelectStarTimer);
				pendingSelectStarTimer = null;
			}
		}

		function armGotoPrefix() {
			pendingGotoPrefix = true;
			clearSelectStar();
			if (pendingGotoPrefixTimer) clearTimeout(pendingGotoPrefixTimer);
			pendingGotoPrefixTimer = setTimeout(() => {
				pendingGotoPrefix = false;
				pendingGotoPrefixTimer = null;
			}, 1250);
		}

		function armSelectStar() {
			pendingSelectStar = true;
			clearGotoPrefix();
			if (pendingSelectStarTimer) clearTimeout(pendingSelectStarTimer);
			pendingSelectStarTimer = setTimeout(() => {
				pendingSelectStar = false;
				pendingSelectStarTimer = null;
			}, 1250);
		}

		function schedulePrefetch(messageId: string | null) {
			if (!messageId || !auth.client || messageId === lastPrefetchId) return;
			if (prefetchTimer) clearTimeout(prefetchTimer);
			prefetchTimer = setTimeout(() => {
				prefetchTimer = null;
				const message = listMessages().find((entry) => entry.id === messageId);
				if (!message || !auth.client) return;
				lastPrefetchId = messageId;
				void mail.loadMessage(auth.client, message.mailboxId, message.threadId).catch(() => {
					/* best-effort warm */
				});
			}, 150);
		}

		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (isTypingTarget(event.target)) return;

			const pathname = $page.url.pathname;
			// Compose owns its own keys (Tab, Ctrl+Enter, Escape). List shortcuts
			// must not fire while the panel is open — including when focus is on
			// a toolbar button rather than the body.
			if (pathname.startsWith('/mail/compose')) return;
			if (pathname.startsWith('/settings')) {
				if (event.key === 'Escape') return;
				if (event.key === ',' && !event.metaKey && !event.ctrlKey && !event.altKey) {
					event.preventDefault();
					goto('/settings/account');
				}
				return;
			}

			const ctx = parseMailContext(pathname);
			if (!ctx) {
				if (event.key === ',' && !event.metaKey && !event.ctrlKey && !event.altKey) {
					event.preventDefault();
					goto('/settings/account');
				}
				return;
			}

			const mode = triageMode({
				hasThread: !!ctx.threadId,
				hasSelection: mail.hasSelection
			});

			if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
				event.preventDefault();
				helpOpen = !helpOpen;
				return;
			}

			if (helpOpen && event.key === 'Escape') {
				event.preventDefault();
				helpOpen = false;
				return;
			}

			if (event.key === 'Escape' && mail.hasSelection) {
				event.preventDefault();
				mail.clearSelection();
				clearGotoPrefix();
				clearSelectStar();
				return;
			}

			if (event.key === 'Escape' && ctx.threadId) {
				event.preventDefault();
				const routeId = ctx.mailboxRouteId ?? currentMessage()?.mailboxId ?? 'inbox';
				goto(mailListBackHref(routeId));
				return;
			}

			if (event.key === ',' && !event.metaKey && !event.ctrlKey && !event.altKey) {
				event.preventDefault();
				goto('/settings/account');
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) return;

			const key = event.key;

			if (pendingSelectStar) {
				const filter = selectStarFilter(key);
				clearSelectStar();
				if (filter) {
					event.preventDefault();
					mail.selectMessagesByFilter(filter);
					return;
				}
			}

			if (pendingGotoPrefix) {
				const targetRouteId = resolveMailboxRouteByShortcut(mail.mailboxes, key);
				clearGotoPrefix();
				if (targetRouteId) {
					event.preventDefault();
					goto(mailListHref(targetRouteId));
					return;
				}
			}

			if (key === 'g') {
				event.preventDefault();
				armGotoPrefix();
				return;
			}

			if (key === '*') {
				event.preventDefault();
				armSelectStar();
				return;
			}

			if (key === 'c') {
				event.preventDefault();
				goto('/mail/compose');
				return;
			}

			if (key === 'j' || key === 'k') {
				event.preventDefault();
				const delta = key === 'j' ? 1 : -1;
				if (mode === 'reader') {
					navigateReader(delta);
				} else {
					moveListCursor(delta, event.shiftKey);
					schedulePrefetch(mail.listCursorId);
				}
				return;
			}

			if (key === 'n') {
				event.preventDefault();
				navigateNextNew();
				schedulePrefetch(mail.listCursorId);
				return;
			}

			if (key === 'Enter' || key === 'o') {
				if (mode === 'reader') return;
				const message = cursorMessage();
				if (!message) return;
				event.preventDefault();
				openMessage(message);
				return;
			}

			if ((key === 'x' || key === 'X') && mode !== 'reader') {
				event.preventDefault();
				const message = cursorMessage();
				if (!message) return;
				if (event.shiftKey || key === 'X') {
					mail.selectMessageAt(message.id, {
						shift: true,
						activeMessageId: mail.selectionAnchorId ?? message.id
					});
				} else {
					mail.toggleMessageSelection(message.id);
				}
				return;
			}

			if (key === 'v' && mode !== 'reader') {
				event.preventDefault();
				const message = cursorMessage();
				if (!mail.hasSelection && message) {
					mail.startSelection(message.id);
				}
				if (mail.hasSelection || message) {
					window.dispatchEvent(new CustomEvent('zaur:open-bulk-move'));
				}
				return;
			}

			if (key === 's') {
				event.preventDefault();
				if (mode === 'reader') {
					void withLatest((message) => markSeenTarget(message));
					return;
				}
				void withCursorOrSelection(
					(message) => markSeenTarget(message),
					() => mail.bulkMarkAsSeen(auth.client!)
				);
				return;
			}

			if (key === 'u') {
				event.preventDefault();
				if (mode === 'reader') {
					if (!auth.client) return;
					const importantTarget =
						mail.selectedThread.length > 0
							? threadActionMessage(
									mail.selectedThread,
									$page.url.searchParams.get('messageId'),
									mail.messages
								)
							: (currentMessage() ?? mail.selectedThread.at(-1));
					if (!importantTarget) return;
					const routeId = ctx.mailboxRouteId ?? importantTarget.mailboxId;
					const mailbox = mail.mailboxByRouteId(routeId);
					if (
						!importantTarget.important &&
						!canMarkImportantFromMailboxRole(mailbox?.role)
					) {
						return;
					}
					void withLatest((message) => mail.toggleImportant(auth.client!, message), {
						leaveThread: true
					});
					return;
				}
				void withCursorOrSelection(
					(message) => toggleUnseenTarget(message),
					async () => {
						const selected = mail.selectedMessages();
						const unread = selected.filter((message) => message.unread);
						const read = selected.filter((message) => !message.unread);
						if (unread.length >= read.length && unread.length) {
							await mail.bulkMarkAsSeen(auth.client!);
						} else if (read.length) {
							await mail.bulkMarkAsNew(auth.client!);
						}
					}
				);
				return;
			}

			if (key === 'e') {
				event.preventDefault();
				if (mode === 'reader') {
					void withLatest((message) => archiveTarget(message), { leaveThread: true });
					return;
				}
				void withCursorOrSelection(
					(message) => archiveTarget(message),
					async () => {
						const archive = mail.mailboxes.find((mb) => mb.role === 'archive');
						if (!archive) return;
						await mail.bulkMoveToMailbox(auth.client!, archive.id);
					}
				);
				return;
			}

			if (key === '#' || key === 'Delete') {
				event.preventDefault();
				if (mode === 'reader') {
					void withLatest(async (message) => {
						const routeId = ctx.mailboxRouteId ?? message.mailboxId;
						await trashTarget(message, routeId);
					}, { leaveThread: true });
					return;
				}
				void withCursorOrSelection(
					async (message) => {
						const routeId = ctx.mailboxRouteId ?? message.mailboxId;
						await trashTarget(message, routeId);
					},
					async () => {
						const routeId = ctx.mailboxRouteId ?? 'inbox';
						const mailbox = mail.mailboxByRouteId(routeId);
						const permanent = mailbox?.role === 'trash';
						const count = mail.selectedCount;
						if (!(await settings.confirmDeleteMessage(count, permanent))) return;
						await mail.bulkDelete(auth.client!, routeId);
					}
				);
				return;
			}

			/* Reader-only compose actions */
			if (mode !== 'reader') return;

			switch (key) {
				case 'r':
					event.preventDefault();
					openCompose('reply');
					break;
				case 'a':
					event.preventDefault();
					openCompose('reply-all');
					break;
				case 'f':
					event.preventDefault();
					void forwardSelectedMessage();
					break;
				case 'd':
					event.preventDefault();
					void withLatest(
						(message) => {
							if (!auth.client) return;
							if (!message.unread && !message.important) return;
							return mail.fileAsNotImportant(auth.client, message);
						},
						{ leaveThread: true }
					);
					break;
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => {
			window.removeEventListener('keydown', onKeydown);
			clearGotoPrefix();
			clearSelectStar();
			if (prefetchTimer) clearTimeout(prefetchTimer);
		};
	});
</script>

<ShortcutsHelpDialog open={helpOpen} onOpenChange={(open) => (helpOpen = open)} />
