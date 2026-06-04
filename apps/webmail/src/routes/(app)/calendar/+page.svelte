<script lang="ts">
	import ZaurCalendarIcon from '$lib/components/icons/Calendar.svelte';
	import { Calendar as LibCalendar, createMemoryAdapter, auto } from '@nomideusz/svelte-calendar';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import EventComposePanel from '$lib/components/calendar/EventComposePanel.svelte';
	import EventPanel from '$lib/components/calendar/EventPanel.svelte';
	import EventPanelEmpty from '$lib/components/calendar/EventPanelEmpty.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { formatMonthTitle } from '$lib/utils/dates';
	import { mapJmapToTimelineEvents } from '$lib/components/calendar/calendar-adapter';
	import { cn } from '$lib/utils/cn';

	const monthTitle = $derived(formatMonthTitle(calendar.viewYear, calendar.viewMonth));

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;

		calendar.viewYear;
		calendar.viewMonth;
		void calendar.loadMonth(client);
	});

	// Derive svelte-calendar adapter reactively when events or visibility filter changes
	const visibleEvents = $derived(
		calendar.events.filter((e) => !calendar.hiddenCalendarIds.has(e.calendarIds[0]))
	);
	const timelineEvents = $derived(mapJmapToTimelineEvents(visibleEvents, calendar.calendars));
	const calAdapter = $derived(createMemoryAdapter(timelineEvents));
</script>

<svelte:head>
	<title>{monthTitle} · Calendar · ZAUR</title>
</svelte:head>

{#if calendar.supported === false}
	<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
		<div class="z-panel rounded-xl p-8 text-center">
			<ZaurCalendarIcon class="mx-auto size-10 text-fg-subtle" aria-hidden="true" />
			<h1 class="mt-4 text-2xl font-semibold text-fg">Calendar unavailable</h1>
			<p class="mx-auto mt-2 max-w-md text-sm text-fg-muted">
				Your mail server does not advertise JMAP Calendars support yet. Calendar will appear here
				once it is enabled on your account.
			</p>
			<div class="mt-6">
				<Button href={settings.preferredMailHref()} variant="ghost">Back to mail</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="hidden md:contents">
		<CalendarSidebar />
	</div>
	<section
		class={cn(
			'z-mail-pane-surface flex min-h-0 min-w-0 flex-col overflow-hidden',
			calendar.selectedEvent ? 'hidden md:flex md:flex-1' : 'flex flex-1',
			'md:border-r md:border-border'
		)}
		style="view-transition-name: calendar-grid;"
		aria-label="Calendar view"
	>
		<LibCalendar
			adapter={calAdapter}
			view="week-planner"
			theme={auto}
			oneventclick={(evt) => calendar.selectEvent(evt.id)}
			oneventcreate={(range) => calendar.openCompose(range.start)}
			height="auto"
		/>
	</section>
	{#if calendar.selectedEvent}
		<EventPanel />
	{:else}
		<EventPanelEmpty />
	{/if}
{/if}

{#if calendar.composeOpen}
	<EventComposePanel />
{/if}
