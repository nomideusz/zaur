<script lang="ts">
	import MapPin from '$lib/components/icons/MapPin.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Video from '$lib/components/icons/Video.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { Drawer } from '@ark-ui/svelte/drawer';
	import { Portal } from '@ark-ui/svelte/portal';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { calendarKey } from '$lib/jmap/calendar-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { formatEventTime } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';
	import { extractMeetingGroup, meetingJoinPath } from '$lib/utils/meet';

	const event = $derived(calendar.selectedEvent);
	const eventCalendars = $derived(
		event
			? event.calendarIds
					.map((id) => calendar.calendarById(id, event.accountId))
					.filter(Boolean)
			: []
	);
	const canEditEvent = $derived(event ? calendar.eventAllowsWrites(event) : false);
	const eventTitle = $derived(event?.title?.trim() || 'Untitled event');
	const eventDescription = $derived(event?.description?.trim() ?? '');
	const eventLocation = $derived(event?.location?.trim() ?? '');
	const meetingGroup = $derived(extractMeetingGroup(eventLocation));
	const meetingUrl = $derived(meetingGroup ? meetingJoinPath(meetingGroup) : null);
	const panelPadding = 'px-4 py-3';

	function deleteEvent() {
		if (!auth.client || !event) return;
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
	{#if canEditEvent}
		<div class={cn('flex gap-2 mt-2', panelPadding)}>
			{#if meetingUrl}
				<Button href={meetingUrl} target="_blank" rel="noopener noreferrer" class="min-w-0">
					<Video class="size-4" aria-hidden="true" />
					Join call
				</Button>
			{/if}
			<Button variant="ghost" onclick={editEvent}>
				<Pencil class="size-4" aria-hidden="true" />
				Edit
			</Button>
			<Button variant="danger" onclick={deleteEvent}>
				<Trash2 class="size-4" aria-hidden="true" />
				Delete
			</Button>
		</div>
	{/if}

	<ScrollArea pane class="min-h-0 flex-1">
		<div class="space-y-4 px-4 py-4 text-sm">
		{#if eventCalendars.length}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Calendars</p>
				<ul class="mt-2 space-y-1">
					{#each eventCalendars as item (calendarKey(item!))}
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

		{#if meetingUrl}
			<div class="flex items-start gap-2 text-fg">
				<Video class="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
				<a
					href={meetingUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="min-w-0 break-all text-accent underline-offset-2 hover:underline"
				>
					{eventLocation || meetingUrl}
				</a>
			</div>
		{:else if eventLocation}
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
	</ScrollArea>

	{#if meetingUrl || canEditEvent}
		<footer
			class={cn(
				'flex shrink-0 flex-wrap gap-2 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]',
				panelPadding
			)}
		>
			{#if meetingUrl}
				<Button href={meetingUrl} target="_blank" rel="noopener noreferrer" class="min-w-0">
					<Video class="size-4" aria-hidden="true" />
					Join call
				</Button>
			{/if}
			{#if canEditEvent}
				<Button variant="ghost" onclick={editEvent}>
					<Pencil class="size-4" aria-hidden="true" />
					Edit
				</Button>
				<Button variant="danger" onclick={deleteEvent}>
					<Trash2 class="size-4" aria-hidden="true" />
					Delete
				</Button>
			{/if}
		</footer>
	{/if}
{/snippet}

{#if event}
	<!-- Desktop pane -->
	<aside
		class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex"
		style="view-transition-name: calendar-event;"
		aria-label="Event details"
	>
		{@render details(true)}
	</aside>

	<!-- Mobile drawer -->
	<Drawer.Root
		open={calendar.selectedEvent != null}
		onOpenChange={(details) => {
			if (!details.open) calendar.selectEvent(null);
		}}
		swipeDirection="end"
		lazyMount
		unmountOnExit
	>
		<Portal>
			<Drawer.Backdrop class="z-event-drawer-backdrop fixed inset-0 bg-black/50 md:hidden" />
			<Drawer.Positioner
				class="z-event-drawer-positioner fixed inset-0 flex items-stretch justify-end md:hidden"
			>
				<Drawer.Content
					class="z-event-drawer-content flex h-full min-h-0 max-w-md flex-col bg-surface-raised outline-none"
					aria-label="Event details"
				>
					{@render details(true)}
				</Drawer.Content>
			</Drawer.Positioner>
		</Portal>
	</Drawer.Root>
{/if}
