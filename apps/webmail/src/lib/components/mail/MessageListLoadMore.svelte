<script lang="ts">
	import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		hasMore = false,
		loadingMore = false,
		onLoadMore
	}: {
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
	} = $props();
</script>

{#if hasMore && onLoadMore}
	<div class="border-t border-border px-4 py-3">
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
