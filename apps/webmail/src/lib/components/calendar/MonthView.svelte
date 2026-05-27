<script lang="ts">
	import CalendarDays from '$lib/components/icons/CalendarDays.svelte';
import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
import LoaderCircle from '$lib/components/icons/LoaderCircle.svelte';
import Plus from '$lib/components/icons/Plus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { CalendarEvent } from '$lib/types/calendar';
	import { formatMonthTitle, isSameDay, isSameMonth, monthGrid, weekdayLabels } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';

	const today = new Date();
	const weekStart = $derived(settings.calendarWeekStartsOnMonday ? 'monday' : 'sunday');
	const weekdays = $derived(weekdayLabels(weekStart));
	const days = $derived(monthGrid(calendar.viewYear, calendar.viewMonth, weekStart));
	const monthTitle = $derived(formatMonthTitle(calendar.viewYear, calendar.viewMonth));
	const maxEventsPerDay = $derived(settings.calendarMaxEventsPerDay);
	const hideBorders = $derived(settings.hideCalendarPaneBorders || settings.hidePaneBorders);

	let calendarsOpen = $state(false);

	function eventColor(event: CalendarEvent): string {
		const primaryCalendarId = event.calendarIds[0];
		return calendar.calendarById(primaryCalendarId)?.color ?? '#2563eb';
	}

	function formatChipTime(event: CalendarEvent): string {
		if (event.allDay || settings.hideCalendarEventTimes) return '';
		return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(event.start);
	}

	function selectEvent(id: string) {
		calendar.selectEvent(id);
	}

	function createOnDay(day: Date) {
		calendar.openCompose(day);
	}

	function formatDayLabel(day: Date): string {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day);
	}

	function eventLabel(event: CalendarEvent): string {
		const time = event.allDay ? 'All day' : formatChipTime(event);
		return `${event.title || 'Untitled event'}${time ? `, ${time}` : ''}`;
	}

	function onCalendarsKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			calendarsOpen = false;
		}
	}
</script>

<svelte:window onclick={() => (calendarsOpen = false)} onkeydown={onCalendarsKeydown} />

<section
	class={cn(
		'm-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-raised/95 shadow-sm md:m-3 md:mr-0',
		!hideBorders && 'border border-border'
	)}
	style="view-transition-name: calendar-grid;"
	aria-label="Month view"
