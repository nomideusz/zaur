<script lang="ts">
	import ZaurCalendarIcon from '$lib/components/icons/Calendar.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import { Calendar as LibCalendar, auto } from '@nomideusz/svelte-calendar';
	import { Tabs } from '@ark-ui/svelte/tabs';
	import AgendaWeekNav from '$lib/components/calendar/AgendaWeekNav.svelte';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import EventComposePanel from '$lib/components/calendar/EventComposePanel.svelte';
	import EventPanel from '$lib/components/calendar/EventPanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { ZaurCalendarAdapter } from '$lib/components/calendar/calendar-adapter';
	import { cn } from '$lib/utils/cn';
	import { addDays } from '$lib/utils/dates';
	import { untrack } from 'svelte';

	const tabs = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agenda' }
	] as const;
	let currentDate = $state<Date>(new Date());
	let isWide = $state(false);
	let blockCreateUntil = 0;

	function handleEventClick(evt: { id: string }) {
		blockCreateUntil = performance.now() + 300;
		calendar.selectEvent(evt.id);
	}

	function handleEventCreate(range: { start: Date }) {
		if (performance.now() < blockCreateUntil) return;
		calendar.openCompose(range.start);
	}

	const plannerCalendarProps = $derived({
		currentDate,
		initialDate: currentDate,
		theme: auto,
		showModePills: false,
		showNavigation: false,
		oneventclick: handleEventClick,
		oneventcreate: handleEventCreate,
		ondatechange: handlePlannerDateChange
	});

	const dayAgendaProps = $derived({
		currentDate,
		initialDate: currentDate,
		theme: auto,
		showModePills: false,
		showNavigation: false,
		oneventclick: handleEventClick,
		oneventcreate: handleEventCreate,
		ondatechange: handleAgendaDayChange
	});

	$effect(() => {
		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		isWide = mediaQuery.matches;

		const handler = (e: MediaQueryListEvent) => {
			isWide = e.matches;
		};
		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	});

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;

		if (calendar.viewYear !== currentDate.getFullYear() || calendar.viewMonth !== currentDate.getMonth()) {
			calendar.viewYear = currentDate.getFullYear();
			calendar.viewMonth = currentDate.getMonth();
		}

		void calendar.ensureCalendars(client);
	});

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring || calendar.activeView !== 'agendas') return;

		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		untrack(() => {
			if (calendar.viewYear !== year || calendar.viewMonth !== month) {
				calendar.viewYear = year;
				calendar.viewMonth = month;
			}
			void calendar.loadMonth(client, { preserveSelection: true });
		});
	});

	let calAdapter = $state<ZaurCalendarAdapter | null>(null);

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) {
			calAdapter = null;
			return;
		}
		calAdapter = new ZaurCalendarAdapter(client);
	});

	const headerTitle = $derived.by(() => {
		if (calendar.activeView === 'week') return 'Week';
		if (calendar.activeView === 'day' || calendar.activeView === 'agendas') {
			return currentDate.toLocaleDateString(undefined, {
				weekday: 'long',
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		}
		return currentDate.toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		});
	});

	const showDateNav = $derived(calendar.activeView === 'day' || calendar.activeView === 'agendas');

	function prev() {
		currentDate = addDays(currentDate, -1);
	}

	function next() {
		currentDate = addDays(currentDate, 1);
	}

	function goToday() {
		currentDate = new Date();
	}

	function handlePlannerDateChange(date: Date) {
		if (currentDate.getTime() !== date.getTime()) {
			currentDate = date;
		}
	}

	function handleAgendaDayChange(date: Date) {
		if (currentDate.getTime() !== date.getTime()) {
			currentDate = date;
		}
	}

	function selectAgendaDay(day: Date) {
		currentDate = day;
	}

	function deleteSelectedEvent() {
		const event = calendar.selectedEvent;
		const client = auth.client;
		if (!event || !client) return;
		void calendar.deleteEvent(client, event);
	}
</script>

