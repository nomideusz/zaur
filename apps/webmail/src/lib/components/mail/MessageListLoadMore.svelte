<script lang="ts">
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		hasMore = false,
		loadingMore = false,
		loadedCount,
		total,
		onLoadMore
	}: {
		hasMore?: boolean;
		loadingMore?: boolean;
		loadedCount?: number;
		total?: number;
		onLoadMore?: () => void;
	} = $props();

	const statusLabel = $derived.by(() => {
		if (loadedCount == null || total == null || total <= loadedCount) return null;
		return `Showing ${loadedCount} of ${total}`;
	});
</script>

{#if hasMore && onLoadMore}
	<div class="z-mail-list-load-more shrink-0 border-t border-border px-4 py-3 pb-4">
		{#if statusLabel}
			<p class="mb-2 text-center text-xs text-fg-subtle">{statusLabel}</p>
		{/if}
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
	</div>
{/if}
