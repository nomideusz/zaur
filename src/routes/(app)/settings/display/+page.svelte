<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<svelte:head>
	<title>Display · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Display"
	description="Appearance and how messages are shown in the list and reader."
>
	<SettingsGroup title="Appearance">
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
	</SettingsGroup>

	<SettingsGroup title="Inbox list">
		<SettingsRow
			title="List density"
			description="Row spacing — turn off previews below for a tighter list"
		>
			<select
				class="z-input w-auto"
				value={settings.listDensity}
				onchange={(e) => settings.setListDensity(e.currentTarget.value as ListDensity)}
			>
				<option value="comfortable">Comfortable</option>
				<option value="compact">Compact</option>
			</select>
		</SettingsRow>

		<SettingsRow title="Show message preview" description="Second line under the subject in the inbox list">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showListPreview}
				onchange={(e) => settings.setShowListPreview(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Reading">
		<SettingsRow title="Reading size" description="Text size when reading and writing messages">
			<select
				class="z-input w-auto"
				value={settings.readerTextSize}
				onchange={(e) => settings.setReaderTextSize(e.currentTarget.value as ReaderTextSize)}
			>
				<option value="normal">Normal</option>
				<option value="large">Large</option>
			</select>
		</SettingsRow>

		<SettingsRow
			title="Block external content"
			description="Block remote images in HTML mail — you can still show them once per message"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.blockExternalContent}
				onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>
</SettingsPanel>
