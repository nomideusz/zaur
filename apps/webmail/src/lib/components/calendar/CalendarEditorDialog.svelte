<script lang="ts">
	import { Dialog } from '@ark-ui/svelte/dialog';
	import { ColorPicker, parseColor } from '@ark-ui/svelte/color-picker';
	import { Portal } from '@ark-ui/svelte/portal';
	import RiCheckLine from 'svelte-remixicon/RiCheckLine.svelte';
	import { CALENDAR_COLORS } from '$lib/jmap/calendar-map';
	import { cn } from '$lib/utils/cn';

	interface Props {
		open?: boolean;
		mode?: 'create' | 'edit';
		name?: string;
		color?: string;
		submitting?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSubmit?: (value: { name: string; color: string }) => void | Promise<void>;
	}

	let {
		open = $bindable(false),
		mode = 'create',
		name = '',
		color = CALENDAR_COLORS[0],
		submitting = false,
		onOpenChange,
		onSubmit
	}: Props = $props();

	let calendarName = $state('');
	let calendarColor = $state(parseColor(CALENDAR_COLORS[0]));

	const selectedColor = $derived(calendarColor.toString('hex'));

	const isEdit = $derived(mode === 'edit');
	const title = $derived(isEdit ? 'Edit calendar' : 'New calendar');
	const description = $derived(
		isEdit ? 'Rename this calendar or pick a new color.' : 'Add a calendar for a separate set of events.'
	);
	const submitLabel = $derived(isEdit ? 'Save' : 'Create');
	const canSubmit = $derived(calendarName.trim().length > 0 && !submitting);

	const dialogBtn =
		'inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:w-auto';

	$effect(() => {
		if (!open) return;
		calendarName = name;
		calendarColor = parseColor(color || CALENDAR_COLORS[0]);
	});

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	async function submit(event: Event) {
		event.preventDefault();
		if (!canSubmit) return;
		await onSubmit?.({ name: calendarName.trim(), color: selectedColor });
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
								bind:value={calendarName}
								placeholder="Calendar name"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								disabled={submitting}
							/>
						</label>
						<fieldset class="flex flex-col gap-1.5">
							<legend class="text-xs font-medium text-fg-muted">Color</legend>
							<ColorPicker.Root
								inline
								disabled={submitting}
								bind:value={calendarColor}
							>
								<ColorPicker.SwatchGroup
									role="group"
									aria-label="Calendar color"
									class="flex flex-wrap gap-2"
								>
									{#each CALENDAR_COLORS as swatch (swatch)}
										<ColorPicker.SwatchTrigger
											value={swatch}
											aria-label={swatch}
											class="inline-flex cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
										>
											<ColorPicker.Swatch
												value={swatch}
												style="background-color: {swatch}"
												class={cn(
													'relative grid size-6 place-items-center rounded-full border-2',
													selectedColor === swatch ? 'border-fg' : 'border-transparent'
												)}
											>
												<ColorPicker.SwatchIndicator
													class="absolute inset-0 flex items-center justify-center text-white drop-shadow"
												>
													<RiCheckLine class="size-4" aria-hidden="true" />
												</ColorPicker.SwatchIndicator>
											</ColorPicker.Swatch>
										</ColorPicker.SwatchTrigger>
									{/each}
								</ColorPicker.SwatchGroup>
							</ColorPicker.Root>
						</fieldset>
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
							{submitting ? (isEdit ? 'Saving…' : 'Creating…') : submitLabel}
						</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
