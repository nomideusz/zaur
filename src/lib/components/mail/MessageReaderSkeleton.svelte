<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-raised">
	{#if settings.minimalLoadingStates}
		<p class="flex flex-1 items-center justify-center text-sm text-fg-muted" aria-busy="true">
			Loading message…
		</p>
	{:else}
		<div
			class={cn(
				'shrink-0 px-4 md:px-6',
				settings.compactReaderHeader ? 'py-2' : 'py-3',
				!settings.hideReaderPaneBorders && 'border-b border-border'
			)}
		>
			<div class="h-6 w-2/3 max-w-md animate-pulse rounded bg-surface-sunken"></div>
			<div class="mt-3 h-4 w-1/3 animate-pulse rounded bg-surface-sunken"></div>
		</div>
		<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto space-y-4 px-4 py-5 md:px-6">
			<div class="flex gap-3">
				<div class="size-9 shrink-0 animate-pulse rounded-full bg-surface-sunken"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 w-40 animate-pulse rounded bg-surface-sunken"></div>
					<div class="h-3 w-56 animate-pulse rounded bg-surface-sunken"></div>
				</div>
			</div>
			<div class="space-y-2">
				<div class="h-3 w-full animate-pulse rounded bg-surface-sunken"></div>
				<div class="h-3 w-full animate-pulse rounded bg-surface-sunken"></div>
				<div class="h-3 w-4/5 animate-pulse rounded bg-surface-sunken"></div>
			</div>
		</div>
	{/if}
</div>
