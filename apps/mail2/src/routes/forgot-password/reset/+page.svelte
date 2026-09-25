<script lang="ts">
	import AuthAlert from '#lib/components/auth/AuthAlert.svelte';
	import AuthCard, { fieldClass, inputClass, linkClass } from '#lib/components/auth/AuthCard.svelte';
	import { resetPassword } from '../../reset.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pending = $derived(resetPassword.pending > 0);
	const result = $derived(resetPassword.result);
	const signIn = $derived(`/login?email=${encodeURIComponent(data.email)}`);
</script>

<svelte:head>
	<title>New password · Zaur Mail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet lock()}
	<svg class="size-[15px] shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<rect x="3" y="7" width="10" height="6.5" rx="1.4" stroke="currentColor" stroke-width="1.3" />
		<path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
	</svg>
{/snippet}

<AuthCard title="Choose a new password">
	{#if data.email}
		<p class="z-mono mt-1.5 text-[11.5px] text-[var(--z-strong)]">{data.email}</p>
	{/if}

	{#if result?.ok}
		<AuthAlert tone="ok" title="Password changed" hint="Sign in with the new one." />
		<a href={signIn} class="btn-tactile btn-primary mt-3.5 h-[42px] w-full !text-[14px]">Sign in</a>
	{:else if data.problem}
		<AuthAlert title={data.problem} />
		<a href="/forgot-password?email={encodeURIComponent(data.email)}" class="btn-tactile mt-3.5 h-[38px] w-full !text-[13.5px]">
			Send a new link
		</a>
	{:else}
		<form {...resetPassword} class="mt-[18px] flex flex-col gap-2.5">
			<input {...resetPassword.fields.email.as('hidden', data.email)} />
			<input {...resetPassword.fields.token.as('hidden', data.token)} />
			<!-- For the password manager: which account this new password belongs to. -->
			<input type="email" value={data.email} autocomplete="username" hidden readonly />
			<label class={fieldClass}>
				{@render lock()}
				<input
					{...resetPassword.fields._password.as('password')}
					required
					minlength="8"
					autocomplete="new-password"
					enterkeyhint="next"
					placeholder="New password"
					aria-label="New password"
					disabled={pending}
					class={inputClass}
				/>
			</label>
			<label class={fieldClass}>
				{@render lock()}
				<input
					{...resetPassword.fields._confirm.as('password')}
					required
					minlength="8"
					autocomplete="new-password"
					enterkeyhint="go"
					placeholder="The same again"
					aria-label="Confirm new password"
					disabled={pending}
					class={inputClass}
				/>
			</label>
			<p class="z-mono -mt-0.5 text-[10.5px] text-[var(--z-soft)]">At least 8 characters.</p>
			{#if result?.error}
				<AuthAlert title={result.error} />
			{/if}
			<button type="submit" disabled={pending} class="btn-tactile btn-primary mt-1 h-[42px] w-full !text-[14px]">
				{pending ? 'Saving…' : 'Change password'}
			</button>
		</form>
	{/if}

	{#snippet below()}
		<a href="/login" class={linkClass}>Back to sign in</a>
	{/snippet}
</AuthCard>
