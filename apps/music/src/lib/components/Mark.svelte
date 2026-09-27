<script lang="ts">
	/** Zaur Music's mark: two beamed notes, white on the violet tile (static/favicon.svg). */
	let { class: className = 'size-7' }: { class?: string } = $props();
</script>

<svg class={className} viewBox="0 0 16 16" aria-hidden="true">
	<defs>
		<linearGradient id="zaur-music-tile" x2="0" y2="1">
			<stop offset="0" stop-color="#8b5cf6" />
			<stop offset="1" stop-color="#6d28d9" />
		</linearGradient>
	</defs>
	<rect width="16" height="16" rx="3.5" fill="url(#zaur-music-tile)" />
	<g fill="#fff" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
		<path d="M6 11.2V4.6l6-1.4v6.6" fill="none" />
		<path d="M6 6.6l6-1.4" fill="none" stroke-opacity="0.55" />
		<circle cx="4.6" cy="11.4" r="1.5" stroke="none" />
		<circle cx="10.6" cy="10" r="1.5" stroke="none" />
	</g>
</svg>
