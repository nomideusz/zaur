<script lang="ts">
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		hasMore = false,
		loadingMore = false,
		onLoadMore,
		loadSentinel = $bindable(null as HTMLDivElement | null)
	}: {
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
		loadSentinel?: HTMLDivElement | null;
	} = $props();
</script>

{#if hasMore && onLoadMore}
	<div
		class="border-t border-border px-4 py-3"
		bind:this={loadSentinel}
	>
		{#if settings.autoLoadMore}
			<div class="flex items-center justify-center py-2 text-xs text-fg-subtle" aria-live="polite">
				{#if loadingMore}
					<span class="z-spinner size-4" aria-hidden="true">
						<LoaderCircle class="size-full" />
					</span>
					<span class="ml-2">Loading…</span>
				{/if}
			</div>
		{:else}
			<Button variant="ghost" class="w-full" disabled={loadingMore} onclick={onLoadMore}>
				{#if loadingMore}
					<span class="z-spinner size-4" aria-hidden="true">
						<LoaderCircle class="size-full" />
					</span>
					Loading…
				{:else}
					Load more
				{/if}
			</Button>
		{/if}
	</div>
{/if}
