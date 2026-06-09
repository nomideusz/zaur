<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		activeValue?: string;
		class?: string;
		children: Snippet;
	}

	let { activeValue, class: className, children }: Props = $props();

	let scrollEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!scrollEl || !activeValue) return;

		const selected = scrollEl.querySelector<HTMLElement>(
			`[data-value="${CSS.escape(activeValue)}"][data-state="checked"], [data-value="${CSS.escape(activeValue)}"][aria-current="page"]`
		);
		if (!selected) return;

		selected.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
	});
</script>

<div
	bind:this={scrollEl}
	class={cn('z-segment-group-scroll min-w-0 overflow-x-auto', className)}
	data-slot="segment-group-scroll"
>
	{@render children()}
</div>
