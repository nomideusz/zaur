<script lang="ts">
	import AccentColorPicker from '$lib/components/settings/AccentColorPicker.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type LoadingIndicatorStyle } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { visual } from '$lib/stores/visual.svelte';
	import {
		CORNER_OPTIONS,
		SURFACE_OPTIONS,
		type CornerStyle,
		type SurfaceStyle
	} from '$lib/theme/visual';
</script>

<SettingsGroup title="Theme" description="Color mode and accent.">
	<SettingsRow title="Color mode" description="Also available in the account menu">
		<select
			class="z-input w-auto"
			bind:value={
				() => theme.mode,
				(v) => theme.set(v as ThemeMode)
			}
		>
			<option value="system">System</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
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
		<select
			class="z-input w-auto"
			value={visual.cornerStyle}
			onchange={(e) => visual.setCornerStyle(e.currentTarget.value as CornerStyle)}
		>
			{#each CORNER_OPTIONS as option (option.id)}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	</SettingsRow>

	<SettingsRow title="Surface tone" description="Softer backgrounds and borders">
		<select
			class="z-input w-auto"
			value={visual.surfaceStyle}
			onchange={(e) => visual.setSurfaceStyle(e.currentTarget.value as SurfaceStyle)}
		>
			{#each SURFACE_OPTIONS as option (option.id)}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	</SettingsRow>

	<SettingsRow title="Loading indicator" description="Placeholder shown while content loads">
		<select
			class="z-input w-auto"
			value={settings.loadingIndicatorStyle}
			onchange={(e) =>
				settings.setLoadingIndicatorStyle(e.currentTarget.value as LoadingIndicatorStyle)}
		>
			<option value="skeleton">Skeleton</option>
			<option value="minimal">Text only</option>
			<option value="spinner">Spinner</option>
		</select>
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
