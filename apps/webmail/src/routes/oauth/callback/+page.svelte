<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { appConfig } from '$lib/config';
	import AuthPage from '$lib/components/auth/AuthPage.svelte';

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

		await auth.completeOauthLogin(code, state);
	});
</script>

<svelte:head>
	<title>Authenticating · {appConfig.appName}</title>
</svelte:head>

<AuthPage title={appConfig.brandName} tagline="Completing sign-in…" sprite="idle" blinks={false}>
	<div class="flex justify-center py-2">
		<div
			class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
			aria-hidden="true"
		></div>
	</div>
</AuthPage>
