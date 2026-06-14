<script lang="ts">
	let { rows = 7 }: { rows?: number } = $props();

	// Varied subject widths so the placeholder reads like real, uneven content
	// rather than a uniform grid.
	const SUBJECT_WIDTHS = ['72%', '58%', '84%', '64%', '46%', '78%', '54%', '68%'];
</script>

<div class="z-mail-list-skeleton" role="status" aria-label="Loading messages">
	<span class="sr-only">Loading messages…</span>
	{#each Array(rows) as _, i (i)}
		<div class="z-mail-list-skeleton__row" style="--z-skeleton-index: {i};" aria-hidden="true">
			<div class="z-mail-list-skeleton__copy">
				<div class="z-skeleton z-mail-list-skeleton__sender"></div>
				<div
					class="z-skeleton z-mail-list-skeleton__subject"
					style="width: {SUBJECT_WIDTHS[i % SUBJECT_WIDTHS.length]};"
				></div>
			</div>
			<div class="z-skeleton z-mail-list-skeleton__time"></div>
		</div>
	{/each}
</div>
