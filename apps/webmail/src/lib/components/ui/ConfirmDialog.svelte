<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { cn } from '$lib/utils/cn';

	/** Shared button shape so Cancel and the action match in width, alignment and height. */
	const confirmBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';
</script>

<AlertDialog.Root open={confirm.open} onOpenChange={confirm.onOpenChange.bind(confirm)}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		{#if confirm.request}
			<AlertDialog.Content
				class="fixed left-1/2 top-1/2 z-[60] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<div class="flex min-h-0 flex-col gap-2 overflow-y-auto">
					<AlertDialog.Title class="text-base font-semibold text-fg">
						{confirm.request.title}
					</AlertDialog.Title>
					<AlertDialog.Description class="text-sm text-fg-muted">
						{confirm.request.description}
					</AlertDialog.Description>
				</div>

				<div class="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<AlertDialog.Cancel
						class={cn(
							confirmBtn,
							'border border-border bg-surface text-fg hover:bg-surface-sunken focus-visible:outline-accent'
						)}
					>
						{confirm.request.cancelLabel}
					</AlertDialog.Cancel>
					<AlertDialog.Action
						class={cn(
							confirmBtn,
							'shadow-sm',
							confirm.request.tone === 'danger'
								? 'bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger'
								: 'bg-accent text-accent-fg hover:bg-accent-hover focus-visible:outline-accent'
						)}
						onclick={() => confirm.confirm()}
					>
						{confirm.request.confirmLabel}
					</AlertDialog.Action>
				</div>
			</AlertDialog.Content>
		{/if}
	</AlertDialog.Portal>
</AlertDialog.Root>
