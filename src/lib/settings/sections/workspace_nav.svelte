<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<SettingsGroup title="Getting around" description="Home screen, tools, search, and folders.">
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

		<SettingsRow
			title="Compact home screen"
			description="Tighter welcome screen with smaller tool cards — only applies when Home is visible"
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

		<SettingsRow
			title="Tool icons only"
			description="Hide Mail, Calendar, and other tool names in the top bar — icons with tooltips only"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.toolIconsOnly}
				onchange={(e) => settings.setToolIconsOnly(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact tool switcher"
			description="Tighter padding on Mail, Calendar, and Home tabs in the top bar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactToolSwitcher}
				onchange={(e) => settings.setCompactToolSwitcher(e.currentTarget.checked)}
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

		<SettingsRow
			title="Hide offline indicator"
			description="Do not show the offline badge in the header when you lose connection"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideOfflineIndicator}
				onchange={(e) => settings.setHideOfflineIndicator(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact offline indicator"
			description="Smaller offline badge in the header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactOfflineIndicator}
				onchange={(e) => settings.setCompactOfflineIndicator(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact toasts"
			description="Smaller notification popups in the bottom-right corner"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactToasts}
				onchange={(e) => settings.setCompactToasts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide toast icons"
			description="Text-only notification popups — no success, error, or info icons"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideToastIcons}
				onchange={(e) => settings.setHideToastIcons(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide outbox unless failed"
			description="Do not show the outbox icon while messages are sending — only when a send fails"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideOutboxUnlessFailed}
				onchange={(e) => settings.setHideOutboxUnlessFailed(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact outbox menu"
			description="Tighter spacing in the queued-messages dropdown from the header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactOutboxMenu}
				onchange={(e) => settings.setCompactOutboxMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>

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
			title="Hide search list prefix"
			description="Show the query alone in search results — no “Search:” label"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSearchListPrefix}
				onchange={(e) => settings.setHideSearchListPrefix(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact mobile search"
			description="Less padding on the search field bar on mobile"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactMobileSearch}
				onchange={(e) => settings.setCompactMobileSearch(e.currentTarget.checked)}
			/>
		</SettingsRow>

</SettingsGroup>
