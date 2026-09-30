<script lang="ts" module>
	/**
	 * Music's glyphs, on mail's icon grid: a 16-unit box, 1.4 stroke, round
	 * caps, in currentColor. The transport glyphs are filled.
	 */
	const STROKE = {
		home: 'M2.6 7.2L8 2.8l5.4 4.4v5.9a.9.9 0 0 1-.9.9H9.7V10.2H6.3V14H3.5a.9.9 0 0 1-.9-.9z',
		search: 'M7.2 12.2a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.8 10.8L14 14',
		album: 'M8 14.2A6.2 6.2 0 1 0 8 1.8a6.2 6.2 0 0 0 0 12.4zM8 9.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
		artist: 'M8 7.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM3 13.8c.6-2.6 2.6-4 5-4s4.4 1.4 5 4',
		playlist: 'M2.4 3.8h11.2M2.4 7.4h11.2M2.4 11h5.8M11.2 9.4v4.8M10 12.6a1.2 1.2 0 1 0 2.4 0',
		heart: 'M8 13.4S2.2 10 2.2 6.1a2.9 2.9 0 0 1 5.8-.7 2.9 2.9 0 0 1 5.8.7C13.8 10 8 13.4 8 13.4z',
		add: 'M8 2.2v9M4.6 7.8L8 11.2l3.4-3.4M2.6 13.8h10.8',
		plus: 'M8 3v10M3 8h10',
		queue: 'M2.4 3.8h11.2M2.4 7.4h11.2M2.4 11h6.2M11 9.6v4l3.2-2z',
		shuffle:
			'M1.8 4.6h2.1c1.3 0 2.1.6 2.9 1.8l1.9 3.2c.8 1.2 1.6 1.8 2.9 1.8h2.6M1.8 11.4h2.1c1.1 0 1.8-.4 2.5-1.2M9.2 5.8c.7-.8 1.4-1.2 2.5-1.2h2.5M12.4 2.8l1.8 1.8-1.8 1.8M12.4 9.6l1.8 1.8-1.8 1.8',
		'chevron-down': 'M4 6.2l4 4 4-4',
		'chevron-left': 'M9.8 4l-4 4 4 4',
		'chevron-right': 'M6.2 4l4 4-4 4',
		close: 'M4 4l8 8M12 4l-8 8',
		check: 'M3.5 8.5l3 3 6-7',
		alert: 'M8 2.2l6.2 11.2H1.8zM8 6.6v3.2M8 11.6v.1',
		logout: 'M6.2 2.6H3.6a1 1 0 0 0-1 1v8.8a1 1 0 0 0 1 1h2.6M10.6 11l3-3-3-3M13.6 8H6',
		more: 'M3.1 8a.4.4 0 1 0 .8 0 .4.4 0 1 0-.8 0M7.6 8a.4.4 0 1 0 .8 0 .4.4 0 1 0-.8 0M12.1 8a.4.4 0 1 0 .8 0 .4.4 0 1 0-.8 0',
		note: 'M6 12.2a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM6 12.2V3.4l7.2-1.6v8.4M13.2 10.2a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM6 6.2l7.2-1.6',
		repeat: 'M2.8 7.4V6.6a2 2 0 0 1 2-2h8M10.8 2.6l2 2-2 2M13.2 8.6v.8a2 2 0 0 1-2 2h-8M5.2 13.4l-2-2 2-2',
		'repeat-one': 'M2.8 7.4V6.6a2 2 0 0 1 2-2h8M10.8 2.6l2 2-2 2M13.2 8.6v.8a2 2 0 0 1-2 2h-8M5.2 13.4l-2-2 2-2M7.2 7.2l1-.7v3.2',
		volume: 'M2.4 6.2h2.2L8 3.4v9.2L4.6 9.8H2.4zM10.4 5.9a3 3 0 0 1 0 4.2M12.2 4a5.7 5.7 0 0 1 0 8',
		mute: 'M2.4 6.2h2.2L8 3.4v9.2L4.6 9.8H2.4zM10.6 6.2l3.2 3.6M13.8 6.2l-3.2 3.6'
	} as const;
	const FILL = {
		play: 'M4.6 2.6v10.8L13.2 8z',
		pause: 'M3.8 2.8h2.8v10.4H3.8zM9.4 2.8h2.8v10.4H9.4z',
		next: 'M2.8 3v10l7-5zM11 3h2.2v10H11z',
		prev: 'M13.2 3v10l-7-5zM2.8 3H5v10H2.8z',
		'heart-filled': 'M8 13.4S2.2 10 2.2 6.1a2.9 2.9 0 0 1 5.8-.7 2.9 2.9 0 0 1 5.8.7C13.8 10 8 13.4 8 13.4z'
	} as const;

	export type IconName = keyof typeof STROKE | keyof typeof FILL;
</script>

<script lang="ts">
	let { name, class: className = 'size-4' }: { name: IconName; class?: string } = $props();
</script>

<svg class={className} viewBox="0 0 16 16" aria-hidden="true">
	{#if name in FILL}
		<path d={FILL[name as keyof typeof FILL]} fill="currentColor" />
	{:else}
		<path
			d={STROKE[name as keyof typeof STROKE]}
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
</svg>
