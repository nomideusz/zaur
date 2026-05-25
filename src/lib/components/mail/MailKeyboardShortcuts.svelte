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
	import { isTypingTarget } from '$lib/utils/keyboard';
	import type { MessagePreview } from '$lib/types/mail';

	function parseMailContext(pathname: string) {
		const parts = pathname.split('/').filter(Boolean);
		if (parts[0] !== 'mail') return null;
		if (parts[1] === 'compose') return null;

		if (parts[1] === 'search') {
			return { kind: 'search' as const, mailboxRouteId: null, threadId: parts[2] ?? null };
		}

		const mailboxRouteId = parts[1] ?? null;
		const threadId = parts[2] ?? null;
		if (!mailboxRouteId) return null;
		return { kind: 'mailbox' as const, mailboxRouteId, threadId };
	}

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
		goto(`/mail/${mailbox}/${next.threadId}`);
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
				goto(`/mail/${routeId}`);
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

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!settings.enableKeyboardShortcuts) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;

			const ctx = parseMailContext($page.url.pathname);
			if (!ctx) return;

			const key = event.key;

			if (key === 'j' || key === 'k') {
				event.preventDefault();
				navigateList(key === 'j' ? 1 : -1);
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
					{
						const latest = mail.selectedThread.at(-1);
						if (!latest) return;
						compose.startForward(latest);
						goto('/mail/compose?mode=forward');
					}
					break;
				case 'e':
					event.preventDefault();
					void withLatest(
						(message) => {
							if (!auth.client) return;
							return mail.moveMessage(auth.client, message, 'archive');
						},
						{ leaveThread: true }
					);
					break;
				case 'u':
					event.preventDefault();
					void withLatest((message) => {
						if (!auth.client) return;
						return mail.markAsRead(auth.client, message, !message.unread);
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
							if (mailbox?.role === 'trash') {
								if (
									!confirm('Permanently delete this message? This cannot be undone.')
								) {
									return;
								}
							}
							return mail.deleteMessage(auth.client, message, routeId);
						},
						{ leaveThread: true }
					);
					break;
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>
