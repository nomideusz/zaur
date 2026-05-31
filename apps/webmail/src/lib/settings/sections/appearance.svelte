<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';

	const themeModeOptions = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];
</script>

<SettingsGroup title="Theme" description="Color mode and motion.">
	<SettingsRow title="Color mode" description="Also available in the account menu">
		<SettingsSelect
			label="Color mode"
			value={theme.mode}
			options={themeModeOptions}
			onchange={(v) => theme.set(v as ThemeMode)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Reduce motion" description="Turn off page transitions and loading animations">
		<input
			type="checkbox"
			checked={settings.reduceMotion}
			onchange={(e) => settings.setReduceMotion(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset theme settings" description="Restore color mode and motion on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset theme settings to defaults?')) {
					settings.resetLookAndFeel();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
