<script lang="ts">
	import type { Calendar, CalendarEvent } from '@zaur/mail-core';
	import { calendarKey, isRecurringInstance, recurrenceFrom } from '@zaur/mail-core';
	import { formatEventTime } from '@zaur/mail-core/utils/dates';
	import { extractMeetingGroup } from '@zaur/mail-core/utils/meet';
	import { describeRepeat } from '#lib/calendar/schedule';
	import MeetIcon from '../meet/MeetIcon.svelte';

	/**
	 * An event as it is, before anyone edits it — what a click on the grid or
	 * the day list opens, as 1.0's event panel did. An event you may change has
	 * Edit and Delete here; one from a calendar you can only read (a holiday
	 * feed, somebody else's calendar) has nothing to press but Join and Close.
	 */
	let {
		event,
		calendars,
		writable,
		busy = false,
		error = null,
		onEdit,
		onDelete,
		onClose
	}: {
		event: CalendarEvent;
		/** The calendars it is filed in, where they are known. */
		calendars: Calendar[];
		writable: boolean;
		busy?: boolean;
		/** A delete that failed. */
		error?: string | null;
		onEdit: () => void;
		onDelete: () => void;
		onClose: () => void;
	} = $props();

	const medium = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
	// The shared formatter says only "All day"; here the days are the point. The
	// end is exclusive midnight, so the last day covered is the one before it.
	const when = $derived.by(() => {
		if (!event.allDay) return formatEventTime(event);
		const last = new Date(event.end.getTime() - 1);
		const first = medium.format(event.start);
		return `${last.toDateString() === event.start.toDateString() ? first : `${first} – ${medium.format(last)}`} · All day`;
	});
	const meeting = $derived(extractMeetingGroup(event.location));
	const repeats = $derived(
		describeRepeat(recurrenceFrom(event.recurrenceRule, event.start), event.start) ??
			(isRecurringInstance(event) ? 'Repeats' : null)
	);
	const label = 'z-caption mb-1';
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--z-hairline)] px-6 py-3 max-md:px-4">
		<h2 class="text-[14px] font-semibold text-[var(--z-ink)]">Event</h2>
		<div class="flex items-center gap-2">
			{#if writable}
				<button type="button" class="btn-tactile btn-danger !h-[30px]" onclick={onDelete} disabled={busy}>Delete</button>
				<button type="button" class="btn-tactile !h-[30px]" onclick={onEdit} disabled={busy}>Edit</button>
			{/if}
			<button type="button" class="btn-tactile !h-[30px]" onclick={onClose}>Close</button>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
		<div class="mx-auto flex max-w-[560px] flex-col gap-5">
			{#if error}
				<p class="rounded-[8px] border border-[var(--z-ch-discard-line)] bg-[var(--z-ch-discard-hover)] px-3 py-2 text-[13px] text-[var(--z-ch-discard-ink)]" role="alert">{error}</p>
			{/if}
			<div>
				<p class="text-[17px] leading-snug font-semibold text-[var(--z-ink)]">{event.title}</p>
				<p class="mt-1 text-[13.5px] text-[var(--z-body)]">{when}</p>
				{#if repeats}<p class="mt-0.5 text-[12.5px] text-[var(--z-soft)]">{repeats}</p>{/if}
			</div>

			{#if meeting}
				<div class="flex items-center gap-2.5 rounded-[10px] border border-[var(--z-accent-stroke)] bg-[var(--z-accent-tint)] p-3 text-[var(--z-accent-ink)]">
					<span class="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] border border-current/40 bg-[var(--z-surface)]">
						<MeetIcon name="cam" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-[13.5px] font-semibold">Video call</span>
						<span class="z-mono block truncate text-[11.5px] opacity-85">{event.location}</span>
					</span>
					<a class="btn-tactile btn-primary !h-[30px] shrink-0" href="/meet/{meeting}" target="_blank" rel="noopener">Join</a>
				</div>
			{:else if event.location}
				<div>
					<h3 class={label}>Where</h3>
					<p class="text-[13.5px] text-[var(--z-body)]">{event.location}</p>
				</div>
			{/if}

			{#if calendars.length}
				<div>
					<h3 class={label}>Calendar</h3>
					<ul role="list">
						{#each calendars as calendar (calendarKey(calendar))}
							<li class="flex items-center gap-2 text-[13.5px] text-[var(--z-body)]">
								<span class="size-2.5 shrink-0 rounded-full" style:background={calendar.color} aria-hidden="true"></span>
								{calendar.name}
							</li>
						{/each}
					</ul>
					{#if !writable}
						<p class="mt-1 text-[12.5px] text-[var(--z-soft)]">You can see this calendar but not change it.</p>
					{/if}
				</div>
			{/if}

			{#if event.description?.trim()}
				<div>
					<h3 class={label}>Notes</h3>
					<p class="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words text-[var(--z-body)]">{event.description.trim()}</p>
				</div>
			{/if}
		</div>
	</div>
</div>
