<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { reload } from '#lib/visit.svelte';
	import Icon from '#lib/components/Icon.svelte';

	const missing = $derived(page.status === 404);
	let trying = $state(false);

	// Loads this address again in place, so what is playing keeps playing.
	async function retry() {
		trying = true;
		await reload(refreshAll);
		trying = false;
	}
</script>

<svelte:head><title>{missing ? 'Not found' : 'Something went wrong'} · Zaur Music</title></svelte:head>

<div class="page">
	<div class="oops">
		<span class="glyph"><Icon name={missing ? 'search' : 'alert'} class="size-6" /></span>
		<h1>{missing ? 'Not found' : 'Something went wrong'}</h1>
		<p>{page.error?.message}</p>
		<div class="actions">
			{#if !missing}
				<button class="btn-tactile btn-primary tall" type="button" disabled={trying} onclick={retry}>Try again</button>
			{/if}
			<a class="btn-tactile tall" href="/">Back to Home</a>
		</div>
	</div>
</div>

<style>
	.oops {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		max-width: 360px;
		margin: 12vh auto 0;
		text-align: center;
	}
	.glyph {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-bottom: 8px;
		border-radius: 16px;
		background: var(--z-sunken);
		color: var(--z-soft);
	}
	h1 {
		margin: 0;
		color: var(--z-ink);
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	p {
		margin: 0 0 14px;
		color: var(--z-muted);
	}
	.actions {
		justify-content: center;
	}
</style>
