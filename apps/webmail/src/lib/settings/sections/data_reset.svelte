<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Reset" description="Restore reading and navigation defaults.">
	<SettingsRow
		title="Reset all display & layout settings"
		description="Restore reading focus, navigation, and search options — keeps notifications and shortcuts"
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
