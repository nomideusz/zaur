<script lang="ts">
	import { CheckCircle2, Info, X, XCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import IconButton from './IconButton.svelte';
	import { toast, type ToastVariant } from '$lib/stores/toast.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const variantStyles: Record<ToastVariant, string> = {
		info: 'border-border bg-surface-raised text-fg',
		success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
		error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100'
	};
</script>

<div
	class={cn(
		'pointer-events-none fixed z-50 flex w-full flex-col',
		settings.compactToasts ? 'bottom-3 right-3 max-w-xs gap-1.5' : 'bottom-4 right-4 max-w-sm gap-2'
	)}
	aria-live="polite"
	aria-relevant="additions"
>
	{#each toast.toasts as item (item.id)}
		<div
			class={cn(
				'pointer-events-auto flex items-start rounded-lg border shadow-md',
				settings.compactToasts ? 'gap-2 px-2.5 py-2' : 'gap-3 px-3 py-2.5',
				variantStyles[item.variant]
			)}
			role="status"
		>
			{#if !settings.hideToastIcons}
				{#if item.variant === 'success'}
					<CheckCircle2
						class={cn('shrink-0', settings.compactToasts ? 'mt-0.5 size-3.5' : 'mt-0.5 size-4')}
						aria-hidden="true"
					/>
				{:else if item.variant === 'error'}
					<XCircle
						class={cn('shrink-0', settings.compactToasts ? 'mt-0.5 size-3.5' : 'mt-0.5 size-4')}
						aria-hidden="true"
					/>
				{:else}
					<Info
						class={cn('shrink-0', settings.compactToasts ? 'mt-0.5 size-3.5' : 'mt-0.5 size-4')}
						aria-hidden="true"
					/>
				{/if}
			{/if}
			<p class={cn('min-w-0 flex-1 leading-snug', settings.compactToasts ? 'text-xs' : 'text-sm')}>
				{item.message}
			</p>
			{#if item.action}
				<button
					type="button"
					class={cn(
						'shrink-0 font-medium underline-offset-2 hover:underline',
						settings.compactToasts ? 'text-xs' : 'text-sm'
					)}
					onclick={() => void toast.runAction(item.id, item.action!)}
				>
					{item.action.label}
				</button>
			{/if}
			<IconButton label="Dismiss notification" onclick={() => toast.dismiss(item.id)}>
				<X class="size-4" />
			</IconButton>
		</div>
	{/each}
</div>
