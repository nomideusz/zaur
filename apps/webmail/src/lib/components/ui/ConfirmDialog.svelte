<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { cn } from '$lib/utils/cn';
</script>

<AlertDialog.Root open={confirm.open} onOpenChange={confirm.onOpenChange.bind(confirm)}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		{#if confirm.request}
			<AlertDialog.Content
				class="fixed left-1/2 top-1/2 z-[60] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<div class="flex flex-col gap-2">
					<AlertDialog.Title class="text-base font-semibold text-fg">
						{confirm.request.title}
					</AlertDialog.Title>
					<AlertDialog.Description class="text-sm text-fg-muted">
						{confirm.request.description}
					</AlertDialog.Description>
				</div>

				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<AlertDialog.Cancel class="z-btn-ghost w-full sm:w-auto">
						{confirm.request.cancelLabel}
					</AlertDialog.Cancel>
					<AlertDialog.Action
						class={cn(
							'w-full sm:w-auto',
							confirm.request.tone === 'danger'
								? 'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger'
								: 'z-btn-primary'
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
