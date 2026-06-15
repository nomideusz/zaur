<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { cn } from '$lib/utils/cn';

	/** Shared button shape so Cancel and the action match in width, alignment and height. */
	const confirmBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';
</script>

<!-- Ark has no AlertDialog: it's Dialog with role="alertdialog". No Cancel/Action
     parts either — CloseTrigger handles cancel (→ onOpenChange(false) → confirm.cancel),
     and a plain button runs confirm.confirm() (which sets open=false itself). -->
<Dialog.Root
	role="alertdialog"
	open={confirm.open}
	onOpenChange={(details) => confirm.onOpenChange(details.open)}
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		{#if confirm.request}
			<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
				<Dialog.Content
					class="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
				>
					<div class="flex min-h-0 flex-col gap-2 overflow-y-auto">
						<Dialog.Title class="text-base font-semibold text-fg">
							{confirm.request.title}
						</Dialog.Title>
						<Dialog.Description class="text-sm text-fg-muted">
							{confirm.request.description}
						</Dialog.Description>
					</div>

					<div class="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.CloseTrigger
							class={cn(
								confirmBtn,
								'border border-border bg-surface text-fg hover:bg-surface-sunken focus-visible:outline-accent'
							)}
						>
							{confirm.request.cancelLabel}
						</Dialog.CloseTrigger>
						<button
							type="button"
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
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Positioner>
		{/if}
	</Portal>
</Dialog.Root>
