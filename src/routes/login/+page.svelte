<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import { loadRememberedLogin } from '$lib/auth/remember-login';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';

	const remembered = loadRememberedLogin();

	let email = $state(remembered.email);
	let password = $state('');
	let totp = $state('');
	let showTotp = $state(false);
	let rememberMe = $state(remembered.rememberMe);
	const canSubmit = $derived(email.trim().length > 0 && password.length > 0 && (!showTotp || totp.trim().length > 0));
	const nextPath = $derived.by(() => {
		const next = $page.url.searchParams.get('next');
		return next?.startsWith('/') && !next.startsWith('//') ? next : undefined;
	});

	$effect(() => {
		if (!auth.isRestoring && auth.isAuthenticated) {
			goto(nextPath ?? settings.preferredMailHref());
		}
	});

	function submit(e: Event) {
		e.preventDefault();
		void auth.login(email, password, showTotp ? totp : undefined, rememberMe, nextPath);
	}
</script>

<svelte:head>
	<title>Sign in · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center bg-surface px-4">
	<div class="z-panel w-full max-w-md rounded-xl p-8 shadow-md">
		<div class="mb-8 text-center">
			<p class="z-type-brand text-2xl">ZAUR</p>
			<p class="mt-1 text-sm text-fg-muted">Sign in to {appConfig.jmapServerUrl.replace('https://', '')}</p>
		</div>

		<form class="space-y-4" onsubmit={submit}>
			<div>
				<label for="email" class="mb-1.5 block text-sm font-medium text-fg">Email</label>
				<input
					id="email"
					type="email"
					class="z-input"
					bind:value={email}
					autocomplete="username"
					placeholder="you@example.com"
					required
					disabled={auth.isLoading}
				/>
			</div>

			<div>
				<label for="password" class="mb-1.5 block text-sm font-medium text-fg">Password</label>
				<input
					id="password"
					type="password"
					class="z-input"
					bind:value={password}
					autocomplete="current-password"
					aria-describedby="password-hint"
					required
					disabled={auth.isLoading}
				/>
				<p id="password-hint" class="mt-1 text-xs text-fg-subtle">
					Use your mailbox password or app password.
				</p>
			</div>

			<label class="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
				<input
					type="checkbox"
					class="size-4 accent-accent"
					bind:checked={rememberMe}
					disabled={auth.isLoading}
				/>
				Remember me
			</label>
			{#if rememberMe}
				<p class="-mt-2 text-xs text-fg-subtle">
					This keeps you signed in on this device.
				</p>
			{/if}

			{#if showTotp}
				<div>
					<div class="mb-1.5 flex items-center justify-between gap-2">
						<label for="totp" class="block text-sm font-medium text-fg">Authentication code</label>
						<button
							type="button"
							class="text-xs text-fg-subtle hover:text-accent hover:underline"
							onclick={() => {
								showTotp = false;
								totp = '';
							}}
						>
							No code
						</button>
					</div>
					<input
						id="totp"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						class="z-input"
						bind:value={totp}
						placeholder="000000"
						disabled={auth.isLoading}
					/>
				</div>
			{:else}
				<button
					type="button"
					class="text-xs text-accent hover:underline"
					onclick={() => (showTotp = true)}
				>
					I have a 2FA code
				</button>
			{/if}

			{#if auth.error}
				<p class="text-sm text-danger" role="alert">{auth.error}</p>
			{/if}

			<Button
				type="submit"
				class="w-full"
				disabled={auth.isLoading || !canSubmit}
				title={canSubmit ? 'Sign in' : 'Enter your sign-in details'}
			>
				{auth.isLoading ? 'Signing in…' : 'Sign in'}
			</Button>
		</form>

		<p class="mt-6 text-center text-xs text-fg-subtle">
			<button type="button" class="text-accent hover:underline" onclick={() => theme.toggle()}>
				Toggle {theme.resolved === 'dark' ? 'light' : 'dark'} mode
			</button>
		</p>
	</div>
</div>
