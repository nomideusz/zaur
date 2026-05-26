<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Startup" description="Where you land when opening the app.">
	<SettingsRow
		title="Remember last mailbox"
		description="Open your last folder instead of Inbox when signing in"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Mail-only navigation"
		description="Hide Calendar and Contacts from the top bar"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.mailOnlyNavigation}
			onchange={(e) => settings.setMailOnlyNavigation(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Folder sidebar" description="Mailbox list on the left.">
	<SettingsRow
		title="Show folder unread counts"
		description="Unread badges on folders"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showFolderUnreadCounts}
			onchange={(e) => settings.setShowFolderUnreadCounts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide folder icons" description="Text-only folder names">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideFolderIcons}
			onchange={(e) => settings.setHideFolderIcons(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide sidebar shortcuts"
		description="Remove Contacts, Calendar, and Settings links at the bottom"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideSidebarShortcuts}
			onchange={(e) => settings.setHideSidebarShortcuts(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Search" description="Sidebar search on desktop; mobile uses the top bar.">
	<SettingsRow
		title="Hide sidebar search"
		description="Mobile search and / shortcut still work"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideHeaderSearch}
			onchange={(e) => settings.setHideHeaderSearch(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideHeaderSearch}
		inactiveReason={settings.hideHeaderSearch ? 'Sidebar search is hidden' : 'Search options'}
	>
		<SettingsRow
			title="Search contact suggestions"
			description="Contact matches while typing in sidebar search"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSearchContactSuggestions}
				onchange={(e) => settings.setShowSearchContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Density" description="Tighter spacing in the folder sidebar." advanced>
	<SettingsRow title="Compact folder sidebar" description="Tighter folder rows and padding">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactFolderSidebar}
			onchange={(e) => settings.setCompactFolderSidebar(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.showFolderUnreadCounts}
		inactiveReason={settings.showFolderUnreadCounts
			? 'Folder badge appearance'
			: 'Turn on folder unread counts to adjust badge size'}
	>
		<SettingsRow title="Compact folder badges" description="Smaller unread badges">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderBadges}
				onchange={(e) => settings.setCompactFolderBadges(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset sidebar settings" description="Restore startup, sidebar, and search on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset sidebar settings to defaults?')) {
					settings.resetWorkspaceSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
