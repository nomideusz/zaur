<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	const urlEmail = $derived($page.url.searchParams.get('email')?.trim().toLowerCase() ?? '');
	const urlToken = $derived($page.url.searchParams.get('token')?.trim() ?? '');

	let oauthReady = $state(false);
	let done = $state(false);
	let error = $state<string | null>(null);
	let loading = $state(false);

	onMount(async () => {
		await auth.checkOauthConfig();
		oauthReady = true;

		if (urlEmail && urlToken) {
			void createPasskey();
		}
	});

	async function createPasskey() {
		if (!urlEmail || !urlToken || loading || done) return;

		loading = true;
		error = null;
		try {
			await auth.registerPasskey({
				email: urlEmail,
				token: urlToken,
				rememberMe: true,
				redirectTo: '/mail/inbox'
			});
			done = true;
			if (!auth.isAuthenticated) {
				await goto(`/login?email=${encodeURIComponent(urlEmail)}&passkey_ready=1`);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Passkey setup failed.';
		} finally {
			loading = false;
		}
	}
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
			{#if urlEmail}
				<p class="mt-2 text-sm text-fg-muted">{urlEmail}</p>
			{/if}
		</div>

		{#if !oauthReady}
			<p class="text-sm text-fg-muted">Loading…</p>
		{:else if !urlEmail || !urlToken}
			<p class="text-sm text-fg-muted">
				This link is incomplete. Open mail and add a passkey from Settings after signing in.
			</p>
			<div class="mt-6">
				<Button variant="ghost" onclick={() => goto('/login')}>Open sign in</Button>
			</div>
		{:else if done}
			<p class="text-sm text-fg">
				Passkey ready. You can sign in with Face ID, Touch ID, or your device PIN next time.
			</p>
			<div class="mt-6">
				<Button class="w-full" onclick={() => goto(auth.isAuthenticated ? '/mail/inbox' : '/login')}>
					{auth.isAuthenticated ? 'Open mail' : 'Sign in'}
				</Button>
			</div>
		{:else}
			<p class="text-sm text-fg-muted">
				{loading
					? 'Follow the prompt on this device…'
					: 'Use Face ID, Touch ID, or your device PIN for faster sign-in.'}
			</p>
			{#if error}
				<p class="mt-4 text-sm text-danger" role="alert">{error}</p>
			{/if}
			<div class="mt-6 space-y-2">
				<Button class="w-full" disabled={loading} onclick={createPasskey}>
					{loading ? 'Waiting for passkey…' : 'Create passkey'}
				</Button>
				<Button variant="ghost" class="w-full" disabled={loading} onclick={() => goto('/login')}>
					Skip for now
				</Button>
			</div>
		{/if}
	</div>
</div>
