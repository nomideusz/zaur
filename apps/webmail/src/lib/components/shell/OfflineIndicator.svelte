<script lang="ts">
	import WifiOff from '$lib/components/icons/WifiOff.svelte';
	import { network } from '$lib/stores/network.svelte';
</script>

{#if !network.isOnline}
	<div
		class="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
		role="status"
		title="Offline"
	>
		<WifiOff class="size-3.5 shrink-0" aria-hidden="true" />
		<span class="sr-only">Offline. Queued messages will send when the connection returns.</span>
		<span class="hidden sm:inline">Offline</span>
	</div>
{/if}
