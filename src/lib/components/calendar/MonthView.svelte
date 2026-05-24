<script lang="ts">
	import { ChevronLeft, ChevronRight, LoaderCircle, Plus } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import type { CalendarEvent } from '$lib/types/calendar';
	import { formatMonthTitle, isSameDay, isSameMonth, monthGrid, weekdayLabels } from '$lib/utils/dates';
	import { cn } from '$lib/utils/cn';

	const today = new Date();
	const weekdays = weekdayLabels();
	const days = $derived(monthGrid(calendar.viewYear, calendar.viewMonth));
	const monthTitle = $derived(formatMonthTitle(calendar.viewYear, calendar.viewMonth));

	function eventColor(event: CalendarEvent): string {
		const primaryCalendarId = event.calendarIds[0];
		return calendar.calendarById(primaryCalendarId)?.color ?? '#2563eb';
	}

	function formatChipTime(event: CalendarEvent): string {
		if (event.allDay) return '';
		return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(event.start);
	}

	function selectEvent(id: string) {
		calendar.selectEvent(id);
	}

	function createOnDay(day: Date) {
		calendar.openCompose(day);
	}
</script>

<section
	class="z-panel flex min-w-0 flex-1 flex-col border-r"
	style="view-transition-name: calendar-grid;"
	aria-label="Month view"
>
	<div class="flex h-12 items-center justify-between gap-2 border-b border-border px-4">
		<div class="flex items-center gap-1">
			<IconButton label="Previous month" onclick={() => calendar.prevMonth()}>
				<ChevronLeft class="size-4" />
			</IconButton>
			<h2 class="min-w-36 text-center text-sm font-semibold text-fg">{monthTitle}</h2>
			<IconButton label="Next month" onclick={() => calendar.nextMonth()}>
				<ChevronRight class="size-4" />
			</IconButton>
		</div>
		<Button variant="ghost" onclick={() => calendar.goToToday()}>Today</Button>
		<Button onclick={() => calendar.openCompose()} class="hidden sm:inline-flex">
			<Plus class="size-4" aria-hidden="true" />
			New event
		</Button>
	</div>

	<div class="grid grid-cols-7 border-b border-border bg-surface-sunken/50">
		{#each weekdays as weekday}
			<div class="px-2 py-2 text-center text-xs font-medium text-fg-subtle">{weekday}</div>
		{/each}
	</div>

	{#if calendar.eventsLoading}
		<div class="flex flex-1 items-center justify-center gap-2 text-sm text-fg-muted">
			<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
			Loading events…
		</div>
	{:else if calendar.error}
		<p class="flex flex-1 items-center justify-center px-4 text-center text-sm text-danger">
			{calendar.error}
		</p>
	{:else}
		<div class="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
			{#each days as day (day.toISOString())}
				{@const inMonth = isSameMonth(day, calendar.viewYear, calendar.viewMonth)}
				{@const isToday = isSameDay(day, today)}
				{@const dayEvents = calendar.eventsForDay(day)}
				<div
					class={cn(
						'group min-h-24 border-b border-r border-border p-1.5',
						!inMonth && 'bg-surface-sunken/30 text-fg-subtle'
					)}
				>
					<div class="mb-1 flex items-center justify-between gap-1">
						<button
							type="button"
							class="rounded p-0.5 text-fg-subtle opacity-0 transition-opacity hover:bg-surface-sunken hover:text-fg group-hover:opacity-100 focus:opacity-100"
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
						{#each dayEvents.slice(0, 3) as event (event.id)}
							<li>
								<button
									type="button"
									class={cn(
										'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-opacity hover:opacity-80',
										calendar.selectedEventId === event.id && 'ring-1 ring-accent/40'
									)}
									style:background-color={`color-mix(in srgb, ${eventColor(event)} 18%, transparent)`}
									style:color={eventColor(event)}
									onclick={() => selectEvent(event.id)}
								>
									{#if formatChipTime(event)}
										<span class="shrink-0 opacity-80">{formatChipTime(event)}</span>
									{/if}
									<span class="truncate font-medium">{event.title}</span>
								</button>
							</li>
						{/each}
						{#if dayEvents.length > 3}
							<li class="px-1 text-[10px] text-fg-subtle">+{dayEvents.length - 3} more</li>
						{/if}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
</section>
