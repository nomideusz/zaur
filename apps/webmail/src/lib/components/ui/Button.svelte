<script lang="ts">
	import type { Snippet } from 'svelte';
	import TooltipWrap from '$lib/components/ui/TooltipWrap.svelte';
	import { cn } from '$lib/utils/cn';

	type Variant = 'primary' | 'ghost' | 'danger';

	interface Props {
		variant?: Variant;
		href?: string;
		type?: 'button' | 'submit';
		class?: string;
		disabled?: boolean;
		title?: string;
		ariaDescribedby?: string;
		children: Snippet;
		onclick?: (e: MouseEvent) => void;
		form?: string;
	}

	let {
		variant = 'primary',
		href,
		type = 'button',
		class: className,
		disabled = false,
		title,
		ariaDescribedby,
		children,
		onclick,
		form
	}: Props = $props();

	const classes = $derived(
		cn(
			variant === 'primary' && 'z-btn-primary',
			variant === 'ghost' && 'z-btn-ghost',
			variant === 'danger' &&
				'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger',
			disabled && 'pointer-events-none opacity-50',
			className
		)
	);

	const tooltipLabel = $derived(title ?? '');
</script>

{#if tooltipLabel}
	<TooltipWrap label={tooltipLabel} wrapDisabled={disabled}>
		{#snippet trigger({ props })}
			{#if href}
				<a
					{...props}
					{href}
					class={classes}
					aria-disabled={disabled}
					aria-describedby={ariaDescribedby}
				>
					{@render children()}
				</a>
			{:else}
				<button
					{...props}
					{type}
					class={classes}
					{disabled}
					aria-describedby={ariaDescribedby}
					{onclick}
					{form}
				>
					{@render children()}
				</button>
			{/if}
		{/snippet}
	</TooltipWrap>
{:else if href}
	<a {href} class={classes} aria-disabled={disabled} aria-describedby={ariaDescribedby}>
		{@render children()}
	</a>
{:else}
	<button {type} class={classes} {disabled} aria-describedby={ariaDescribedby} {onclick} {form}>
		{@render children()}
	</button>
{/if}
