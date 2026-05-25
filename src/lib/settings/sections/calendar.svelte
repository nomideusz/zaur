<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type CalendarMaxEventsPerDay } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Month grid" description="Layout of the calendar month view.">
	<SettingsRow
		title="Compact calendar grid"
		description="Smaller day cells with tighter spacing in the month grid"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCalendarGrid}
			onchange={(e) => settings.setCompactCalendarGrid(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact calendar header"
		description="Shorter month navigation bar above the grid"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCalendarHeader}
			onchange={(e) => settings.setCompactCalendarHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Week starts on Monday"
		description="Use Monday as the first column in the month grid"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.calendarWeekStartsOnMonday}
			onchange={(e) => settings.setCalendarWeekStartsOnMonday(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Events in grid" description="How events appear on each day.">
	<SettingsRow
		title="Events shown per day"
		description="How many event chips appear before a “more” label"
	>
		<select
			class="z-input w-auto"
			value={String(settings.calendarMaxEventsPerDay)}
			onchange={(e) =>
				settings.setCalendarMaxEventsPerDay(Number(e.currentTarget.value) as CalendarMaxEventsPerDay)}
		>
			<option value="2">2</option>
			<option value="3">3</option>
			<option value="5">5</option>
		</select>
	</SettingsRow>

	<SettingsRow
		title="Hide event times in grid"
		description="Show only event titles on day cells — no start times"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarEventTimes}
			onchange={(e) => settings.setHideCalendarEventTimes(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide more-events label"
		description="Do not show “+N more” when a day has additional events"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarMoreEventsLabel}
			onchange={(e) => settings.setHideCalendarMoreEventsLabel(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Calendar sidebar" description="The calendar list on the left." advanced>
	<SettingsRow
		title="Compact calendar sidebar"
		description="Tighter spacing on calendar checkboxes in the sidebar"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCalendarSidebar}
			onchange={(e) => settings.setCompactCalendarSidebar(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide calendar sidebar header"
		description="Remove the Calendars label above the calendar list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarSidebarHeader}
			onchange={(e) => settings.setHideCalendarSidebarHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide calendar settings link"
		description="Remove the Settings shortcut at the bottom of the calendar sidebar"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarSidebarSettings}
			onchange={(e) => settings.setHideCalendarSidebarSettings(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Month header" description="Navigation and actions above the grid." advanced>
	<SettingsRow
		title="Hide new event button"
		description="Remove the New event button from the month header"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarNewEventButton}
			onchange={(e) => settings.setHideCalendarNewEventButton(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideCalendarNewEventButton}
		inactiveReason={settings.hideCalendarNewEventButton
			? 'New event button is hidden'
			: 'New event button appearance'}
	>
		<SettingsRow
			title="Icon-only new event button"
			description="Show only the plus icon on desktop — no New event label"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyCalendarNewEvent}
				onchange={(e) => settings.setIconOnlyCalendarNewEvent(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Event details" description="The panel when an event is selected." advanced>
	<SettingsRow
		title="Compact event panel"
		description="Less padding in the event details panel"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCalendarEventPanel}
			onchange={(e) => settings.setCompactCalendarEventPanel(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide empty event panel"
		description="Leave the right pane blank until an event is selected — no placeholder message"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarEmptyEventPanel}
			onchange={(e) => settings.setHideCalendarEmptyEventPanel(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideCalendarEmptyEventPanel}
		inactiveReason={settings.hideCalendarEmptyEventPanel
			? 'Empty event panel is hidden'
			: 'Empty event panel appearance'}
	>
		<SettingsRow
			title="Compact empty event panel"
			description="Less padding and a smaller icon when no event is selected"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactCalendarEmptyEventPanel}
				onchange={(e) => settings.setCompactCalendarEmptyEventPanel(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Create & edit events" description="The event compose drawer." advanced>
	<SettingsRow
		title="Compact event compose"
		description="Less padding in the new and edit event panel"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCalendarCompose}
			onchange={(e) => settings.setCompactCalendarCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide compose field labels"
		description="Remove field labels in the event form — placeholders stay"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarComposeFieldLabels}
			onchange={(e) => settings.setHideCalendarComposeFieldLabels(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Dividers" description="Lines between calendar panes." advanced>
	<SettingsRow
		title="Hide calendar pane borders"
		description="Remove divider lines between the sidebar, month grid, and event panel"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideCalendarPaneBorders}
			onchange={(e) => settings.setHideCalendarPaneBorders(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset calendar settings"
		description="Restore every calendar option on this page to its original value"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset all calendar settings to defaults?')) {
					settings.resetCalendarSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
