<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Reset" description="Restore defaults without affecting your account profile.">
	<SettingsRow
		title="Reset all settings"
		description="Restore appearance, reading, writing, and calendar options to defaults"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset all settings to defaults? Your display name and signature are unchanged.')) {
					settings.resetAllSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
