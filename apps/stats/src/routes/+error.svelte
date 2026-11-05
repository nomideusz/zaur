<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Stats</title></svelte:head>

<p class="message">{page.error?.message}</p>

<style>
	.message {
		padding: 24px 0;
		color: var(--z-body);
	}
</style>
