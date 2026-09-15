<script lang="ts">
	import ZaurMark from '#lib/components/mail/ZaurMark.svelte';
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
	class="flex min-h-svh flex-col items-center justify-center gap-6 bg-[#ebeef2] px-6 py-10 text-slate-900"
>
	<form
		{...login}
		class="w-full max-w-[380px] overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-window"
	>
		<!-- Window header: the mark is taken out of the flow so the title stays
		     centred on the window rather than on whatever is left beside it. -->
		<div class="relative flex h-11 items-center justify-center border-b border-[#e2e8f0] bg-slate-50/80 px-4">
			<ZaurMark unread={0} label="Zaur Mail" size={24} class="absolute left-4 top-1/2 -translate-y-1/2" />
			<span class="text-xs font-semibold text-slate-600">Zaur Mail</span>
		</div>

		<div class="p-6">
			<h1 class="text-[18px] font-bold tracking-tight text-slate-900">Sign in</h1>
			<p class="mt-1 text-[13px] leading-relaxed text-slate-500">
				Private, focused email — Mail 2.0.
			</p>

			<input {...login.fields.next.as('hidden', data.next)} />

			<div class="mt-5 flex flex-col gap-3.5">
				<div class="flex flex-col gap-1.5">
					<label for="login-email" class="text-[13px] font-semibold text-slate-700">Email</label>
					<input
						{...login.fields.email.as('email')}
						id="login-email"
						required
						autocomplete="username"
						placeholder="you@zaur.app"
						disabled={pending}
						class="h-9 rounded-[6px] border border-[#cbd5e1] bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60 shadow-2xs"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="login-password" class="text-[13px] font-semibold text-slate-700">Password</label>
					<input
						{...login.fields.password.as('password')}
						id="login-password"
						required
						autocomplete="current-password"
						disabled={pending}
						class="h-9 rounded-[6px] border border-[#cbd5e1] bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60 shadow-2xs"
					/>
				</div>

				{#if needsTotp}
					<div class="flex flex-col gap-1.5">
						<label for="login-totp" class="text-[13px] font-semibold text-slate-700">Authentication code</label>
						<input
							{...login.fields.totp.as('text')}
							id="login-totp"
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							disabled={pending}
							class="h-9 rounded-[6px] border border-[#cbd5e1] bg-white px-3 font-mono text-sm tracking-[0.2em] text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60 shadow-2xs"
						/>
						<p class="text-xs leading-relaxed text-slate-500">
							Enter the six-digit code from your authenticator app.
						</p>
					</div>
				{/if}

				<label class="flex w-full cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-600">
					<input
						{...login.fields.remember.as('checkbox')}
						disabled={pending}
						class="size-4 rounded border-[#cbd5e1] text-blue-600 focus:ring-blue-500"
					/>
					Remember me
				</label>

				{#if error}
					<p class="text-[13px] text-red-600 font-medium" role="alert">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={pending}
					class="btn-tactile !h-10 !bg-blue-600 !border-blue-700 !text-white hover:!bg-blue-700 font-semibold text-sm shadow-2xs"
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
		</div>
	</form>

	<p class="text-[13px] text-slate-500">
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
