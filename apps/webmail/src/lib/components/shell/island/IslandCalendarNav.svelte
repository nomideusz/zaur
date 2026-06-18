<script lang="ts">
	import CalendarPlus from '$lib/components/icons/CalendarPlus.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText,
		SegmentGroupScroll
	} from '$lib/components/ui/segment-group';
	import {
		ISLAND_RAIL_ITEM_CLASS,
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS
	} from '$lib/shell/mobile-rail';
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	/* Calendar island — view switching (Week/Day/Agenda) lives here, mirroring the
	   mail island's tabs, so the calendar header keeps only its date navigation. */

	const views: { id: CalendarViewTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agenda' }
	];
</script>

<div class="z-mobile-island__tabs">
	<button
		type="button"
		class="z-mobile-island__icon-btn"
		aria-label="Apps and folders"
		aria-expanded={mobileIsland.navDrawerOpen}
		onclick={() => mobileIsland.openNavDrawer()}
	>
		<Menu class="size-[1.125rem]" aria-hidden="true" />
	</button>

	<nav class="min-w-0 flex-1" aria-label="Calendar views">
		<SegmentGroupScroll activeValue={calendar.activeView} class="w-full">
			<SegmentGroup
				value={calendar.activeView}
				onValueChange={(value) => (calendar.activeView = value as CalendarViewTab)}
				track={false}
				indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
				class={MOBILE_RAIL_GROUP_CLASS}
			>
				{#each views as view (view.id)}
					<SegmentGroupItem value={view.id} class={ISLAND_RAIL_ITEM_CLASS}>
						<SegmentGroupItemText>{view.label}</SegmentGroupItemText>
					</SegmentGroupItem>
				{/each}
			</SegmentGroup>
		</SegmentGroupScroll>
	</nav>

	{#if calendar.supported !== false}
		<button
			type="button"
			class="z-mobile-island__icon-btn z-mobile-island__icon-btn--accent"
			aria-label="New event"
			onclick={() => calendar.openCompose()}
		>
			<CalendarPlus class="size-[1.125rem]" aria-hidden="true" />
		</button>
	{:else}
		<div class="size-11 shrink-0" aria-hidden="true"></div>
	{/if}
</div>
