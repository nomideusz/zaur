<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import Button from '$lib/components/ui/Button.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	const email = $derived($page.url.searchParams.get('email')?.trim().toLowerCase() ?? '');

	let phase = $state<'redirecting' | 'missing'>('redirecting');

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get('token')?.trim() ?? '';
		const address = params.get('email')?.trim().toLowerCase() ?? '';

		if (!address || !token) {
			phase = 'missing';
			return;
		}

		const startParams = new URLSearchParams({ email: address, token });
		window.location.replace(`/setup-passkey/start?${startParams.toString()}`);
	});
</script>

<svelte:head>
	<title>Set up passkey · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm text-center">
		<div class="mb-8">
			<div class="mb-4 flex justify-center text-accent">
				<ZaurSprite id="happy" scale={5} />
			</div>
			<h1 class="z-type-brand text-2xl text-fg">Set up a passkey</h1>
			{#if email}
				<p class="mt-3 text-sm font-medium text-fg">{email}</p>
			{/if}
		</div>

		{#if phase === 'missing'}
			<p class="text-sm text-fg-muted">
				This link is incomplete. Register again or open mail with your password.
			</p>
			<div class="mt-6">
				<Button variant="ghost" onclick={() => goto('/login')}>Open sign in</Button>
			</div>
		{:else}
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			<p class="mt-4 text-sm text-fg-muted">Redirecting to set up your passkey…</p>
		{/if}
	</div>
</div>
