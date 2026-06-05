<script lang="ts">
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { calendar } from '$lib/stores/calendar.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { CalendarEvent } from '$lib/types/calendar';
	import { cn } from '$lib/utils/cn';
	import { formatWeekRange, isSameDay, startOfWeek, weekDays } from '$lib/utils/dates';

	interface Props {
		selectedDay: Date;
		onSelectDay: (day: Date) => void;
		onPrevWeek: () => void;
		onNextWeek: () => void;
	}

	let { selectedDay, onSelectDay, onPrevWeek, onNextWeek }: Props = $props();

	const today = new Date();
	const weekStart = $derived(settings.calendarWeekStartsOnMonday ? 'monday' : 'sunday');
	const weekAnchor = $derived(startOfWeek(selectedDay, weekStart));
	const weekLabel = $derived(formatWeekRange(weekAnchor, weekStart));
	const days = $derived(weekDays(weekAnchor, weekStart));

	function formatEventTime(event: CalendarEvent): string {
		if (event.allDay || settings.hideCalendarEventTimes) return 'All day';
		return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(event.start);
	}

	function daySummary(day: Date): string {
		const events = calendar.eventsForDay(day);
		if (!events.length) return 'No events';
		if (events.length === 1) return events[0].title || 'Untitled event';
		const first = events[0].title || 'Untitled event';
		return `${first} +${events.length - 1} more`;
	}
</script>

<nav class="flex min-h-0 flex-col" aria-label="Week overview">
	<div class="flex h-10 shrink-0 items-center justify-between gap-1 border-b border-border/80 bg-surface/50 px-2">
		<IconButton label="Previous week" onclick={onPrevWeek}>
			<ChevronLeft class="size-4" />
		</IconButton>
		<p class="min-w-0 truncate text-center text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">
			{weekLabel}
		</p>
		<IconButton label="Next week" onclick={onNextWeek}>
			<ChevronRight class="size-4" />
		</IconButton>
	</div>

	<ul class="z-pane-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
		{#each days as day (day.toISOString())}
			{@const selected = isSameDay(day, selectedDay)}
			{@const isToday = isSameDay(day, today)}
			{@const events = calendar.eventsForDay(day)}
			<li>
				<button
					type="button"
					class={cn(
						'flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
						selected
							? 'border-accent/40 bg-accent/10 shadow-sm'
							: 'border-transparent hover:border-border/80 hover:bg-surface-sunken/60'
					)}
					aria-current={selected ? 'date' : undefined}
					onclick={() => onSelectDay(day)}
				>
					<div class="flex items-center justify-between gap-2">
						<span class={cn('text-xs font-semibold', selected ? 'text-fg' : 'text-fg-muted')}>
							{day.toLocaleDateString(undefined, { weekday: 'short' })}
							<span class="ml-1 tabular-nums">{day.getDate()}</span>
						</span>
						{#if isToday}
							<span class="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-fg">
								Today
							</span>
						{:else if events.length}
							<span class="text-[10px] font-medium text-fg-subtle tabular-nums">
								{events.length}
							</span>
						{/if}
					</div>
					<p class={cn('truncate text-[11px]', selected ? 'text-fg' : 'text-fg-muted')}>
						{daySummary(day)}
					</p>
					{#if selected && events.length}
						<ul class="mt-1 space-y-1 border-t border-border/60 pt-1.5">
							{#each events.slice(0, 3) as event (event.id)}
								<li class="truncate text-[11px] text-fg-muted">
									<span class="text-fg-subtle">{formatEventTime(event)}</span>
									<span class="ml-1">{event.title || 'Untitled event'}</span>
								</li>
							{/each}
							{#if events.length > 3}
								<li class="text-[10px] text-fg-subtle">+{events.length - 3} more</li>
							{/if}
						</ul>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</nav>
