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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const remembered = loadRememberedLogin();
	const urlEmail = $derived($page.url.searchParams.get('email')?.trim() ?? '');
	const urlRecovery = $derived($page.url.searchParams.get('recovery')?.trim() ?? '');
	const isWelcome = $derived(
		$page.url.searchParams.get('welcome') === '1' || urlEmail.length > 0
	);
	// Prefer the server-load value (bound to the navigated route, race-free); fall back to
	// the live URL param for safety. Either being true keeps us in add mode.
	const isAdd = $derived(data.isAdd === true || $page.url.searchParams.get('mode') === 'add');

	let email = $state(remembered.email);
	let password = $state('');
	let totp = $state('');
	let rememberMe = $state(remembered.rememberMe);

	const canSubmitPassword = $derived(
		email.trim().length > 0 &&
			password.length > 0 &&
			(!auth.requiresTotp || /^\d{6}$/.test(totp.trim()))
	);
	const nextPath = $derived.by(() => {
		const next = $page.url.searchParams.get('next');
		return next?.startsWith('/') && !next.startsWith('//') ? next : undefined;
	});
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
		// In add mode we intentionally stay on the form while already authenticated.
		if (!isAdd && !auth.isRestoring && auth.isAuthenticated) {
			goto(nextPath ?? settings.preferredMailHref());
		}
	});

	onMount(() => {
		if (urlEmail) {
			email = urlEmail;
		} else if (isAdd) {
			// Adding an account: start from a blank email, not the current user's.
			email = '';
		}
	});

	function submitLogin(e: Event) {
		e.preventDefault();
		void auth.login(email, password, auth.requiresTotp ? totp : undefined, rememberMe, nextPath, {
			add: isAdd
		});
	}
</script>

<svelte:head>
	<title>Sign in · {appConfig.appName}</title>
</svelte:head>

<AuthPage title={appConfig.brandName} tagline="Private, focused email">
	<form class="z-form-stack" onsubmit={submitLogin}>
		{#if isAdd}
			<div class="z-callout">
				<span class="z-callout__title">Add another account</span>
				<p class="z-callout__body">
					Sign in with the address you want to add. Your current account stays open.
				</p>
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
			placeholder="you@example.com"
			autocomplete="username"
			required
			disabled={auth.isLoading}
		/>

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
			{#if data.passwordResetEnabled}
				<p class="text-right">
					<a href={forgotPasswordHref} class="z-link text-sm">
						Forgot password?
					</a>
				</p>
			{/if}
		</div>

		{#if auth.requiresTotp}
			<div class="z-callout">
				<span class="z-callout__title">Two-factor authentication</span>
				<p class="z-callout__body">Enter the six-digit code from your authenticator app.</p>
			</div>
			<LabelInput
				id="totp"
				label="Authentication code"
				type="text"
				bind:value={totp}
				placeholder="000000"
				inputmode="numeric"
				pattern="[0-9]{6}"
				maxlength={6}
				autocomplete="one-time-code"
				required
				autofocus
				disabled={auth.isLoading}
			/>
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
			<Button
				type="submit"
				class="z-btn-lg w-full"
				disabled={auth.isLoading || !canSubmitPassword}
			>
				{auth.isLoading ? 'Signing in…' : auth.requiresTotp ? 'Verify and sign in' : 'Sign in'}
			</Button>
			{#if isAdd}
				<p class="text-center">
					<a href={settings.preferredMailHref()} class="z-link text-sm">Cancel</a>
				</p>
			{/if}
		</div>
	</form>

	{#snippet footer()}
		{#if appConfig.registerUrl}
			Need an address?
			<a href={appConfig.registerUrl} class="z-link">Get your address</a>
		{/if}
	{/snippet}
</AuthPage>
