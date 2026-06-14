<script lang="ts">
	// Body line widths — uneven, with a short final line per "paragraph" so the
	// placeholder reads like prose rather than a solid block.
	const BODY_LINES = ['97%', '92%', '99%', '74%', '0', '95%', '88%', '63%'];
</script>

<article
	class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
	style="view-transition-name: message-reader;"
	role="status"
	aria-label="Loading message"
>
	<span class="sr-only">Loading message…</span>
	<div class="z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<!-- Desktop header carries the subject; on mobile the island owns chrome. -->
		<header
			class="z-reader-header flex shrink-0 items-center gap-2 border-b border-border/80 px-4 py-2.5 max-md:hidden"
			aria-hidden="true"
		>
			<div class="z-skeleton z-reader-skeleton__title"></div>
		</header>

		<div class="z-pane-scroll min-h-0 flex-1 overflow-y-auto">
			<div class="z-reader-skeleton" aria-hidden="true">
				<div class="z-reader-skeleton__meta">
					<div class="z-skeleton z-reader-skeleton__from"></div>
					<div class="z-skeleton z-reader-skeleton__email"></div>
				</div>

				<!-- Mobile inline subject — mirrors .z-reader-inline-subject (md:hidden). -->
				<div class="z-skeleton z-reader-skeleton__subject md:hidden"></div>

				<div class="z-reader-skeleton__body">
					{#each BODY_LINES as width, i (i)}
						{#if width === '0'}
							<div class="z-reader-skeleton__break"></div>
						{:else}
							<div class="z-skeleton z-reader-skeleton__line" style="width: {width};"></div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
</article>
