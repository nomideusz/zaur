<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import { beforeNavigate, goto, preloadCode } from '$app/navigation';
	import type { RouteId } from '$app/types';
	import { page } from '$app/state';
	import { inOrder, stepBack } from '#lib/back-layer.svelte.ts';
	import Toasts from '#lib/components/compose/Toasts.svelte';
	import { uploadFile } from '#lib/compose/attachments';
	import { compose } from '#lib/compose/store.svelte.ts';
	import PhoneTabBar from '#lib/components/mail/PhoneTabBar.svelte';
	import ShellHeader from '#lib/components/mail/ShellHeader.svelte';
	import { provideShell } from '#lib/shell.svelte.ts';
	import { LiveUpdates } from '#lib/mail/live';
	import { prefs } from '#lib/settings.svelte.ts';
	import { SETTINGS_GROUPS } from '#lib/settings/sections';
	import { mailboxes } from '../mail.remote';
	import { whoami } from '../session.remote';
	import { send, cancelScheduled, saveDraft, deleteDraft } from '../compose.remote';

	let { children }: { children: Snippet } = $props();

	const shell = provideShell();

	type BadgeNavigator = Navigator & {
		setAppBadge?: (count: number) => Promise<void>;
		clearAppBadge?: () => Promise<void>;
	};

	const who = whoami();
	const signedIn = $derived(!!who.current);

	/**
	 * The inbox's unread count, for the tab's title in every section and for the
	 * installed app's icon. A push writes the icon's while the app is closed (the
	 * service worker); open, both follow the inbox — the same query Mail shows
	 * its counts from — so reading your mail takes the number down instead of
	 * leaving the last pushed one until the next message.
	 */
	const boxes = $derived(browser && signedIn ? mailboxes() : undefined);
	const unread = $derived(boxes?.current?.find((box) => box.kind === 'inbox')?.unread);

	$effect(() => {
		if (unread !== undefined) shell.unread = unread;
	});

	$effect(() => {
		const nav = navigator as BadgeNavigator;
		// The server stops sending a count once the badge is off; this clears one that
		// is already on the icon, here and on each device as it next opens the app.
		if (!prefs.appBadge) return void nav.clearAppBadge?.().catch(() => {});
		if (unread === undefined) return;
		void (unread > 0 ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => {});
	});

	/**
	 * Push: Stalwart says what changed, and whoever shows it asks again. One
	 * stream here rather than one per section, so it stays open across them —
	 * and the unread count moves in Calendar or Settings as it does in Mail
	 * (which asks for the folders itself, along with its lists).
	 */
	$effect(() => {
		if (!signedIn) return;
		const live = new LiveUpdates();
		live.start((changed) => {
			if (changed.mailbox && !shell.mailChanged) void boxes?.refresh();
			shell.tellLive(changed);
		});
		return () => live.stop();
	});

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
	 * On Mail already, a link to Mail takes the place of what is open instead of
	 * stacking on it. A phone reading a conversation (or with a sheet over it)
	 * first leaves those entries, and the list's entry becomes the link's: Back
	 * from the conversation the notification opened is then the list, once —
	 * not the list, the conversation before, and the list again.
	 */
	async function show(url: URL) {
		const onMail = location.pathname === '/' && url.pathname === '/';
		// A layer over the reader, then the reader: each its own entry.
		for (let steps = 0; onMail && steps < 3 && (page.state.layer || page.state.reader); steps += 1) {
			const { layer, reader } = page.state;
			await inOrder(() => stepBack(() => page.state.layer === layer && page.state.reader === reader));
		}
		await goto(url, { replace: onMail });
	}

	/**
	 * A link to the address in the bar is a refresh to Kit. Offline it cannot
	 * succeed, and failing took the whole app down to the error card: the logo,
	 * a tab, any link to where you already are.
	 */
	beforeNavigate(({ type, from, to, cancel }) => {
		if (type === 'link' && !navigator.onLine && to?.url.href === from?.url.href) cancel();
	});

	/**
	 * Every section's code, and every settings page's, once the page is idle. A section first opened with
	 * the connection gone then opens and says what it could not load, where it
	 * used to fail on its own code and take the app down to the error card —
	 * which WebKit can keep up for a while after the connection is back.
	 */
	$effect(() => {
		const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 2000));
		idle(() => {
			const settings = SETTINGS_GROUPS.flatMap((group) => group.items.map((item) => item.href));
			for (const href of ['', '/contacts', '/calendar', '/files', ...settings]) {
				// A route id, which is what Kit 3 takes here: a pathname matches nothing, silently.
				void preloadCode(`/(app)${href}` as RouteId).catch(() => {});
			}
		});
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
			void show(url).catch(() => location.assign(url));
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
		<!-- Mail's bar claims the header (and steps it out on a phone) only once the
		     page hydrates; until then the server's markup would show it empty above
		     Mail's own phone bar, and the list would jump up when it went. -->
		<ShellHeader bar={shell.bar} class={shell.bar ? shell.barClass : page.route.id === '/(app)' ? 'max-md:hidden' : ''} />
		{@render children()}
		<Toasts />
		{#if shell.tabs}<PhoneTabBar />{/if}
	</div>
</div>
