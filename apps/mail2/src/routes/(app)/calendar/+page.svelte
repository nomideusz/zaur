<script lang="ts">
	import { goto } from '$app/navigation';
	import { Calendar as CalendarGrid } from '@nomideusz/svelte-calendar';
	import type { CalendarViewId, TimelineEvent } from '@nomideusz/svelte-calendar';
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { isRecurringInstance } from '@zaur/mail-core';
	import {
		addDays,
		durationBetween,
		formatEventTime,
		formatJmapQueryBound,
		formatMonthTitle,
		formatWeekRange,
		monthGrid,
		toDateInputValue,
		weekDays
	} from '@zaur/mail-core/utils/dates';
	import SectionShell from '#lib/components/mail/SectionShell.svelte';
	import EventEditor, { type EventDraft } from '#lib/components/calendar/EventEditor.svelte';
	import CalendarList from '#lib/components/calendar/CalendarList.svelte';
	import { eventsOnDay, shiftMonth, startOfDay } from '#lib/calendar/schedule';
	import { ZAUR_THEME, sourceOf, toTimelineEvent } from '#lib/calendar/bridge';
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

	/**
	 * The grid owns direct manipulation — drag to move, drag an edge to resize,
	 * sweep empty canvas to create — and we keep the chrome: the shell's own
	 * tactile view switcher and date nav drive it through `view` and
	 * `currentDate`, so the header is ours and the geometry is the package's.
	 */
	type View = 'day' | 'week' | 'roll' | 'month';
	const VIEWS: { value: View; label: string; short: string; id: CalendarViewId }[] = [
		{ value: 'day', label: 'Day', short: 'D', id: 'day-planner' },
		{ value: 'week', label: 'Week', short: 'W', id: 'week-planner' },
		{ value: 'roll', label: 'Roll', short: 'R', id: 'week-scroll' },
		{ value: 'month', label: 'Month', short: 'M', id: 'month-grid' }
	];

	const today = startOfDay(new Date());
	let anchor = $state(today);
	let view = $state<View>('week');
	const viewId = $derived(VIEWS.find((option) => option.value === view)!.id);
	// The roll view moves the grid's own focus to its centre week's Monday. A
	// fresh Date per view switch makes the grid take the anchor again, so the
	// next view opens on the day we kept, not the one the roll drifted to.
	const gridDate = $derived(view && new Date(anchor));

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

	// A phone shows Day and Month only: seven columns at 50px each is not a week,
	// and the segments it saves are what the date in the header needs.
	const views = $derived(
		phone ? VIEWS.filter((option) => option.value === 'day' || option.value === 'month' || option.value === view) : VIEWS
	);

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	const month = $derived(monthGrid(anchor.getFullYear(), anchor.getMonth(), 'monday'));
	/** The days the current view is asking the server about. */
	const span = $derived(
		view === 'month' ? month : view === 'day' ? [anchor] : weekDays(anchor, 'monday')
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
				: addDays(anchor, view === 'day' ? delta : 7 * delta);
	}

	const title = $derived(
		view === 'month'
			? formatMonthTitle(anchor.getFullYear(), anchor.getMonth())
			: view === 'day'
				? anchor.toLocaleDateString(
						undefined,
						// A phone header has no room for "Saturday, September 19".
						phone
							? { weekday: 'short', day: 'numeric', month: 'short' }
							: { weekday: 'long', day: 'numeric', month: 'long' }
					)
				: formatWeekRange(anchor, 'monday')
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
				void reload();
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

	/**
	 * The grid asks for the range it is actually drawing, which is the only
	 * honest contract: the week planner wants a week, the roll wants the ±8
	 * weeks it buffers. Remote queries are cached per range, so the day list
	 * beside a month and the grid behind it resolve to one request.
	 *
	 * Rebuilt whenever the calendars' visibility changes or a write lands —
	 * the grid reloads on a new adapter, and that is the only handle it gives.
	 */
	let gridHeight = $state(0);
	let dataVersion = $state(0);
	/**
	 * The bounds the grid last asked for. A remote query caches per argument, so
	 * refreshing the day list's copy leaves the grid's own copy stale — after a
	 * write both have to be told, and this is which one the grid holds.
	 * Plain, not `$state`: the adapter writes it from inside the grid's own
	 * load effect, and a signal there would feed back into that effect.
	 */
	let gridRange: { after: string; before: string; timeZone: string } | null = null;
	const adapter = $derived.by(() => {
		const by = calendarById;
		dataVersion;
		return {
			async fetchEvents(range: { start: Date; end: Date }) {
				const bounds = {
					after: formatJmapQueryBound(range.start),
					before: formatJmapQueryBound(range.end),
					timeZone
				};
				gridRange = bounds;
				const list = await eventsRemote(bounds);
				return list
					.filter((event) => event.calendarIds.some((id) => by.get(id)?.isVisible !== false))
					.map((event) => toTimelineEvent(event, colorOf(event)));
			}
		};
	});

	/** Put the server's answer back in front of both the grid and the day list. */
	async function reload() {
		await Promise.all([
			eventsResource?.refresh(),
			gridRange ? eventsRemote(gridRange).refresh() : null
		]);
		dataVersion++;
	}

	/* ── Editing ──────────────────────────────────────────────────────── */

	let mode = $state<'view' | 'new' | 'edit'>('view');
	let editing = $state<CalendarEvent | null>(null);
	/** What a new event opens on — a day, or the exact slot that was drawn. */
	let draftAt = $state(today);
	let draftEnd = $state<Date | null>(null);
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

	function startNew(at: Date = anchor, until: Date | null = null) {
		anchor = startOfDay(at);
		draftAt = at;
		draftEnd = until;
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
				const { occurrence: _ignored, ...create } = draft;
				await createEvent({ accountId: calendar?.accountId ?? null, timeZone, ...create });
				flash('Event created');
			}
			await reload();
			mode = 'view';
			editing = null;
		} catch (cause) {
			editorError = messageOf(cause, 'The event could not be saved.');
		} finally {
			saving = false;
		}
	}

	/**
	 * A drag landed. One occurrence of a repeating event moves on its own —
	 * the same rule the editor states when you open an instance — because the
	 * synthetic id is what JMAP records the override against.
	 */
	async function moveEvent(row: TimelineEvent, start: Date, end: Date) {
		const event = sourceOf(row);
		if (!event) return;
		const calendarId = event.calendarIds[0];
		if (!calendarId) return;
		try {
			await updateEvent({
				id: event.id,
				accountId: event.accountId,
				previousCalendarIds: event.calendarIds,
				calendarId,
				title: event.title,
				start: event.allDay
					? `${toDateInputValue(start)}T00:00:00`
					: formatJmapQueryBound(start),
				duration: durationBetween(start, end, event.allDay),
				timeZone,
				allDay: event.allDay,
				description: event.description ?? '',
				location: event.location ?? '',
				// A drag moves an event; it never edits the rule behind it. Without
				// this a dragged occurrence would write its own rule over the series.
				keepRecurrence: true,
				occurrence: isRecurringInstance(event),
				recurrence: null
			});
			await reload();
			flash(isRecurringInstance(event) ? 'This occurrence moved' : 'Event moved');
		} catch (cause) {
			// The grid has already drawn the event where it was dropped; putting
			// the server's answer back is what undoes it.
			await reload();
			flash(messageOf(cause, 'The event could not be moved.'));
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
			await reload();
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

	const dayTitle = $derived(
		anchor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
	);
	const editorOpen = $derived(mode !== 'view');
	/** The month grid needs the day's list beside it; a planner is already one. */
	const railOpen = $derived(editorOpen || view === 'month');
	/** Nothing to drag an event onto if none of your calendars take writes. */
	const readOnly = $derived(
		!calendarList.some((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn)
	);
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

		<!-- The grid -->
		<div class="flex min-w-0 flex-1 flex-col {editorOpen ? 'max-md:hidden' : ''}">
			{#if notice}
				<p
					class="border-b border-[var(--z-hairline)] bg-[var(--z-hover)] px-4 py-1.5 text-[12px] font-medium text-[var(--z-muted)]"
					role="status"
				>
					{notice}
				</p>
			{/if}

			{#if eventsResource?.error}
				<p class="px-4 py-3 text-[13px] text-[var(--z-ch-discard-ink)]">
					Could not load events.
					<button type="button" class="underline" onclick={() => eventsResource?.refresh()}>Retry</button>
				</p>
			{:else}
				<!--
					The grid scrolls itself — sticky day headings, and the roll view
					scrolling under a drag — so it needs a real height, not `auto`.
					`bind:clientHeight` is a ResizeObserver in two words.
				-->
				<div class="z-cal min-h-0 flex-1" bind:clientHeight={gridHeight}>
					<CalendarGrid
						{adapter}
						view={viewId}
						currentDate={gridDate}
						theme={ZAUR_THEME}
						autoTheme={false}
						mondayStart
						height={gridHeight || 600}
						borderRadius={0}
						{readOnly}
						showModePills={false}
						showNavigation={false}
						snapInterval={15}
						minDuration={15}
						mobile={phone}
						ondatechange={(date) => {
							// `currentDate` is controlled, so the grid echoes back what it
							// was handed: taking the echo as a change feeds itself forever.
							//
							// The roll view also reports the Monday of whichever week sits
							// at its centre — on mount too, before anyone scrolls. Inside
							// the anchored week that is an echo, not navigation: taking it
							// would land a later switch to Day on Monday instead of the day
							// we were on. Another week is a real scroll.
							const next = startOfDay(date).getTime();
							const inSpan = next >= span[0]!.getTime() && next <= span[span.length - 1]!.getTime();
							if (view === 'day' || view === 'month' ? next !== anchor.getTime() : !inSpan)
								anchor = new Date(next);
						}}
						oneventclick={(row) => {
							const event = sourceOf(row);
							if (event) startEdit(event);
						}}
						oneventcreate={({ start, end }) => startNew(start, end)}
						oneventmove={(row, start, end) => void moveEvent(row, start, end)}
					>
						<!-- The shell's header already carries the date and the views. -->
						{#snippet header()}{/snippet}
					</CalendarGrid>
				</div>
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
						until={draftEnd}
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
						{#if eventsResource?.loading && !eventsResource.current}
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

<style>
	/*
	 * The grid's geometry is the package's; what a block looks like is ours.
	 * Every view hands its blocks the calendar's colour as `--ev-color` (the
	 * month as `--mg-chip-color`), so one recipe dresses all of them: a pastel
	 * fill, a stroke of the same hue, a 2px lip under it, ink mixed from the
	 * hue. Mixed against the surface and the ink, so dark mode is the same rule.
	 *
	 * `:global` because the markup is not ours; the `.z-cal` in front both
	 * fences it to this grid and outranks the package's own scoped rules.
	 */
	.z-cal :global {
		.tw-ev,
		.tw-ad,
		.tw-ghost:not(.tw-ghost--create),
		.wg-ev,
		.wg-ad,
		.mb-event,
		.mb-allday-chip,
		.mw-ev,
		.mg-chip:not(.mg-chip--custom) {
			--ev-hue: var(--ev-color, var(--mg-chip-color));
			--ev-fill: color-mix(in oklab, var(--ev-hue) 28%, var(--z-surface));
			--ev-ink: color-mix(in oklab, var(--ev-hue) 30%, var(--z-ink));
			border: 1px solid color-mix(in oklab, var(--ev-hue) 80%, var(--z-surface));
			border-bottom-width: 2px;
			border-radius: 6px;
			background: var(--ev-fill);
			color: var(--ev-ink);
			outline: none;
		}

		.tw-ev:hover,
		.tw-ad:hover,
		.wg-ev:hover,
		.wg-ad:hover,
		.mb-event:hover,
		.mw-ev:hover,
		.mg-chip:not(.mg-chip--custom):hover {
			background: color-mix(in oklab, var(--ev-hue) 38%, var(--z-surface));
		}

		/* Not yet certain, so not yet solid. */
		.tw-ev--tentative,
		.tw-ev--limited,
		.wg-ev--tentative,
		.wg-ev--limited {
			border-style: dashed;
		}

		/* A bar that runs on into the next day has no end to round off here. */
		.tw-ad--mid,
		.tw-ad--end:not(.tw-ad--start),
		.wg-ad--mid,
		.wg-ad--end:not(.wg-ad--start) {
			border-left-style: dashed;
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
		}

		/* The hue is the whole block now; a stripe or a dot would say it twice. */
		.tw-ev-stripe,
		.mb-ev-stripe,
		.mw-ev-stripe,
		.mb-allday-dot,
		.mg-chip-dot {
			display: none;
		}

		.tw-ev-body {
			padding: 3px 7px;
		}

		.tw-ev-title,
		.tw-ad-title,
		.tw-ghost-title,
		.wg-ev-title,
		.wg-ad-title,
		.mb-ev-title,
		.mw-ev-title,
		.mb-allday-title,
		.mg-chip-title {
			color: inherit;
			font-weight: 600;
		}

		.tw-ev-time,
		.tw-ev-loc,
		.tw-ad-span,
		.tw-ghost-time,
		.wg-ev-time,
		.wg-ev-loc,
		.mb-ev-time,
		.mb-ev-loc,
		.mw-ev-time,
		.mg-chip-time {
			color: inherit;
			font-weight: 500;
			opacity: 0.78;
		}

		/* What it is, then when: the title leads, and on a one-line block the
		   time sits at the far end of it. */
		.tw-ev-title {
			order: -1;
		}

		.tw-ev--compact .tw-ev-time {
			margin-left: auto;
		}

		.tw-ad {
			min-height: 22px;
		}

		/* ── The grid around them: quiet, one face, no washes ── */

		.tw-hd-wd,
		.wg-day-wd,
		.mg-head-cell {
			font-family: var(--font-sans);
			font-size: 12px;
			font-weight: 500;
			letter-spacing: 0;
			text-transform: none;
			color: var(--z-soft);
		}

		.tw-hd-num {
			font-size: 15px;
		}

		.tw-gutter-lb,
		.tw-ad-gutter-lb {
			font-size: 11.5px;
			color: var(--z-soft);
		}

		/* Yesterday is not greyer than today; its events already step back. */
		.tw-col.tw-col--past,
		.mg-cell.mg-cell--out {
			background: transparent;
		}

		.mg-daynum {
			font-size: 13px;
			color: var(--z-body);
		}

		.mg-cell--out .mg-daynum {
			color: var(--z-faint);
		}

		.mg-chip:not(.mg-chip--custom) {
			padding: 1px 6px;
			border-bottom-width: 1px;
		}
	}
</style>
