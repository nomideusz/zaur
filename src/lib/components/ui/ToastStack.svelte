<script lang="ts">
	import { CheckCircle2, Info, X, XCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import IconButton from './IconButton.svelte';
	import { toast, type ToastVariant } from '$lib/stores/toast.svelte';

	const variantStyles: Record<ToastVariant, string> = {
		info: 'border-border bg-surface-raised text-fg',
		success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
		error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100'
	};
</script>

<div
	class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
	aria-live="polite"
	aria-relevant="additions"
>
	{#each toast.toasts as item (item.id)}
		<div
			class={cn(
				'pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2.5 shadow-md',
				variantStyles[item.variant]
			)}
			role="status"
		>
			{#if item.variant === 'success'}
				<CheckCircle2 class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			{:else if item.variant === 'error'}
				<XCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			{:else}
				<Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			{/if}
			<p class="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
			<IconButton label="Dismiss notification" onclick={() => toast.dismiss(item.id)}>
				<X class="size-4" />
			</IconButton>
		</div>
	{/each}
</div>
