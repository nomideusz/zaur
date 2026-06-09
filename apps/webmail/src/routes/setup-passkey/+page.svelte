<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import AuthPage from '$lib/components/auth/AuthPage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';

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

<AuthPage title="Set up a passkey" tagline={urlEmail || undefined}>
	{#if !oauthReady}
		<p class="z-auth-tagline text-center">Loading…</p>
	{:else if !urlEmail || !urlToken}
		<div class="z-form-stack">
			<p class="z-auth-tagline text-center">
				This link is incomplete. Open mail and add a passkey from Settings after signing in.
			</p>
			<Button variant="ghost" class="w-full" onclick={() => goto('/login')}>Open sign in</Button>
		</div>
	{:else if done}
		<div class="z-form-stack">
			<div class="z-callout">
				<p>
					Passkey ready. You can sign in with Face ID, Touch ID, or your device PIN next time.
				</p>
			</div>
			<Button
				class="z-btn-lg w-full"
				onclick={() => goto(auth.isAuthenticated ? '/mail/inbox' : '/login')}
			>
				{auth.isAuthenticated ? 'Open mail' : 'Sign in'}
			</Button>
		</div>
	{:else}
		<div class="z-form-stack">
			<p class="z-auth-tagline text-center">
				{loading
					? 'Follow the prompt on this device…'
					: 'Use Face ID, Touch ID, or your device PIN for faster sign-in.'}
			</p>
			{#if error}
				<p class="text-sm text-danger" role="alert">{error}</p>
			{/if}
			<Button class="z-btn-lg w-full" disabled={loading} onclick={createPasskey}>
				{loading ? 'Waiting for passkey…' : 'Create passkey'}
			</Button>
			<Button variant="ghost" class="w-full" disabled={loading} onclick={() => goto('/login')}>
				Skip for now
			</Button>
		</div>
	{/if}
</AuthPage>
