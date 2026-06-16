<script lang="ts">
	import { Clipboard } from '@ark-ui/svelte/clipboard';
	import Copy from '$lib/components/icons/Copy.svelte';
	import CheckCircle2 from '$lib/components/icons/CheckCircle2.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/** Text written to the clipboard. */
		value: string;
		/** Idle label. */
		label?: string;
		/** Label shown briefly after a successful copy (Ark resets after `timeout`). */
		copiedLabel?: string;
		/** How long the copied state lasts, in ms. */
		timeout?: number;
		class?: string;
	}

	let {
		value,
		label = 'Copy',
		copiedLabel = 'Copied',
		timeout = 2000,
		class: className
	}: Props = $props();
</script>

<!--
	Ark Clipboard handles the copy + the transient "copied" state. The Indicator
	swaps its children for the `copied` snippet while that state is active; both
	are inline-flex so the icon and label stay on one row inside the button.
-->
<Clipboard.Root {value} {timeout} class="contents">
	<Clipboard.Trigger class={cn('z-btn-ghost', className)}>
		<Clipboard.Indicator class="inline-flex items-center gap-2" copied={copiedContent}>
			<Copy class="size-4" aria-hidden="true" />
			{label}
		</Clipboard.Indicator>
	</Clipboard.Trigger>
</Clipboard.Root>

{#snippet copiedContent()}
	<CheckCircle2 class="size-4" aria-hidden="true" />
	{copiedLabel}
{/snippet}
