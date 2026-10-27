<script module lang="ts">
	import type { Calendar } from '@zaur/mail-core';
	import type { QuickAdd } from '#lib/calendar/quick-add';

	/** A line as read: the event it makes, and the calendar it goes in. */
	export interface Reading {
		event: QuickAdd;
		calendar: Calendar;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { EventRecurrence } from '@zaur/mail-core';
	import { fold, parseQuickAdd } from '#lib/calendar/quick-add';
	import { span } from '#lib/calendar/day-shape';

	/**
	 * An event is a sentence before it is a form: "Lunch with Anna fri 13:00 45m".
	 * What the line is read as shows under it while it is typed, and as a ghost
	 * block on the grid, so a wrong hour is seen before Enter, not after. A slot
	 * drawn on the grid or a free gap clicked opens it with that time already
	 * taken; a time in the line still wins.
	 */
	let {
		calendars,
		slot = null,
		saving = false,
		error = null,
		onPreview,
		onSave,
		onMore,
		onClose
	}: {
		calendars: Calendar[];
		slot?: { start: Date; end: Date } | null;
		saving?: boolean;
		error?: string | null;
		onPreview: (reading: Reading | null) => void;
		onSave: (reading: Reading) => void;
		onMore: (reading: Reading | null) => void;
		onClose: () => void;
	} = $props();

	let text = $state('');
	let input = $state<HTMLInputElement | null>(null);
	onMount(() => input?.focus());

	const writable = $derived(calendars.filter((calendar) => calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn));
	const fallback = $derived(writable.find((calendar) => calendar.isDefault) ?? writable[0]);

	const reading = $derived.by((): Reading | null => {
		const event = parseQuickAdd(text);
		if (!event || !fallback) return null;
		if (slot && !event.dated) {
			if (!event.timed) Object.assign(event, { start: slot.start, end: slot.end, allDay: false });
			else {
				// A time typed into a drawn slot keeps the slot's day.
				const move = (date: Date) => new Date(slot.start.getFullYear(), slot.start.getMonth(), slot.start.getDate(), date.getHours(), date.getMinutes());
				const length = +event.end - +event.start;
				event.start = move(event.start);
				event.end = new Date(+event.start + length);
			}
		}
		const tag = event.calendar && fold(event.calendar);
		const calendar = (tag && writable.find((candidate) => fold(candidate.name).startsWith(tag))) || fallback;
		return { event, calendar };
	});

	// The grid redraws for the ghost: not on every key.
	$effect(() => {
		const next = reading;
		const timer = setTimeout(() => onPreview(next), 120);
		return () => clearTimeout(timer);
	});

	const DAYS: Record<string, string> = { mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday', sa: 'Saturday', su: 'Sunday' };
	function repeatLabel(rule: EventRecurrence): string {
		if (rule.frequency === 'weekly' && rule.byDay.length === 5 && !rule.byDay.some((day) => day === 'sa' || day === 'su')) return 'Weekdays';
		if (rule.frequency === 'weekly' && rule.byDay.length === 1) return `Every ${DAYS[rule.byDay[0]!]}`;
		return { daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' }[rule.frequency] ?? 'Repeats';
	}

	function dayLabel(date: Date): string {
		const today = new Date();
		const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
		if (date.toDateString() === today.toDateString()) return 'Today';
		if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
		return date.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
		});
	}
	const time = (date: Date) => date.toLocaleTimeString(undefined, { timeStyle: 'short' });

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === 'Enter' && !event.isComposing) {
			event.preventDefault();
			// ⌘/Ctrl+Enter: the same, in the full form.
			if (event.metaKey || event.ctrlKey) onMore(reading);
			else if (reading && !saving) onSave(reading);
		}
	}
</script>

<div class="shrink-0 border-b border-[var(--z-line)] bg-[var(--z-surface)] px-4 pt-2.5 pb-2 shadow-[var(--z-shadow-tactile)]">
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
			onkeydown={keydown}
		/>
		<button type="button" class="btn-tactile !h-[28px] shrink-0 text-[12.5px] max-sm:hidden" onclick={() => onMore(reading)}>More options</button>
		<button type="button" class="btn-tactile btn-primary !h-[28px] shrink-0 text-[12.5px]" disabled={!reading || saving} onclick={() => reading && onSave(reading)}>
			{saving ? 'Adding…' : 'Add'}
		</button>
		<button type="button" class="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--z-soft)] hover:bg-[var(--z-hover)] hover:text-[var(--z-strong)]" aria-label="Close" onclick={onClose}>
			<svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
		</button>
	</div>

	<!-- The reading: what Enter would save. Measured things in mono. -->
	<div id="quick-reading" class="mt-1.5 flex min-h-[22px] flex-wrap items-center gap-x-3 gap-y-1 pl-[26px] text-[12px] text-[var(--z-muted)]" aria-live="polite">
		{#if error}
			<span class="text-[var(--z-ch-discard-ink)]">{error}</span>
		{:else if reading}
			{@const event = reading.event}
			<span class="font-medium text-[var(--z-strong)]">{dayLabel(event.start)}</span>
			{#if event.allDay}
				<span>All day</span>
			{:else}
				<span class="z-mono">{time(event.start)}–{time(event.end)}</span>
				<span class="z-mono text-[var(--z-soft)]">{span(Math.round((+event.end - +event.start) / 60_000))}</span>
			{/if}
			{#if event.recurrence}<span>↻ {repeatLabel(event.recurrence)}</span>{/if}
			{#if event.location}<span class="max-w-[220px] truncate">at {event.location}</span>{/if}
			<span class="inline-flex items-center gap-1.5">
				<span class="size-[7px] rounded-full" style:background={reading.calendar.color ?? 'var(--z-accent)'} aria-hidden="true"></span>
				{reading.calendar.name}
			</span>
			<span class="z-mono ml-auto text-[10.5px] text-[var(--z-soft)] pointer-coarse:hidden">
				<kbd class="z-kbd">↵</kbd> add · <kbd class="z-kbd">esc</kbd> close
			</span>
		{:else if !fallback}
			<span>None of your calendars takes new events.</span>
		{:else if slot}
			<span class="font-medium text-[var(--z-strong)]">{dayLabel(slot.start)}</span>
			<span class="z-mono">{time(slot.start)}–{time(slot.end)}</span>
			<span class="z-mono text-[var(--z-soft)]">{span(Math.round((+slot.end - +slot.start) / 60_000))}</span>
			<span class="text-[var(--z-soft)]">· say what it is, and <span class="z-mono">@where</span></span>
		{:else}
			<span class="text-[var(--z-soft)]">A day, a time, a length, <span class="z-mono">@place</span>, <span class="z-mono">#calendar</span>: in any order, in English or Polish.</span>
		{/if}
	</div>
</div>

