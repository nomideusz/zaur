<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<Tooltip.Provider delayDuration={300} skipDelayDuration={100} disableHoverableContent>
	{@render children()}
</Tooltip.Provider>
