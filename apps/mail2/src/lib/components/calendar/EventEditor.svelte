<script lang="ts">
	import type { Calendar, CalendarEvent, EventRepeat } from '@zaur/mail-core';
	import { EVENT_REPEAT_OPTIONS, isRecurringInstance } from '@zaur/mail-core';
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
		title: string;
		start: string;
		duration: string;
		allDay: boolean;
		description: string;
		location: string;
		repeat: EventRepeat;
	}

	let {
		event = null,
		day = new Date(),
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
		calendars: Calendar[];
		saving?: boolean;
		error?: string | null;
		onSave: (draft: EventDraft) => void;
		onDelete?: () => void;
		onCancel: () => void;
	} = $props();

	const writable = $derived(calendars.filter((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn));
	const instance = $derived(event ? isRecurringInstance(event) : false);

	let title = $state('');
	let calendarId = $state('');
	let allDay = $state(false);
	let startValue = $state('');
	let endValue = $state('');
	let location = $state('');
	let description = $state('');
	let repeat = $state<EventRepeat>('none');

	// A different event (or a new one on another day) resets the form.
	$effect(() => {
		event?.id;
		day.getTime();
		const source = event;
		if (source) {
			title = source.title === '(No title)' ? '' : source.title;
			calendarId = source.calendarIds[0] ?? writable[0]?.id ?? '';
			allDay = source.allDay;
			startValue = allDay ? toDateInputValue(source.start) : toDatetimeLocalValue(source.start);
			// JMAP all-day ends are exclusive midnight; show the last day included.
			const endShown = allDay ? new Date(source.end.getTime() - 1) : source.end;
			endValue = allDay ? toDateInputValue(endShown) : toDatetimeLocalValue(endShown);
			location = source.location ?? '';
			description = source.description ?? '';
			repeat = (source.recurrenceRule?.frequency as EventRepeat | undefined) ?? 'none';
		} else {
			const times = defaultEventTimes(day);
			title = '';
			calendarId = (writable.find((calendar) => calendar.isDefault) ?? writable[0])?.id ?? '';
			allDay = false;
			startValue = toDatetimeLocalValue(times.start);
			endValue = toDatetimeLocalValue(times.end);
			location = '';
			description = '';
			repeat = 'none';
		}
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
	const canSave = $derived(Boolean(title.trim() && calendarId && parsed && !endsBeforeStart));

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || !parsed || saving) return;
		onSave({
			calendarId,
			title: title.trim(),
			start: allDay ? `${toDateInputValue(parsed.start)}T00:00:00` : formatJmapQueryBound(parsed.start),
			duration: durationBetween(parsed.start, parsed.end, allDay),
			allDay,
			description,
			location,
			repeat
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
				<button type="button" class="btn-tactile !h-[30px] !text-[var(--z-ch-discard-ink)]" onclick={onDelete} disabled={saving}>Delete</button>
			{/if}
			<button type="button" class="btn-tactile !h-[30px]" onclick={onCancel} disabled={saving}>Cancel</button>
			<button
				type="submit"
				class="btn-tactile !h-[30px] btn-primary disabled:!border-[var(--z-hairline)] disabled:!bg-[var(--z-sunken)] disabled:!text-[var(--z-faint)]"
				disabled={!canSave || saving}
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-4">
			{#if error}
				<p class="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
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

			<div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
				<label>
					<span class={label}>Calendar</span>
					<select class="{field} mt-1" bind:value={calendarId} required>
						{#each writable as calendar (calendar.accountId + calendar.id)}
							<option value={calendar.id}>{calendar.name}</option>
						{/each}
					</select>
				</label>
				<label>
					<span class={label}>Repeats</span>
					<select class="{field} mt-1" bind:value={repeat} disabled={instance}>
						{#each EVENT_REPEAT_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="flex items-center gap-2.5 text-[13px] text-[var(--z-strong)]">
				<input type="checkbox" class="z-check" checked={allDay} onchange={(e) => toggleAllDay(e.currentTarget.checked)} />
				All day
			</label>

			<div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
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
