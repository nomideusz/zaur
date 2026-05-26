<script lang="ts">
	import { WifiOff } from 'lucide-svelte';
	import { network } from '$lib/stores/network.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

{#if !network.isOnline && !settings.hideOfflineIndicator}
	<div
		class={cn(
			'flex items-center rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
			settings.compactOfflineIndicator ? 'gap-1 px-2 py-0.5 text-[11px]' : 'gap-1.5 px-2.5 py-1 text-xs'
		)}
		role="status"
		title="Offline"
	>
		<WifiOff class={cn('shrink-0', settings.compactOfflineIndicator ? 'size-3' : 'size-3.5')} aria-hidden="true" />
		<span class="sr-only">Offline. Queued messages will send when the connection returns.</span>
		<span class="hidden sm:inline">Offline</span>
	</div>
{/if}
