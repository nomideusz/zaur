<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Home screen" description="Welcome screen and where Mail opens.">
	<SettingsRow
		title="Skip home screen"
		description="Open inbox directly — hides the Home tab and welcome screen"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.skipHomeScreen}
			onchange={(e) => settings.setSkipHomeScreen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.skipHomeScreen}
		inactiveReason={settings.skipHomeScreen
			? 'Turn off “Skip home screen” above to adjust the welcome screen'
			: 'Welcome screen options'}
	>
		<SettingsRow title="Compact home screen" description="Tighter welcome screen with smaller tool cards">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactHomeScreen}
				onchange={(e) => settings.setCompactHomeScreen(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide home screen subtitle"
			description="Remove the “Choose a tool to get started” line under Welcome back"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideHomeScreenSubtitle}
				onchange={(e) => settings.setHideHomeScreenSubtitle(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide home card descriptions"
			description="Tool names only on welcome cards — no subtitle under each"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideHomeCardDescriptions}
				onchange={(e) => settings.setHideHomeCardDescriptions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide open inbox button"
			description="Remove the Open inbox button at the bottom of the home screen"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideHomeOpenInboxButton}
				onchange={(e) => settings.setHideHomeOpenInboxButton(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Remember last mailbox"
		description="Open your last visited folder instead of Inbox when signing in"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Sidebar" description="Folder list, unread badges, and shortcuts at the bottom.">
	<SettingsRow
		title="Show folder unread counts"
		description="Unread badges on folders and in the mobile folder picker"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showFolderUnreadCounts}
			onchange={(e) => settings.setShowFolderUnreadCounts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.showFolderUnreadCounts}
		inactiveReason={settings.showFolderUnreadCounts
			? 'Folder badge appearance'
			: 'Turn on folder unread counts above to adjust badge size'}
	>
		<SettingsRow title="Compact folder badges" description="Smaller unread badges on folders">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderBadges}
				onchange={(e) => settings.setCompactFolderBadges(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow title="Hide folder icons" description="Text-only folder names">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideFolderIcons}
			onchange={(e) => settings.setHideFolderIcons(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact folder sidebar" description="Tighter folder rows and sidebar padding">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactFolderSidebar}
			onchange={(e) => settings.setCompactFolderSidebar(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact folder tree" description="Less indentation for nested folders">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactFolderTree}
			onchange={(e) => settings.setCompactFolderTree(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide sidebar shortcuts"
		description="Remove Contacts, Calendar, and Settings links at the bottom of the sidebar"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideSidebarShortcuts}
			onchange={(e) => settings.setHideSidebarShortcuts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideSidebarShortcuts}
		inactiveReason={settings.hideSidebarShortcuts
			? 'Sidebar shortcuts are hidden'
			: 'Sidebar shortcut spacing'}
	>
		<SettingsRow title="Compact sidebar shortcuts" description="Tighter spacing on shortcut links">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSidebarShortcuts}
				onchange={(e) => settings.setCompactSidebarShortcuts(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup
	title="Search"
	description="Search field at the top of the mail sidebar on desktop. On mobile, use the search icon in the top bar."
>
	<SettingsRow
		title="Hide sidebar search"
		description="Remove search from the sidebar — mobile search icon and / shortcut still work on the search page"
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
		inactiveReason={settings.hideHeaderSearch
			? 'Sidebar search is hidden'
			: 'Sidebar search options'}
	>
		<SettingsRow title="Compact search field" description="Less padding around the sidebar search box">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderSidebarHeader}
				onchange={(e) => settings.setCompactFolderSidebarHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Search contact suggestions"
			description="Contact matches while typing in the sidebar search field"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSearchContactSuggestions}
				onchange={(e) => settings.setShowSearchContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide search dropdown headers"
			description="Remove section labels like “Contacts” in search suggestions"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSearchDropdownHeaders}
				onchange={(e) => settings.setHideSearchDropdownHeaders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow title="Compact search dropdown" description="Tighter spacing in search suggestion results">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSearchDropdown}
				onchange={(e) => settings.setCompactSearchDropdown(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Navigation" description="Which tools appear in the top bar on non-mail pages.">
	<SettingsRow
		title="Mail-only navigation"
		description="Hide Calendar and Contacts from the top bar — for a focused mail experience"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.mailOnlyNavigation}
			onchange={(e) => settings.setMailOnlyNavigation(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>
