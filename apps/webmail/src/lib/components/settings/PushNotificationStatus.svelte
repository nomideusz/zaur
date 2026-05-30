<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getPushNotificationStatus,
		pushStatusLabel,
		pushStatusTone,
		syncPushSubscription,
		unsubscribeFromPushNotifications,
		type PushNotificationStatus
	} from '$lib/utils/notifications';
	import { ensureAppServiceWorkerReady, resetAppServiceWorker } from '$lib/utils/service-worker';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

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
				lastError = 'Notifications are blocked for this site in browser settings.';
			} else if (pushStatus.state === 'unsupported') {
				lastError = 'Background push needs Chrome or Firefox on desktop.';
			} else if (!ok || (pushStatus.state !== 'subscribed' && pushStatus.state !== 'prompt')) {
				lastError = 'Could not register push on this device.';
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
			if (!ok) lastError = 'Service worker or push registration failed.';
			await refreshStatus();
		} finally {
			busy = false;
		}
	}

	const toneClass = $derived(
		pushStatusTone(pushStatus) === 'success'
			? 'text-green-700 dark:text-green-300'
			: pushStatusTone(pushStatus) === 'warning'
				? 'text-amber-700 dark:text-amber-300'
				: 'text-fg-muted'
	);

	const showInstall = $derived(!pwa.isInstalled && (pwa.canInstall || pwa.showIosHint));
</script>

<div class="flex max-w-sm flex-col items-end gap-2">
	<span class={cn('z-settings-row-desc text-right font-medium', toneClass)}>
		{pushStatusLabel(pushStatus)}
	</span>

	{#if lastError}
		<p class="z-settings-row-desc text-right text-amber-700 dark:text-amber-300">{lastError}</p>
	{/if}

	<div class="flex flex-wrap items-center justify-end gap-2">
		{#if pushStatus.state === 'subscribed'}
			<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void disablePush()}>
				Turn off push
			</button>
		{:else if pushStatus.state === 'prompt' || pushStatus.state === 'not_subscribed'}
			<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void enablePush()}>
				Enable push
			</button>
		{:else if pushStatus.state === 'denied'}
			<span class="z-settings-row-desc text-fg-subtle">Change in browser site settings</span>
		{:else if pushStatus.state === 'service_worker_unavailable'}
			<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void retryPush()}>
				Retry
			</button>
		{:else if pushStatus.state === 'unsupported'}
			<span class="z-settings-row-desc text-fg-subtle">Use Chrome or Firefox for background push</span>
		{/if}

		{#if showInstall}
			<button type="button" class="z-btn-ghost text-sm" onclick={() => pwa.showInstallPromptAgain()}>
				Install app
			</button>
		{/if}
	</div>
</div>
