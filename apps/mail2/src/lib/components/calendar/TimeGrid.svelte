<script lang="ts">
	import type { CalendarEvent } from '@zaur/mail-core';
	import { isSameDay } from '@zaur/mail-core/utils/dates';
	import { eventsOnDay, percentOfDay, placeDay } from '#lib/calendar/schedule';

	/**
	 * A day drawn as a column of hours — one column for the day view, seven for
	 * the week. The hours are a repeating gradient rather than twenty-four
	 * elements, events are placed by percentage of the day, and the ones that
	 * overlap share the width. Clicking empty air at 14:00 starts an event at
	 * 14:00, which is the whole reason to draw a grid instead of a list.
	 */
	let {
		days,
		events,
		colorOf,
		selected,
		onSelectDay,
		onOpen,
		onCreate
	}: {
		days: Date[];
		events: CalendarEvent[];
		colorOf: (event: CalendarEvent) => string;
		selected: Date;
		onSelectDay: (day: Date) => void;
		onOpen: (event: CalendarEvent) => void;
		/** Empty air was claimed: a new event at this moment. */
		onCreate: (start: Date) => void;
	} = $props();

	const HOUR_PX = 48;
	const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

	const timeShort = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
	const hourLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
	const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

	// The now line moves; nothing else here does. A minute is close enough.
	let now = $state(new Date());
	$effect(() => {
		const tick = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(tick);
	});

	const columns = $derived(`54px repeat(${days.length}, minmax(0, 1fr))`);
	const allDayByDay = $derived(
		days.map((day) => eventsOnDay(events, day).filter((event) => event.allDay))
	);
	const hasAllDay = $derived(allDayByDay.some((list) => list.length > 0));

	/** Open the grid on the working day, not on midnight. */
	let scroller = $state<HTMLDivElement | null>(null);
	let scrolled = false;
	$effect(() => {
		if (!scroller || scrolled) return;
		scrolled = true;
		scroller.scrollTop = 7.5 * HOUR_PX;
	});

	function claim(event: MouseEvent, day: Date) {
		if (event.target !== event.currentTarget) return;
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const minutes = Math.floor((((event.clientY - box.top) / box.height) * 1440) / 30) * 30;
		onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes));
	}
</script>

<!--
	Everything scrolls in one box. The day headings and the all-day row used to
	sit outside it, which meant they were laid out across the full width while
	the hour grid lost a classic scrollbar's worth — so the columns drifted
	apart, up to 13px by Sunday. Inside, all three share one content width and
	alignment stops depending on how the platform draws its scrollbars. They
	stick to the top on the way down, which is what you want anyway.
-->
<div class="min-h-0 flex-1 overflow-y-auto" bind:this={scroller}>
	<div class="sticky top-0 z-[4] bg-[var(--z-surface)]">
		{#if days.length > 1}
			<div class="grid border-b border-[var(--z-hairline)]" style:grid-template-columns={columns}>
				<div></div>
				{#each days as day (day.getTime())}
					{@const isToday = isSameDay(day, now)}
					<button
						type="button"
						class="flex items-baseline justify-center gap-1.5 border-l border-[var(--z-sunken)] py-1.5 transition-colors hover:bg-[var(--z-hover)] {isSameDay(day, selected) ? 'bg-[var(--z-accent-faint)]' : ''}"
						onclick={() => onSelectDay(day)}
					>
						<span class="z-caption">{weekdayShort.format(day)}</span>
						<span
							class="flex size-[22px] items-center justify-center rounded-[6px] text-[13px] tabular-nums {isToday
								? 'bg-[var(--z-accent)] font-bold text-[var(--z-accent-fg)]'
								: 'font-semibold text-[var(--z-strong)]'}"
						>
							{day.getDate()}
						</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if hasAllDay}
			<div
				class="grid max-h-[84px] overflow-y-auto border-b border-[var(--z-hairline)] bg-[var(--z-canvas)]"
				style:grid-template-columns={columns}
			>
				<div class="z-caption flex items-start justify-end px-2 py-1.5 text-[9.5px] tracking-[0.03em] whitespace-nowrap">
					All day
				</div>
				{#each days as day, index (day.getTime())}
					<div class="flex flex-col gap-0.5 border-l border-[var(--z-sunken)] p-1">
						{#each allDayByDay[index] as event (event.id)}
							<button
								type="button"
								class="z-event w-full"
								style:--z-rail={colorOf(event)}
								onclick={() => onOpen(event)}
								title={event.title}
							>
								<span class="truncate">{event.title}</span>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div
		class="relative grid"
		style:grid-template-columns={columns}
		style:--z-hour="{HOUR_PX}px"
		style:height="{24 * HOUR_PX}px"
	>
		<div class="relative">
			{#each HOURS.slice(1) as hour (hour)}
				<span
					class="z-mono absolute right-2 -translate-y-1/2 text-[10.5px] text-[var(--z-soft)]"
					style:top="{(hour / 24) * 100}%"
				>
					{hourLabel.format(new Date(2026, 0, 1, hour))}
				</span>
			{/each}
		</div>

		{#each days as day (day.getTime())}
			{@const isToday = isSameDay(day, now)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				role="gridcell"
				tabindex="0"
				aria-label={day.toDateString()}
				class="z-hours relative border-l border-[var(--z-sunken)] {isSameDay(day, selected) && days.length > 1
					? 'bg-[var(--z-accent-faint)]'
					: ''}"
				onclick={(clicked) => claim(clicked, day)}
				onkeydown={(pressed) => {
					if (pressed.key === 'Enter')
						onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0));
				}}
			>
				{#each placeDay(events, day) as item (item.event.id)}
					<button
						type="button"
						class="z-event absolute z-[1]"
						style:--z-rail={colorOf(item.event)}
						style:top="{item.top}%"
						style:height="{item.height}%"
						style:left="{(item.lane / item.lanes) * 100}%"
						style:width="calc({100 / item.lanes}% - 3px)"
						data-continues-before={item.continuesBefore || undefined}
						data-continues-after={item.continuesAfter || undefined}
						onclick={() => onOpen(item.event)}
						title="{item.event.title} · {timeShort.format(item.event.start)}"
					>
						<span class="truncate">{item.event.title}</span>
						<!-- A shared lane in a week column is too narrow for a title and a time both. -->
						{#if item.lanes === 1 || days.length === 1}
							<span class="z-mono ml-auto shrink-0 text-[10px] opacity-70">
								{timeShort.format(item.event.start)}
							</span>
						{/if}
					</button>
				{/each}

				{#if isToday}
					<div class="z-now" style:top="{percentOfDay(now)}%"></div>
				{/if}
			</div>
		{/each}
	</div>
</div>
