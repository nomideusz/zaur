<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { getWebmailModeContext } from '$lib/modes/context';
	import { settings } from '$lib/stores/settings.svelte';

	const isSimple = $derived(getWebmailModeContext().id === 'simple');
</script>

<SettingsGroup title="Reset" description={isSimple ? 'Restore reading and navigation defaults.' : 'Restore display and layout defaults.'}>
	<SettingsRow
		title="Reset all display & layout settings"
		description={isSimple
			? 'Restore reading focus, navigation, and search options — keeps notifications and shortcuts'
			: 'Restore every display, layout, and navigation option — keeps notifications and shortcuts'}
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
