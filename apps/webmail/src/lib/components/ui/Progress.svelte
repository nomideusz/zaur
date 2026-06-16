<script lang="ts">
	import { Progress } from '@ark-ui/svelte/progress';
	import { cn } from '$lib/utils/cn';

	interface Props {
		/**
		 * Current value. Pass `null` (or leave undefined) for an indeterminate
		 * bar — e.g. when total size is not yet known.
		 */
		value?: number | null;
		min?: number;
		max?: number;
		/** Optional caption shown above the track. */
		label?: string;
		/** Render the formatted percentage next to the label. */
		showValueText?: boolean;
		/** Range colour — `danger` for at-capacity states like a full quota. */
		tone?: 'accent' | 'danger';
		class?: string;
	}

	let {
		value = null,
		min = 0,
		max = 100,
		label,
		showValueText = false,
		tone = 'accent',
		class: className = ''
	}: Props = $props();
</script>

<!--
	Ark linear progress: Root > (Label + ValueText) + Track > Range.
	A `null` value puts the machine in its indeterminate state
	(data-state="indeterminate"), which the CSS animates.
-->
<Progress.Root {value} {min} {max} class={cn('z-progress', tone === 'danger' && 'z-progress--danger', className)}>
	{#if label || showValueText}
		<div class="z-progress__header">
			{#if label}
				<Progress.Label class="z-progress__label">{label}</Progress.Label>
			{/if}
			{#if showValueText}
				<Progress.ValueText class="z-progress__value" />
			{/if}
		</div>
	{/if}
	<Progress.Track class="z-progress__track">
		<Progress.Range class="z-progress__range" />
	</Progress.Track>
</Progress.Root>
