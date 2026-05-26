<script lang="ts">
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<div class="z-mail-pane-surface min-h-0 flex-1 overflow-hidden">
	{#if settings.loadingIndicatorStyle === 'skeleton'}
		<div
			class={cn(
				'z-pane-scroll min-h-0 flex-1 overflow-y-auto',
				settings.compactReaderSkeleton ? 'py-3' : 'py-5'
			)}
		>
			<div
				class={cn(
					'z-reader-column space-y-4 px-4 md:px-6',
					settings.compactReaderHeader || settings.compactReaderSkeleton ? 'pb-2' : 'pb-3',
					!settings.hideReaderPaneBorders && 'border-b border-border/80'
				)}
			>
				<div
					class={cn(
						'w-2/3 max-w-md animate-pulse rounded bg-surface-sunken',
						settings.compactReaderSkeleton ? 'h-5' : 'h-6'
					)}
				></div>
				<div
					class={cn(
						'animate-pulse rounded bg-surface-sunken',
						settings.compactReaderSkeleton ? 'mt-2 h-3 w-1/4' : 'mt-3 h-4 w-1/3'
					)}
				></div>
			</div>
			<div class="flex gap-3">
				<div
					class={cn(
						'shrink-0 animate-pulse rounded-full bg-surface-sunken',
						settings.compactReaderSkeleton || settings.compactReaderAvatars ? 'size-8' : 'size-9'
					)}
				></div>
				<div class="flex-1 space-y-2">
					<div class="flex items-center justify-between gap-3">
						<div class="h-4 w-36 animate-pulse rounded bg-surface-sunken"></div>
						<div class="h-3 w-24 animate-pulse rounded bg-surface-sunken"></div>
					</div>
					<div class="h-3 w-48 animate-pulse rounded bg-surface-sunken"></div>
				</div>
			</div>
			<div
				class={cn(
					'h-10 animate-pulse rounded-md border border-border/80 bg-surface-sunken/70',
					settings.compactReaderSkeleton ? 'max-w-sm' : 'max-w-md'
				)}
			></div>
			<div class="space-y-2 pt-2">
				<div class="h-3 w-full animate-pulse rounded bg-surface-sunken"></div>
				<div class="h-3 w-full animate-pulse rounded bg-surface-sunken"></div>
				<div class="h-3 w-4/5 animate-pulse rounded bg-surface-sunken"></div>
			</div>
		</div>
	{:else}
		<LoadingIndicator label="Loading message…" class="flex flex-1 items-center" />
	{/if}
</div>
