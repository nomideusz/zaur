<script lang="ts">
	import AuthAlert from '#lib/components/auth/AuthAlert.svelte';
	import AuthCard, { fieldClass, inputClass, linkClass } from '#lib/components/auth/AuthCard.svelte';
	import { requestReset } from '../reset.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pending = $derived(requestReset.pending > 0);
	const result = $derived(requestReset.result);
</script>

<svelte:head>
	<title>Forgot password · Zaur Mail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard title="Forgot your password?">
	{#if result?.ok}
		<AuthAlert tone="ok" title="Check your recovery email" hint={result.message} />
	{:else}
		<p class="mt-1.5 text-[12.5px] leading-normal text-[var(--z-muted)]">
			{data.viaRecovery
				? 'The link goes to the address your invitation came to.'
				: 'Your Zaur address, or the personal email your invitation came to. The link goes to your recovery email.'}
		</p>
		<form {...requestReset} class="mt-[18px] flex flex-col gap-2.5">
			<label class={fieldClass}>
				<svg class="size-[15px] shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3" />
					<path d="M2.4 4.6L8 8.8l5.6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
				</svg>
				<input
					{...requestReset.fields.email.as('email', data.email)}
					required
					autocomplete="username"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					enterkeyhint="send"
					placeholder={data.viaRecovery ? 'you@gmail.com' : 'you@zaur.app'}
					aria-label="Email"
					disabled={pending}
					class={inputClass}
				/>
			</label>
			{#if result?.error}
				<AuthAlert title={result.error} />
			{/if}
			<button type="submit" disabled={pending} class="btn-tactile btn-primary mt-1 h-[42px] w-full !text-[14px]">
				{pending ? 'Sending…' : 'Send reset link'}
			</button>
		</form>
	{/if}

	{#snippet below()}
		<a href="/login" class={linkClass}>Back to sign in</a>
	{/snippet}
</AuthCard>
