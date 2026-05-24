<script lang="ts">
	import { onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';

	const isEdit = $derived(calendar.composeMode === 'edit');
	const submitLabel = $derived(
		calendar.composeSaving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create event'
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

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[1px]"
	onclick={close}
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="z-panel flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden border-l shadow-md"
		onclick={(e) => e.stopPropagation()}
	>
		<header class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
			<h2 class="text-sm font-semibold text-fg">{isEdit ? 'Edit event' : 'New event'}</h2>
			<IconButton label="Close" onclick={close}>
				<X class="size-4" />
			</IconButton>
		</header>

		<form
			class="flex min-h-0 flex-1 flex-col overflow-hidden"
			onsubmit={(e) => {
				e.preventDefault();
				if (auth.client) void calendar.saveCompose(auth.client);
			}}
		>
			<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
				<label class="block space-y-1.5">
					<span class="text-sm font-medium text-fg">Title</span>
					<input
						type="text"
						class="z-input"
						placeholder="Event title"
						bind:value={calendar.composeDraft.title}
						required
					/>
				</label>

				<label class="block space-y-1.5">
					<span class="text-sm font-medium text-fg">Calendar</span>
					<select class="z-input" bind:value={calendar.composeDraft.calendarId} required>
						{#each calendar.calendars as item (item.id)}
							<option value={item.id}>{item.name}</option>
						{/each}
					</select>
				</label>

				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" class="size-4 accent-accent" bind:checked={calendar.composeDraft.allDay} />
					<span class="text-fg">All day</span>
				</label>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block space-y-1.5">
						<span class="text-sm font-medium text-fg">Starts</span>
						<input type="date" class="z-input" bind:value={calendar.composeDraft.startDate} required />
					</label>

					{#if calendar.composeDraft.allDay}
						<label class="block space-y-1.5">
							<span class="text-sm font-medium text-fg">Ends</span>
							<input type="date" class="z-input" bind:value={calendar.composeDraft.endDate} required />
						</label>
					{:else}
						<label class="block space-y-1.5">
							<span class="text-sm font-medium text-fg">Start time</span>
							<input type="time" class="z-input" bind:value={calendar.composeDraft.startTime} required />
						</label>
						<label class="block space-y-1.5 sm:col-span-2">
							<span class="text-sm font-medium text-fg">End time</span>
							<div class="grid gap-3 sm:grid-cols-2">
								<input type="date" class="z-input" bind:value={calendar.composeDraft.endDate} required />
								<input type="time" class="z-input" bind:value={calendar.composeDraft.endTime} required />
							</div>
						</label>
					{/if}
				</div>

				<label class="block space-y-1.5">
					<span class="text-sm font-medium text-fg">Location</span>
					<input
						type="text"
						class="z-input"
						placeholder="Optional"
						bind:value={calendar.composeDraft.location}
					/>
				</label>

				<label class="block space-y-1.5">
					<span class="text-sm font-medium text-fg">Description</span>
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

			<footer class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<Button variant="ghost" type="button" onclick={close}>Cancel</Button>
				<Button type="submit" disabled={calendar.composeSaving}>
					{submitLabel}
				</Button>
			</footer>
		</form>
	</div>
</div>
