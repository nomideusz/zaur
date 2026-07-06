<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { quota, formatStorageSize } from '$lib/stores/quota.svelte';
	import Progress from '$lib/components/ui/Progress.svelte';

	// Settings should show up-to-the-minute numbers, so bypass the cache here.
	$effect(() => {
		if (auth.client) void quota.load(auth.client, { force: true });
	});
</script>

<!-- Only `ready` renders anything — servers without the Quota extension stay silent. -->
{#if quota.status === 'ready'}
	<section class="z-settings-section">
		<div class="z-settings-section-heading">
			<p class="z-settings-section-title">Storage</p>
			<p class="z-settings-section-desc">Mailbox storage used on your account.</p>
		</div>
		<div class="z-storage-quota">
			<Progress value={quota.percent} max={100} tone={quota.nearFull ? 'danger' : 'accent'} />
			<p class="z-storage-quota__caption" class:z-storage-quota__caption--warn={quota.nearFull}>
				<strong>{formatStorageSize(quota.used)}</strong>
				of {formatStorageSize(quota.limit)} used · {quota.percent}%
			</p>
		</div>
	</section>
{/if}
