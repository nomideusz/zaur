<script lang="ts">
	import {
		WEEKDAYS,
		defaultRecurrence,
		weekdayCodeOf,
		type EventFrequency,
		type EventRecurrence,
		type WeekdayCode
	} from '@zaur/mail-core';
	import { toDateInputValue } from '@zaur/mail-core/utils/dates';
	import { describeRepeat } from '#lib/calendar/schedule';

	/**
	 * A repeat rule, asked for the way a schedule is actually described: an
	 * interval and a unit on one line, the weekdays a weekly rule lands on, and
	 * an end. The footer says back what the rule will do, with the next two
	 * dates where they are not in doubt — a rule nobody can read is a rule
	 * nobody trusts, and "monthly" alone is not readable.
	 */
	let {
		recurrence = $bindable(),
		start,
		disabled = false
	}: {
		recurrence: EventRecurrence | null;
		/** The event's own start — the rule hangs off it. */
		start: Date;
		disabled?: boolean;
	} = $props();

	const UNITS: { value: EventFrequency; label: string }[] = [
		{ value: 'daily', label: 'Days' },
		{ value: 'weekly', label: 'Weeks' },
		{ value: 'monthly', label: 'Months' },
		{ value: 'yearly', label: 'Years' }
	];

	type Ending = 'never' | 'on' | 'after';
	const ending = $derived<Ending>(
		recurrence?.count !== undefined ? 'after' : recurrence?.until ? 'on' : 'never'
	);

	function patch(change: Partial<EventRecurrence>) {
		if (!recurrence) return;
		recurrence = { ...recurrence, ...change };
	}

	function setFrequency(frequency: EventFrequency) {
		if (!recurrence) return;
		// A weekly rule always lands on at least one day: the start's own.
		const byDay =
			frequency === 'weekly' && !recurrence.byDay.length ? [weekdayCodeOf(start)] : recurrence.byDay;
		patch({ frequency, byDay });
	}

	function toggleDay(code: WeekdayCode, on: boolean) {
		if (!recurrence) return;
		const next = on
			? [...recurrence.byDay, code]
			: recurrence.byDay.filter((day) => day !== code);
		// Clearing the last day would mean a weekly rule that never runs.
		patch({ byDay: next.length ? next : [code] });
	}

	function setEnding(next: Ending) {
		if (!recurrence) return;
		if (next === 'never') patch({ until: undefined, count: undefined });
		else if (next === 'after') patch({ until: undefined, count: recurrence.count ?? 10 });
		else {
			const until = new Date(start);
			until.setMonth(until.getMonth() + 3);
			patch({ count: undefined, until: `${toDateInputValue(until)}T23:59:59` });
		}
	}

	const untilDate = $derived(recurrence?.until?.slice(0, 10) ?? '');
	const summary = $derived(describeRepeat(recurrence, start));

	const chip =
		'flex h-[30px] cursor-pointer items-center gap-2 rounded-[6px] border px-2.5 text-[12.5px] font-medium transition-colors';
	const chipOn = 'border-[var(--z-accent-line)] bg-[var(--z-accent-tint)] text-[var(--z-accent-ink)]';
	const chipOff = 'border-[var(--z-line)] bg-[var(--z-surface)] text-[var(--z-strong)] hover:bg-[var(--z-hover)]';
</script>

<div class="z-card">
	<label class="z-card-head cursor-pointer">
		<input
			type="checkbox"
			class="z-check"
			checked={!!recurrence}
			{disabled}
			onchange={(changed) => (recurrence = changed.currentTarget.checked ? defaultRecurrence(start) : null)}
		/>
		Repeats
	</label>

	{#if recurrence}
		<div class="z-card-body flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-[12.5px] text-[var(--z-soft)]">Every</span>
				<input
					type="number"
					min="1"
					max="999"
					class="z-field !h-[30px] w-[62px] text-center"
					value={recurrence.interval}
					{disabled}
					oninput={(typed) => patch({ interval: Math.max(1, Number(typed.currentTarget.value) || 1) })}
				/>
				{#each UNITS as unit (unit.value)}
					<button
						type="button"
						class="{chip} {recurrence.frequency === unit.value ? chipOn : chipOff}"
						aria-pressed={recurrence.frequency === unit.value}
						{disabled}
						onclick={() => setFrequency(unit.value)}
					>
						{unit.label}
					</button>
				{/each}
			</div>

			{#if recurrence.frequency === 'weekly'}
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="mr-1 text-[12.5px] text-[var(--z-soft)]">On</span>
					{#each WEEKDAYS as day (day.code)}
						{@const on = recurrence.byDay.includes(day.code)}
						<label class="{chip} {on ? chipOn : chipOff} !px-2">
							<input
								type="checkbox"
								class="z-check"
								checked={on}
								{disabled}
								onchange={(changed) => toggleDay(day.code, changed.currentTarget.checked)}
							/>
							{day.label}
						</label>
					{/each}
				</div>
			{/if}

			<div class="flex flex-wrap items-center gap-2">
				<span class="text-[12.5px] text-[var(--z-soft)]">Ends</span>
				{#each [{ id: 'never', label: 'Never' }, { id: 'on', label: 'On' }, { id: 'after', label: 'After' }] as choice (choice.id)}
					<button
						type="button"
						class="{chip} {ending === choice.id ? chipOn : chipOff}"
						aria-pressed={ending === choice.id}
						{disabled}
						onclick={() => setEnding(choice.id as Ending)}
					>
						{choice.label}
					</button>
				{/each}

				{#if ending === 'on'}
					<input
						type="date"
						class="z-field !h-[30px] max-md:text-base"
						value={untilDate}
						{disabled}
						onchange={(changed) =>
							changed.currentTarget.value && patch({ until: `${changed.currentTarget.value}T23:59:59` })}
					/>
				{:else if ending === 'after'}
					<input
						type="number"
						min="1"
						max="999"
						class="z-field !h-[30px] w-[70px] text-center"
						value={recurrence.count ?? 10}
						{disabled}
						oninput={(typed) => patch({ count: Math.max(1, Number(typed.currentTarget.value) || 1) })}
					/>
					<span class="text-[12.5px] text-[var(--z-soft)]">times</span>
				{/if}
			</div>
		</div>

		{#if summary}
			<p class="z-card-foot flex-nowrap" aria-live="polite">
				<svg class="size-3.5 shrink-0 text-[var(--z-faint)]" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8a5 5 0 018.5-3.5M13 8a5 5 0 01-8.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /><path d="M11.5 2v2.5H9M4.5 14v-2.5H7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
				{summary}
			</p>
		{/if}
	{/if}
</div>
