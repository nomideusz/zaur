<script lang="ts">
	import { calendar, type CalendarViewTab } from '$lib/stores/calendar.svelte';
	import {
		SegmentGroup,
		SegmentGroupItem,
		SegmentGroupItemText
	} from '$lib/components/ui/segment-group';

	const tabs: { id: CalendarViewTab; label: string }[] = [
		{ id: 'week', label: 'Week' },
		{ id: 'day', label: 'Day' },
		{ id: 'agendas', label: 'Agendas' }
	];
</script>

<nav class="min-w-0 md:hidden" aria-label="Calendar navigation">
	<SegmentGroup
		value={calendar.activeView}
		track={false}
		indicatorClass="z-segment-group__indicator--accent rounded-md"
		class="rounded-lg px-0.5"
		onValueChange={(value) => (calendar.activeView = value as CalendarViewTab)}
	>
		{#each tabs as tab (tab.id)}
			<SegmentGroupItem
				value={tab.id}
				class="px-2.5 py-1.5 text-sm font-medium text-fg-muted data-[state=checked]:font-semibold data-[state=checked]:text-fg"
			>
				<SegmentGroupItemText>{tab.label}</SegmentGroupItemText>
			</SegmentGroupItem>
		{/each}
	</SegmentGroup>
</nav>
