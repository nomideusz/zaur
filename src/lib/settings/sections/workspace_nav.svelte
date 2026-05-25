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
			<SettingsRow
				title="Compact home screen"
				description="Tighter welcome screen with smaller tool cards"
			>
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
				description="Show only tool names on the welcome screen cards — no subtitle under each"
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
			description="Open your last visited folder instead of Inbox when signing in or clicking Mail"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.rememberLastMailbox}
				onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
			/>
		</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Folders & sidebar" description="Folder sidebar, unread badges, and shortcuts.">
		<SettingsRow
			title="Show folder unread counts"
			description="Unread badges on folders in the sidebar and mobile folder picker"
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
			<SettingsRow
				title="Compact folder badges"
				description="Smaller unread count badges on folders in the sidebar"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactFolderBadges}
					onchange={(e) => settings.setCompactFolderBadges(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

		<SettingsRow
			title="Hide sidebar shortcuts"
			description="Remove Contacts and Settings links from the mail folder sidebar — they stay in the top bar"
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
				? 'Sidebar shortcuts are hidden — show them above to change spacing'
				: 'Sidebar shortcut spacing'}
		>
			<SettingsRow
				title="Compact sidebar shortcuts"
				description="Tighter Contacts and Settings links at the bottom of the folder sidebar"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactSidebarShortcuts}
					onchange={(e) => settings.setCompactSidebarShortcuts(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Navigation" description="Which tools appear in the top bar.">
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

<SettingsGroup title="Search" description="Global search in the top bar.">
		<SettingsRow
			title="Hide header search"
			description="Remove the search bar from the top bar — search remains on mobile via the icon"
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
				? 'Header search is hidden — show it above to adjust search options'
				: 'Header search options'}
		>
			<SettingsRow
				title="Search contact suggestions"
				description="Contact matches while typing in the header search bar"
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
				description="Remove section labels like “Contacts” in the header search suggestions"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.hideSearchDropdownHeaders}
					onchange={(e) => settings.setHideSearchDropdownHeaders(e.currentTarget.checked)}
				/>
			</SettingsRow>

			<SettingsRow
				title="Compact search dropdown"
				description="Tighter spacing in header search suggestion results"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactSearchDropdown}
					onchange={(e) => settings.setCompactSearchDropdown(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>
</SettingsGroup>
