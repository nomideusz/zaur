<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import { loadRememberedLogin } from '$lib/auth/remember-login';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	const remembered = loadRememberedLogin();
	const urlEmail = $derived($page.url.searchParams.get('email')?.trim() ?? '');
	const isWelcome = $derived(
		$page.url.searchParams.get('welcome') === '1' || urlEmail.length > 0
	);

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
	const showPasskey = $derived(oauthEnabled && !passwordFallback);

	$effect(() => {
		if (!auth.isRestoring && auth.isAuthenticated) {
			goto(nextPath ?? settings.preferredMailHref());
		}
	});

	onMount(async () => {
		if (urlEmail) {
			email = urlEmail;
		}
		await auth.checkOauthConfig();
		oauthReady = true;
	});

	function submitPassword(e: Event) {
		e.preventDefault();
		void auth.login(email, password, undefined, rememberMe, nextPath);
	}

	function signInWithPasskey() {
		void auth.loginWithPasskey({
			rememberMe,
			redirectTo: nextPath,
			loginHint: email.trim() || undefined
		});
	}
</script>

<svelte:head>
	<title>Sign in · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center text-accent">
				<ZaurSprite id="happy" scale={5} />
			</div>
			<h1 class="z-type-brand text-2xl text-fg">{appConfig.brandName}</h1>
			<p class="mt-2 text-sm text-fg-muted">Private, focused email</p>
		</div>

		{#if !oauthReady}
			<p class="text-center text-sm text-fg-muted">Loading sign-in…</p>
		{:else}
			<form class="space-y-4" onsubmit={submitPassword}>
				{#if isWelcome}
					<div class="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-fg">
						<p class="font-medium">Welcome — almost done</p>
						<p class="mt-1 text-fg-muted">
							Sign in with the email and password you just created.
						</p>
					</div>
				{/if}

				<div>
					<label for="email" class="mb-1.5 block text-sm font-medium text-fg">Email</label>
					<input
						id="email"
						type="email"
						class="z-input"
						bind:value={email}
						autocomplete={showPasskey ? 'username webauthn' : 'username'}
						placeholder="you@zaur.app"
						required
						disabled={auth.isLoading}
					/>
				</div>

				{#if showPassword}
					<div>
						<label for="password" class="mb-1.5 block text-sm font-medium text-fg">Password</label>
						<input
							id="password"
							type="password"
							class="z-input"
							bind:value={password}
							autocomplete="current-password"
							required
							disabled={auth.isLoading}
						/>
					</div>
				{/if}

				<label class="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
					<input
						type="checkbox"

						bind:checked={rememberMe}
						disabled={auth.isLoading}
					/>
					Remember me
				</label>

				{#if auth.error}
					<p class="text-sm text-danger" role="alert">{auth.error}</p>
				{/if}

				<div class="space-y-2">
					{#if showPassword}
						<Button type="submit" class="w-full" disabled={auth.isLoading || !canSubmitPassword}>
							{auth.isLoading ? 'Signing in…' : 'Sign in'}
						</Button>
					{/if}
					{#if showPasskey}
						<Button
							type="button"
							class="w-full"
							variant={showPassword ? 'ghost' : 'primary'}
							disabled={auth.isLoading}
							onclick={signInWithPasskey}
						>
							{auth.isLoading ? 'Redirecting…' : 'Sign in with passkey'}
						</Button>
					{/if}
				</div>
			</form>
		{/if}

		<p class="mt-8 text-center text-xs text-fg-subtle">
			<button type="button" class="text-accent hover:underline" onclick={() => theme.toggle()}>
				Toggle {theme.resolved === 'dark' ? 'light' : 'dark'} mode
			</button>
		</p>
	</div>
</div>
