<script lang="ts">
	import { MapPin, Pencil, Trash2, X } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { formatEventTime } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';

	const event = $derived(calendar.selectedEvent);
	const eventCalendars = $derived(
		event ? event.calendarIds.map((id) => calendar.calendarById(id)).filter(Boolean) : []
	);
	const hideBorders = $derived(settings.hideCalendarPaneBorders || settings.hidePaneBorders);
	const panelPadding = $derived(settings.compactCalendarEventPanel ? 'px-3 py-2.5' : 'px-4 py-3');

	function deleteEvent() {
		if (!auth.client || !event) return;
		if (!confirm(`Delete “${event.title}”?`)) return;
		void calendar.deleteEvent(auth.client, event);
	}

	function editEvent() {
		if (!event) return;
		calendar.openComposeEdit(event);
	}
</script>

{#snippet details(showClose: boolean)}
	<header
		class={cn(
			'flex shrink-0 items-start justify-between gap-2 border-b',
			panelPadding,
			!hideBorders && 'border-border'
		)}
	>
		<div class="min-w-0">
			<h2 class="text-base font-semibold text-fg">{event!.title}</h2>
			<p class="mt-1 text-sm text-fg-muted">{formatEventTime(event!)}</p>
		</div>
		{#if showClose}
			<IconButton label="Close event" onclick={() => calendar.selectEvent(null)}>
				<X class="size-4" />
			</IconButton>
		{/if}
	</header>

	<div
		class={cn(
			'z-pane-scroll min-h-0 flex-1 space-y-4 overflow-y-auto text-sm',
			settings.compactCalendarEventPanel ? 'space-y-3 px-3 py-3' : 'px-4 py-4'
		)}
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

		{#if event!.location}
			<div class="flex items-start gap-2 text-fg">
				<MapPin class="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
				<span>{event!.location}</span>
			</div>
		{/if}

		{#if event!.description}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Description</p>
				<p class="mt-2 whitespace-pre-wrap text-fg">{event!.description}</p>
			</div>
		{/if}
	</div>

	<footer
		class={cn(
			'flex shrink-0 gap-2 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]',
			panelPadding,
			!hideBorders && 'border-border'
		)}
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
		class={cn(
			'z-panel hidden min-h-0 w-80 shrink-0 flex-col overflow-hidden md:flex',
			!hideBorders && 'border-l'
		)}
		style="view-transition-name: calendar-event;"
		aria-label="Event details"
	>
		{@render details(false)}
	</aside>

	<div
		class="fixed inset-0 z-30 flex justify-end bg-black/20 backdrop-blur-[1px] md:hidden"
		onclick={() => calendar.selectEvent(null)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class={cn(
				'z-panel flex h-full w-full max-w-md flex-col shadow-md',
				!hideBorders && 'border-l'
			)}
			onclick={(e) => e.stopPropagation()}
		>
			{@render details(true)}
		</div>
	</div>
{/if}
