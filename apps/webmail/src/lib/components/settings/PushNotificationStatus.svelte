<script lang="ts">
	import { onMount } from 'svelte';
	import {
		fetchMutedPushAccounts,
		getPushNotificationStatus,
		saveMutedPushAccounts,
		syncPushSubscription,
		unsubscribeFromPushNotifications,
		type PushNotificationStatus
	} from '$lib/utils/notifications';
	import { ensureAppServiceWorkerReady, resetAppServiceWorker } from '$lib/utils/service-worker';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	let pushStatus = $state<PushNotificationStatus>({ state: 'prompt' });
	let busy = $state(false);
	let lastError = $state<string | null>(null);
	/** Account keys muted on this device; null until loaded. */
	let mutedAccounts = $state<string[] | null>(null);

	async function refreshStatus() {
		pushStatus = await getPushNotificationStatus();
		pwa.refreshInstalledState();
		mutedAccounts =
			pushStatus.state === 'subscribed' && auth.accounts.length > 1
				? await fetchMutedPushAccounts()
				: null;
	}

	async function toggleAccount(key: string, enabled: boolean) {
		const current = mutedAccounts ?? [];
		const next = enabled ? current.filter((k) => k !== key) : [...new Set([...current, key])];
		mutedAccounts = next;
		if (!(await saveMutedPushAccounts(next))) {
			mutedAccounts = current;
			lastError = 'Could not save notification preferences';
		}
	}

	onMount(() => {
		void refreshStatus();

		const onVisibility = () => {
			if (document.visibilityState === 'visible') void refreshStatus();
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => document.removeEventListener('visibilitychange', onVisibility);
	});

	async function enablePush() {
		busy = true;
		lastError = null;
		try {
			await ensureAppServiceWorkerReady();

			let ok: boolean;
			if (!settings.notifyOnNewMail) {
				ok = (await settings.setNotifyOnNewMail(true)) ?? false;
			} else {
				ok = await syncPushSubscription(true);
			}

			if (!ok) {
				await resetAppServiceWorker();
				ok = await syncPushSubscription(true);
			}

			await refreshStatus();
			if (pushStatus.state === 'denied') {
				lastError = 'Blocked in browser settings';
			} else if (pushStatus.state === 'unsupported') {
				lastError = 'Not supported in this browser';
			} else if (pushStatus.state === 'server_disabled') {
				lastError = 'Not configured on server';
			} else if (!ok || (pushStatus.state !== 'subscribed' && pushStatus.state !== 'prompt')) {
				lastError = 'Could not register push';
			}
		} finally {
			busy = false;
		}
	}

	async function disablePush() {
		busy = true;
		lastError = null;
		try {
			if (settings.notifyOnNewMail) {
				settings.setNotifyOnNewMail(false);
			} else {
				await unsubscribeFromPushNotifications();
			}
			await refreshStatus();
		} finally {
			busy = false;
		}
	}

	async function retryPush() {
		busy = true;
		lastError = null;
		try {
			await resetAppServiceWorker();
			const ok = await syncPushSubscription(settings.notifyOnNewMail);
			if (!ok) lastError = 'Registration failed';
			await refreshStatus();
		} finally {
			busy = false;
		}
	}

</script>

<div class="flex flex-col items-end gap-1">
	<div class="flex items-center gap-2">
		{#if busy}
			<span class="text-fg-muted">Syncing…</span>
		{:else if pushStatus.state === 'subscribed'}
			<span class="text-fg-muted">Active</span>
		{/if}
		<Switch
			checked={settings.notifyOnNewMail}
			disabled={busy || pushStatus.state === 'unsupported' || pushStatus.state === 'server_disabled'}
			onchange={async (checked) => {
				if (checked) {
					await enablePush();
				} else {
					await disablePush();
				}
			}}
		/>
	</div>

	{#if pushStatus.state === 'denied'}
		<span class="text-fg-muted">Blocked in browser</span>
	{:else if pushStatus.state === 'unsupported'}
		<span class="text-fg-muted">Not supported</span>
	{:else if pushStatus.state === 'server_disabled'}
		<span class="text-fg-muted">Not on server</span>
	{:else if pushStatus.state === 'service_worker_unavailable'}
		<div class="flex items-center gap-1.5">
			<span class="text-fg-muted">Not ready</span>
			<button
				type="button"
				class="z-mail-text-nav__link"
				disabled={busy}
				onclick={() => void retryPush()}
			>
				Retry
			</button>
		</div>
	{/if}

	{#if pushStatus.state === 'subscribed' && auth.accounts.length > 1 && mutedAccounts !== null}
		<div class="mt-1 flex flex-col items-end gap-1.5">
			{#each auth.accounts as account (account.key)}
				<div class="flex items-center gap-2">
					<span class="text-fg-muted">{account.username}</span>
					<Switch
						checked={!mutedAccounts.includes(account.key)}
						disabled={busy}
						label={`Notifications for ${account.username}`}
						onchange={(checked) => void toggleAccount(account.key, checked)}
					/>
				</div>
			{/each}
		</div>
	{/if}

	{#if lastError}
		<span class="text-fg-muted">{lastError}</span>
	{/if}
</div>
