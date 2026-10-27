<script lang="ts">
	import type { CalendarEvent } from '@zaur/mail-core';
	import { extractMeetingGroup } from '@zaur/mail-core/utils/meet';
	import { span, type DayVoice } from '#lib/calendar/day-shape';
	import KeysSheet from '../ui/KeysSheet.svelte';

	/**
	 * Mail's status line, for time: what the day says now (in something, free
	 * until what, done for today) and the keys. On a phone only the day's line
	 * shows, over the grid: there are no keys to press there.
	 */
	let {
		voice,
		colorOf,
		phone = false,
		onOpen
	}: {
		voice: DayVoice<CalendarEvent> | null;
		colorOf: (event: CalendarEvent) => string;
		phone?: boolean;
		onOpen: (event: CalendarEvent) => void;
	} = $props();

	const KEYS: [key: string, does: string, long: string][] = [
		['n', 'add', 'Add an event by typing it: “Lunch with Anna fri 13:00 45m”'],
		['t', 'today', 'Back to today'],
		['j/k', 'move', 'Next / previous day or week (also → and ←)'],
		['d/w', 'view', 'The day, or the weeks'],
		['/', 'search', 'Search your events'],
		['c', 'new', 'New event, every field'],
		['e', 'edit', 'Edit the open event'],
		['#', 'delete', 'Delete the open event'],
		['esc', 'close', 'Close the panel or the line'],
		['?', 'keys', 'This list']
	];

	let sheet = $state<KeysSheet | null>(null);
	export function showKeys() {
		sheet?.toggle();
	}

	const time = (date: Date) => date.toLocaleTimeString(undefined, { timeStyle: 'short' });
	const dayName = (date: Date) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' });
	};
	const meeting = $derived(voice?.kind === 'now' ? extractMeetingGroup(voice.event.location) : voice && voice.kind !== 'clear' && voice.kind !== 'later' ? extractMeetingGroup(voice.next.location) : null);
	// A call is worth a button from ten minutes before it starts.
	const joinable = $derived(meeting && (voice?.kind === 'now' || (voice?.kind === 'free' && voice.minutes <= 10)));
</script>

{#snippet title(event: CalendarEvent)}
	<button
		type="button"
		class="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[var(--z-strong)] hover:text-[var(--z-ink)] hover:underline underline-offset-2"
		onclick={() => onOpen(event)}
	>
		<span class="size-[7px] shrink-0 rounded-full" style:background={colorOf(event)} aria-hidden="true"></span>
		<span class="truncate">{event.title}</span>
	</button>
{/snippet}

{#snippet line()}
	<!-- Said, not drawn: polite, so a screen reader hears the change of state without being interrupted. -->
	<div class="flex min-w-0 items-center gap-2 whitespace-nowrap" aria-live="polite">
		{#if !voice}
			<span>…</span>
		{:else if voice.kind === 'now'}
			<span class="shrink-0 font-semibold text-[var(--z-ch-confirmed-ink)]">Now</span>
			{@render title(voice.event)}
			<span class="shrink-0"><span class="z-mono">{span(voice.left)}</span> left</span>
			{#if voice.next && +voice.next.start - +voice.event.end < 5 * 60_000}
				<span class="shrink-0 text-[var(--z-line)] max-sm:hidden">·</span>
				<span class="shrink-0 max-sm:hidden">then straight into {voice.next.title}</span>
			{/if}
		{:else if voice.kind === 'free'}
			<span class="shrink-0">Free for <span class="z-mono font-semibold text-[var(--z-strong)]">{span(voice.minutes)}</span></span>
			<span class="shrink-0 text-[var(--z-line)]">·</span>
			<span class="shrink-0">then</span>
			{@render title(voice.next)}
			<span class="z-mono shrink-0">{time(voice.next.start)}</span>
		{:else if voice.kind === 'later'}
			<span class="shrink-0">Nothing else today</span>
			<span class="shrink-0 text-[var(--z-line)]">·</span>
			<span class="shrink-0">{dayName(voice.next.start)}</span>
			{@render title(voice.next)}
			<span class="z-mono shrink-0">{time(voice.next.start)}</span>
		{:else}
			<span>Nothing in the next seven days</span>
		{/if}
		{#if joinable}
			<a class="btn-tactile btn-primary !h-[24px] shrink-0 !px-2 text-[12px]" href="/meet/{meeting}" target="_blank" rel="noopener">Join</a>
		{/if}
	</div>
{/snippet}

{#if phone}
	<div class="flex h-8 shrink-0 items-center border-b border-[var(--z-hairline)] bg-[var(--z-surface)] px-4 text-[12.5px] text-[var(--z-soft)] md:hidden">
		{@render line()}
	</div>
{:else}
	<footer
		class="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-[var(--z-line)] bg-[var(--z-surface)] px-4 text-[12px] text-[var(--z-soft)] select-none max-md:hidden"
	>
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<div class="min-w-0 shrink">{@render line()}</div>
			<span class="text-[var(--z-line)] pointer-coarse:hidden">|</span>
			<div class="z-mono flex h-[19px] min-w-0 flex-1 flex-wrap items-center gap-x-[9px] overflow-hidden text-[10.5px] pointer-coarse:hidden">
				{#each KEYS.slice(0, 6) as [key, does] (key)}
					<span class="flex h-[19px] items-center gap-[5px] whitespace-nowrap"><kbd class="z-kbd">{key}</kbd> {does}</span>
				{/each}
			</div>
		</div>
		<button
			type="button"
			class="z-mono flex shrink-0 items-center gap-[5px] text-[10.5px] hover:text-[var(--z-strong)] pointer-coarse:hidden"
			title="Keyboard shortcuts (?)"
			onclick={showKeys}
		>
			<kbd class="z-kbd">?</kbd> all keys
		</button>
	</footer>
	<KeysSheet bind:this={sheet} keys={KEYS} />
{/if}
