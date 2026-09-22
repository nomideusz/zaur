<script lang="ts">
	import { untrack } from 'svelte';
	import type { Calendar, CalendarEvent, EventRecurrence } from '@zaur/mail-core';
	import { calendarKey, isRecurringInstance, recurrenceFrom } from '@zaur/mail-core';
	import RepeatPanel from './RepeatPanel.svelte';
	import {
		defaultEventTimes,
		durationBetween,
		formatJmapQueryBound,
		parseDateInputValue,
		parseDatetimeLocalValue,
		toDateInputValue,
		toDatetimeLocalValue
	} from '@zaur/mail-core/utils/dates';

	/** What the editor hands back: already in JMAP's local-datetime + duration form. */
	export interface EventDraft {
		calendarId: string;
		/** The account the calendar lives in — a shared one is not yours. */
		accountId: string | null;
		title: string;
		start: string;
		duration: string;
		allDay: boolean;
		description: string;
		location: string;
		recurrence: EventRecurrence | null;
		/** The event being edited is one occurrence of a series, so the save is
		 *  an override: it carries only what an occurrence owns and must not
		 *  rewrite the rule behind it. */
		occurrence: boolean;
	}

	let {
		event = null,
		day = new Date(),
		until = null,
		calendars,
		saving = false,
		error = null,
		onSave,
		onDelete,
		onCancel
	}: {
		event?: CalendarEvent | null;
		/** Where a new event lands when there is no event to edit. */
		day?: Date;
		/** The end a drag drew on the grid; without one the default hour applies. */
		until?: Date | null;
		calendars: Calendar[];
		saving?: boolean;
		error?: string | null;
		onSave: (draft: EventDraft) => void;
		onDelete?: () => void;
		onCancel: () => void;
	} = $props();

	// ponytail: an existing event offers only calendars in its own account —
	// moving one to another account is a copy plus a delete in JMAP, not an
	// update. Widen it when moving an event into a shared calendar is asked for.
	const writable = $derived(
		calendars.filter(
			(calendar) =>
				(calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn) &&
				(!event || (calendar.accountId ?? null) === (event.accountId ?? null))
		)
	);
	const instance = $derived(event ? isRecurringInstance(event) : false);

	let title = $state('');
	/** `accountId:id` — a bare id collides across accounts (see calendarKey). */
	let calendarRef = $state('');
	let allDay = $state(false);
	let startValue = $state('');
	let endValue = $state('');
	let location = $state('');
	let description = $state('');
	let recurrence = $state<EventRecurrence | null>(null);

	/**
	 * What a re-seed keys on. The calendar list is deliberately not part of it:
	 * it refreshes on its own (a push, a visibility toggle, a tab coming back),
	 * and re-seeding then throws away what was typed — silently putting the
	 * event back on the calendar it came from.
	 */
	const seed = $derived(`${event?.id ?? 'new'}:${day.getTime()}:${until?.getTime() ?? ''}`);

	// A different event (or a new one on another day) resets the form.
	$effect(() => {
		seed;
		untrack(() => {
			const source = event;
			if (source) {
				title = source.title === '(No title)' ? '' : source.title;
				const filed = source.calendarIds[0];
				calendarRef = filed
					? calendarKey({ id: filed, accountId: source.accountId })
					: (writable[0] ? calendarKey(writable[0]) : '');
				allDay = source.allDay;
				startValue = allDay ? toDateInputValue(source.start) : toDatetimeLocalValue(source.start);
				// JMAP all-day ends are exclusive midnight; show the last day included.
				const endShown = allDay ? new Date(source.end.getTime() - 1) : source.end;
				endValue = allDay ? toDateInputValue(endShown) : toDatetimeLocalValue(endShown);
				location = source.location ?? '';
				description = source.description ?? '';
				recurrence = recurrenceFrom(source.recurrenceRule, source.start);
			} else {
				const times = until ? { start: day, end: until } : defaultEventTimes(day);
				title = '';
				const fallback = writable.find((calendar) => calendar.isDefault) ?? writable[0];
				calendarRef = fallback ? calendarKey(fallback) : '';
				allDay = false;
				startValue = toDatetimeLocalValue(times.start);
				endValue = toDatetimeLocalValue(times.end);
				location = '';
				description = '';
				recurrence = null;
			}
		});
	});

	function toggleAllDay(next: boolean) {
		const start = allDay ? parseDateInputValue(startValue) : parseDatetimeLocalValue(startValue);
		const end = allDay ? parseDateInputValue(endValue) : parseDatetimeLocalValue(endValue);
		allDay = next;
		if (next) {
			startValue = toDateInputValue(start);
			endValue = toDateInputValue(end < start ? start : end);
		} else {
			const times = defaultEventTimes(start);
			startValue = toDatetimeLocalValue(times.start);
			endValue = toDatetimeLocalValue(times.end);
		}
	}

	const parsed = $derived.by(() => {
		if (!startValue || !endValue) return null;
		const start = allDay ? parseDateInputValue(startValue) : parseDatetimeLocalValue(startValue);
		const end = allDay ? parseDateInputValue(endValue) : parseDatetimeLocalValue(endValue);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
		return { start, end };
	});
	const endsBeforeStart = $derived(Boolean(parsed && parsed.end.getTime() < parsed.start.getTime()));
	const chosen = $derived(writable.find((calendar) => calendarKey(calendar) === calendarRef) ?? null);
	/**
	 * What the select lists: the ones that take writes, plus wherever this event
	 * already sits. A calendar shared read-only is not writable, and without it
	 * here the field would read blank rather than saying where the event lives.
	 */
	const options = $derived(
		chosen || !calendarRef
			? writable
			: [...calendars.filter((calendar) => calendarKey(calendar) === calendarRef), ...writable]
	);
	const canSave = $derived(Boolean(title.trim() && chosen && parsed && !endsBeforeStart));

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || !parsed || !chosen || saving) return;
		onSave({
			calendarId: chosen.id,
			accountId: chosen.accountId,
			title: title.trim(),
			start: allDay ? `${toDateInputValue(parsed.start)}T00:00:00` : formatJmapQueryBound(parsed.start),
			duration: durationBetween(parsed.start, parsed.end, allDay),
			allDay,
			description,
			location,
			recurrence,
			occurrence: instance
		});
	}

	const field = 'z-field w-full max-md:text-base';
	const label = 'block text-[12px] text-[var(--z-soft)]';
