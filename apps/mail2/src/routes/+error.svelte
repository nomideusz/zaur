<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';
	import { withOutboxLock } from '#lib/compose/outbox';

	/**
	 * Every error that reaches the root: a mistyped address, a meeting link that
	 * is not one, a load that threw. Drawn on the signed-out screens' card, since
	 * an error takes the whole page and the shell with it — and an installed app
	 * has no address bar or reload button, so the way out has to be on the card.
	 */
	const missing = $derived(page.status === 404);
	/**
	 * A section opened for the first time with no connection fails on its own
	 * code, which is fetched when first needed. That is not an error of the
	 * app's: it is the offline page (static/offline.html), said here, and like
	 * it this one comes back by itself. As it was when the error arrived — the
	 * card must not change its story in the moment before the reload.
	 */
	const offline = browser && !navigator.onLine;
	/**
	 * The same failure with a connection (`hooks.client.ts` marks it): the server
	 * is away — or, in WebKit, the browser has not got over the import that
	 * failed a moment ago, and the reload that `online` brought lands here.
	 */
	const unloaded = browser && !offline && page.error?.unreachable === true;
	/** Either way there is nothing to report and one thing to do: load the page again. */
	const waiting = offline || unloaded;

	/**
	 * Always a full load of the address now in the bar. The outbox sends on
	 * `online` too: a reload between its send and its crossing-off would send
	 * the message again on the next load, so every reload from here waits for
	 * the lock the outbox sends under.
	 */
	const reload = () => void withOutboxLock(async () => location.reload());

	/**
	 * Code that did not load is tried again once, a moment later, which is often
	 * all WebKit needs — though it can go on failing the same file for a while
	 * with the connection back, so that card also offers Mail. A second failure within half a minute waits for the person:
	 * no loop of reloads against a server that is down.
	 */
	const RETRIED = 'zaur:error-retried';
	let retrying = $state(false);
	onMount(() => {
		if (!unloaded) return;
		try {
			if (Date.now() - Number(sessionStorage.getItem(RETRIED) ?? 0) < 30_000) return;
			sessionStorage.setItem(RETRIED, String(Date.now()));
		} catch {
			// Nowhere to note the attempt: then no attempt, rather than one on every load.
			return;
		}
		retrying = true;
		// A reload that cannot even fetch the page leaves this card up in some
		// browsers: it must not go on saying it is trying.
		const timers = [setTimeout(reload, 1500), setTimeout(() => (retrying = false), 6000)];
		return () => timers.forEach(clearTimeout);
	});

	const title = $derived(
		offline ? 'You’re offline' : unloaded ? 'Can’t reach Zaur Mail' : missing ? 'Page not found' : 'Something went wrong'
	);
	// Kit's own 404 says "Not Found", which the title already does.
	const message = $derived(
		offline
			? 'This part of Zaur Mail needs a connection to open. It opens by itself when the connection is back.'
			: unloaded
				? `This part of Zaur Mail could not be loaded. ${retrying ? 'Trying again…' : 'Check your connection and try again.'}`
				: missing && (!page.error?.message || page.error.message === 'Not Found')
					? 'There is nothing at this address.'
					: (page.error?.message ?? 'Unknown error')
	);
	// Someone sent a meeting link that does not work may have no mailbox to go back to.
	const home = $derived(page.url.pathname.startsWith('/meet/') ? 'Open Zaur Mail' : 'Back to Mail');
</script>

<!-- The card took the place of the whole app, and a step through history to
     another entry of the page that was up before it would change the address
     and leave the card: every step loads what the address now says. -->
<svelte:window ononline={() => offline && reload()} onpopstate={reload} />

<svelte:head>
	<title>{title} · Zaur Mail</title>
</svelte:head>

<AuthCard {title}>
	<p class="mt-2 text-[13.5px] leading-relaxed text-[var(--z-muted)]">{message}</p>
	{#if !waiting}
		<p class="z-mono mt-1.5 text-[12px] text-[var(--z-soft)]">Error {page.status}</p>
	{/if}

	<!-- Full page loads, both: if the app's own scripts are what failed, a
	     client-side navigation would fail the same way. With nothing loaded
	     there is only this address to try again; and trying again an address
	     that does not exist finds it missing again. -->
	{#if waiting}
		<button type="button" class="btn-tactile btn-primary mt-5 h-[42px] w-full !text-[14px]" onclick={reload}>
			Try again
		</button>
		{#if unloaded && page.url.pathname !== '/'}
			<a href="/" data-sveltekit-reload class="btn-tactile mt-2 h-[38px] w-full !text-[13.5px]">{home}</a>
		{/if}
	{:else}
		<a href="/" data-sveltekit-reload class="btn-tactile btn-primary mt-5 h-[42px] w-full !text-[14px]">{home}</a>
		{#if !missing}
			<button type="button" class="btn-tactile mt-2 h-[38px] w-full !text-[13.5px]" onclick={reload}>
				Try again
			</button>
		{/if}
	{/if}
</AuthCard>
