<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Month view">
	<SettingsRow title="Week starts on Monday">
		<input
			type="checkbox"
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(e) => settings.setCalendarWeekStartsOnMonday(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Events per day">
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

	<SettingsRow title="Show event times">
		<input
			type="checkbox"
			checked={!settings.hideCalendarEventTimes}
			onchange={(e) => settings.setHideCalendarEventTimes(!e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset calendar settings">
		<button
			type="button"
			class="z-btn-ghost"
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
