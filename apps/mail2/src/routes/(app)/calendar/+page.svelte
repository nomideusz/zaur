<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { isRecurringInstance } from '@zaur/mail-core';
	import {
		addDays,
		formatEventTime,
		formatJmapQueryBound,
		formatMonthTitle,
		formatWeekRange,
		isSameDay,
		isSameMonth,
		monthGrid,
		weekDays,
		weekdayLabels
	} from '@zaur/mail-core/utils/dates';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import EventEditor, { type EventDraft } from '#lib/components/calendar/EventEditor.svelte';
	import CalendarList from '#lib/components/calendar/CalendarList.svelte';
	import TimeGrid from '#lib/components/calendar/TimeGrid.svelte';
	import { eventsOnDay, shiftMonth, startOfDay } from '#lib/calendar/schedule';
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

	type View = 'day' | 'week' | 'month';
	const VIEWS: { value: View; label: string; short: string }[] = [
		{ value: 'day', label: 'Day', short: 'D' },
		{ value: 'week', label: 'Week', short: 'W' },
		{ value: 'month', label: 'Month', short: 'M' }
	];

	const today = startOfDay(new Date());
	/** One date drives all three views: the day in focus. */
	let anchor = $state(today);
	let view = $state<View>('week');

	let phone = $state(false);
	$effect(() => {
		const narrow = window.matchMedia('(max-width: 639px)');
		const sync = () => (phone = narrow.matches);
		sync();
		// Seven columns do not fit on a phone; the day does. Only on the way in —
		// after that the switcher is the person's, whatever size the screen is.
		if (narrow.matches) view = 'day';
		narrow.addEventListener('change', sync);
		return () => narrow.removeEventListener('change', sync);
	});

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	const labels = weekdayLabels('monday');
	const month = $derived(monthGrid(anchor.getFullYear(), anchor.getMonth(), 'monday'));
	/** The days the current view is asking about — and, for month, the grid itself. */
	const span = $derived(
		view === 'month' ? month : view === 'week' ? weekDays(anchor, 'monday') : [anchor]
	);
	const range = $derived({
		after: formatJmapQueryBound(span[0]!),
		before: formatJmapQueryBound(addDays(span[span.length - 1]!, 1)),
		timeZone
	});

	function step(delta: number) {
		anchor =
			view === 'month'
				? shiftMonth(anchor, delta)
				: addDays(anchor, view === 'week' ? 7 * delta : delta);
	}

	// A phone shows Day and Month only: seven columns at 50px each is not a week,
	// and the two segments it saves are what the date in the header needs.
	const views = $derived(
		phone ? VIEWS.filter((option) => option.value !== 'week' || view === 'week') : VIEWS
	);

	const title = $derived(
		view === 'month'
			? formatMonthTitle(anchor.getFullYear(), anchor.getMonth())
			: view === 'week'
				? formatWeekRange(anchor, 'monday')
				: anchor.toLocaleDateString(
						undefined,
						// A phone header has no room for "Saturday, September 19".
						phone
							? { weekday: 'short', day: 'numeric', month: 'short' }
							: { weekday: 'long', day: 'numeric', month: 'long' }
					)
	);

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
	const agenda = $derived(eventsOnDay(visibleEvents, anchor));

	function colorOf(event: CalendarEvent): string {
		return calendarById.get(event.calendarIds[0] ?? '')?.color ?? 'var(--z-accent)';
	}

	/* ── Editing ──────────────────────────────────────────────────────── */

	let mode = $state<'view' | 'new' | 'edit'>('view');
	let editing = $state<CalendarEvent | null>(null);
	/** What a new event opens on — a day, or the exact slot that was clicked. */
	let draftAt = $state(today);
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

	function startNew(at: Date = anchor) {
		anchor = startOfDay(at);
		draftAt = at;
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

	let addingCalendar = $state(false);
	async function addCalendar(name: string) {
		addingCalendar = true;
		try {
			await createCalendar({ name });
			flash('Calendar created');
		} catch (cause) {
			flash(messageOf(cause, 'Could not create the calendar'));
		} finally {
			addingCalendar = false;
		}
	}

	const timeShort = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
	const dayTitle = $derived(
		anchor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
	);
	const editorOpen = $derived(mode !== 'view');
	/** The month grid needs the day's list beside it; the time grid is already one. */
	const railOpen = $derived(editorOpen || view === 'month');
</script>

<svelte:head><title>Calendar · Zaur Mail</title></svelte:head>

<SectionShell title="Calendar">
	{#snippet controls()}
		<div class="z-group shrink-0" role="group" aria-label="View">
			{#each views as option (option.value)}
				<button
					type="button"
					class="z-segment !px-2.5 max-sm:!px-2"
					aria-pressed={view === option.value}
					onclick={() => (view = option.value)}
				>
					<span class="max-sm:hidden">{option.label}</span>
					<span class="sm:hidden">{option.short}</span>
				</button>
			{/each}
		</div>

		<div
			class="flex min-w-0 items-center rounded-[6px] border border-[var(--z-line)] bg-[var(--z-surface)] shadow-[var(--z-shadow-tactile)]"
		>
			<button
				type="button"
				class="flex h-[30px] w-7 shrink-0 items-center justify-center rounded-l-[5px] border-r border-[var(--z-line)] text-[var(--z-strong)] hover:bg-[var(--z-hover)]"
				onclick={() => step(-1)}
				aria-label="Previous"
			>
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
			<button
				type="button"
				class="h-[30px] min-w-[170px] max-w-[42vw] truncate bg-[var(--z-sunken)] px-3 text-[13px] font-semibold text-[var(--z-ink)] max-md:min-w-0 max-sm:px-1.5"
				onclick={() => (anchor = today)}
				title="Back to today"
			>
				{title}
			</button>
			<button
				type="button"
				class="flex h-[30px] w-7 shrink-0 items-center justify-center rounded-r-[5px] border-l border-[var(--z-line)] text-[var(--z-strong)] hover:bg-[var(--z-hover)]"
				onclick={() => step(1)}
				aria-label="Next"
			>
				<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</button>
		</div>

		<button
			type="button"
			class="btn-tactile shrink-0 gap-1.5"
			onclick={() => startNew()}
			disabled={!calendarsState?.supported}
		>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
			<span class="max-md:sr-only">New event</span>
		</button>
	{/snippet}

	<div class="flex min-h-0 flex-1">
		<!-- Calendars -->
		<aside
			class="flex w-[240px] shrink-0 flex-col border-r border-[var(--z-line)] bg-[var(--z-surface)] max-lg:hidden"
			aria-label="Calendars"
		>
			{#if calendarsResource?.error}
				<p class="px-5 py-4 text-[12.5px] text-[var(--z-ch-discard-ink)]">Could not load calendars.</p>
			{:else if !calendarsState}
				<ul class="space-y-1 px-3 py-4">
					{#each [1, 2] as n (n)}<li class="z-skeleton h-[32px] rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
				</ul>
			{:else if !calendarsState.supported}
				<p class="px-5 py-4 text-[12.5px] leading-relaxed text-[var(--z-soft)]">
					This mail server does not offer calendars over JMAP.
				</p>
			{:else}
				<CalendarList
					calendars={calendarList}
					primaryAccountId={calendarsState.primaryAccountId}
					onToggle={toggleCalendar}
					onAdd={addCalendar}
					adding={addingCalendar}
				/>
			{/if}
		</aside>

		<!-- The view -->
		<div class="flex min-w-0 flex-1 flex-col {editorOpen ? 'max-md:hidden' : ''}">
			{#if notice}
				<p
					class="border-b border-[var(--z-hairline)] bg-[var(--z-hover)] px-4 py-1.5 text-[12px] font-medium text-[var(--z-muted)]"
					role="status"
				>
					{notice}
				</p>
			{/if}

			{#if view === 'month'}
				<div class="grid grid-cols-7 border-b border-[var(--z-hairline)]">
					{#each labels as label (label)}
						<div class="z-caption px-2 py-1.5 text-center">{label}</div>
					{/each}
				</div>
				<div
					class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto"
					role="grid"
					aria-label={title}
				>
					{#each month as day (day.getTime())}
						{@const inMonth = isSameMonth(day, anchor.getFullYear(), anchor.getMonth())}
						{@const isToday = isSameDay(day, today)}
						{@const isSelected = isSameDay(day, anchor)}
						{@const items = eventsOnDay(visibleEvents, day)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							role="gridcell"
							tabindex="0"
							aria-selected={isSelected}
							class="flex min-h-[84px] flex-col gap-0.5 border-r border-b border-[var(--z-sunken)] p-1 text-left transition-colors {isSelected
								? 'bg-[var(--z-accent-faint)]'
								: inMonth
									? 'bg-[var(--z-surface)]'
									: 'bg-[var(--z-hover)]/60'} hover:bg-[var(--z-hover)]"
							onclick={() => (anchor = day)}
							ondblclick={() => startNew(day)}
							onkeydown={(pressed) => {
								if (pressed.key === 'Enter') startNew(day);
							}}
						>
							<span
								class="flex size-6 items-center justify-center self-end rounded-[6px] text-[12px] tabular-nums {isToday
									? 'bg-[var(--z-accent)] font-bold text-[var(--z-accent-fg)]'
									: inMonth
										? 'font-medium text-[var(--z-strong)]'
										: 'text-[var(--z-faint)]'}"
							>
								{day.getDate()}
							</span>
							{#each items.slice(0, 3) as event (event.id)}
								<button
									type="button"
									class="z-event w-full"
									style:--z-rail={colorOf(event)}
									onclick={(clicked) => {
										clicked.stopPropagation();
										anchor = day;
										startEdit(event);
									}}
									title={event.title}
								>
									<!-- A phone's month column is 55px: the title is worth more than the time. -->
									{#if !event.allDay}
										<span class="z-mono shrink-0 text-[10px] opacity-70 max-sm:hidden">
											{timeShort.format(event.start)}
										</span>
									{/if}
									<span class="truncate">{event.title}</span>
								</button>
							{/each}
							{#if items.length > 3}
								<button
									type="button"
									class="px-1 text-left text-[11px] whitespace-nowrap text-[var(--z-soft)] hover:text-[var(--z-ink)]"
									onclick={(clicked) => {
										clicked.stopPropagation();
										anchor = day;
										view = 'day';
									}}
								>
									+{items.length - 3}<span class="max-sm:hidden">&nbsp;more</span>
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<TimeGrid
					days={span}
					events={visibleEvents}
					{colorOf}
					selected={anchor}
					onSelectDay={(day) => {
						anchor = day;
						view = 'day';
					}}
					onOpen={startEdit}
					onCreate={startNew}
				/>
			{/if}
		</div>

		<!-- The day, or the editor -->
		{#if railOpen}
			<div
				class="flex w-[380px] shrink-0 flex-col border-l border-[var(--z-hairline)] max-md:w-full max-md:border-l-0 {editorOpen
					? ''
					: 'max-md:hidden'}"
			>
				{#if editorOpen && calendarsState}
					<EventEditor
						event={mode === 'edit' ? editing : null}
						day={draftAt}
						calendars={calendarList}
						{saving}
						error={editorError}
						onSave={save}
						onDelete={mode === 'edit' && editing ? () => remove(editing!) : undefined}
						onCancel={() => {
							mode = 'view';
							editing = null;
						}}
					/>
				{:else}
					<div class="flex items-center justify-between gap-2 border-b border-[var(--z-hairline)] px-4 py-3">
						<h2 class="min-w-0 truncate text-[14px] font-semibold text-[var(--z-ink)]">{dayTitle}</h2>
						<button
							type="button"
							class="btn-tactile !h-[28px] shrink-0 text-[12px]"
							onclick={() => startNew()}
							disabled={!calendarsState?.supported}
						>
							New event
						</button>
					</div>
					<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
						{#if eventsResource?.error}
							<p class="text-[13px] text-[var(--z-ch-discard-ink)]">
								Could not load events.
								<button type="button" class="underline" onclick={() => eventsResource?.refresh()}>Retry</button>
							</p>
						{:else if eventsResource?.loading && !eventsResource.current}
							<ul class="space-y-2">
								{#each [1, 2, 3] as n (n)}<li class="z-skeleton h-[52px] rounded-[8px] bg-[var(--z-sunken)]"></li>{/each}
							</ul>
						{:else if agenda.length === 0}
							<p class="py-6 text-center text-[13px] text-[var(--z-faint)]">Nothing on this day.</p>
						{:else}
							<ul class="space-y-2" role="list">
								{#each agenda as event (event.id)}
									<li>
										<button
											type="button"
											class="z-event w-full !flex-col !items-stretch !gap-0.5 !rounded-[8px] !px-3 !py-2"
											style:--z-rail={colorOf(event)}
											onclick={() => startEdit(event)}
										>
											<span class="text-[13.5px] font-semibold">{event.title}</span>
											<span class="text-[12px] opacity-80">{formatEventTime(event)}</span>
											{#if event.location}
												<span class="truncate text-[12px] opacity-70">{event.location}</span>
											{/if}
											<span class="text-[11px] opacity-60">
												{calendarById.get(event.calendarIds[0] ?? '')?.name ?? ''}{isRecurringInstance(event)
													? ' · Repeats'
													: ''}
											</span>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</SectionShell>
