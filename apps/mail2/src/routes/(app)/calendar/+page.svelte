<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { isRecurringInstance } from '@zaur/mail-core';
	import {
		addDays,
		formatEventTime,
		formatJmapQueryBound,
		formatMonthTitle,
		isSameDay,
		isSameMonth,
		monthGrid,
		weekdayLabels
	} from '@zaur/mail-core/utils/dates';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import EventEditor, { type EventDraft } from '#lib/components/calendar/EventEditor.svelte';
	import { LiveUpdates } from '#lib/mail/live';
	import { whoami } from '../../session.remote';
	import {
		calendars as calendarsRemote,
		events as eventsRemote,
		createEvent,
		updateEvent,
		deleteEvent,
		setCalendarVisible,
		createCalendar
	} from '../../calendar.remote';

	const session = $derived(whoami()?.current ?? null);

	$effect(() => {
		const current = whoami()?.current;
		if (whoami().ready && !current) goto('/login', { replaceState: true });
	});

	/* ── Where we are looking ─────────────────────────────────────────── */

	const today = new Date();
	let year = $state(today.getFullYear());
	let month = $state(today.getMonth());
	let selectedDay = $state<Date>(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	const grid = $derived(monthGrid(year, month, 'monday'));
	const labels = weekdayLabels('monday');
	const range = $derived({
		after: formatJmapQueryBound(grid[0]!),
		before: formatJmapQueryBound(addDays(grid[grid.length - 1]!, 1)),
		timeZone
	});

	function step(delta: number) {
		const next = new Date(year, month + delta, 1);
		year = next.getFullYear();
		month = next.getMonth();
	}

	function goToday() {
		year = today.getFullYear();
		month = today.getMonth();
		selectedDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	}

	/* ── Data ─────────────────────────────────────────────────────────── */

	const calendarsResource = $derived(session ? calendarsRemote() : undefined);
	const calendarsState = $derived(calendarsResource?.current ?? null);
	const calendarList = $derived(calendarsState?.calendars ?? []);
	const eventsResource = $derived(session && calendarsState?.supported ? eventsRemote(range) : undefined);

	// Push: a change made on the phone shows up here.
	$effect(() => {
		if (!session) return;
		const live = new LiveUpdates();
		live.start(({ calendar }) => {
			if (calendar) {
				void calendarsResource?.refresh();
				void eventsResource?.refresh();
			}
		});
		return () => live.stop();
	});

	const calendarById = $derived(new Map(calendarList.map((calendar) => [calendar.id, calendar])));
	const visibleEvents = $derived(
		(eventsResource?.current ?? []).filter((event) =>
			event.calendarIds.some((id) => calendarById.get(id)?.isVisible !== false)
		)
	);

	/** Events touching a day, all-day first then by start. */
	function eventsOn(day: Date): CalendarEvent[] {
		const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
		const dayEnd = dayStart + 86_400_000;
		return visibleEvents
			.filter((event) => event.start.getTime() < dayEnd && event.end.getTime() > dayStart)
			.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
	}
	const agenda = $derived(eventsOn(selectedDay));

	function colorOf(event: CalendarEvent): string {
		return calendarById.get(event.calendarIds[0] ?? '')?.color ?? '#2563eb';
	}

	/* ── Editing ──────────────────────────────────────────────────────── */

	let mode = $state<'view' | 'new' | 'edit'>('view');
	let editing = $state<CalendarEvent | null>(null);
	let saving = $state(false);
	let editorError = $state<string | null>(null);
	let notice = $state<string | null>(null);

	function flash(text: string) {
		notice = text;
		setTimeout(() => (notice = null), 2500);
	}

	function messageOf(cause: unknown, fallback: string): string {
		if (cause && typeof cause === 'object' && 'body' in cause) {
			const body = (cause as { body?: { message?: string } }).body;
			if (body?.message) return body.message;
		}
		return cause instanceof Error && cause.message ? cause.message : fallback;
	}

	function startNew(day = selectedDay) {
		selectedDay = day;
		editing = null;
		editorError = null;
		mode = 'new';
	}

	function startEdit(event: CalendarEvent) {
		editing = event;
		editorError = null;
		mode = 'edit';
	}

	async function save(draft: EventDraft) {
		saving = true;
		editorError = null;
		const calendar = calendarById.get(draft.calendarId);
		try {
			if (mode === 'edit' && editing) {
				await updateEvent({
					id: editing.id,
					accountId: editing.accountId,
					previousCalendarIds: editing.calendarIds,
					timeZone,
					...draft
				});
				flash('Event saved');
			} else {
				await createEvent({ accountId: calendar?.accountId ?? null, timeZone, ...draft });
				flash('Event created');
			}
			await eventsResource?.refresh();
			mode = 'view';
			editing = null;
		} catch (cause) {
			editorError = messageOf(cause, 'The event could not be saved.');
		} finally {
			saving = false;
		}
	}

	async function remove(event: CalendarEvent) {
		const series = isRecurringInstance(event);
		const prompt = series
			? `Delete every occurrence of “${event.title}”? Repeating events are deleted as a series.`
			: `Delete “${event.title}”?`;
		if (!confirm(prompt)) return;
		saving = true;
		try {
			await deleteEvent({ id: series ? event.baseEventId! : event.id, accountId: event.accountId });
			await eventsResource?.refresh();
			mode = 'view';
			editing = null;
			flash('Event deleted');
		} catch (cause) {
			editorError = messageOf(cause, 'The event could not be deleted.');
		} finally {
			saving = false;
		}
	}

	async function toggleCalendar(calendar: Calendar, visible: boolean) {
		try {
			await setCalendarVisible({ id: calendar.id, accountId: calendar.accountId, visible });
		} catch (cause) {
			flash(messageOf(cause, 'Could not update the calendar'));
		}
	}

	let newCalendarName = $state('');
	let addingCalendar = $state(false);
	async function addCalendar() {
		const name = newCalendarName.trim();
		if (!name) return;
		addingCalendar = true;
		try {
			await createCalendar({ name });
			newCalendarName = '';
			flash('Calendar created');
		} catch (cause) {
			flash(messageOf(cause, 'Could not create the calendar'));
		} finally {
			addingCalendar = false;
		}
	}

	const timeShort = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
	const dayTitle = $derived(
		selectedDay.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
	);
	const editorOpen = $derived(mode !== 'view');
</script>

<svelte:head><title>Calendar · Zaur Mail</title></svelte:head>

<SectionShell title="Calendar">
	{#snippet controls()}
		<div class="flex items-center rounded-[6px] border border-[#cbd5e1] bg-white shadow-2xs">
			<button type="button" class="flex h-[30px] w-7 items-center justify-center rounded-l-[5px] border-r border-[#cbd5e1] text-slate-700 hover:bg-slate-50" onclick={() => step(-1)} aria-label="Previous month">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
			<button type="button" class="h-[30px] min-w-[150px] bg-slate-100 px-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-200/70 max-md:min-w-0" onclick={goToday} title="Back to today">
				{formatMonthTitle(year, month)}
			</button>
			<button type="button" class="flex h-[30px] w-7 items-center justify-center rounded-r-[5px] border-l border-[#cbd5e1] text-slate-700 hover:bg-slate-50" onclick={() => step(1)} aria-label="Next month">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
		</div>
		<button type="button" class="btn-tactile gap-1.5" onclick={() => startNew()} disabled={!calendarsState?.supported}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
			<span class="max-md:sr-only">New event</span>
		</button>
	{/snippet}

	<div class="flex min-h-0 flex-1">
		<!-- Calendars -->
		<aside class="flex w-[240px] shrink-0 flex-col border-r border-[#cbd5e1] bg-white max-lg:hidden" aria-label="Calendars">
			<div class="flex-1 overflow-y-auto px-4 py-4">
				<h2 class="z-caption mb-2 px-2">Your calendars</h2>
				{#if calendarsResource?.error}
					<p class="px-2 text-[12.5px] text-red-600">Could not load calendars.</p>
				{:else if !calendarsState}
					<ul class="space-y-1">{#each [1, 2] as n (n)}<li class="h-[32px] animate-pulse rounded-[8px] bg-slate-100"></li>{/each}</ul>
				{:else if !calendarsState.supported}
					<p class="px-2 text-[12.5px] leading-relaxed text-slate-500">This mail server does not offer calendars over JMAP.</p>
				{:else}
					<ul class="space-y-0.5" role="list">
						{#each calendarList as calendar (calendar.accountId + calendar.id)}
							<li>
								<label class="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13.5px] font-medium text-slate-800 hover:bg-slate-50">
									<input type="checkbox" class="z-check" style:--z-check={calendar.color} checked={calendar.isVisible} onchange={(e) => toggleCalendar(calendar, e.currentTarget.checked)} />
									<span class="size-2.5 shrink-0 rounded-full" style:background-color={calendar.color}></span>
									<span class="truncate">{calendar.name}</span>
								</label>
							</li>
						{/each}
					</ul>
					<form class="mt-3 flex items-center gap-1.5 px-1" onsubmit={(e) => { e.preventDefault(); void addCalendar(); }}>
						<input class="z-field min-w-0 flex-1 !h-[28px] text-[12.5px]" placeholder="New calendar" bind:value={newCalendarName} maxlength="200" />
						<button type="submit" class="btn-tactile !h-[28px] text-[12px]" disabled={addingCalendar || !newCalendarName.trim()}>Add</button>
					</form>
				{/if}
			</div>
		</aside>

		<!-- Month grid -->
		<div class="flex min-w-0 flex-1 flex-col {editorOpen ? 'max-md:hidden' : ''}">
			{#if notice}
				<p class="border-b border-[#e2e8f0] bg-slate-50 px-4 py-1.5 text-[12px] font-medium text-slate-600" role="status">{notice}</p>
			{/if}
			<div class="grid grid-cols-7 border-b border-[#e2e8f0]">
				{#each labels as label (label)}
					<div class="z-caption px-2 py-1.5 text-center">{label}</div>
				{/each}
			</div>
			<div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto" role="grid" aria-label={formatMonthTitle(year, month)}>
				{#each grid as day (day.getTime())}
					{@const inMonth = isSameMonth(day, year, month)}
					{@const isToday = isSameDay(day, today)}
					{@const isSelected = isSameDay(day, selectedDay)}
					{@const items = eventsOn(day)}
					<div
						role="gridcell"
						tabindex="0"
						aria-selected={isSelected}
						class="flex min-h-[84px] flex-col gap-0.5 border-r border-b border-[#f1f5f9] p-1 text-left transition-colors {isSelected ? 'bg-[#f5f9ff]' : inMonth ? 'bg-white' : 'bg-slate-50/60'} hover:bg-slate-50"
						onclick={() => (selectedDay = day)}
						ondblclick={() => startNew(day)}
						onkeydown={(e) => { if (e.key === 'Enter') startNew(day); }}
					>
						<span class="flex size-6 items-center justify-center self-end rounded-[6px] text-[12px] tabular-nums {isToday ? 'bg-blue-600 font-bold text-white' : inMonth ? 'font-medium text-slate-700' : 'text-slate-400'}">
							{day.getDate()}
						</span>
						{#each items.slice(0, 3) as event (event.id)}
							<button
								type="button"
								class="z-railed truncate rounded-[4px] py-0.5 pr-1 pl-2 text-left text-[11.5px] font-medium text-slate-800 hover:bg-slate-100"
								style:--z-rail={colorOf(event)}
								style:--z-rail-inset="2px"
								onclick={(e) => { e.stopPropagation(); selectedDay = day; startEdit(event); }}
								title={event.title}
							>
								{#if !event.allDay}<span class="mr-1 text-slate-500 tabular-nums">{timeShort.format(event.start)}</span>{/if}{event.title}
							</button>
						{/each}
						{#if items.length > 3}
							<span class="px-1 text-[11px] text-slate-400">+{items.length - 3} more</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Agenda / editor -->
		<div class="flex w-[380px] shrink-0 flex-col border-l border-[#e2e8f0] max-md:w-full max-md:border-l-0 {editorOpen ? '' : 'max-md:hidden'}">
			{#if editorOpen && calendarsState}
				<EventEditor
					event={mode === 'edit' ? editing : null}
					day={selectedDay}
					calendars={calendarList}
					{saving}
					error={editorError}
					onSave={save}
					onDelete={mode === 'edit' && editing ? () => remove(editing!) : undefined}
					onCancel={() => { mode = 'view'; editing = null; }}
				/>
			{:else}
				<div class="flex items-center justify-between gap-2 border-b border-[#e2e8f0] px-4 py-3">
					<h2 class="min-w-0 truncate text-[14px] font-semibold text-slate-900">{dayTitle}</h2>
					<button type="button" class="btn-tactile !h-[28px] shrink-0 text-[12px]" onclick={() => startNew()} disabled={!calendarsState?.supported}>New event</button>
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					{#if eventsResource?.error}
						<p class="text-[13px] text-red-600">Could not load events. <button type="button" class="underline" onclick={() => eventsResource?.refresh()}>Retry</button></p>
					{:else if eventsResource?.loading && !eventsResource.current}
						<ul class="space-y-2">{#each [1, 2, 3] as n (n)}<li class="h-[52px] animate-pulse rounded-[8px] bg-slate-100"></li>{/each}</ul>
					{:else if agenda.length === 0}
						<p class="py-6 text-center text-[13px] text-slate-400">Nothing on this day.</p>
					{:else}
						<ul class="space-y-2" role="list">
							{#each agenda as event (event.id)}
								<li>
									<button
										type="button"
										class="z-railed z-hue-wash flex w-full flex-col gap-0.5 rounded-[8px] border px-3 py-2 pl-4 text-left hover:brightness-[0.98]"
										style:--z-rail={colorOf(event)}
										onclick={() => startEdit(event)}
									>
										<span class="text-[13.5px] font-semibold text-slate-900">{event.title}</span>
										<span class="text-[12px] text-slate-600">{formatEventTime(event)}</span>
										{#if event.location}<span class="truncate text-[12px] text-slate-500">{event.location}</span>{/if}
										{#if isRecurringInstance(event)}<span class="text-[11px] text-slate-400">Repeats</span>{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</SectionShell>
