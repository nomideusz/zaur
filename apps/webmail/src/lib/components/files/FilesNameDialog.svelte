<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { Portal } from '@ark-ui/svelte/portal';
	import { cn } from '$lib/utils/cn';

	let {
		open = $bindable(false),
		title,
		confirmLabel,
		initialName = '',
		onSubmit
	}: {
		open?: boolean;
		title: string;
		confirmLabel: string;
		initialName?: string;
		onSubmit: (name: string) => Promise<void> | void;
	} = $props();

	let name = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const dialogBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';

	$effect(() => {
		if (open) {
			name = initialName;
			error = null;
			submitting = false;
		}
	});

	async function submit(event: Event) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || submitting) return;
		submitting = true;
		error = null;
		try {
			await onSubmit(trimmed);
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save';
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(details) => (open = details.open)} role="dialog">
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<Dialog.Content
				class="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-lg outline-none"
			>
				<Dialog.Title class="text-base font-semibold text-fg">{title}</Dialog.Title>
				<form class="flex flex-col gap-3" onsubmit={submit}>
					<label class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-fg-muted">Name</span>
						<input class="z-input" bind:value={name} disabled={submitting} />
					</label>
					{#if error}
						<p class="text-sm text-danger" role="alert">{error}</p>
					{/if}
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
							disabled={submitting || !name.trim()}
						>
							{confirmLabel}
						</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
