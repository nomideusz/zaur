<script lang="ts">
	import { page } from '$app/state';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	/**
	 * Every error that reaches the root: a mistyped address, a meeting link that
	 * is not one, a load that threw. Drawn on the signed-out screens' card, since
	 * an error takes the whole page and the shell with it — and an installed app
	 * has no address bar or reload button, so the way out has to be on the card.
	 */
	const missing = $derived(page.status === 404);
	const title = $derived(missing ? 'Page not found' : 'Something went wrong');
	// Kit's own 404 says "Not Found", which the title already does.
	const message = $derived(
		missing && (!page.error?.message || page.error.message === 'Not Found')
			? 'There is nothing at this address.'
			: (page.error?.message ?? 'Unknown error')
	);
</script>

<svelte:head>
	<title>{title} · Zaur Mail</title>
</svelte:head>

<AuthCard {title}>
	<p class="mt-2 text-[13.5px] leading-relaxed text-[var(--z-muted)]">{message}</p>
	<p class="z-mono mt-1.5 text-[12px] text-[var(--z-soft)]">Error {page.status}</p>

	<!-- Full page loads, both: if the app's own scripts are what failed, a
	     client-side navigation would fail the same way. -->
	<a href="/" data-sveltekit-reload class="btn-tactile btn-primary mt-5 h-[42px] w-full !text-[14px]">Back to Mail</a>
	<button type="button" class="btn-tactile mt-2 h-[38px] w-full !text-[13.5px]" onclick={() => location.reload()}>
		Try again
	</button>
</AuthCard>
