<script lang="ts">
	import ZaurCalendarIcon from '$lib/components/icons/Calendar.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import { Calendar as LibCalendar, auto } from '@nomideusz/svelte-calendar';
	import AgendaWeekNav from '$lib/components/calendar/AgendaWeekNav.svelte';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import EventComposePanel from '$lib/components/calendar/EventComposePanel.svelte';
	import EventPanel from '$lib/components/calendar/EventPanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { ZaurCalendarAdapter } from '$lib/components/calendar/calendar-adapter';
	import { cn } from '$lib/utils/cn';
	import { addDays } from '$lib/utils/dates';
	import { untrack } from 'svelte';

	type CalendarTab = 'week' | 'day' | 'agendas';

	const tabs: { id: CalendarTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agendas' }
	];

	let activeView = $state<CalendarTab>('week');
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
		if (!client || auth.isRestoring || activeView !== 'agendas') return;

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
		if (activeView === 'week') return 'Week';
		if (activeView === 'day' || activeView === 'agendas') {
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

	const showDateNav = $derived(activeView === 'day' || activeView === 'agendas');

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

				<div class="h-4 w-px bg-border/80" aria-hidden="true"></div>

				<div class="flex items-center rounded-lg border border-border/50 bg-surface-sunken/60 p-0.5">
					{#each tabs as tab (tab.id)}
						<button
							type="button"
							class={cn(
								'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150',
								activeView === tab.id
									? 'bg-surface-raised font-semibold text-fg shadow-sm'
									: 'text-fg-muted hover:text-fg'
							)}
							onclick={() => (activeView = tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if calAdapter}
			{#key `${activeView}-${calendar.refreshCounter}`}
				{#if activeView === 'week'}
					<div class="flex min-h-0 min-w-0 flex-1 flex-col">
						<LibCalendar
							adapter={calAdapter}
							view="week-planner"
							{...plannerCalendarProps}
						/>
					</div>
				{:else if activeView === 'day'}
					<div class="flex min-h-0 min-w-0 flex-1 flex-col">
						<LibCalendar
							adapter={calAdapter}
							view="day-planner"
							{...plannerCalendarProps}
						/>
					</div>
				{:else}
					<div
						class={cn(
							'flex min-h-0 min-w-0 flex-1 divide-border bg-surface-sunken/10',
							isWide ? 'flex-row divide-x' : 'flex-col divide-y'
						)}
					>
						<div
							class={cn(
								'flex min-h-0 min-w-0 flex-col',
								isWide ? 'w-72 max-w-[20rem] shrink-0' : 'max-h-[42%] shrink-0'
							)}
						>
							<AgendaWeekNav selectedDay={currentDate} onSelectDay={selectAgendaDay} />
						</div>
						<div class="min-h-0 flex-1 overflow-hidden">
							<LibCalendar
								adapter={calAdapter}
								view="day-agenda"
								{...dayAgendaProps}
							/>
						</div>
					</div>
				{/if}
			{/key}
		{/if}
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
