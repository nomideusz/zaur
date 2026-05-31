<script lang="ts">
	import MapPin from '$lib/components/icons/MapPin.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { formatEventTime } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';

	const event = $derived(calendar.selectedEvent);
	const eventCalendars = $derived(
		event ? event.calendarIds.map((id) => calendar.calendarById(id)).filter(Boolean) : []
	);
	const eventTitle = $derived(event?.title?.trim() || 'Untitled event');
	const eventDescription = $derived(event?.description?.trim() ?? '');
	const eventLocation = $derived(event?.location?.trim() ?? '');
	const panelPadding = 'px-4 py-3';

	function deleteEvent() {
		if (!auth.client || !event) return;
		if (!confirm(`Delete “${eventTitle}”? This cannot be undone.`)) return;
		void calendar.deleteEvent(auth.client, event);
	}

	function editEvent() {
		if (!event) return;
		calendar.openComposeEdit(event);
	}
</script>

{#snippet details(showClose: boolean)}
	<header
		class={cn('flex shrink-0 items-start justify-between gap-2 border-b border-border', panelPadding)}
	>
		<div class="min-w-0">
			<h2 class="text-base font-semibold text-fg">{eventTitle}</h2>
			<p class="mt-1 text-sm text-fg-muted">{formatEventTime(event!)}</p>
		</div>
		{#if showClose}
			<IconButton label="Close event" onclick={() => calendar.selectEvent(null)}>
				<X class="size-4" />
			</IconButton>
		{/if}
	</header>

	<div
		class="z-pane-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm"
	>
		{#if eventCalendars.length}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Calendars</p>
				<ul class="mt-2 space-y-1">
					{#each eventCalendars as item (item!.id)}
						<li class="flex items-center gap-2 text-fg">
							<span
								class="size-2.5 shrink-0 rounded-full"
								style:background-color={item!.color}
								aria-hidden="true"
							></span>
							<span>{item!.name}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if eventLocation}
			<div class="flex items-start gap-2 text-fg">
				<MapPin class="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span>{eventLocation}</span>
			</div>
		{/if}

		{#if eventDescription}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Description</p>
				<p class="mt-2 whitespace-pre-wrap text-fg">{eventDescription}</p>
			</div>
		{:else if !eventLocation && !eventCalendars.length}
			<p class="text-sm text-fg-muted">No extra details for this event.</p>
		{/if}
	</div>

	<footer
		class={cn('flex shrink-0 gap-2 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]', panelPadding)}
	>
		<Button variant="ghost" onclick={editEvent}>
			<Pencil class="size-4" aria-hidden="true" />
			Edit
		</Button>
		<Button variant="danger" onclick={deleteEvent}>
			<Trash2 class="size-4" aria-hidden="true" />
			Delete
		</Button>
	</footer>
{/snippet}

{#if event}
	<aside
		class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex"
		style="view-transition-name: calendar-event;"
		aria-label="Event details"
	>
		{@render details(false)}
	</aside>

	<div class="z-mobile-sheet-backdrop md:hidden">
		<div
			class="m-2 flex h-[calc(100%-1rem)] w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-md"
		>
			{@render details(true)}
		</div>
	</div>
{/if}
