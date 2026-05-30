<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Month view" description="Calendar grid behavior.">
	<SettingsRow title="Week starts on Monday" description="Use Monday as the first column instead of Sunday">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(e) => settings.setCalendarWeekStartsOnMonday(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Events per day" description="How many event chips appear on a day before “+N more”">
		<SettingsSelect
			label="Events per day"
			value={String(settings.calendarMaxEventsPerDay)}
			options={[
				{ value: '2', label: '2' },
				{ value: '3', label: '3' },
				{ value: '5', label: '5' }
			]}
			onchange={(v) =>
				settings.setCalendarMaxEventsPerDay(Number(v) as CalendarMaxEventsPerDay)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Show event times" description="Display start time next to each event title">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hideCalendarEventTimes}
			onchange={(e) => settings.setHideCalendarEventTimes(!e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset calendar settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset calendar settings to defaults?')) {
					settings.resetCalendarSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
