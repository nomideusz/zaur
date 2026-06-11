<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import { loadRememberedLogin } from '$lib/auth/remember-login';
	import AuthPage from '$lib/components/auth/AuthPage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import LabelInput from '$lib/components/ui/LabelInput.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const remembered = loadRememberedLogin();
	const urlEmail = $derived($page.url.searchParams.get('email')?.trim() ?? '');
	const urlRecovery = $derived($page.url.searchParams.get('recovery')?.trim() ?? '');
	const isWelcome = $derived(
		$page.url.searchParams.get('welcome') === '1' || urlEmail.length > 0
	);
	const passkeyReady = $derived($page.url.searchParams.get('passkey_ready') === '1');

	let email = $state(remembered.email);
	let password = $state('');
	let rememberMe = $state(remembered.rememberMe);
	let oauthReady = $state(false);

	const canSubmitPassword = $derived(email.trim().length > 0 && password.length > 0);
	const nextPath = $derived.by(() => {
		const next = $page.url.searchParams.get('next');
		return next?.startsWith('/') && !next.startsWith('//') ? next : undefined;
	});
	const oauthEnabled = $derived(auth.oauthConfig?.enabled === true);
	const passwordFallback = $derived(auth.oauthConfig?.passwordFallback !== false);
	const showPassword = $derived(!oauthEnabled || passwordFallback);
	const showPasskey = $derived(oauthEnabled && auth.oauthConfig?.passkeyEnabled !== false);
	const forgotPasswordHref = $derived.by(() => {
		const recovery = urlRecovery;
		const trimmed = email.trim();
		if (!recovery && !trimmed) return '/forgot-password';
		const params = new URLSearchParams();
		if (recovery) params.set('recovery', recovery);
		else if (trimmed) params.set('email', trimmed);
		return `/forgot-password?${params.toString()}`;
	});

	$effect(() => {
		if (!auth.isRestoring && auth.isAuthenticated) {
			goto(nextPath ?? settings.preferredMailHref());
		}
	});

	onMount(async () => {
		if (urlEmail) {
			email = urlEmail;
		}
		if ($page.url.searchParams.get('error') === 'passkey_email') {
			auth.error = 'Enter your email address before signing in with a passkey.';
		}
		await auth.checkOauthConfig();
		oauthReady = true;
	});

	function submitLogin(e: Event) {
		e.preventDefault();
		if (showPassword) {
			void auth.login(email, password, undefined, rememberMe, nextPath);
		} else if (showPasskey) {
			signInWithPasskey();
		}
	}

	function signInWithPasskey() {
		void auth.loginWithPasskey({
			rememberMe,
			redirectTo: nextPath,
			loginHint: email.trim().toLowerCase()
		});
	}
</script>

<svelte:head>
	<title>Sign in · {appConfig.appName}</title>
</svelte:head>

<AuthPage title={appConfig.brandName} tagline="Private, focused email">
	{#if !oauthReady}
		<p class="z-auth-tagline text-center">Loading sign-in…</p>
	{:else}
		<form class="z-form-stack" onsubmit={submitLogin}>
			{#if passkeyReady && showPasskey}
				<div class="z-callout">
					<span class="z-callout__title">Passkey ready</span>
					<p class="z-callout__body">Use “Sign in with passkey” below.</p>
				</div>
			{:else if isWelcome}
				<div class="z-callout">
					<span class="z-callout__title">Welcome — almost done</span>
					<p class="z-callout__body">
						Sign in with the email and password you just created.
					</p>
				</div>
			{/if}

			<LabelInput
				id="email"
				label="Email"
				type="email"
				bind:value={email}
				placeholder="you@zaur.app"
				autocomplete="username"
				required
				disabled={auth.isLoading}
			/>

			{#if showPassword}
				<div class="z-field-stack">
					<LabelInput
						id="password"
						label="Password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						required
						disabled={auth.isLoading}
					/>
					<p class="text-right">
						<a href={forgotPasswordHref} class="z-link text-sm">
							Forgot password?
						</a>
					</p>
				</div>
			{/if}

			<Checkbox
				bind:checked={rememberMe}
				disabled={auth.isLoading}
				label="Remember me"
				class="w-full py-0.5 text-sm text-fg-muted"
			>
				Remember me
			</Checkbox>

			{#if auth.error}
				<p class="text-sm text-danger" role="alert">{auth.error}</p>
			{/if}

			<div class="z-field-stack">
				{#if showPassword}
					<Button
						type="submit"
						class="z-btn-lg w-full"
						disabled={auth.isLoading || !canSubmitPassword}
					>
						{auth.isLoading ? 'Signing in…' : 'Sign in'}
					</Button>
				{/if}
				{#if showPasskey}
					<Button
						type="button"
						variant={showPassword ? 'ghost' : 'primary'}
						class={showPassword ? 'w-full' : 'z-btn-lg w-full'}
						disabled={auth.isLoading || !email.trim().includes('@')}
						onclick={signInWithPasskey}
					>
						{auth.isLoading ? 'Waiting for passkey…' : 'Sign in with passkey'}
					</Button>
				{/if}
			</div>
		</form>
	{/if}

	{#snippet footer()}
		Need an address?
		<a href={appConfig.registerUrl} class="z-link">Get your address</a>
	{/snippet}
</AuthPage>
