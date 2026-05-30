<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type SearchScope } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Reading focus">
	<SettingsRow
		title="Show list rail in reader"
		description="Keep a slim message list visible on the side when reading on desktop"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showReaderListRail}
			onchange={(e) => settings.setShowReaderListRail(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Navigation">
	<SettingsRow title="Remember last mailbox" description="Open your last folder instead of Inbox when signing in">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Search">
	<SettingsRow
		title="Default search scope"
		description="Start in the current folder when searching from a mailbox view, or always look everywhere"
	>
		<SettingsSelect
			label="Default search scope"
			value={settings.searchScope}
			options={[
				{ value: 'all', label: 'All mail' },
				{ value: 'current-folder', label: 'Current folder' }
			]}
			onchange={(v) => settings.setSearchScope(v as SearchScope)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset reading settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset reading settings to defaults?')) {
					settings.resetLayoutSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