<svelte:head>
	<title>{headerTitle} · Calendar · ZAUR</title>
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
			'z-mail-pane-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
			calendar.selectedEvent && 'max-md:hidden md:border-r md:border-border'
		)}
		style="view-transition-name: calendar-grid;"
		aria-label="Calendar view"
	>
		<!--
			Ark Tabs drives the view switcher: Root is display:contents so the header
			and the panels below stay direct flex children of the section. Triggers and
			panels are far apart in the markup but share this one Root.
		-->
		<Tabs.Root
			value={calendar.activeView}
			onValueChange={(details) => (calendar.activeView = details.value as CalendarViewTab)}
			lazyMount
			unmountOnExit
			class="contents"
		>
		<div
			class={cn(
				'flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border/80 px-4 py-2',
				showDateNav ? 'justify-between' : 'justify-end'
			)}
		>
			{#if showDateNav}
				<div class="flex items-center gap-1">
					<IconButton label="Previous day" onclick={prev}>
						<ChevronLeft class="size-4" />
					</IconButton>
					<h2 class="min-w-36 text-center text-sm font-semibold text-fg">
						{headerTitle}
					</h2>
					<IconButton label="Next day" onclick={next}>
						<ChevronRight class="size-4" />
					</IconButton>
				</div>
			{/if}

			<div class="flex items-center gap-3">
				{#if calendar.selectedEvent}
					<IconButton
						label="Delete event"
						class="text-danger hover:bg-danger/10"
						onclick={deleteSelectedEvent}
					>
						<Trash2 class="size-4" />
					</IconButton>
					<div class="h-4 w-px bg-border/80" aria-hidden="true"></div>
				{/if}
				<Button variant="ghost" onclick={goToday}>Today</Button>

				<!-- Desktop keeps the view switcher inline; mobile moves it to the island. -->
				<div class="hidden h-4 w-px bg-border/80 md:block" aria-hidden="true"></div>

				<Tabs.List class="hidden items-center rounded-lg border border-border/50 bg-surface-sunken/60 p-0.5 md:flex">
					{#each tabs as tab (tab.id)}
						<Tabs.Trigger
							value={tab.id}
							class="rounded-md px-2.5 py-1 text-xs font-medium text-fg-muted transition-all duration-150 hover:text-fg data-[selected]:bg-surface-raised data-[selected]:font-semibold data-[selected]:text-fg data-[selected]:shadow-sm"
						>
							{tab.label}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>
		</div>

		<!--
			unmountOnExit keeps only the active panel mounted (the planners are heavy);
			the inner {#key refreshCounter} preserves the remount-on-refresh behaviour the
			previous {#key} block provided when data changes without switching views.
		-->
		<Tabs.Content value="week" class="flex min-h-0 min-w-0 flex-1 flex-col">
			{#if calAdapter}
				{#key calendar.refreshCounter}
					<LibCalendar adapter={calAdapter} view="week-planner" {...plannerCalendarProps} />
				{/key}
			{/if}
		</Tabs.Content>
		<Tabs.Content value="day" class="flex min-h-0 min-w-0 flex-1 flex-col">
			{#if calAdapter}
				{#key calendar.refreshCounter}
					<LibCalendar adapter={calAdapter} view="day-planner" {...plannerCalendarProps} />
				{/key}
			{/if}
		</Tabs.Content>
		<Tabs.Content
			value="agendas"
			class="flex min-h-0 min-w-0 flex-1 flex-row divide-x divide-border bg-surface-sunken/10"
		>
			{#if calAdapter}
				{#key calendar.refreshCounter}
					{#if isWide}
						<!-- Week overview is a desktop-only side column — stacked with the
						     day agenda it crowds small screens; the header date nav covers
						     day switching there. -->
						<div class="flex min-h-0 w-72 max-w-[20rem] min-w-0 shrink-0 flex-col">
							<AgendaWeekNav selectedDay={currentDate} onSelectDay={selectAgendaDay} />
						</div>
					{/if}
					<div class="min-h-0 flex-1 overflow-hidden">
						<LibCalendar adapter={calAdapter} view="day-agenda" {...dayAgendaProps} />
					</div>
				{/key}
			{/if}
		</Tabs.Content>
		</Tabs.Root>
	</section>
	{#if calendar.selectedEvent}
		<EventPanel />
	{/if}
{/if}

{#if calendar.composeOpen}
	<EventComposePanel />
{/if}

<style>
	:global(.cal) {
		height: 100% !important;
		border: none !important;
		border-radius: 0 !important;
	}

	/* Shell header owns date navigation — hide duplicate labels/controls inside LibCalendar. */
	:global(.cal .fs-date-label),
	:global(.cal .ag-date-label),
	:global(.cal .fs-nav),
	:global(.cal .ag-nav) {
		display: none !important;
	}
</style>
