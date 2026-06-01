<script lang="ts">
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import Button from '$lib/components/ui/Button.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

	const initialEmail = $derived(
		$page.url.searchParams.get('email')?.trim() ??
			$page.url.searchParams.get('recovery')?.trim() ??
			''
	);
	const usesRecoveryEmail = $derived(Boolean($page.url.searchParams.get('recovery')?.trim()));

	let email = $state('');
	let isLoading = $state(false);
	let submitted = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	$effect(() => {
		if (initialEmail) email = initialEmail;
	});

	async function submit(e: Event) {
		e.preventDefault();
		isLoading = true;
		error = null;
		message = null;

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim() })
			});
			const payload = (await response.json()) as { message?: string; error?: string };
			if (!response.ok) {
				error = payload.error ?? 'Unable to send reset instructions.';
				return;
			}
			submitted = true;
			message =
				payload.message ??
				'If an account exists for that address, we sent password reset instructions to its recovery email.';
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Forgot password · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center text-accent">
				<ZaurSprite id="idle" scale={5} />
			</div>
			<h1 class="z-type-brand text-2xl text-fg">Reset password</h1>
			<p class="mt-2 text-sm text-fg-muted">
				{#if usesRecoveryEmail}
					We'll send reset instructions to this invitation email — the same address that received
					your invite.
				{:else}
					Enter your ZAUR address or the personal email we invited you with.
				{/if}
			</p>
		</div>

		{#if submitted}
			<div class="space-y-4">
				<div class="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-fg">
					<p>{message}</p>
				</div>
				<a href="/login" class="block text-center text-sm text-accent hover:underline">Back to sign in</a>
			</div>
		{:else}
			<form class="space-y-4" onsubmit={submit}>
				<div>
					<label for="email" class="mb-1.5 block text-sm font-medium text-fg">Email</label>
					<input
						id="email"
						type="email"
						class="z-input"
						bind:value={email}
						autocomplete="username"
						placeholder={usesRecoveryEmail ? 'you@gmail.com' : 'you@zaur.app or invitation email'}
						required
						disabled={isLoading}
					/>
				</div>

				{#if error}
					<p class="text-sm text-danger" role="alert">{error}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={isLoading || !email.trim()}>
					{isLoading ? 'Sending…' : 'Send reset link'}
				</Button>
			</form>

			<p class="mt-6 text-center text-sm text-fg-muted">
				<a href="/login" class="text-accent hover:underline">Back to sign in</a>
			</p>
		{/if}
	</div>
</div>
