<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type SearchScope } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Navigation" description="What's available in the top bar and where the app opens.">
	<SettingsRow title="Mail-only navigation" description="Hide Calendar and Contacts from the top bar and sidebar">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.mailOnlyNavigation}
			onchange={(e) => settings.setMailOnlyNavigation(e.currentTarget.checked)}
		/>
	</SettingsRow>

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

	<SettingsRow title="Show folder icons" description="Display an icon beside each folder name">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hideFolderIcons}
			onchange={(e) => settings.setHideFolderIcons(!e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact folder sidebar"
		description="Tighter folder rows and padding"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.compactFolderSidebar}
			onchange={(e) => settings.setCompactFolderSidebar(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show sidebar shortcuts"
		description="Contacts, Calendar, and Settings links at the bottom of the sidebar"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hideSidebarShortcuts}
			onchange={(e) => settings.setHideSidebarShortcuts(!e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Search" description="Sidebar search field on desktop; mobile uses the top bar.">
	<SettingsRow title="Show sidebar search" description="Mobile search and / shortcut still work when off">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hideHeaderSearch}
			onchange={(e) => settings.setHideHeaderSearch(!e.currentTarget.checked)}
		/>
	</SettingsRow>

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

	<SettingsDepends
		enabled={!settings.hideHeaderSearch}
		inactiveReason={settings.hideHeaderSearch ? 'Sidebar search is hidden' : undefined}
	>
		<SettingsRow title="Contact suggestions in search" description="Contact matches while typing in sidebar search">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.showSearchContactSuggestions}
				onchange={(e) => settings.setShowSearchContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Panes" description="Desktop layout for sidebar, message list, and reader.">
	<SettingsRow title="Compact layout" description="Narrower sidebar and message list">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.compactLayout}
			onchange={(e) => settings.setCompactLayout(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Expand list until opened"
		description="Full-width message list until you open a message"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.expandListUntilOpen}
			onchange={(e) => settings.setExpandListUntilOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Show pane borders" description="Divider lines between sidebar, list, and reader">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={!settings.hidePaneBorders}
			onchange={(e) => settings.setHidePaneBorders(!e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Top bar" description="App header behavior.">
	<SettingsRow title="Tool icons only" description="Hide Mail, Calendar, and Contacts labels in the top bar">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.toolIconsOnly}
			onchange={(e) => settings.setToolIconsOnly(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide outbox unless failed"
		description="Show the outbox icon only when a send fails"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.hideOutboxUnlessFailed}
			onchange={(e) => settings.setHideOutboxUnlessFailed(e.currentTarget.checked)}
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
