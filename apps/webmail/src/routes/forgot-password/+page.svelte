<script lang="ts">
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import AuthPage from '$lib/components/auth/AuthPage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LabelInput from '$lib/components/ui/LabelInput.svelte';

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

<AuthPage
	title="Reset password"
	sprite="idle"
	blinks={false}
	tagline={usesRecoveryEmail
		? "We'll send reset instructions to this invitation email — the same address that received your invite."
		: 'Enter your ZAUR address or the personal email we invited you with.'}
>
	{#if submitted}
		<div class="z-form-stack">
			<div class="z-callout">
				<p>{message}</p>
			</div>
			<a href="/login" class="block text-center text-sm text-accent hover:underline">Back to sign in</a>
		</div>
	{:else}
		<form class="z-form-stack" onsubmit={submit}>
			<LabelInput
				id="email"
				label="Email"
				type="email"
				bind:value={email}
				placeholder={usesRecoveryEmail ? 'you@gmail.com' : 'you@zaur.app or invitation email'}
				autocomplete="username"
				required
				disabled={isLoading}
			/>

			{#if error}
				<p class="text-sm text-danger" role="alert">{error}</p>
			{/if}

			<Button type="submit" class="z-btn-lg w-full" disabled={isLoading || !email.trim()}>
				{isLoading ? 'Sending…' : 'Send reset link'}
			</Button>
		</form>
	{/if}

	{#snippet footer()}
		<a href="/login" class="text-accent hover:underline">Back to sign in</a>
	{/snippet}
</AuthPage>