>
	<div
		class={cn(
			'flex shrink-0 items-center justify-between gap-2 px-4',
			settings.compactCalendarHeader ? 'h-10' : 'h-12',
			!hideBorders && 'border-b border-border/80'
		)}
	>
		<div class="flex items-center gap-1">
			<IconButton label="Previous month" onclick={() => calendar.prevMonth()}>
				<ChevronLeft class="size-4" />
			</IconButton>
			<h2
				class={cn(
					'min-w-36 text-center font-semibold text-fg',
					settings.compactCalendarHeader ? 'text-xs' : 'text-sm'
				)}
			>
				{monthTitle}
			</h2>
			<IconButton label="Next month" onclick={() => calendar.nextMonth()}>
				<ChevronRight class="size-4" />
			</IconButton>
		</div>
		<Button variant="ghost" onclick={() => calendar.goToToday()}>Today</Button>
		<IconButton
			label="Show calendars"
			class="md:hidden"
			ariaExpanded={calendarsOpen}
			ariaControls="mobile-calendar-list"
			ariaHaspopup="true"
			onclick={(e) => {
				e.stopPropagation();
				calendarsOpen = !calendarsOpen;
			}}
		>
			<CalendarDays class="size-4" aria-hidden="true" />
		</IconButton>
	</div>

	{#if calendarsOpen && calendar.calendars.length}
		<div
			id="mobile-calendar-list"
			role="group"
			aria-label="Visible calendars"
			tabindex="-1"
			class={cn(
				'z-pane-scroll max-h-48 shrink-0 overflow-y-auto border-b md:hidden',
				settings.compactCalendarSidebar ? 'px-2 py-1' : 'px-2 py-2',
				!hideBorders && 'border-border'
			)}
		>
			<ul class="space-y-0.5">
				{#each calendar.calendars as item (item.id)}
					<li>
						<label
							class={cn(
								'flex cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-all hover:bg-surface-sunken/80 focus-within:ring-2 focus-within:ring-accent/20',
								settings.compactCalendarSidebar ? 'py-1.5' : 'py-2',
								calendar.isCalendarVisible(item.id) ? 'text-fg' : 'text-fg-muted'
							)}
						>
							<input
								type="checkbox"
								class="z-checkbox"
								checked={calendar.isCalendarVisible(item.id)}
								onchange={() => calendar.toggleCalendar(item.id)}
							/>
							<span
								class="size-2.5 shrink-0 rounded-full"
								style:background-color={item.color}
								aria-hidden="true"
							></span>
							<span class="truncate">{item.name}</span>
						</label>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div
		class={cn(
			'grid shrink-0 grid-cols-7 border-b bg-surface-sunken/50',
			!hideBorders && 'border-border/80'
		)}
	>
		{#each weekdays as weekday}
			<div
				class={cn(
					'px-2 text-center text-xs font-medium text-fg-subtle',
					settings.compactCalendarGrid ? 'py-1.5' : 'py-2'
				)}
			>
				{weekday}
			</div>
		{/each}
	</div>

	{#if calendar.eventsLoading}
		<div class="flex flex-1 items-center justify-center gap-2 text-sm text-fg-muted">
			<span class="z-spinner size-4" aria-hidden="true">
				<LoaderCircle class="size-full" />
			</span>
			Loading events…
		</div>
	{:else if calendar.error}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
			<p class="text-sm text-danger">{calendar.error}</p>
			{#if auth.client}
				<Button variant="ghost" class="text-sm" onclick={() => void calendar.loadMonth(auth.client!)}>
					Try again
				</Button>
			{/if}
		</div>
	{:else}
		<div class="z-pane-scroll grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
			{#each days as day (day.toISOString())}
				{@const inMonth = isSameMonth(day, calendar.viewYear, calendar.viewMonth)}
				{@const isToday = isSameDay(day, today)}
				{@const dayEvents = calendar.eventsForDay(day)}
				<div
					class={cn(
						'group p-1.5 transition-colors hover:bg-surface-sunken/40',
						settings.compactCalendarGrid ? 'min-h-16 p-1' : 'min-h-24',
						!hideBorders && 'border-b border-r border-border',
						!inMonth && 'bg-surface-sunken/30 text-fg-subtle'
					)}
					aria-label={`${formatDayLabel(day)}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
				>
					<div class="mb-1 flex items-center justify-between gap-1">
						<button
							type="button"
							class="rounded p-0.5 text-fg-subtle opacity-0 transition-all hover:bg-surface-raised hover:text-fg group-hover:opacity-100 focus:opacity-100"
							class:opacity-100={inMonth}
							aria-label="Create event on {day.toLocaleDateString()}"
							onclick={() => createOnDay(day)}
						>
							<Plus class="size-3.5" />
						</button>
						<span
							class={cn(
								'inline-flex size-6 items-center justify-center rounded-full text-xs',
								isToday && 'bg-accent font-medium text-accent-fg'
							)}
						>
							{day.getDate()}
						</span>
					</div>

					<ul class="space-y-0.5">
						{#each dayEvents.slice(0, maxEventsPerDay) as event (event.id)}
							<li>
								<button
									type="button"
									class={cn(
										'flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left leading-tight shadow-sm transition-all hover:-translate-y-px hover:opacity-90',
										settings.compactCalendarGrid ? 'text-[10px]' : 'text-[11px]',
										calendar.selectedEventId === event.id && 'ring-1 ring-accent/40'
									)}
									style:background-color={`color-mix(in srgb, ${eventColor(event)} 18%, transparent)`}
									style:color={eventColor(event)}
									aria-label={eventLabel(event)}
									aria-current={calendar.selectedEventId === event.id ? 'true' : undefined}
									onclick={() => selectEvent(event.id)}
								>
									{#if formatChipTime(event)}
										<span class="shrink-0 opacity-80">{formatChipTime(event)}</span>
									{/if}
									<span class="truncate font-medium">{event.title}</span>
								</button>
							</li>
						{/each}
						{#if !settings.hideCalendarMoreEventsLabel && dayEvents.length > maxEventsPerDay}
							<li>
								<button
									type="button"
									class="w-full rounded px-1 text-left text-[10px] text-fg-subtle hover:bg-surface-sunken hover:text-fg"
									aria-label={`Show ${dayEvents.length - maxEventsPerDay} more events on ${formatDayLabel(day)}`}
									onclick={() => selectEvent(dayEvents[maxEventsPerDay].id)}
								>
									+{dayEvents.length - maxEventsPerDay} more
								</button>
							</li>
						{/if}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
</section>
