<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';

	/** Bytes → human-readable, GB/TB-aware (attachment formatter only goes to MB). */
	function formatStorageSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		const units = ['KB', 'MB', 'GB', 'TB'];
		let size = bytes / 1024;
		let unit = 0;
		while (size >= 1024 && unit < units.length - 1) {
			size /= 1024;
			unit++;
		}
		return `${size.toFixed(size >= 100 || unit < 2 ? 0 : 1)} ${units[unit]}`;
	}

	// Only `ready` renders anything — servers without the Quota extension stay silent.
	let status = $state<'loading' | 'ready' | 'unavailable'>('loading');
	let used = $state(0);
	let limit = $state(0);

	const percent = $derived(limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0);
	const nearFull = $derived(percent >= 90);

	onMount(async () => {
		const client = auth.client;
		if (!client) {
			status = 'unavailable';
			return;
		}
		try {
			const quota = await client.getStorageQuota();
			if (!quota) {
				status = 'unavailable';
				return;
			}
			used = quota.used;
			limit = quota.limit;
			status = 'ready';
		} catch {
			status = 'unavailable';
		}
	});
</script>

{#if status === 'ready'}
	<section class="z-settings-section">
		<div class="z-settings-section-heading">
			<p class="z-settings-section-title">Storage</p>
			<p class="z-settings-section-desc">Mailbox storage used on your account.</p>
		</div>
		<div class="z-storage-quota">
			<Progress value={percent} max={100} tone={nearFull ? 'danger' : 'accent'} />
			<p class="z-storage-quota__caption" class:z-storage-quota__caption--warn={nearFull}>
				<strong>{formatStorageSize(used)}</strong>
				of {formatStorageSize(limit)} used · {percent}%
			</p>
		</div>
	</section>
{/if}
