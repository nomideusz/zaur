<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<SettingsGroup title="Theme & motion" description="Colors, motion, and loading placeholders.">
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

		<SettingsRow
			title="Minimal loading states"
			description="Show simple loading text instead of animated skeleton placeholders"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.minimalLoadingStates}
				onchange={(e) => settings.setMinimalLoadingStates(e.currentTarget.checked)}
			/>
		</SettingsRow>

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

		<SettingsRow
			title="Compact folder sidebar error"
			description="Smaller folder load error message and retry button in the sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderSidebarError}
				onchange={(e) => settings.setCompactFolderSidebarError(e.currentTarget.checked)}
			/>
		</SettingsRow>

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
