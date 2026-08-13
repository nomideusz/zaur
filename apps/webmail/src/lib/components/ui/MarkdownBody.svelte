<script lang="ts">
	import { renderMarkdown } from '$lib/markdown';
	import { cn } from '$lib/utils/cn';

	let {
		source,
		class: className
	}: {
		source: string;
		class?: string;
	} = $props();

	const html = $derived(renderMarkdown(source));
</script>

<div class={cn('z-md-body', className)}>{@html html}</div>
