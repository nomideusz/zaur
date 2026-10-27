<script module lang="ts">
	import type { Calendar } from '@zaur/mail-core';
	import type { QuickAdd } from '#lib/calendar/quick-add';

	/** A line as read: the event it makes, the calendar it goes in, and any notes. */
	export interface Reading {
		event: QuickAdd;
		calendar: Calendar;
		notes: string;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { calendarKey, type EventRecurrence } from '@zaur/mail-core';
	import { createMeetingUrl, extractMeetingGroup } from '@zaur/mail-core/utils/meet';
	import { toDateInputValue } from '@zaur/mail-core/utils/dates';
	import { fold, parseQuickAdd } from '#lib/calendar/quick-add';
	import { span } from '#lib/calendar/day-shape';

	/**
	 * An event is a sentence before it is a form: "Lunch with Anna fri 13:00 45m".
	 * What the line is read as shows under it while it is typed, and as a ghost
	 * block on the grid, so a wrong hour is seen before Enter, not after. Each
	 * part of that reading is also its own control: a day, the times, a repeat,
	 * the place, the calendar, notes. Changing one there wins over the line, so
	 * the whole event is made here, in place, without a form opening elsewhere.
	 * A slot drawn on the grid or a free gap clicked opens it with that time
	 * already taken; a time in the line still wins.
	 */
	let {
		calendars,
		slot = null,
		saving = false,
		error = null,
		meetEnabled = false,
		onPreview,
		onSave,
		onClose
	}: {
		calendars: Calendar[];
		slot?: { start: Date; end: Date } | null;
		saving?: boolean;
		error?: string | null;
		/** The server can host calls: a Video call switch is offered. */
		meetEnabled?: boolean;
		onPreview: (reading: Reading | null) => void;
		onSave: (reading: Reading) => void;
		onClose: () => void;
	} = $props();

	let text = $state('');
	let input = $state<HTMLInputElement | null>(null);
	onMount(() => input?.focus());

	/** What was set by hand in the reading's controls; each wins over what the line says. */
	let set = $state<{
		day?: string;
		from?: string;
		to?: string;
		allDay?: boolean;
		repeat?: Repeat;
		place?: string;
		calendar?: string;
	}>({});
	let notes = $state('');
	let notesOpen = $state(false);

	const writable = $derived(calendars.filter((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn));
	const fallback = $derived(writable.find((calendar) => calendar.isDefault) ?? writable[0]);

	type Repeat = '' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
	const WEEKDAY_CODES = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const;
	function ruleOf(repeat: Repeat, start: Date): EventRecurrence | null {
		if (!repeat) return null;
		if (repeat === 'weekdays') return { frequency: 'weekly', interval: 1, byDay: ['mo', 'tu', 'we', 'th', 'fr'] };
		if (repeat === 'weekly') return { frequency: 'weekly', interval: 1, byDay: [WEEKDAY_CODES[start.getDay()]!] };
		return { frequency: repeat, interval: 1, byDay: [] };
	}
	function repeatOf(rule: EventRecurrence | null): Repeat {
		if (!rule) return '';
		if (rule.frequency === 'weekly' && rule.byDay.length === 5 && !rule.byDay.some((day) => day === 'sa' || day === 'su')) return 'weekdays';
		return rule.frequency;
	}

	const hhmm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
	const at = (date: Date, value: string) => {
		const [hours, minutes] = value.split(':').map(Number);
		return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
	};

	const reading = $derived.by((): Reading | null => {
		const event = parseQuickAdd(text);
		if (!event || !fallback) return null;
		if (slot && !event.dated) {
			if (!event.timed) Object.assign(event, { start: slot.start, end: slot.end, allDay: false });
			else {
				// A time typed into a drawn slot keeps the slot's day.
				const length = +event.end - +event.start;
				event.start = at(slot.start, hhmm(event.start));
				event.end = new Date(+event.start + length);
			}
		}
		// Then what was set by hand, field by field.
		if (set.day) {
			const [year, month, day] = set.day.split('-').map(Number);
			const length = +event.end - +event.start;
			event.start = new Date(year, month - 1, day, event.start.getHours(), event.start.getMinutes());
			event.end = new Date(+event.start + length);
		}
		if (set.allDay !== undefined && set.allDay !== event.allDay) {
			event.allDay = set.allDay;
			if (event.allDay) {
				event.start = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate());
				event.end = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate() + 1);
			} else {
				event.start = at(event.start, '09:00');
				event.end = at(event.start, '10:00');
			}
		}
		if (!event.allDay && set.from) {
			const length = +event.end - +event.start;
			event.start = at(event.start, set.from);
			event.end = new Date(+event.start + length);
		}
		if (!event.allDay && set.to) {
			const end = at(event.start, set.to);
			// "23:00–01:00" ends the next day.
			event.end = end > event.start ? end : new Date(+end + 86_400_000);
		}
		if (set.repeat !== undefined) event.recurrence = ruleOf(set.repeat, event.start);
		if (set.place !== undefined) event.location = set.place;
		const tag = event.calendar && fold(event.calendar);
		const calendar =
			writable.find((candidate) => calendarKey(candidate) === set.calendar) ??
			((tag && writable.find((candidate) => fold(candidate.name).startsWith(tag))) || fallback);
		return { event, calendar, notes };
	});

	// The grid redraws for the ghost: not on every key.
	$effect(() => {
		const next = reading;
		const timer = setTimeout(() => onPreview(next), 120);
		return () => clearTimeout(timer);
	});

	const meeting = $derived(reading ? extractMeetingGroup(reading.event.location) : null);
	let placeBefore = '';
	function setMeeting(on: boolean) {
		if (!reading) return;
		if (on) {
			placeBefore = reading.event.location;
			set.place = createMeetingUrl(window.location.origin);
		} else set.place = placeBefore;
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === 'Enter' && !event.isComposing && !(event.target instanceof HTMLTextAreaElement && !(event.metaKey || event.ctrlKey))) {
			event.preventDefault();
			if (reading && !saving) onSave(reading);
		}
	}

	const chip =
		'h-[26px] rounded-[6px] border border-[var(--z-hairline)] bg-transparent px-1.5 text-[12.5px] max-md:h-8 max-md:text-base text-[var(--z-strong)] outline-none hover:border-[var(--z-line)] hover:bg-[var(--z-hover)] focus-visible:border-[var(--z-accent-line)] focus-visible:shadow-[0_0_0_2px_var(--z-accent-soft)]';
