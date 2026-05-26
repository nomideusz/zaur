<script lang="ts">
	import type { Snippet } from 'svelte';
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
		onclick
	}: Props = $props();

	const classes = $derived(
		cn(
			variant === 'primary' && 'z-btn-primary',
			variant === 'ghost' && 'z-btn-ghost',
			variant === 'danger' &&
				'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger transition-all hover:-translate-y-px hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger active:translate-y-0',
			disabled && 'pointer-events-none opacity-50',
			className
		)
	);
</script>

{#if href}
	<a {href} class={classes} aria-disabled={disabled} {title} aria-describedby={ariaDescribedby}>
		{@render children()}
	</a>
{:else}
	<button {type} class={classes} {disabled} {title} aria-describedby={ariaDescribedby} {onclick}>
		{@render children()}
	</button>
{/if}
