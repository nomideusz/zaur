<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '../login.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pending = $derived(login.pending > 0);
	const result = $derived(login.result);
	const needsTotp = $derived(result?.requiresTotp === true);
	const error = $derived(result && !result.ok ? (result.error ?? null) : null);

	$effect(() => {
		if (result?.ok) goto(data.next, { replaceState: true });
	});

	// When Stalwart asks for a 2FA code, put the cursor in the code field.
	$effect(() => {
		if (needsTotp) document.getElementById('login-totp')?.focus();
	});
</script>

<svelte:head>
	<title>Sign in · Zaur Mail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div
	class="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas px-6 py-10 text-ink"
>
	<div class="flex items-center gap-2">
		<div class="size-5 rounded-[6px] bg-accent"></div>
		<div class="text-base font-semibold tracking-[-0.01em]">Zaur Mail</div>
	</div>

	<form
		{...login}
		class="w-full max-w-[360px] rounded-panel border border-line bg-container p-6 shadow-toast"
	>
		<h1 class="text-[17px] font-semibold tracking-[-0.01em]">Sign in</h1>
		<p class="mt-1 text-[13px] leading-relaxed text-ink-secondary">
			Private, focused email — Mail 2.0.
		</p>

		<input {...login.fields.next.as('hidden', data.next)} />

		<div class="mt-5 flex flex-col gap-3.5">
			<div class="flex flex-col gap-1.5">
				<label for="login-email" class="text-[13px] font-medium">Email</label>
				<input
					{...login.fields.email.as('email')}
					id="login-email"
					required
					autocomplete="username"
					placeholder="you@zaur.app"
					disabled={pending}
					class="h-10 rounded-control border border-line bg-container px-3 text-sm text-ink transition-colors duration-[160ms] placeholder:text-ink-disabled focus:border-accent focus:outline-none disabled:opacity-60"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="login-password" class="text-[13px] font-medium">Password</label>
				<input
					{...login.fields.password.as('password')}
					id="login-password"
					required
					autocomplete="current-password"
					disabled={pending}
					class="h-10 rounded-control border border-line bg-container px-3 text-sm text-ink transition-colors duration-[160ms] focus:border-accent focus:outline-none disabled:opacity-60"
				/>
			</div>

			{#if needsTotp}
				<div class="flex flex-col gap-1.5">
					<label for="login-totp" class="text-[13px] font-medium">Authentication code</label>
					<input
						{...login.fields.totp.as('text')}
						id="login-totp"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="123456"
						disabled={pending}
						class="h-10 rounded-control border border-line bg-container px-3 font-mono text-sm tracking-[0.2em] text-ink focus:border-accent focus:outline-none disabled:opacity-60"
					/>
					<p class="text-xs leading-relaxed text-ink-secondary">
						Enter the six-digit code from your authenticator app.
					</p>
				</div>
			{/if}

			<label class="flex w-full cursor-pointer items-center gap-2 py-0.5 text-sm text-ink-secondary">
				<input
					{...login.fields.remember.as('checkbox')}
					disabled={pending}
					class="size-[15px] accent-[var(--z-accent)]"
				/>
				Remember me
			</label>

			{#if error}
				<p class="text-[13px] text-danger" role="alert">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={pending}
				class="h-10 rounded-btn bg-accent text-sm text-accent-fg transition-colors duration-[160ms] hover:opacity-95 disabled:opacity-100 disabled:bg-ink-disabled"
			>
				{#if pending}
					Signing in…
				{:else if needsTotp}
					Verify and sign in
				{:else}
					Sign in
				{/if}
			</button>
		</div>
	</form>

	<p class="text-[13px] text-ink-secondary">
		{#if data.registerUrl}
			Need an address?
			<a href={data.registerUrl} class="font-semibold text-accent hover:underline">
				Create your account
			</a>
		{:else}
			Invites open periodically at
			<a href="https://register.zaur.app" class="font-semibold text-accent hover:underline"
				>register.zaur.app</a
			>
		{/if}
	</p>
</div>
