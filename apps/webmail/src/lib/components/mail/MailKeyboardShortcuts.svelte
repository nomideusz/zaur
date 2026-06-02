<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { search } from '$lib/stores/search.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { resolveMailboxRouteByShortcut } from '$lib/mail/folder-shortcuts';
	import { canMarkImportantFromMailboxRole } from '$lib/mail/mailboxes';
	import { mailListHref, mailThreadHref, parseMailContext } from '$lib/mail/routes';
	import { threadActionMessage } from '$lib/components/mail/message-list-utils';
	import { isTypingTarget } from '$lib/utils/keyboard';
	import type { MessagePreview } from '$lib/types/mail';

	function listMessages(): MessagePreview[] {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx) return [];
		return ctx.kind === 'search' ? search.results : mail.messages;
	}

	function currentMessage(): MessagePreview | null {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx?.threadId) return null;
		const messages = listMessages();
		return messages.find((message) => message.threadId === ctx.threadId) ?? mail.messages.find(
			(message) => message.threadId === ctx.threadId
		) ?? null;
	}

	function navigateList(delta: number) {
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

		const mailbox = ctx.kind === 'search' ? next.mailboxId : ctx.mailboxRouteId!;
		const params = new URLSearchParams();
		params.set('messageId', next.id);
		goto(mailThreadHref(mailbox, next.threadId, params));
	}

	function navigateNextNew() {
		const ctx = parseMailContext($page.url.pathname);
		if (!ctx) return;

		const newMessages = listMessages().filter((message) => message.unread);
		if (!newMessages.length) return;

		const current = currentMessage();
		const currentIndex = current ? newMessages.findIndex((message) => message.id === current.id) : -1;
		const next = newMessages[currentIndex + 1] ?? newMessages[0];
		if (!next) return;

		const mailbox = ctx.kind === 'search' ? next.mailboxId : ctx.mailboxRouteId ?? next.mailboxId;
		if (!mailbox) return;

		const params = new URLSearchParams();
		params.set('messageId', next.id);
		goto(mailThreadHref(mailbox, next.threadId, params));
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
				goto(mailListHref(routeId));
			}
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Action failed', 'error');
		}
	}

	function openCompose(mode?: 'reply' | 'reply-all') {
		const thread = mail.selectedThread;
		const latest = thread.at(-1);
		if (!latest) return;

		const resolved =
			mode ?? (settings.defaultReplyMode === 'reply-all' ? 'reply-all' : 'reply');

		if (resolved === 'reply') {
			compose.startReply(latest);
			goto('/mail/compose?mode=reply');
			return;
		}

		if (!auth.username) return;
		compose.startReplyAll(latest, thread, auth.username);
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
		compose.startForward(latest);
		goto('/mail/compose?mode=forward');
	}

	onMount(() => {
		let pendingGotoPrefix = false;
		let pendingGotoPrefixTimer: ReturnType<typeof setTimeout> | null = null;

		function clearGotoPrefix() {
			pendingGotoPrefix = false;
			if (pendingGotoPrefixTimer) {
				clearTimeout(pendingGotoPrefixTimer);
				pendingGotoPrefixTimer = null;
			}
		}

		function armGotoPrefix() {
			pendingGotoPrefix = true;
			if (pendingGotoPrefixTimer) clearTimeout(pendingGotoPrefixTimer);
			pendingGotoPrefixTimer = setTimeout(() => {
				pendingGotoPrefix = false;
				pendingGotoPrefixTimer = null;
			}, 1250);
		}

		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (isTypingTarget(event.target)) return;

			const ctx = parseMailContext($page.url.pathname);
			if (!ctx) return;

			if (event.key === 'Escape' && ctx.threadId && !mail.hasSelection) {
				event.preventDefault();
				const routeId = ctx.mailboxRouteId ?? currentMessage()?.mailboxId ?? 'inbox';
				goto(mailListHref(routeId));
				return;
			}

			if (event.key === 'Escape' && mail.hasSelection) {
				event.preventDefault();
				mail.clearSelection();
				clearGotoPrefix();
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) return;

			const key = event.key;

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

			if (key === 'j' || key === 'k') {
				event.preventDefault();
				navigateList(key === 'j' ? 1 : -1);
				return;
			}

			if (key === 'n') {
				event.preventDefault();
				navigateNextNew();
				return;
			}

			if (!ctx.threadId && key !== 'c') return;

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
					void withLatest((message) => {
						if (!auth.client || !message.unread) return;
						return mail.markMessageDone(auth.client, message);
					});
					break;
				case 'u':
					event.preventDefault();
					if (!auth.client) break;
					const importantTarget =
						mail.selectedThread.length > 0
							? threadActionMessage(
									mail.selectedThread,
									$page.url.searchParams.get('messageId'),
									mail.messages
								)
							: (currentMessage() ?? mail.selectedThread.at(-1));
					if (!importantTarget) break;
					{
						const routeId =
							parseMailContext($page.url.pathname)?.mailboxRouteId ??
							importantTarget.mailboxId;
						const mailbox = mail.mailboxByRouteId(routeId);
						if (
							!importantTarget.important &&
							!canMarkImportantFromMailboxRole(mailbox?.role)
						) {
							break;
						}
					}
					void mail.toggleImportant(auth.client, importantTarget).catch((error) => {
						const message = error instanceof Error ? error.message : 'Could not update important';
						toast.show(message, 'error');
					});
					break;
				case '#':
				case 'Delete':
					event.preventDefault();
					void withLatest(
						(message) => {
							if (!auth.client) return;
							const routeId =
								parseMailContext($page.url.pathname)?.mailboxRouteId ?? message.mailboxId;
							const mailbox = mail.mailboxByRouteId(routeId);
							const permanent = mailbox?.role === 'trash';
							if (!settings.confirmDeleteMessage(1, permanent)) return;
							return mail.deleteMessage(auth.client, message, routeId);
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
		};
	});
</script>
