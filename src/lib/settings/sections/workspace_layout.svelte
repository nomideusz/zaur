<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Mail panes" description="Sidebar, list, and reader on desktop.">
	<SettingsRow
		title="Compact layout"
		description="Narrower sidebar and message list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
			class="size-4 accent-accent"
			checked={settings.expandListUntilOpen}
			onchange={(e) => settings.setExpandListUntilOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide pane borders"
		description="Remove divider lines between panes"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hidePaneBorders}
			onchange={(e) => settings.setHidePaneBorders(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Top bar" description="Header on mail and other pages." advanced>
	<SettingsRow
		title="Compact app header"
		description="Shorter top bar with less padding"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactAppHeader}
			onchange={(e) => settings.setCompactAppHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Icon-only thread actions"
		description="Compact New message button on small screens"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactHeaderActions}
			onchange={(e) => settings.setCompactHeaderActions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Tool icons only"
		description="Hide Mail and Calendar labels in the top bar"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
			class="size-4 accent-accent"
			checked={settings.hideOutboxUnlessFailed}
			onchange={(e) => settings.setHideOutboxUnlessFailed(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset layout settings" description="Restore layout and header options on this page">
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