</script>

<!-- Keys from any of its controls: Enter adds, Escape closes. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="shrink-0 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 pt-2.5 pb-2.5 shadow-[var(--z-shadow-tactile)]" onkeydown={keydown}>
	<div class="flex items-center gap-2.5">
		<svg class="size-4 shrink-0 text-[var(--z-accent)]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
		<input
			bind:this={input}
			bind:value={text}
			class="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--z-ink)] outline-none placeholder:text-[var(--z-soft)] max-md:text-base"
			placeholder={slot ? 'Design review @Room 2 #work' : 'Lunch with Anna fri 13:00 45m @Długa 5'}
			aria-label="New event, in one line"
			aria-describedby="quick-reading"
			autocomplete="off"
			spellcheck="false"
			enterkeyhint="done"
		/>
		<span class="z-mono shrink-0 text-[10.5px] text-[var(--z-soft)] pointer-coarse:hidden max-lg:hidden">
			<kbd class="z-kbd">↵</kbd> add · <kbd class="z-kbd">esc</kbd> close
		</span>
		<button type="button" class="btn-tactile btn-primary !h-[28px] shrink-0 text-[12.5px]" disabled={!reading || saving} onclick={() => reading && onSave(reading)}>
			{saving ? 'Adding…' : 'Add'}
		</button>
		<button type="button" class="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--z-soft)] hover:bg-[var(--z-hover)] hover:text-[var(--z-strong)]" aria-label="Close" onclick={onClose}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
		</button>
	</div>

	<!-- The reading: what Enter would save, each part of it a control. -->
	<div id="quick-reading" class="mt-2 flex min-h-[26px] flex-wrap items-center gap-x-1.5 gap-y-1.5 pl-[26px] text-[12px] text-[var(--z-muted)]" aria-live="polite">
		{#if error}
			<span class="text-[var(--z-ch-discard-ink)]">{error}</span>
		{:else if reading}
			{@const event = reading.event}
			<input type="date" class="{chip} z-mono" aria-label="Day" value={toDateInputValue(event.start)} onchange={(changed) => changed.currentTarget.value && (set.day = changed.currentTarget.value)} />
			{#if !event.allDay}
				<span class="inline-flex items-center gap-1">
					<input type="time" class="{chip} z-mono" aria-label="Starts" step="300" value={hhmm(event.start)} onchange={(changed) => changed.currentTarget.value && (set.from = changed.currentTarget.value)} />
					<span aria-hidden="true">–</span>
					<input type="time" class="{chip} z-mono" aria-label="Ends" step="300" value={hhmm(event.end)} onchange={(changed) => changed.currentTarget.value && (set.to = changed.currentTarget.value)} />
				</span>
				<span class="z-mono px-0.5 text-[var(--z-soft)]">{span(Math.round((+event.end - +event.start) / 60_000))}</span>
			{/if}
			<label class="{chip} inline-flex cursor-pointer items-center gap-1.5">
				<input type="checkbox" class="z-check" checked={event.allDay} onchange={(changed) => (set.allDay = changed.currentTarget.checked)} />
				All day
			</label>
			<select class={chip} aria-label="Repeat" value={repeatOf(event.recurrence)} onchange={(changed) => (set.repeat = changed.currentTarget.value as Repeat)}>
				<option value="">Once</option>
				<option value="daily">Every day</option>
				<option value="weekdays">Weekdays</option>
				<option value="weekly">Every {event.start.toLocaleDateString(undefined, { weekday: 'long' })}</option>
				<option value="monthly">Every month</option>
				<option value="yearly">Every year</option>
			</select>
			{#if !meeting}
				<input
					class="{chip} w-[150px] placeholder:text-[var(--z-soft)]"
					aria-label="Where"
					placeholder="Where"
					value={event.location}
					oninput={(changed) => (set.place = changed.currentTarget.value)}
				/>
			{/if}
			{#if meetEnabled}
				<label class="{chip} inline-flex cursor-pointer items-center gap-1.5">
					<input type="checkbox" class="z-check" checked={meeting !== null} onchange={(changed) => setMeeting(changed.currentTarget.checked)} />
					Video call
				</label>
			{/if}
			<span class="relative inline-flex items-center">
				<span class="pointer-events-none absolute left-2 size-[7px] rounded-full" style:background={reading.calendar.color ?? 'var(--z-accent)'} aria-hidden="true"></span>
				<select class="{chip} pl-[20px]" aria-label="Calendar" value={calendarKey(reading.calendar)} onchange={(changed) => (set.calendar = changed.currentTarget.value)}>
					{#each writable as calendar (calendarKey(calendar))}
						<option value={calendarKey(calendar)}>{calendar.name}</option>
					{/each}
				</select>
			</span>
			{#if !notesOpen}
				<button type="button" class="{chip} text-[var(--z-muted)]" onclick={() => (notesOpen = true)}>+ Notes</button>
			{/if}
		{:else if !fallback}
			<span>None of your calendars takes new events.</span>
		{:else if slot}
			<span class="font-medium text-[var(--z-strong)]">{slot.start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
			<span class="z-mono">{hhmm(slot.start)}–{hhmm(slot.end)}</span>
			<span class="text-[var(--z-soft)]">· say what it is, and <span class="z-mono">@where</span></span>
		{:else}
			<span class="text-[var(--z-soft)]">A day, a time, a length, <span class="z-mono">@place</span>, <span class="z-mono">#calendar</span>: in any order, in English or Polish.</span>
		{/if}
	</div>
	{#if reading && notesOpen}
		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			class="z-field mt-2 ml-[26px] !h-auto w-[calc(100%-26px)] py-1.5 text-[13px] max-md:text-base"
			rows="2"
			placeholder="Notes  (⌘↵ adds)"
			aria-label="Notes"
			autofocus
			bind:value={notes}
		></textarea>
	{/if}
</div>
