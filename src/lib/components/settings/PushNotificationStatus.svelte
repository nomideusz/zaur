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
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let pushStatus = $state<PushNotificationStatus>({ state: 'prompt' });
	let busy = $state(false);

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
		try {
			if (!settings.notifyOnNewMail) {
				settings.setNotifyOnNewMail(true);
			} else {
				await syncPushSubscription(true);
			}
			await refreshStatus();
		} finally {
			busy = false;
		}
	}

	async function disablePush() {
		busy = true;
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
		try {
			await syncPushSubscription(settings.notifyOnNewMail);
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
</script>

<div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
	<span class={cn('text-right text-xs font-medium', toneClass)}>
		{pushStatusLabel(pushStatus)}
	</span>

	{#if !pwa.isInstalled && (pwa.canInstall || pwa.showIosHint)}
		<button type="button" class="z-btn-ghost text-sm" onclick={() => pwa.showInstallPromptAgain()}>
			Install app
		</button>
	{:else if pushStatus.state === 'subscribed'}
		<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void disablePush()}>
			Turn off push
		</button>
	{:else if pushStatus.state === 'prompt' || pushStatus.state === 'not_subscribed'}
		<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void enablePush()}>
			Enable push
		</button>
	{:else if pushStatus.state === 'denied'}
		<span class="text-xs text-fg-subtle">Change in browser site settings</span>
	{:else if pushStatus.state === 'service_worker_unavailable'}
		<button type="button" class="z-btn-ghost text-sm" disabled={busy} onclick={() => void retryPush()}>
			Retry
		</button>
	{/if}
</div>
