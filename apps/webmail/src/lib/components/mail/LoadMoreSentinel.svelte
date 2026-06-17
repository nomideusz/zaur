<script lang="ts">
	import { browser } from '$app/environment';

	let {
		scrollRoot = null,
		hasMore = false,
		loadingMore = false,
		onLoadMore
	}: {
		scrollRoot?: HTMLElement | null;
		hasMore?: boolean;
		loadingMore?: boolean;
		onLoadMore?: () => void;
	} = $props();

	let sentinel = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!browser || !sentinel || !onLoadMore || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting) return;
				if (!hasMore || loadingMore) return;
				onLoadMore();
			},
			{
				root: scrollRoot,
				rootMargin: '240px 0px 0px',
				threshold: 0
			}
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={sentinel}
	class="z-load-more-sentinel pointer-events-none h-px w-full shrink-0"
	aria-hidden="true"
></div>
