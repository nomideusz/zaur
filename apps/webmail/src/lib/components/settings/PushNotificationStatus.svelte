<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getPushNotificationStatus,
		syncPushSubscription,
		unsubscribeFromPushNotifications,
		type PushNotificationStatus
	} from '$lib/utils/notifications';
	import { ensureAppServiceWorkerReady, resetAppServiceWorker } from '$lib/utils/service-worker';
	import IOSToggle from '$lib/components/ui/IOSToggle.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	let pushStatus = $state<PushNotificationStatus>({ state: 'prompt' });
	let busy = $state(false);
	let lastError = $state<string | null>(null);

	async function refreshStatus() {
		pushStatus = await getPushNotificationStatus();
		pwa.refreshInstalledState();
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
			const ok = await syncPushSubscription(settings.notifyOnNewMail || true);
			if (!ok) lastError = 'Registration failed';
			await refreshStatus();
		} finally {
			busy = false;
		}
	}

	const showInstall = $derived(!pwa.isInstalled && (pwa.canInstall || pwa.showIosHint));
</script>

<div class="flex flex-col items-end gap-1">
	<div class="flex items-center gap-2">
		{#if busy}
			<span class="text-fg-muted">Syncing…</span>
		{:else if pushStatus.state === 'subscribed'}
			<span class="text-fg-muted">Active</span>
		{/if}
		<IOSToggle
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

	{#if lastError}
		<span class="text-fg-muted">{lastError}</span>
	{/if}

	{#if showInstall && pushStatus.state !== 'unsupported' && pushStatus.state !== 'server_disabled'}
		<button type="button" class="z-mail-text-nav__link" onclick={() => pwa.showInstallPromptAgain()}>
			Install app
		</button>
	{/if}
</div>
