<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
	import Toasts from '#lib/components/compose/Toasts.svelte';
	import { uploadFile } from '#lib/compose/attachments';
	import { compose } from '#lib/compose/store.svelte.ts';
	import PhoneTabBar from '#lib/components/mail/PhoneTabBar.svelte';
	import ShellHeader from '#lib/components/mail/ShellHeader.svelte';
	import { provideShell } from '#lib/shell.svelte.ts';
	import { prefs } from '#lib/settings.svelte.ts';
	import { mailboxes } from '../mail.remote';
	import { whoami } from '../session.remote';
	import { send, cancelScheduled, saveDraft, deleteDraft } from '../compose.remote';

	let { children }: { children: Snippet } = $props();

	const shell = provideShell();

	type BadgeNavigator = Navigator & {
		setAppBadge?: (count: number) => Promise<void>;
		clearAppBadge?: () => Promise<void>;
	};

	/**
	 * The count on the installed app's icon. A push writes it while the app is
	 * closed (the service worker); open, it follows the inbox — the same query
	 * Mail shows its counts from — so reading your mail takes the number down
	 * instead of leaving the last pushed one until the next message. Only asked
	 * for where there is an icon to write on.
	 */
	const boxes = $derived(browser && prefs.appBadge && 'setAppBadge' in navigator ? mailboxes() : undefined);

	$effect(() => {
		const nav = navigator as BadgeNavigator;
		// The server stops sending a count once the badge is off; this clears one that
		// is already on the icon, here and on each device as it next opens the app.
		if (!prefs.appBadge) return void nav.clearAppBadge?.().catch(() => {});
		const unread = boxes?.current?.find((box) => box.kind === 'inbox')?.unread;
		if (unread === undefined) return;
		void (unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => {});
	});

	const who = whoami();

	/**
	 * Compose's way to the server, and its notices, belong to the layout: a
	 * message waiting in the outbox goes out — and says so — whichever section
	 * is open. A draft save touches only Drafts; a send (or its undo) lands
	 * anywhere, so Mail is told which of its lists to ask again.
	 */
	async function told<T>(result: Promise<T>, anyList = false): Promise<T> {
		const value = await result;
		shell.mailChanged?.(anyList);
		return value;
	}
	compose.setTransport({
		get account() {
			return who.current?.key ?? null;
		},
		send: (payload) => told(send(payload), true),
		cancelScheduled: (emailId) => told(cancelScheduled({ emailId }), true),
		uploadAttachment: uploadFile,
		saveDraft: (input) => told(saveDraft(input)),
		deleteDraft: (emailId) => told(deleteDraft({ emailId }))
	});

	// What the last visit left in the outbox. From here it retries itself: the
	// compose store watches the network and the clock.
	$effect(() => {
		if (who.current) void compose.drainOutbox();
	});

	/**
	 * A tapped notification, when a window is already open: the service worker
	 * asks it to show the link rather than loading the app again. Answered at
	 * once — it waits half a second before navigating the window itself.
	 */
	$effect(() => {
		if (!('serviceWorker' in navigator)) return;
		const open = (event: MessageEvent) => {
			if (event.data?.type !== 'zaur:open' || typeof event.data.url !== 'string') return;
			// Our own pages only, as the worker checked: a path, never another origin.
			const url = new URL(event.data.url, location.origin);
			if (url.origin !== location.origin) return;
			event.ports[0]?.postMessage('ok');
			void goto(url).catch(() => location.assign(url));
		};
		navigator.serviceWorker.addEventListener('message', open);
		return () => navigator.serviceWorker.removeEventListener('message', open);
	});
</script>

<!-- A page the browser kept whole and brought back on Back (its back/forward
     cache) never asked the server who is signed in: after a sign-out or an
     account switch it would show the old account's shell. Load it again. -->
<!-- A held send goes out when the window closes; leaving first puts it off to the next visit. -->
<svelte:window
	onpageshow={(event) => event.persisted && location.reload()}
	onbeforeunload={(event) => {
		if (compose.holding) event.preventDefault();
	}}
/>

<!-- Past the 1780px ceiling the body's ground shows either side of the app
     column. No background of its own: iOS colours the status bar from the
     boxes under the top edge (see `.z-screen`), and a second colour there
     makes it guess from a snapshot instead of reading the top bar's.
     (`.z-safe` paints only the screen's inset strips, in the bar's colour.) -->
<div class="z-screen z-safe flex w-full flex-col items-center justify-center overflow-hidden text-[var(--z-ink)]">
	<!-- App column: edge to edge until 1780px, then capped so the chrome at each
	     end stays within reach of the content in the middle. `--z-tabbar-h` lifts
	     what floats on a phone's bottom edge (the dock, notices) above the tabs. -->
	<div
		bind:this={shell.frame}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-[var(--z-surface)]"
		style:--z-tabbar-h={shell.tabs ? '56px' : '0px'}
	>
		<ShellHeader bar={shell.bar} class={shell.barClass} />
		{@render children()}
		<Toasts />
		{#if shell.tabs}<PhoneTabBar />{/if}
	</div>
</div>
