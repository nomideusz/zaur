<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthAlert from '#lib/components/auth/AuthAlert.svelte';
	import AuthCard, { fieldClass, inputClass, linkClass } from '#lib/components/auth/AuthCard.svelte';
	import { login } from '../login.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pending = $derived(login.pending > 0);
	const result = $derived(login.result);
	const needsTotp = $derived(result?.requiresTotp === true);
	const error = $derived(result && !result.ok ? (result.error ?? null) : null);

	/**
	 * The two errors Stalwart actually returns — a rejected sign-in and a
	 * locked-out account — each get a title and a hint. The credential check
	 * cannot tell a wrong password from an unknown address, so it does not
	 * pretend to.
	 */
	const errorCard = $derived.by(() => {
		if (!error) return null;
		if (/too many/i.test(error)) {
			return {
				title: 'Too many attempts',
				hint: error.replace(/^Too many sign-in attempts\.\s*/i, '') || 'Signing in is paused for a while. It will unlock on its own.'
			};
		}
		if (/invalid/i.test(error)) {
			return {
				title: 'Those details did not match',
				hint: needsTotp
					? 'Check the code in your authenticator app — it changes every 30 seconds.'
					: 'Check the address and your capitals.'
			};
		}
		return { title: error, hint: null };
	});

	$effect(() => {
		if (!result?.ok) return;
		// A newly added account becomes the active one: reload, so nothing loaded for
		// the previous account (lists, drafts, the live stream) survives into it.
		if (data.addingTo) location.assign('/');
		else goto(data.next, { replaceState: true });
	});

	// When Stalwart asks for a 2FA code, put the cursor in the code field.
	$effect(() => {
		if (needsTotp) document.getElementById('login-totp')?.focus();
	});
</script>

<svelte:head>
	<title>{data.addingTo ? 'Add an account' : 'Sign in'} · Zaur Mail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard title={data.addingTo ? 'Add an account' : 'Sign in'}>
	{#if data.addingTo}
		<p class="mt-1.5 text-[12.5px] leading-normal text-[var(--z-muted)]">
			Signed in as <span class="z-mono text-[11.5px] text-[var(--z-strong)]">{data.addingTo}</span>. The account
			you add here joins it; switch between them from the account menu.
		</p>
	{:else if data.continueTo}
		<p class="mt-1.5 text-[12.5px] leading-normal text-[var(--z-muted)]">
			to continue to <span class="font-semibold text-[var(--z-strong)]">{data.continueTo}</span>, with your Zaur address.
		</p>
	{/if}

	{#if data.signedOut}
		<AuthAlert
			tone="ok"
			title="Signed out everywhere"
			hint={data.returnName
				? `You're signed out of ${data.returnName} and Zaur Mail. Sign in to get back to ${data.returnName}.`
				: "You're signed out of Zaur Mail. Sign in again whenever you're ready."}
		/>
	{:else if data.welcome}
		<AuthAlert tone="ok" title="Welcome — almost done" hint="Sign in with the address and password you just created." />
	{/if}

	<form {...login}>
		<div class="mt-[18px] flex items-center gap-2.5">
			<span class="z-caption">Credentials</span>
			<span class="h-px flex-1 bg-[var(--z-hairline)]"></span>
		</div>

		<input {...login.fields.next.as('hidden', data.next)} />
		{#if data.addingTo}
			<input {...login.fields.mode.as('hidden', 'add')} />
		{/if}

		<div class="mt-3 flex flex-col gap-2.5">
			<label class={fieldClass} aria-invalid={errorCard && !needsTotp ? 'true' : undefined}>
				<svg class="size-[15px] shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3" />
					<path d="M2.4 4.6L8 8.8l5.6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
				</svg>
				<input
					{...login.fields.email.as('email', data.email)}
					id="login-email"
					required
					autocomplete="username"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					enterkeyhint="next"
					placeholder="you@zaur.app"
					aria-label="Email"
					disabled={pending}
					class={inputClass}
				/>
			</label>

			<label class={fieldClass}>
				<svg class="size-[15px] shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<rect x="3" y="7" width="10" height="6.5" rx="1.4" stroke="currentColor" stroke-width="1.3" />
					<path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
				</svg>
				<input
					{...login.fields.password.as('password')}
					id="login-password"
					required
					autocomplete="current-password"
					enterkeyhint="go"
					placeholder="Password"
					aria-label="Password"
					disabled={pending}
					class={inputClass}
				/>
			</label>

			{#if needsTotp}
				<label class={fieldClass}>
					<svg class="size-[15px] shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" />
						<path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
					<input
						{...login.fields.totp.as('text')}
						id="login-totp"
						inputmode="numeric"
						autocomplete="one-time-code"
						enterkeyhint="go"
						placeholder="Authentication code"
						aria-label="Authentication code"
						disabled={pending}
						class="{inputClass} z-mono tracking-[0.2em]"
					/>
				</label>
				<p class="z-mono -mt-0.5 text-[10.5px] text-[var(--z-soft)]">Six digits from your authenticator app.</p>
			{/if}
		</div>

		{#if errorCard}
			<AuthAlert title={errorCard.title} hint={errorCard.hint} />
		{/if}

		<label
			class="mt-2.5 flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-surface)] px-[11px]"
		>
			<input {...login.fields.remember.as('checkbox')} disabled={pending} class="z-check disabled:opacity-60" />
			<span class="flex-1 text-[13.5px] text-[var(--z-strong)]">Keep me signed in</span>
			<span class="z-mono text-[10px] text-[var(--z-soft)]">30 days</span>
		</label>

		<button type="submit" disabled={pending} class="btn-tactile btn-primary mt-3.5 h-[42px] w-full !text-[14px]">
			{#if pending}
				Signing in…
			{:else if needsTotp}
				Verify and sign in
			{:else}
				{data.addingTo ? 'Add account' : 'Sign in'}
			{/if}
			<kbd class="z-kbd z-kbd-inverse" aria-hidden="true">↵</kbd>
		</button>
		{#if data.addingTo}
			<a href="/" class="btn-tactile mt-2 h-[38px] w-full !text-[13.5px]">Cancel</a>
		{:else if data.resetEnabled}
			<a href="/forgot-password" class="mt-3 block text-center text-[12.5px] {linkClass}">Forgot your password?</a>
		{/if}
	</form>

	{#snippet below()}
		{#if data.registerUrl}
			Need an address?
			<a href={data.registerUrl} class={linkClass}>Create your account</a>
		{:else}
			Invites open periodically at
			<a href="https://register.zaur.app" class={linkClass}>register.zaur.app</a>
		{/if}
	{/snippet}
</AuthCard>
