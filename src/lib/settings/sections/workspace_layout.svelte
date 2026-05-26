<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Mail layout" description="How the sidebar, list, and reader share space on desktop.">
	<SettingsRow
		title="Compact layout"
		description="Narrower sidebar and message list — separate from list density in Inbox"
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
		description="Remove divider lines between sidebar, list, and reader"
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
		description="Full-width message list on desktop until you open a message"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.expandListUntilOpen}
			onchange={(e) => settings.setExpandListUntilOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="App header"
	description="Top bar with New message, folder context, outbox, and account. New message stays visible on mail pages."
	advanced
>
	<SettingsRow
		title="Compact header actions"
		description="Icon-only New message on small screens — text label from sm breakpoint up"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactHeaderActions}
			onchange={(e) => settings.setCompactHeaderActions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact app header" description="Shorter top bar with less padding">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactAppHeader}
			onchange={(e) => settings.setCompactAppHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide app title"
		description="Hide the ZAUR label — the logo link still works for screen readers"
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
		description="Avatar only on the account button — no dropdown chevron"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactUserMenu}
			onchange={(e) => settings.setCompactUserMenu(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact account menu dropdown" description="Tighter spacing in the account menu panel">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactUserMenuDropdown}
			onchange={(e) => settings.setCompactUserMenuDropdown(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Tool icons only"
		description="Hide Mail, Calendar, and Home names in the top bar — icons with tooltips only"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.toolIconsOnly}
			onchange={(e) => settings.setToolIconsOnly(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact tool switcher" description="Tighter Mail, Calendar, and Home tabs">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactToolSwitcher}
			onchange={(e) => settings.setCompactToolSwitcher(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide offline indicator" description="Do not show the offline badge when you lose connection">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideOfflineIndicator}
			onchange={(e) => settings.setHideOfflineIndicator(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideOfflineIndicator}
		inactiveReason={settings.hideOfflineIndicator ? 'Offline indicator is hidden' : 'Offline indicator appearance'}
	>
		<SettingsRow title="Compact offline indicator" description="Smaller offline badge">
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
		description="Show the outbox icon only after a send fails — hide it while the queue is empty"
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
		<SettingsRow title="Compact outbox menu" description="Tighter spacing in the outbox dropdown">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactOutboxMenu}
				onchange={(e) => settings.setCompactOutboxMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset workspace settings"
		description="Restore layout, sidebar, search, and header options on this page"
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
