<script lang="ts">
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText
	} from '$lib/components/ui/segment-group';
	import {
		MOBILE_RAIL_GROUP_CLASS,
		MOBILE_RAIL_INDICATOR_CLASS,
		MOBILE_RAIL_ITEM_CLASS
	} from '$lib/shell/mobile-rail';

	const tabs: { id: CalendarViewTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agenda' }
	];
</script>

<nav class="min-w-0 md:hidden" aria-label="Calendar navigation">
	<SegmentGroup
		value={calendar.activeView}
		track={false}
		indicatorClass={MOBILE_RAIL_INDICATOR_CLASS}
		class={MOBILE_RAIL_GROUP_CLASS}
		onValueChange={(value) => (calendar.activeView = value as CalendarViewTab)}
	>
		{#each tabs as tab (tab.id)}
			<SegmentGroupItem
				value={tab.id}
				class={MOBILE_RAIL_ITEM_CLASS}
			>
				<SegmentGroupItemText>{tab.label}</SegmentGroupItemText>
			</SegmentGroupItem>
		{/each}
	</SegmentGroup>
</nav>
