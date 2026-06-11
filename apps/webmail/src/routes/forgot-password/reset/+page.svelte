<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import AuthPage from '$lib/components/auth/AuthPage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LabelInput from '$lib/components/ui/LabelInput.svelte';

	const token = $derived($page.url.searchParams.get('token')?.trim() ?? '');
	const email = $derived($page.url.searchParams.get('email')?.trim() ?? '');

	let ready = $state(false);
	let valid = $state(false);
	let verifyError = $state<string | null>(null);
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let submitError = $state<string | null>(null);
	let done = $state(false);

	const canSubmit = $derived(
		password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword
	);

	onMount(async () => {
		if (!token || !email) {
			verifyError = 'This reset link is incomplete.';
			ready = true;
			return;
		}

		try {
			const response = await fetch(
				`/api/auth/forgot-password/verify?${new URLSearchParams({ email, token }).toString()}`
			);
			const payload = (await response.json()) as { valid?: boolean; error?: string };
			valid = response.ok && payload.valid === true;
			verifyError = valid ? null : (payload.error ?? 'This reset link is invalid or has expired.');
		} catch {
			verifyError = 'Unable to verify this reset link.';
		} finally {
			ready = true;
		}
	});

	async function submit(e: Event) {
		e.preventDefault();
		if (!valid) return;

		isLoading = true;
		submitError = null;

		try {
			const response = await fetch('/api/auth/forgot-password/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, token, password, confirmPassword })
			});
			const payload = (await response.json()) as { success?: boolean; error?: string };
			if (!response.ok) {
				submitError = payload.error ?? 'Unable to reset password.';
				return;
			}
			done = true;
		} catch {
			submitError = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function goToLogin() {
		void goto(`/login?email=${encodeURIComponent(email)}`);
	}
</script>

<svelte:head>
	<title>Choose new password · {appConfig.appName}</title>
</svelte:head>

<AuthPage title="Choose a new password" tagline={email || undefined}>
	{#if !ready}
		<p class="z-auth-tagline text-center">Verifying reset link…</p>
	{:else if done}
		<div class="z-form-stack">
			<div class="z-callout">
				<span class="z-callout__title">Password updated</span>
				<p class="z-callout__body">You can sign in with your new password now.</p>
			</div>
			<Button type="button" class="z-btn-lg w-full" onclick={goToLogin}>Sign in</Button>
		</div>
	{:else if !valid}
		<div class="z-form-stack">
			<p class="text-sm text-danger" role="alert">{verifyError}</p>
			<a href="/forgot-password" class="z-link block text-center text-sm">
				Request a new reset link
			</a>
		</div>
	{:else}
		<form class="z-form-stack" onsubmit={submit}>
			<LabelInput
				id="password"
				label="New password"
				type="password"
				bind:value={password}
				autocomplete="new-password"
				minlength={8}
				required
				disabled={isLoading}
			/>

			<LabelInput
				id="confirm-password"
				label="Confirm password"
				type="password"
				bind:value={confirmPassword}
				autocomplete="new-password"
				minlength={8}
				required
				disabled={isLoading}
			/>

			{#if password && confirmPassword && password !== confirmPassword}
				<p class="text-sm text-danger">Passwords do not match.</p>
			{/if}

			{#if submitError}
				<p class="text-sm text-danger" role="alert">{submitError}</p>
			{/if}

			<Button type="submit" class="z-btn-lg w-full" disabled={isLoading || !canSubmit}>
				{isLoading ? 'Saving…' : 'Update password'}
			</Button>
		</form>
	{/if}
</AuthPage>
