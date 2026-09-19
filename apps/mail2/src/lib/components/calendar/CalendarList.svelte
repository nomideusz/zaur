<script lang="ts">
	import type { Calendar } from '@zaur/mail-core';

	/**
	 * The calendars, in the three groups a person actually holds them in:
	 * their own, the ones another party is attached to, and the ones they can
	 * only read. The checkbox wears the calendar's colour, so the swatch and
	 * the switch are one control rather than two things to line up — and it
	 * wears it the way an event does: pastel fill, stroke of the hue, dark tick.
	 */
	let {
		calendars,
		primaryAccountId,
		onToggle,
		onAdd,
		adding = false
	}: {
		calendars: Calendar[];
		primaryAccountId: string | null;
		onToggle: (calendar: Calendar, visible: boolean) => void;
		onAdd: (name: string) => void;
		adding?: boolean;
	} = $props();

	function writable(calendar: Calendar): boolean {
		return calendar.myRights.mayWriteAll || calendar.myRights.mayWriteOwn;
	}

	const groups = $derived(
		[
			{
				label: 'Your calendars',
				items: calendars.filter(
					(calendar) =>
						writable(calendar) &&
						!calendar.shareWith &&
						(!primaryAccountId || !calendar.accountId || calendar.accountId === primaryAccountId)
				)
			},
			{
				label: 'Shared calendars',
				items: calendars.filter(
					(calendar) =>
						writable(calendar) &&
						(!!calendar.shareWith ||
							(!!primaryAccountId && !!calendar.accountId && calendar.accountId !== primaryAccountId))
				)
			},
			{ label: 'Read-only calendars', items: calendars.filter((calendar) => !writable(calendar)) }
		].filter((group) => group.items.length > 0)
	);

	let name = $state('');
</script>

<div class="flex-1 overflow-y-auto px-3 py-4">
	{#each groups as group (group.label)}
		<h2 class="mb-1.5 px-2 text-[12.5px] text-[var(--z-soft)] {group === groups[0] ? '' : 'mt-5'}">
			{group.label}
		</h2>
		<ul class="space-y-0.5" role="list">
			{#each group.items as calendar (calendar.accountId + calendar.id)}
				<li>
					<label
						class="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] font-medium text-[var(--z-body)] hover:bg-[var(--z-hover)]"
						style:--hue={calendar.color}
					>
						<input
							type="checkbox"
							class="peer sr-only"
							checked={calendar.isVisible}
							onchange={(changed) => onToggle(calendar, changed.currentTarget.checked)}
						/>
						<span class="box" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
						</span>
						<span class="truncate">{calendar.name}</span>
					</label>
				</li>
			{/each}
		</ul>
	{/each}
</div>

<form
	class="flex shrink-0 items-center gap-1.5 border-t border-[var(--z-hairline)] bg-[var(--z-canvas)] px-3 py-2.5"
	onsubmit={(submitted) => {
		submitted.preventDefault();
		if (!name.trim()) return;
		onAdd(name.trim());
		name = '';
	}}
>
	<input
		class="z-field !h-[28px] min-w-0 flex-1 text-[12.5px]"
		placeholder="New calendar"
		bind:value={name}
		maxlength="200"
	/>
	<button type="submit" class="btn-tactile !h-[28px] text-[12px]" disabled={adding || !name.trim()}>
		Add
	</button>
</form>

<style>
	.box {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: 1.5px solid var(--z-faint);
		border-radius: 5px;
		background: var(--z-surface);
		color: transparent;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.box svg {
		width: 12px;
		height: 12px;
	}

	:global(.peer:checked) + .box {
		border-color: color-mix(in oklab, var(--hue) 80%, var(--z-surface));
		border-bottom-width: 2px;
		background: color-mix(in oklab, var(--hue) 28%, var(--z-surface));
		color: color-mix(in oklab, var(--hue) 30%, var(--z-ink));
	}

	:global(.peer:focus-visible) + .box {
		outline: 2px solid var(--z-accent);
		outline-offset: 2px;
	}
</style>
