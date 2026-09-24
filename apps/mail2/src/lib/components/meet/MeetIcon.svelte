<script lang="ts" module>
	/**
	 * Meet's glyphs, on the mail icons' grid: a 16-unit box, 1.4 stroke,
	 * round caps, in currentColor.
	 */
	const PATHS = {
		mic: 'M6 3.8a2 2 0 0 1 4 0v3.6a2 2 0 0 1-4 0zM3.6 7.6a4.4 4.4 0 0 0 8.8 0M8 12v2.2M5.8 14.2h4.4',
		'mic-off': 'M6 3.8a2 2 0 0 1 4 0v3.6a2 2 0 0 1-4 0zM3.6 7.6a4.4 4.4 0 0 0 8.8 0M8 12v2.2M5.8 14.2h4.4M2.2 2.2l11.6 11.6',
		cam: 'M3.4 4h5.6a1.8 1.8 0 0 1 1.8 1.8v4.4A1.8 1.8 0 0 1 9 12H3.4a1.8 1.8 0 0 1-1.8-1.8V5.8A1.8 1.8 0 0 1 3.4 4zM10.8 6.9l3.6-2.1v6.4l-3.6-2.1',
		'cam-off':
			'M3.4 4h5.6a1.8 1.8 0 0 1 1.8 1.8v4.4A1.8 1.8 0 0 1 9 12H3.4a1.8 1.8 0 0 1-1.8-1.8V5.8A1.8 1.8 0 0 1 3.4 4zM10.8 6.9l3.6-2.1v6.4l-3.6-2.1M1.6 1.8l12.8 12.4',
		share: 'M3.2 2.6h9.6a1.6 1.6 0 0 1 1.6 1.6v5.6a1.6 1.6 0 0 1-1.6 1.6H3.2a1.6 1.6 0 0 1-1.6-1.6V4.2a1.6 1.6 0 0 1 1.6-1.6zM5.4 14h5.2M8 9V4.9M6.2 6.6L8 4.8l1.8 1.8',
		hand: 'M5 8V4a1 1 0 0 1 2 0v3.5M7 7.5V2.9a1 1 0 0 1 2 0v4.6M9 7.5V4a1 1 0 0 1 2 0v5.2c0 2.7-1.7 4.6-4.2 4.6-1.6 0-2.6-.8-3.4-2.1L2.2 9.4a1 1 0 0 1 1.6-1.2L5 9.6V8',
		people:
			'M6 7.8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM1.6 13.2c.5-2.4 2.3-3.8 4.4-3.8s3.9 1.4 4.4 3.8M11.4 7.8a1.9 1.9 0 1 0 0-3.8M11.6 9.6c1.5.2 2.6 1.4 2.9 3.4',
		link: 'M6.8 9.2l2.4-2.4M7.4 4.7l1-1a2.6 2.6 0 0 1 3.7 3.7l-1 1M8.6 11.3l-1 1a2.6 2.6 0 0 1-3.7-3.7l1-1',
		copy: 'M6.6 5.2h5.6a1.4 1.4 0 0 1 1.4 1.4v5.6a1.4 1.4 0 0 1-1.4 1.4H6.6a1.4 1.4 0 0 1-1.4-1.4V6.6a1.4 1.4 0 0 1 1.4-1.4zM10.8 5.2V3.6a1.4 1.4 0 0 0-1.4-1.4H3.6a1.4 1.4 0 0 0-1.4 1.4v5.8a1.4 1.4 0 0 0 1.4 1.4h1.6',
		mail: 'M3.4 3.4h9.2a1.6 1.6 0 0 1 1.6 1.6v6a1.6 1.6 0 0 1-1.6 1.6H3.4A1.6 1.6 0 0 1 1.8 11V5a1.6 1.6 0 0 1 1.6-1.6zM2.4 4.4L8 8.6l5.6-4.2',
		'chevron-up': 'M4.6 9.6L8 6.2l3.4 3.4',
		close: 'M4 4l8 8M12 4l-8 8',
		check: 'M3.5 8.5l3 3 6-7',
		volume: 'M2.4 6.2h2.4L8 3.4v9.2L4.8 9.8H2.4zM10.4 5.8a3.1 3.1 0 0 1 0 4.4M12.2 4.1a5.5 5.5 0 0 1 0 7.8',
		alert: 'M8 2.2l6.2 11.2H1.8zM8 6.6v3.2M8 11.6v.1',
		refresh: 'M13 8a5 5 0 1 1-1.5-3.6M13 2.4v2.8h-2.8',
		calendar: 'M3.8 3h8.4A1.8 1.8 0 0 1 14 4.8v7.4a1.8 1.8 0 0 1-1.8 1.8H3.8A1.8 1.8 0 0 1 2 12.2V4.8A1.8 1.8 0 0 1 3.8 3zM2 6.6h12M5.2 1.8v2.6M10.8 1.8v2.6',
		'share-out': 'M8 9.8V2.2M5.4 4.6L8 2l2.6 2.6M4.4 7H3.6a1.2 1.2 0 0 0-1.2 1.2v5a1.2 1.2 0 0 0 1.2 1.2h8.8a1.2 1.2 0 0 0 1.2-1.2v-5A1.2 1.2 0 0 0 12.4 7h-.8'
	} as const;

	export type MeetIconName = keyof typeof PATHS | 'leave';
</script>

<script lang="ts">
	let { name, class: className = 'size-4' }: { name: MeetIconName; class?: string } = $props();
</script>

<svg class="shrink-0 {className}" viewBox="0 0 16 16" fill="none" aria-hidden="true">
	{#if name === 'leave'}
		<!-- A handset laid down: the one filled glyph, on the one filled button. -->
		<path
			d="M1.6 9.6c3.7-3.3 9.1-3.3 12.8 0l-1.5 2-2.6-.9-.3-1.8c-1.3-.5-2.7-.5-4 0l-.3 1.8-2.6.9z"
			fill="currentColor"
			stroke="currentColor"
			stroke-width="1"
			stroke-linejoin="round"
		/>
	{:else}
		<path d={PATHS[name]} stroke="currentColor" stroke-width={name === 'check' ? 1.8 : 1.4} stroke-linecap="round" stroke-linejoin="round" />
	{/if}
</svg>
