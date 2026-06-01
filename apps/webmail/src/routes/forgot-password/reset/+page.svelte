<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import Button from '$lib/components/ui/Button.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';

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

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center text-accent">
				<ZaurSprite id="happy" scale={5} />
			</div>
			<h1 class="z-type-brand text-2xl text-fg">Choose a new password</h1>
			{#if email}
				<p class="mt-2 text-sm text-fg-muted">{email}</p>
			{/if}
		</div>

		{#if !ready}
			<p class="text-center text-sm text-fg-muted">Verifying reset link…</p>
		{:else if done}
			<div class="space-y-4">
				<div class="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-fg">
					<p class="font-medium">Password updated</p>
					<p class="mt-1 text-fg-muted">You can sign in with your new password now.</p>
				</div>
				<Button type="button" class="w-full" onclick={goToLogin}>Sign in</Button>
			</div>
		{:else if !valid}
			<div class="space-y-4">
				<p class="text-sm text-danger" role="alert">{verifyError}</p>
				<a href="/forgot-password" class="block text-center text-sm text-accent hover:underline">
					Request a new reset link
				</a>
			</div>
		{:else}
			<form class="space-y-4" onsubmit={submit}>
				<div>
					<label for="password" class="mb-1.5 block text-sm font-medium text-fg">New password</label>
					<input
						id="password"
						type="password"
						class="z-input"
						bind:value={password}
						autocomplete="new-password"
						minlength="8"
						required
						disabled={isLoading}
					/>
				</div>

				<div>
					<label for="confirm-password" class="mb-1.5 block text-sm font-medium text-fg">
						Confirm password
					</label>
					<input
						id="confirm-password"
						type="password"
						class="z-input"
						bind:value={confirmPassword}
						autocomplete="new-password"
						minlength="8"
						required
						disabled={isLoading}
					/>
				</div>

				{#if password && confirmPassword && password !== confirmPassword}
					<p class="text-sm text-danger">Passwords do not match.</p>
				{/if}

				{#if submitError}
					<p class="text-sm text-danger" role="alert">{submitError}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={isLoading || !canSubmit}>
					{isLoading ? 'Saving…' : 'Update password'}
				</Button>
			</form>
		{/if}
	</div>
</div>
