<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import { cn } from '$lib/utils/cn';

	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
		submitLabel?: string;
		submitting?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSubmit?: (name: string) => void | Promise<void>;
	}

	let {
		open = $bindable(false),
		title = 'New folder',
		description = 'Choose a name for your folder.',
		submitLabel = 'Create',
		submitting = false,
		onOpenChange,
		onSubmit
	}: Props = $props();

	let folderName = $state('');

	const canSubmit = $derived(folderName.trim().length > 0 && !submitting);

	const dialogBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';

	$effect(() => {
		if (open) folderName = '';
	});

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	async function submit(event: Event) {
		event.preventDefault();
		if (!canSubmit) return;
		await onSubmit?.(folderName.trim());
	}
</script>

<Dialog.Root {open} onOpenChange={(details) => handleOpenChange(details.open)} role="dialog">
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<Dialog.Content
				class="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<form class="flex flex-col gap-5" onsubmit={submit}>
					<div class="flex flex-col gap-2">
						<Dialog.Title class="text-base font-semibold text-fg">{title}</Dialog.Title>
						<Dialog.Description class="text-sm text-fg-muted">{description}</Dialog.Description>
						<label class="mt-1 flex flex-col gap-1.5">
							<span class="text-xs font-medium text-fg-muted">Name</span>
							<input
								type="text"
								class="z-input"
								bind:value={folderName}
								placeholder="Folder name"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								disabled={submitting}
							/>
						</label>
					</div>

					<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.CloseTrigger
							type="button"
							class={cn(
								dialogBtn,
								'border border-border bg-surface text-fg hover:bg-surface-sunken focus-visible:outline-accent'
							)}
							disabled={submitting}
						>
							Cancel
						</Dialog.CloseTrigger>
						<button
							type="submit"
							class={cn(
								dialogBtn,
								'bg-accent text-accent-fg shadow-sm hover:bg-accent-hover focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'
							)}
							disabled={!canSubmit}
						>
							{submitLabel}
						</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
