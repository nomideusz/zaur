<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { appConfig } from '$lib/config';
	import Button from '$lib/components/ui/Button.svelte';
	import ZaurSprite from '$lib/components/ui/ZaurSprite.svelte';
	import {
		credentialToRegistrationPayload,
		toCreationOptions,
		type PublicKeyCreationOptionsJson
	} from '$lib/auth/webauthn';

	const email = $derived($page.url.searchParams.get('email')?.trim().toLowerCase() ?? '');
	const token = $derived($page.url.searchParams.get('token')?.trim() ?? '');

	let phase = $state<'loading' | 'ready' | 'working' | 'done' | 'error' | 'missing'>('loading');
	let error = $state<string | null>(null);

	onMount(async () => {
		if (!email || !token) {
			phase = 'missing';
			return;
		}

		// Drop the one-time token from the address bar once read.
		if (typeof history.replaceState === 'function') {
			history.replaceState({}, '', `/setup-passkey?email=${encodeURIComponent(email)}`);
		}

		try {
			const response = await fetch('/api/auth/passkey-setup/begin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, token })
			});
			const payload = (await response.json()) as {
				registrationOptions?: PublicKeyCreationOptionsJson;
				error?: string;
			};
			if (!response.ok) {
				throw new Error(payload.error ?? 'Unable to prepare passkey setup.');
			}
			if (!payload.registrationOptions) {
				throw new Error('Passkey setup options were not returned.');
			}
			phase = 'ready';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unable to prepare passkey setup.';
			phase = 'error';
		}
	});

	async function createPasskey() {
		if (phase !== 'ready') return;
		phase = 'working';
		error = null;

		try {
			const beginResponse = await fetch('/api/auth/passkey-setup/begin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, token })
			});
			const beginPayload = (await beginResponse.json()) as {
				registrationOptions?: PublicKeyCreationOptionsJson;
				error?: string;
			};
			if (!beginResponse.ok || !beginPayload.registrationOptions) {
				throw new Error(beginPayload.error ?? 'Unable to restart passkey setup.');
			}

			if (!window.PublicKeyCredential) {
				throw new Error('This browser does not support passkeys.');
			}

			const credential = (await navigator.credentials.create({
				publicKey: toCreationOptions(beginPayload.registrationOptions)
			})) as PublicKeyCredential | null;

			if (!credential) {
				throw new Error('Passkey creation was cancelled.');
			}

			const completeResponse = await fetch('/api/auth/passkey-setup/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payload: credentialToRegistrationPayload(credential) })
			});
			const completePayload = (await completeResponse.json()) as { error?: string };
			if (!completeResponse.ok) {
				throw new Error(completePayload.error ?? 'Unable to save passkey.');
			}

			phase = 'done';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Passkey setup failed.';
			phase = 'error';
		}
	}

	function openMail() {
		const params = new URLSearchParams({ email, passkey_ready: '1' });
		void goto(`/login?${params.toString()}`);
	}

	function skipToMail() {
		const params = new URLSearchParams({ email, welcome: '1' });
		void goto(`/login?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Set up passkey · {appConfig.appName}</title>
</svelte:head>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center text-accent">
				<ZaurSprite id="happy" scale={5} />
			</div>
			<h1 class="z-type-brand text-2xl text-fg">Set up a passkey</h1>
			<p class="mt-2 text-sm text-fg-muted">
				Sign in to webmail with Face ID, Touch ID, or your device PIN — no password needed.
			</p>
			{#if email}
				<p class="mt-3 text-sm font-medium text-fg">{email}</p>
			{/if}
		</div>

		{#if phase === 'loading'}
			<p class="text-center text-sm text-fg-muted">Preparing passkey setup…</p>
		{:else if phase === 'missing'}
			<p class="text-center text-sm text-fg-muted">
				This link is incomplete. Register again or open mail with your password.
			</p>
			<div class="mt-6 flex justify-center">
				<Button variant="secondary" onclick={() => goto('/login')}>Open sign in</Button>
			</div>
		{:else if phase === 'ready' || phase === 'working'}
			<div class="space-y-4">
				<p class="text-sm text-fg-muted">
					Your mailbox password still works for IMAP and as a backup. A passkey is only for signing
					in to webmail.
				</p>
				<Button class="w-full" disabled={phase === 'working'} onclick={createPasskey}>
					{phase === 'working' ? 'Waiting for device…' : 'Create passkey'}
				</Button>
				<Button class="w-full" variant="ghost" disabled={phase === 'working'} onclick={skipToMail}>
					Skip for now
				</Button>
			</div>
		{:else if phase === 'done'}
			<div class="space-y-4 text-center">
				<p class="text-sm text-fg">Passkey saved. You can sign in with it next time.</p>
				<Button class="w-full" onclick={openMail}>Open mail</Button>
			</div>
		{:else}
			<div class="space-y-4">
				<p class="text-sm text-danger">{error ?? 'Passkey setup failed.'}</p>
				<Button class="w-full" onclick={createPasskey}>Try again</Button>
				<Button class="w-full" variant="ghost" onclick={skipToMail}>Skip — open mail</Button>
			</div>
		{/if}
	</div>
</div>
