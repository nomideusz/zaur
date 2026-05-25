<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Folder sidebar" description="Mailbox tree in the left panel.">
		<SettingsRow
			title="Hide folder sidebar header"
			description="Remove the “Folders” label above the mailbox tree"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideFolderSidebarHeader}
				onchange={(e) => settings.setHideFolderSidebarHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsDepends
			enabled={!settings.hideFolderSidebarHeader}
			inactiveReason={settings.hideFolderSidebarHeader
				? 'Folder sidebar header is hidden'
				: 'Folder sidebar header'}
		>
			<SettingsRow
				title="Compact folder sidebar header"
				description="Less padding around the Folders label in the sidebar"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactFolderSidebarHeader}
					onchange={(e) => settings.setCompactFolderSidebarHeader(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

		<SettingsRow
			title="Hide folder icons"
			description="Text-only folder names in the sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideFolderIcons}
				onchange={(e) => settings.setHideFolderIcons(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact folder sidebar"
			description="Tighter spacing on folder rows and sidebar padding"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderSidebar}
				onchange={(e) => settings.setCompactFolderSidebar(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact folder tree"
			description="Less indentation and spacing for nested folders in the sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderTree}
				onchange={(e) => settings.setCompactFolderTree(e.currentTarget.checked)}
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

</SettingsGroup>

<SettingsGroup title="Mail layout" description="How the list and reading panes share space on desktop.">
	<SettingsRow
		title="Compact layout"
		description="Narrower folder sidebar and message list on desktop — separate from list density in Inbox"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactLayout}
			onchange={(e) => settings.setCompactLayout(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide pane borders"
		description="Remove divider lines between the header, folder sidebar, and message list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hidePaneBorders}
			onchange={(e) => settings.setHidePaneBorders(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Expand list until opened"
		description="Use the full width for the message list on desktop until you pick a message"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.expandListUntilOpen}
			onchange={(e) => settings.setExpandListUntilOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="App header" description="Top bar, New buttons, and account menu.">
	<SettingsRow
		title="Compact header actions"
		description="Icon-only New and New event buttons in the top bar — saves horizontal space"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactHeaderActions}
			onchange={(e) => settings.setCompactHeaderActions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact app header"
		description="Shorter top bar with less horizontal padding and spacing"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactAppHeader}
			onchange={(e) => settings.setCompactAppHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide app title"
		description="Remove the ZAUR label from the top bar — the logo link still works for screen readers"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideAppTitle}
			onchange={(e) => settings.setHideAppTitle(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact account menu"
		description="Show only your avatar in the account button — no dropdown chevron"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactUserMenu}
			onchange={(e) => settings.setCompactUserMenu(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact account menu dropdown"
		description="Tighter spacing in the account menu panel — name, settings, theme, and sign out"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactUserMenuDropdown}
			onchange={(e) => settings.setCompactUserMenuDropdown(e.currentTarget.checked)}
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

	<SettingsDepends
		enabled={!settings.hideOfflineIndicator}
		inactiveReason={settings.hideOfflineIndicator
			? 'Offline indicator is hidden'
			: 'Offline indicator appearance'}
	>
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
	</SettingsDepends>

	<SettingsRow
		title="Hide outbox unless failed"
		description="When on, hide the outbox icon while messages are queued or sending — show it only after a send fails. When off, the icon stays in the header even when the queue is empty"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideOutboxUnlessFailed}
			onchange={(e) => settings.setHideOutboxUnlessFailed(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideOutboxUnlessFailed}
		inactiveReason={settings.hideOutboxUnlessFailed
			? 'Outbox icon only appears when a send fails'
			: 'Outbox menu appearance when visible'}
	>
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
	</SettingsDepends>

	<SettingsRow
		title="Compact mobile search"
		description="Less padding on the search field in the top bar on mobile"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactMobileSearch}
			onchange={(e) => settings.setCompactMobileSearch(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset workspace settings"
		description="Restore layout, sidebar, and navigation options on this page to their original values"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset all workspace settings to defaults?')) {
					settings.resetWorkspaceSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
