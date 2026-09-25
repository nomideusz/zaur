<script lang="ts">
	import { messageOf } from '#lib/errors';
	import { onMount } from 'svelte';
	import StatusNote from '#lib/components/settings/StatusNote.svelte';
	import { disablePush, enablePush, pushEndpoint, pushStatus, type PushStatus } from '#lib/push';
	import { pushMutes, setPushMutes } from '../../../push.remote';
	import { whoami } from '../../../session.remote';

	const who = whoami();
	const session = $derived(who.current ?? null);

	let status = $state<{ text: string; error?: boolean } | null>(null);

	// Notifications belong to the device: read from the browser each visit.
	let push = $state<PushStatus | null>(null);
	let busy = $state(false);
	onMount(() => {
		pushStatus()
			.then((next) => (push = next))
			.catch(() => (push = 'unsupported'));
	});

	/**
	 * With more than one account signed in, each can be kept quiet on this
	 * device. The server holds the list against this browser's subscription.
	 */
	let muted = $state<string[] | null>(null);
	$effect(() => {
		if (push !== 'on' || (session?.accounts.length ?? 0) < 2) {
			muted = null;
			return;
		}
		void pushEndpoint()
			.then((endpoint) => (endpoint ? pushMutes({ endpoint }) : null))
			.then((list) => (muted = list))
			.catch(() => (muted = null));
	});

	async function setMuted(key: string, notify: boolean) {
		const before = muted ?? [];
		const next = notify ? before.filter((entry) => entry !== key) : [...before, key];
		muted = next;
		status = null;
		try {
			const endpoint = await pushEndpoint();
			if (!endpoint) throw new Error('Notifications are off on this device');
			await setPushMutes({ endpoint, mutedAccounts: next });
		} catch (cause) {
			muted = before;
			status = { text: messageOf(cause, 'Could not change notifications'), error: true };
		}
	}

	async function toggle() {
		busy = true;
		status = null;
		try {
			push = push === 'on' ? await disablePush() : await enablePush();
		} catch (cause) {
			status = { text: messageOf(cause, 'Could not change notifications'), error: true };
		} finally {
			busy = false;
		}
	}

	const note: Record<PushStatus, string> = {
		unconfigured: 'Not set up on this server',
		unsupported: 'This browser cannot show notifications',
		install: 'Add Zaur to your Home Screen (Share → Add to Home Screen) and open it from there',
		denied: 'Blocked in your browser settings for this site',
		off: 'Off on this device',
		on: 'On for this device'
	};
</script>

<StatusNote {status} />

<section class="z-card">
	<div class="flex items-center justify-between gap-4 px-4 py-3">
		<span class="min-w-0">
			<span class="block text-[13.5px] font-medium text-[var(--z-body)]">New mail</span>
			<span class="mt-[1px] block text-[12px] text-[var(--z-soft)]">{push ? note[push] : 'Checking…'}</span>
		</span>
		{#if push === 'on' || push === 'off'}
			<button type="button" class="btn-tactile shrink-0 !h-8 {push === 'off' ? 'btn-primary' : ''}" disabled={busy} onclick={toggle}>
				{push === 'on' ? 'Turn off' : 'Turn on'}
			</button>
		{/if}
	</div>
	{#if session && muted}
		<h2 class="z-card-head border-t border-[var(--z-hairline)]">Accounts on this device</h2>
		<div class="divide-y divide-[var(--z-hairline)] border-t border-[var(--z-hairline)]">
			{#each session.accounts as account (account.key)}
				<label class="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
					<span class="min-w-0">
						<span class="block truncate text-[13.5px] font-medium text-[var(--z-body)]">{account.username}</span>
						<span class="block text-[12px] text-[var(--z-soft)]">{muted.includes(account.key) ? 'Muted on this device' : 'Notifies'}</span>
					</span>
					<input type="checkbox" class="z-check" checked={!muted.includes(account.key)} onchange={(event) => setMuted(account.key, event.currentTarget.checked)} />
				</label>
			{/each}
		</div>
	{/if}
</section>