</script>

<form onsubmit={submit} class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="text-[14px] font-semibold text-[var(--z-ink)]">
			{event ? (instance ? 'Edit this occurrence' : 'Edit event') : 'New event'}
		</h2>
		<div class="flex items-center gap-2">
			{#if event && onDelete}
				<button type="button" class="btn-tactile btn-danger !h-[30px]" onclick={onDelete} disabled={saving}>Delete</button>
			{/if}
			<button type="button" class="btn-tactile !h-[30px]" onclick={onCancel} disabled={saving}>Cancel</button>
			<button
				type="submit"
				class="btn-tactile btn-primary !h-[30px]"
				disabled={!canSave || saving}
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-4">
			{#if error}
				<p class="rounded-[8px] border border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
			{/if}
			{#if instance}
				<p class="rounded-[8px] border border-[var(--z-hairline)] bg-[var(--z-hover)] px-3 py-2 text-[12.5px] text-[var(--z-muted)]">
					This is one occurrence of a repeating event. Changes here apply to this date only.
				</p>
			{/if}

			<label>
				<span class={label}>Title</span>
				<input class="{field} mt-1 !text-[15px] font-semibold" bind:value={title} required autocomplete="off" placeholder="What is happening?" />
			</label>

			<label>
				<span class={label}>Calendar</span>
				<!-- Which calendars an event is filed in belongs to the series: the
				     server refuses the property on an override, so on an occurrence
				     this says where the event lives rather than offering a move. -->
				<select class="{field} mt-1" bind:value={calendarRef} required disabled={instance}>
					{#each options as calendar (calendarKey(calendar))}
						<option value={calendarKey(calendar)}>{calendar.name}</option>
					{/each}
				</select>
			</label>

			<label class="flex items-center gap-2.5 text-[13px] text-[var(--z-strong)]">
				<input type="checkbox" class="z-check" checked={allDay} onchange={(e) => toggleAllDay(e.currentTarget.checked)} />
				All day
			</label>

			<!-- The panel is 380px: two native datetime controls do not fit side by side. -->
			<div class="grid gap-3">
				<label>
					<span class={label}>Starts</span>
					{#if allDay}
						<input type="date" class="{field} mt-1" bind:value={startValue} required />
					{:else}
						<input type="datetime-local" class="{field} mt-1" bind:value={startValue} required />
					{/if}
				</label>
				<label>
					<span class={label}>Ends</span>
					{#if allDay}
						<input type="date" class="{field} mt-1" bind:value={endValue} required aria-invalid={endsBeforeStart} />
					{:else}
						<input type="datetime-local" class="{field} mt-1" bind:value={endValue} required aria-invalid={endsBeforeStart} />
					{/if}
				</label>
			</div>
			{#if endsBeforeStart}
				<p class="-mt-2 text-[12.5px] text-[var(--z-ch-discard-ink)]">The end has to come after the start.</p>
			{/if}

			<RepeatPanel bind:recurrence start={parsed?.start ?? day} disabled={instance} />

			<label>
				<span class={label}>Location</span>
				<input class="{field} mt-1" bind:value={location} autocomplete="off" />
			</label>

			<label>
				<span class={label}>Description</span>
				<textarea class="z-field mt-1 !h-auto w-full py-1.5 max-md:text-base" rows="4" bind:value={description}></textarea>
			</label>
		</div>
	</div>
</form>
