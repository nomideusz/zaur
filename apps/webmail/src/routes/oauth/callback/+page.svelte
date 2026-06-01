<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { appConfig } from '$lib/config';

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		const state = $page.url.searchParams.get('state');
		const error = $page.url.searchParams.get('error');
		const errorDescription = $page.url.searchParams.get('error_description');

		if (error || errorDescription) {
			const detail = errorDescription || error || 'OAuth login failed';
			auth.error = /invalid client/i.test(detail)
				? 'Passkey sign-in is misconfigured (Logto OAuth app missing or outdated). Sign in with your password instead, or ask an admin to verify OAUTH_CLIENT_ID on webmail.'
				: detail;
			auth.isLoading = false;
			const { goto } = await import('$app/navigation');
			await goto('/login');
			return;
		}

		if (!code) {
			auth.error = 'No authorization code received';
			auth.isLoading = false;
			const { goto } = await import('$app/navigation');
			await goto('/login');
			return;
		}

		// Exchange code for session
		await auth.completeOauthLogin(code, state);
	});
</script>

<svelte:head>
	<title>Authenticating · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="text-center space-y-4">
		<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
		<p class="text-sm text-fg-muted font-medium">Completing sign-in…</p>
	</div>
</div>
