<script lang="ts">
	import { goto } from '$app/navigation';
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
					: 'Check the address and your capitals. Password resets live at register.zaur.app.'
			};
		}
		return { title: error, hint: null };
	});

	$effect(() => {
		if (result?.ok) goto(data.next, { replaceState: true });
	});

	// When Stalwart asks for a 2FA code, put the cursor in the code field.
	$effect(() => {
		if (needsTotp) document.getElementById('login-totp')?.focus();
	});

	const fieldClass =
		'flex h-10 items-center gap-2.5 rounded-[8px] border border-[#cbd5e1] bg-white px-[11px] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] focus-within:border-[#2563eb] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.18)]';
	const inputClass =
		'min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#0b1220] outline-none placeholder:text-[#94a3b8] disabled:opacity-60 max-md:text-base';
</script>

<svelte:head>
	<title>Sign in · Zaur Mail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center gap-5 bg-[#f6f7f9] px-6 py-10 text-[#0b1220]">
	<!-- The card: a top edge in the accent, the wordmark with its Beta chip,
	     and the fields under a captioned rule. The one screen with no channels
	     on it, so the accent is the only colour. -->
	<form
		{...login}
		class="relative w-full max-w-[380px] overflow-hidden rounded-[12px] border border-[#cbd5e1] bg-white shadow-[var(--z-shadow-window)]"
	>
		<span class="absolute inset-x-0 top-0 h-[3px] bg-[#2563eb]" aria-hidden="true"></span>

		<div class="px-[22px] pt-6 pb-[22px]">
			<div class="flex items-center gap-[9px]">
				<span class="text-[17px] font-bold tracking-[-0.025em] text-[#0b1220]">Zaur</span>
				<span class="z-chip z-chip-filled !tracking-[0.06em]" style="--z-fill:#fde68a;--z-stroke:#d97706;--z-ink-on:#78350f">Beta</span>
			</div>
			<h1 class="mt-3.5 text-[22px] leading-[1.15] font-bold tracking-[-0.025em] text-[#0b1220]">Sign in</h1>

			<div class="mt-[18px] flex items-center gap-2.5">
				<span class="z-caption">Credentials</span>
				<span class="h-px flex-1 bg-[#e2e8f0]"></span>
			</div>

			<input {...login.fields.next.as('hidden', data.next)} />

			<div class="mt-3 flex flex-col gap-2.5">
				<label class={fieldClass} aria-invalid={errorCard && !needsTotp ? 'true' : undefined}>
					<svg class="size-[15px] shrink-0 text-[#94a3b8]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3" />
						<path d="M2.4 4.6L8 8.8l5.6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
					</svg>
					<input
						{...login.fields.email.as('email')}
						id="login-email"
						required
						autocomplete="username"
						placeholder="you@zaur.app"
						aria-label="Email"
						disabled={pending}
						class={inputClass}
					/>
				</label>

				<label class={fieldClass}>
					<svg class="size-[15px] shrink-0 text-[#94a3b8]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="3" y="7" width="10" height="6.5" rx="1.4" stroke="currentColor" stroke-width="1.3" />
						<path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
					</svg>
					<input
						{...login.fields.password.as('password')}
						id="login-password"
						required
						autocomplete="current-password"
						placeholder="Password"
						aria-label="Password"
						disabled={pending}
						class={inputClass}
					/>
				</label>

				{#if needsTotp}
					<label class={fieldClass}>
						<svg class="size-[15px] shrink-0 text-[#94a3b8]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" />
							<path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
						</svg>
						<input
							{...login.fields.totp.as('text')}
							id="login-totp"
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="Authentication code"
							aria-label="Authentication code"
							disabled={pending}
							class="{inputClass} z-mono tracking-[0.2em]"
						/>
					</label>
					<p class="z-mono -mt-0.5 text-[10.5px] text-[#64748b]">Six digits from your authenticator app.</p>
				{/if}
			</div>

			{#if errorCard}
				<div
					class="z-railed mt-2.5 flex items-start gap-[9px] rounded-[8px] border border-[#ef4444] bg-[#fee2e2] py-[9px] pr-[11px] pl-[18px]"
					style:--z-rail="#dc2626"
					style:--z-rail-inset="8px"
					role="alert"
				>
					<svg class="mt-px size-[15px] shrink-0 text-[#b91c1c]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4" />
						<path d="M8 5v3.6M8 10.7v.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
					<span class="min-w-0">
						<span class="block text-[13px] font-semibold text-[#b91c1c]">{errorCard.title}</span>
						{#if errorCard.hint}
							<span class="mt-0.5 block text-[12.5px] leading-normal text-[#991b1b]">{errorCard.hint}</span>
						{/if}
					</span>
				</div>
			{/if}

			<label
				class="mt-2.5 flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[8px] border border-[#e2e8f0] bg-white px-[11px]"
			>
				<input {...login.fields.remember.as('checkbox')} disabled={pending} class="z-check disabled:opacity-60" />
				<span class="flex-1 text-[13.5px] text-[#334155]">Keep me signed in</span>
				<span class="z-mono text-[10px] text-[#64748b]">30 days</span>
			</label>

			<button type="submit" disabled={pending} class="btn-tactile btn-primary mt-3.5 h-[42px] w-full !text-[14px]">
				{#if pending}
					Signing in…
				{:else if needsTotp}
					Verify and sign in
				{:else}
					Sign in
				{/if}
				<kbd class="z-kbd z-kbd-inverse" aria-hidden="true">↵</kbd>
			</button>
		</div>
	</form>

	<p class="text-[13px] text-[#475569]">
		{#if data.registerUrl}
			Need an address?
			<a href={data.registerUrl} class="font-semibold text-[#2563eb] hover:text-[#1d4ed8]">Create your account</a>
		{:else}
			Invites open periodically at
			<a href="https://register.zaur.app" class="font-semibold text-[#2563eb] hover:text-[#1d4ed8]">register.zaur.app</a>
		{/if}
	</p>
</div>
