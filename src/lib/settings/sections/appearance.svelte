<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import AccentColorPicker from '$lib/components/settings/AccentColorPicker.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsUiSection from '$lib/settings/sections/settings_ui.svelte';
	import { settings, type LoadingIndicatorStyle } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { visual } from '$lib/stores/visual.svelte';
	import { CORNER_OPTIONS, SURFACE_OPTIONS, type CornerStyle, type SurfaceStyle } from '$lib/theme/visual';
</script>

<SettingsGroup title="Colors & shape" description="Accent color, corners, and surface tone.">
	<SettingsRow
		title="Accent color"
		description="Primary buttons, links, focus rings, and unread highlights"
	>
		<AccentColorPicker value={visual.accentColor} onchange={(value) => visual.setAccentColor(value)} />
	</SettingsRow>

	<SettingsRow title="Corner style" description="Roundness of buttons, inputs, and panels">
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

	<SettingsRow
		title="Surface tone"
		description="Softer backgrounds and borders for a calmer, lower-contrast look"
	>
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
</SettingsGroup>

<SettingsGroup title="Theme & motion" description="Light/dark mode, motion, and loading placeholders.">
	<SettingsRow title="Theme" description="Light, dark, or match your system — also in the account menu">
		<select
			class="z-input w-auto"
			value={theme.theme}
			onchange={(e) => theme.set(e.currentTarget.value as ThemeMode)}
		>
			<option value="system">System</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</SettingsRow>

	<SettingsRow
		title="Reduce motion"
		description="Turn off page transitions, loading animations, and other motion effects"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.reduceMotion}
			onchange={(e) => settings.setReduceMotion(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Loading states" description="Placeholders while mail, folders, and session restore load.">
	<SettingsRow
		title="Loading indicator"
		description="How loading placeholders appear in the message list, reader, and folder sidebar"
	>
		<select
			class="z-input w-auto"
			value={settings.loadingIndicatorStyle}
			onchange={(e) =>
				settings.setLoadingIndicatorStyle(e.currentTarget.value as LoadingIndicatorStyle)}
		>
			<option value="skeleton">Skeleton placeholders</option>
			<option value="minimal">Text only</option>
			<option value="spinner">Spinner</option>
		</select>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.loadingIndicatorStyle === 'skeleton'}
		inactiveReason={settings.loadingIndicatorStyle === 'skeleton'
			? 'Loading skeleton appearance'
			: 'Skeleton options apply only when loading indicator is set to skeleton placeholders'}
	>
		<SettingsRow
			title="Compact list loading skeleton"
			description="Fewer and tighter placeholder rows while messages load"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListLoadingSkeleton}
				onchange={(e) => settings.setCompactListLoadingSkeleton(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact reader skeleton"
			description="Smaller placeholder layout while a message loads in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderSkeleton}
				onchange={(e) => settings.setCompactReaderSkeleton(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact folder loading skeleton"
			description="Fewer and tighter placeholder rows while folders load in the sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderLoadingSkeleton}
				onchange={(e) => settings.setCompactFolderLoadingSkeleton(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Hide connecting screen"
		description="Blank screen while restoring your session — no “Connecting…” message"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideConnectingScreen}
			onchange={(e) => settings.setHideConnectingScreen(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset look & feel"
		description="Restore accent color, theme, motion, and loading options on this page"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset look & feel settings to defaults?')) {
					settings.resetLookAndFeel();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>

<SettingsUiSection />
