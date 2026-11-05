<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Stats</title></svelte:head>

<div class="error">
	<span class="count">{page.status}</span>
	<h1>{page.error?.message}</h1>
	<a href="/">Back to the overview</a>
</div>

<style>
	.error {
		padding: 48px 0;
	}
	span {
		font-size: 34px;
		color: var(--soft);
	}
	h1 {
		margin: 8px 0 16px;
		font-size: 22px;
		font-weight: 500;
	}
</style>
