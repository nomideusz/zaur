<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';

	const themeModeOptions = [
		{ value: 'circadian', label: 'Automatic' },
		{ value: 'light', label: 'Fixed light' },
		{ value: 'dark', label: 'Fixed dark' }
	];
</script>

<SettingsGroup title="Theme & Motion">
	<SettingsRow kind="menu" title="Appearance" description="Automatic adjusts subtly through the day.">
		<SettingsSelect
			label="Appearance"
			value={theme.mode}
			options={themeModeOptions}
			onchange={(v) => theme.set(v as ThemeMode)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Reduce motion">
		<Switch
			checked={settings.reduceMotion}
			onchange={(checked) => settings.setReduceMotion(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
