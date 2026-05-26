<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Month view" description="Calendar grid behavior.">
	<SettingsRow title="Week starts on Monday" description="Use Monday as the first column instead of Sunday">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(e) => settings.setCalendarWeekStartsOnMonday(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Events per day" description="How many event chips appear on a day before “+N more”">
		<select
			class="z-input w-auto"
			value={String(settings.calendarMaxEventsPerDay)}
			onchange={(e) =>
				settings.setCalendarMaxEventsPerDay(
					Number(e.currentTarget.value) as CalendarMaxEventsPerDay
				)}
		>
			<option value="2">2</option>
			<option value="3">3</option>
			<option value="5">5</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Show event times" description="Display start time next to each event title">
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
