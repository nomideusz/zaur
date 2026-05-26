<script lang="ts">
	import { frameSvg, type FrameId } from '@zaur/sprite';

	let {
		id = 'idle',
		color = 'currentColor',
		scale = 1,
		facing = 'right',
		class: className = '',
		...restProps
	}: {
		id?: FrameId;
		color?: string;
		scale?: number;
		facing?: 'left' | 'right';
		class?: string;
		[key: string]: any;
	} = $props();

	// Generate SVG string reactive to props
	const svgString = $derived(frameSvg(id, { color, scale, facing }));
</script>

<div class="inline-flex shrink-0 {className}" {...restProps}>
	{@html svgString}
</div>
