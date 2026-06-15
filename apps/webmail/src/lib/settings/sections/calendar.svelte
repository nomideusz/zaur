<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Calendar">
	<SettingsRow
		kind="toggle"
		title="Week starts on Monday"
		description="Begin each calendar week on Monday instead of Sunday."
	>
		<Switch
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(checked) => settings.setCalendarWeekStartsOnMonday(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Hide event times"
		description="Show events by title only, without their start and end times."
	>
		<Switch
			checked={settings.hideCalendarEventTimes}
			onchange={(checked) => settings.setHideCalendarEventTimes(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Events per day in month view"
		description="How many events to list under a day before the rest collapse into a count."
	>
		<SettingsSelect
			label="Events per day in month view"
			value={String(settings.calendarMaxEventsPerDay)}
			options={[
				{ value: '2', label: '2' },
				{ value: '3', label: '3' },
				{ value: '5', label: '5' }
			]}
			onchange={(v) => {
				if (v === '2' || v === '3' || v === '5') {
					settings.setCalendarMaxEventsPerDay(Number(v) as CalendarMaxEventsPerDay);
				}
			}}
		/>
	</SettingsRow>
</SettingsGroup>
