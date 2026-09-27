<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Zaur Music</title></svelte:head>

<div class="page">
	<header class="page-head"><h1>{page.status === 404 ? 'Not found' : 'Something went wrong'}</h1></header>
	<p class="empty-note">{page.error?.message}</p>
	<a class="btn-tactile tall" href="/">Back to Home</a>
</div>
