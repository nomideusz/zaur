<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { MAIL_VIEW_MODE_LABELS } from '$lib/mail/view-mode';
	import { settings, type MailViewMode, type SearchScope } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup
	title="Mail view"
	description="Simple focuses on one folder at a time. Traditional shows the classic sidebar, list, and reader together."
>
	<SettingsRow
		title="Mail view"
		description="Switch between the new simple experience and the classic 3-pane layout"
	>
		<SettingsSelect
			label="Mail view"
			value={settings.mailViewMode}
			options={(
				['simple', 'traditional'] as const
			).map((value) => ({
				value,
				label: MAIL_VIEW_MODE_LABELS[value]
			}))}
			onchange={(v) => settings.setMailViewMode(v as MailViewMode)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Navigation" description="Where mail opens and how search behaves.">
	<SettingsRow title="Remember last mailbox" description="Open your last folder instead of Inbox when signing in">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Folder sidebar" description="Mailbox list on the left.">
	<SettingsRow title="Show folder unread counts" description="Unread badges on folders">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showFolderUnreadCounts}
			onchange={(e) => settings.setShowFolderUnreadCounts(e.currentTarget.checked)}
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

<SettingsGroup title="Panes" description="Desktop layout for sidebar, message list, and reader.">
	<SettingsRow title="Show pane borders" description="Divider lines between sidebar, list, and reader">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hidePaneBorders}
			onchange={(e) => settings.setHidePaneBorders(!e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset layout settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset layout settings to defaults?')) {
					settings.resetWorkspaceSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
