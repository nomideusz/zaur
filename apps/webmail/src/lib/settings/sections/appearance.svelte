<script lang="ts">
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

<SettingsRow title="Color mode">
	<SettingsSelect
		label="Color mode"
		value={theme.mode}
		options={themeModeOptions}
		onchange={(v) => theme.set(v as ThemeMode)}
		class="w-auto"
	/>
</SettingsRow>

<SettingsRow title="Reduce motion">
	<input
		type="checkbox"
		checked={settings.reduceMotion}
		onchange={(e) => settings.setReduceMotion(e.currentTarget.checked)}
	/>
</SettingsRow>
