<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppHeader from '$lib/components/shell/AppHeader.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let { children } = $props();

	$effect(() => {
		if (auth.isRestoring) return;
		if (!auth.isAuthenticated && !$page.url.pathname.startsWith('/login')) {
			goto('/login');
		}
	});
</script>

{#if auth.isRestoring}
	<div class="flex min-h-dvh items-center justify-center bg-surface text-sm text-fg-muted">
		Connecting…
	</div>
{:else if auth.isAuthenticated}
	<div class="flex min-h-dvh flex-col">
		<AppHeader />
		<main class="flex min-h-0 flex-1 flex-col">
			{@render children()}
		</main>
	</div>
{/if}
