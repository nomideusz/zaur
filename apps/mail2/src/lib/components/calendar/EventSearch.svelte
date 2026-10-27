<script lang="ts">
	import { onMount } from 'svelte';
	import type { CalendarEvent } from '@zaur/mail-core';
	import { addDays, formatJmapQueryBound } from '@zaur/mail-core/utils/dates';
	import { startOfDay } from '#lib/calendar/schedule';
	import { fold } from '#lib/calendar/quick-add';
	import { events as eventsRemote } from '../../../routes/calendar.remote';

	/**
	 * Every event from half a year back to a year ahead, searched as it is typed:
	 * what is coming first, then what has been. Asked for once and filtered here —
	 * a calendar is small, and a wait per key is what makes search feel heavy.
	 */
	let {
		visible,
		colorOf,
		onOpen,
		onClose
	}: {
		visible: (event: CalendarEvent) => boolean;
		colorOf: (event: CalendarEvent) => string;
		onOpen: (event: CalendarEvent) => void;
		onClose: () => void;
	} = $props();

	const today = startOfDay(new Date());
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
	const range = eventsRemote({
		after: formatJmapQueryBound(addDays(today, -183)),
		before: formatJmapQueryBound(addDays(today, 366)),
		timeZone
	});

	let text = $state('');
	let input = $state<HTMLInputElement | null>(null);
	onMount(() => input?.focus());

	const terms = $derived(fold(text).split(/\s+/).filter(Boolean));
	const found = $derived.by(() => {
		const list = range.current;
		if (!list || !terms.length) return null;
		const hits = list.filter(
			(event) =>
				visible(event) &&
				terms.every((term) => fold(`${event.title} ${event.location ?? ''} ${event.description ?? ''}`).includes(term))
		);
		const coming = hits.filter((event) => event.end >= today).sort((a, b) => +a.start - +b.start);
		const past = hits.filter((event) => event.end < today).sort((a, b) => +b.start - +a.start);
		return { coming: coming.slice(0, 40), past: past.slice(0, 40), total: hits.length };
	});

	const day = (date: Date) =>
		date.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
		});
	const time = (date: Date) => date.toLocaleTimeString(undefined, { timeStyle: 'short' });

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === 'Enter') {
			const first = found?.coming[0] ?? found?.past[0];
			if (first) onOpen(first);
		}
	}
</script>

{#snippet row(event: CalendarEvent)}
	<li>
		<button type="button" class="flex w-full items-start gap-3 rounded-[6px] px-2 py-1.5 text-left hover:bg-[var(--z-hover)]" onclick={() => onOpen(event)}>
			<span class="mt-[5px] size-[7px] shrink-0 rounded-full" style:background={colorOf(event)} aria-hidden="true"></span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-[13px] font-medium text-[var(--z-ink)]">{event.title}</span>
				<span class="block truncate text-[12px] text-[var(--z-soft)]">
					{day(event.start)}{#if !event.allDay}&nbsp;· <span class="z-mono">{time(event.start)}</span>{/if}{#if event.location}&nbsp;· {event.location}{/if}
				</span>
			</span>
		</button>
	</li>
{/snippet}

<div class="flex items-center gap-2 border-b border-[var(--z-hairline)] px-4 py-2.5">
	<svg class="size-4 shrink-0 text-[var(--z-soft)]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
	<input
		bind:this={input}
		bind:value={text}
		type="search"
		class="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--z-ink)] outline-none placeholder:text-[var(--z-soft)] max-md:text-base"
		placeholder="Search events"
		aria-label="Search events"
		onkeydown={keydown}
	/>
	<button type="button" class="btn-tactile !h-[28px]" onclick={onClose}>Done</button>
</div>

<div class="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-live="polite">
	{#if range.error}
		<p class="px-2 py-3 text-[12.5px] text-[var(--z-ch-discard-ink)]">Could not load events to search.</p>
	{:else if !range.current}
		<p class="px-2 py-3 text-[12.5px] text-[var(--z-soft)]">Loading a year and a half of events…</p>
	{:else if !found}
		<p class="px-2 py-3 text-[12.5px] leading-relaxed text-[var(--z-soft)]">
			By title, place or note, from six months back to a year ahead. <kbd class="z-kbd">↵</kbd> opens the next match.
		</p>
	{:else if !found.total}
		<p class="px-2 py-3 text-[12.5px] text-[var(--z-soft)]">Nothing matches “{text.trim()}”.</p>
	{:else}
		{#if found.coming.length}
			<h3 class="px-2 pt-1 pb-1 text-[12px] font-semibold text-[var(--z-muted)]">Coming</h3>
			<ul>{#each found.coming as event (event.id + event.accountId + +event.start)}{@render row(event)}{/each}</ul>
		{/if}
		{#if found.past.length}
			<h3 class="px-2 pt-3 pb-1 text-[12px] font-semibold text-[var(--z-muted)]">Earlier</h3>
			<ul>{#each found.past as event (event.id + event.accountId + +event.start)}{@render row(event)}{/each}</ul>
		{/if}
	{/if}
</div>
