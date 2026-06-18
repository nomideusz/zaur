<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { sampleCircadian } from '@zaur/ui/circadian';

	const themeModeOptions = [
		{ value: 'circadian', label: 'Automatic' },
		{ value: 'light', label: 'Fixed light' },
		{ value: 'dark', label: 'Fixed dark' }
	];

	const appearanceDescription = $derived(
		theme.mode === 'circadian'
			? `Automatic follows the time of day — ${sampleCircadian().phase} right now.`
			: 'Automatic adjusts subtly through the day.'
	);
</script>

<SettingsGroup title="Theme & Motion">
	<SettingsRow kind="menu" title="Appearance" description={appearanceDescription}>
		<SettingsSelect
			label="Appearance"
			value={theme.mode}
			options={themeModeOptions}
			onchange={(v) => theme.set(v as ThemeMode)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Reduce motion"
		description="Minimize animations and transitions throughout the app."
	>
		<Switch
			checked={settings.reduceMotion}
			onchange={(checked) => settings.setReduceMotion(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Navigation">
	<SettingsRow
		kind="toggle"
		title="Show search bar"
		description="Show the search bar at the top of mail, contacts, calendar, and settings. You can also hide it from the bar itself."
	>
		<Switch
			checked={settings.showSearchBar}
			onchange={(checked) => settings.setShowSearchBar(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
