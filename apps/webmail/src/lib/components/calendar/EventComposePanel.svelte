<script lang="ts">
	import { onMount } from 'svelte';
	import X from '$lib/components/icons/X.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	const isEdit = $derived(calendar.composeMode === 'edit');
	const submitLabel = $derived(
		calendar.composeSaving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create event'
	);
	const panelPadding = 'px-4 py-3';
	const fieldGap = 'space-y-4';
	const fieldLabelClass = 'text-sm font-medium text-fg';
	const composeStart = $derived.by(() => {
		const draft = calendar.composeDraft;
		return new Date(`${draft.startDate}T${draft.allDay ? '00:00' : draft.startTime}`);
	});
	const composeEnd = $derived.by(() => {
		const draft = calendar.composeDraft;
		return new Date(`${draft.endDate}T${draft.allDay ? '00:00' : draft.endTime}`);
	});
	const timeRangeInvalid = $derived(composeEnd.getTime() <= composeStart.getTime());
	const saveBlockedReason = $derived.by(() => {
		if (calendar.composeSaving) return isEdit ? 'Saving changes…' : 'Creating event…';
		if (!calendar.composeDraft.title.trim()) return 'Add a title to save this event.';
		if (!calendar.composeDraft.calendarId) return 'Choose a calendar.';
		if (timeRangeInvalid) return 'End must be after start.';
		return null;
	});
	const canSave = $derived(!calendar.composeSaving && !saveBlockedReason);
	const composeHintId = 'event-compose-hint';
	const calendarOptions = $derived(
		calendar.calendars.map((item) => ({ value: item.id, label: item.name }))
	);

	function close() {
		calendar.closeCompose();
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') close();
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<div class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]">
	<div
		class="z-panel flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden border-l shadow-md"
	>
		<header
			class={cn('flex shrink-0 items-center justify-between border-b border-border', panelPadding)}
		>
			<h2 class="text-base font-semibold text-fg">{isEdit ? 'Edit event' : 'New event'}</h2>
			<IconButton label="Close event" onclick={close}>
				<X class="size-4" />
			</IconButton>
		</header>

		<form
			class="flex min-h-0 flex-1 flex-col overflow-hidden"
			onsubmit={(e) => {
				e.preventDefault();
				if (auth.client && canSave) void calendar.saveCompose(auth.client);
			}}
		>
			<div
				class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4', fieldGap)}
			>
				<label class="block space-y-1.5">
					<span class={fieldLabelClass}>Title</span>
					<input
						type="text"
						class="z-input"
						placeholder="Event title"
						bind:value={calendar.composeDraft.title}
						required
					/>
				</label>

				<label class="block space-y-1.5">
					<span class={fieldLabelClass}>Calendar</span>
					<SettingsSelect
						label="Calendar"
						value={calendar.composeDraft.calendarId}
						options={calendarOptions}
						class="w-full"
						onchange={(value) => (calendar.composeDraft.calendarId = value)}
					/>
				</label>

				<label class="flex items-center gap-2 rounded-md text-sm">
					<input type="checkbox" bind:checked={calendar.composeDraft.allDay} />
					<span class="text-fg">All day</span>
				</label>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block space-y-1.5">
						<span class={fieldLabelClass}>Starts</span>
						<input type="date" class="z-input" bind:value={calendar.composeDraft.startDate} required />
					</label>

					{#if calendar.composeDraft.allDay}
						<label class="block space-y-1.5">
							<span class={fieldLabelClass}>Ends</span>
							<input
								type="date"
								class="z-input"
								aria-invalid={timeRangeInvalid ? 'true' : undefined}
								aria-describedby={timeRangeInvalid ? composeHintId : undefined}
								bind:value={calendar.composeDraft.endDate}
								required
							/>
						</label>
					{:else}
						<label class="block space-y-1.5">
							<span class={fieldLabelClass}>Start time</span>
							<input type="time" class="z-input" bind:value={calendar.composeDraft.startTime} required />
						</label>
						<label class="block space-y-1.5 sm:col-span-2">
							<span class={fieldLabelClass}>End time</span>
							<div class="grid gap-3 sm:grid-cols-2">
								<input
									type="date"
									class="z-input"
									aria-invalid={timeRangeInvalid ? 'true' : undefined}
									aria-describedby={timeRangeInvalid ? composeHintId : undefined}
									bind:value={calendar.composeDraft.endDate}
									required
								/>
								<input
									type="time"
									class="z-input"
									aria-invalid={timeRangeInvalid ? 'true' : undefined}
									aria-describedby={timeRangeInvalid ? composeHintId : undefined}
									bind:value={calendar.composeDraft.endTime}
									required
								/>
							</div>
						</label>
					{/if}
				</div>
				{#if saveBlockedReason && !calendar.composeError}
					<p
						id={composeHintId}
						class={cn('text-xs', timeRangeInvalid ? 'text-danger' : 'text-fg-subtle')}
					>
						{saveBlockedReason}
					</p>
				{/if}

				<label class="block space-y-1.5">
					<span class={fieldLabelClass}>Location</span>
					<input
						type="text"
						class="z-input"
						placeholder="Optional"
						bind:value={calendar.composeDraft.location}
					/>
				</label>

				<label class="block space-y-1.5">
					<span class={fieldLabelClass}>Description</span>
					<textarea
						class="z-input min-h-24 resize-y"
						placeholder="Optional"
						bind:value={calendar.composeDraft.description}
					></textarea>
				</label>
			</div>

			{#if calendar.composeError}
				<p class="border-t border-border px-4 py-2 text-sm text-danger" role="alert">
					{calendar.composeError}
				</p>
			{/if}

			<footer class={cn('flex shrink-0 items-center justify-end gap-2 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]', panelPadding)}>
				<Button variant="ghost" type="button" onclick={close}>Close</Button>
				<Button type="submit" disabled={!canSave} title={saveBlockedReason ?? submitLabel}>
					{submitLabel}
				</Button>
			</footer>
		</form>
	</div>
</div>
