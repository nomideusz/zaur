<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	type $$Props = HTMLAttributes<HTMLTableRowElement> & {
		'data-state'?: unknown;
	};

	let className: $$Props['class'] = undefined;
	export let action = () => {};
	export let actionParams = undefined;
	export { className as class };
</script>

<tr use:action={actionParams}
	class={cn(
		'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
		className
	)}
	{...$$restProps}
	on:click
	on:keydown
>
	<slot />
</tr>
