<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Defaults" description="Restore or simplify your setup.">
	<SettingsRow
		title="Apply simple mode"
		description="One step to a minimal mail-only layout — you can still tweak individual options afterward"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Apply simple mode? This updates many display and navigation settings at once.')) {
					settings.applySimpleMode();
				}
			}}
		>
			Apply
		</button>
	</SettingsRow>

	<SettingsRow
		title="Reset all display & layout settings"
		description="Reset every display, layout, and navigation option across the app — not mail behavior like notifications"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (
					confirm(
						'Reset all display and layout settings to defaults? Mail behavior (notifications, shortcuts) is unchanged.'
					)
				) {
					settings.resetDisplaySettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
