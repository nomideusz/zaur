<script lang="ts">
	import AccentColorPicker from '$lib/components/settings/AccentColorPicker.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type LoadingIndicatorStyle } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { visual } from '$lib/stores/visual.svelte';
	import {
		CORNER_OPTIONS,
		SURFACE_OPTIONS,
		type CornerStyle,
		type SurfaceStyle
	} from '$lib/theme/visual';

	const themeModeOptions = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	const loadingIndicatorOptions = [
		{ value: 'skeleton', label: 'Skeleton' },
		{ value: 'minimal', label: 'Text only' },
		{ value: 'spinner', label: 'Spinner' }
	];
</script>

<SettingsGroup title="Theme" description="Color mode and accent.">
	<SettingsRow title="Color mode" description="Also available in the account menu">
		<SettingsSelect
			label="Color mode"
			value={theme.mode}
			options={themeModeOptions}
			onchange={(v) => theme.set(v as ThemeMode)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Accent color" description="Buttons, links, and unread highlights">
		<AccentColorPicker value={visual.accentColor} onchange={(value) => visual.setAccentColor(value)} />
	</SettingsRow>

	<SettingsRow title="Reduce motion" description="Turn off page transitions and loading animations">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.reduceMotion}
			onchange={(e) => settings.setReduceMotion(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Style" description="Corners, surface tone, and loading.">
	<SettingsRow title="Corner style" description="Roundness of buttons and panels">
		<SettingsSelect
			label="Corner style"
			value={visual.cornerStyle}
			options={CORNER_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
			onchange={(v) => visual.setCornerStyle(v as CornerStyle)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Surface tone" description="Softer backgrounds and borders">
		<SettingsSelect
			label="Surface tone"
			value={visual.surfaceStyle}
			options={SURFACE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
			onchange={(v) => visual.setSurfaceStyle(v as SurfaceStyle)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Loading indicator" description="Placeholder shown while content loads">
		<SettingsSelect
			label="Loading indicator"
			value={settings.loadingIndicatorStyle}
			options={loadingIndicatorOptions}
			onchange={(v) => settings.setLoadingIndicatorStyle(v as LoadingIndicatorStyle)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset theme settings" description="Restore theme, accent, and motion on this page">
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
