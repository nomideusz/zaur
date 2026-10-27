<script lang="ts">
	import type { Calendar } from '@zaur/mail-core';

	/**
	 * The calendars, in the three groups a person actually holds them in:
	 * their own, the ones another party is attached to, and the ones they can
	 * only read. The checkbox wears the calendar's colour (`--z-check`), so the
	 * swatch and the switch are one control rather than two things to line up.
	 * Each row's settings — name, colour, sharing, deleting — open in the rail.
	 */
	let {
		calendars,
		primaryAccountId,
		onToggle,
		onEdit,
		onAdd,
		onImport,
		adding = false
	}: {
		calendars: Calendar[];
		primaryAccountId: string | null;
		onToggle: (calendar: Calendar, visible: boolean) => void;
		onEdit: (calendar: Calendar) => void;
		onAdd: (name: string) => void;
		/** Opens importing a file or subscribing by link. */
		onImport?: () => void;
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
		<h2 class="z-caption mb-1.5 px-2 {group === groups[0] ? '' : 'mt-5'}">
			{group.label}
		</h2>
		<ul class="space-y-0.5" role="list">
			{#each group.items as calendar (calendar.accountId + calendar.id)}
				<li class="group flex items-center gap-0.5 rounded-[8px] hover:bg-[var(--z-hover)]">
					<label
						class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-2 py-1.5 text-[14px] font-medium text-[var(--z-body)]"
						style:--z-check={calendar.color}
					>
						<input
							type="checkbox"
							class="z-check"
							checked={calendar.isVisible}
							onchange={(changed) => onToggle(calendar, changed.currentTarget.checked)}
						/>
						<!-- Two lines before it gives up: "Holidays in United States" is read, not guessed. -->
						<span class="min-w-0 line-clamp-2 break-words leading-snug" title={calendar.name}>{calendar.name}</span>
					</label>
					{#if calendar.isDefault}<span class="z-chip shrink-0">Default</span>{/if}
					<!-- Shown on hover where there is one; a finger has no hover, so it stays. -->
					<button
						type="button"
						class="z-icon-btn mr-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
						aria-label="Settings for {calendar.name}"
						onclick={() => onEdit(calendar)}
					>
						<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="8" r="1.25" /><circle cx="8" cy="8" r="1.25" /><circle cx="12.5" cy="8" r="1.25" /></svg>
					</button>
				</li>
			{/each}
		</ul>
	{/each}
	{#if onImport}
		<button type="button" class="mt-4 px-2 text-[12.5px] text-[var(--z-muted)] underline-offset-2 hover:text-[var(--z-ink)] hover:underline" onclick={onImport}>
			Import or subscribe…
		</button>
	{/if}
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
