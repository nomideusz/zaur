<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsField from '$lib/components/settings/SettingsField.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type SearchScope } from '$lib/stores/settings.svelte';
	import { webmailModeDefinition } from '$lib/modes/registry';

	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));
</script>


<SettingsGroup
	title={activeMode.settingsViewLabel}
	description={activeMode.id === 'simple'
		? 'Focused navigation and reading options for Simple mode.'
		: 'Pane, folder, and navigation options for Classic mode.'}
>
	<SettingsField
		title="Current mode"
		description="Change modes from the Experience page so settings stay separated by product mode."
	>
		<a href="/settings" class="z-btn-ghost inline-flex text-sm">
			{activeMode.label} mode
		</a>
	</SettingsField>
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

{#if activeMode.mail.showMailboxSidebar}
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
{/if}

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

{#if activeMode.mail.useAdaptiveReaderFocus}
	<SettingsGroup title="Simple layout options" description="Customize your Simple view experience.">
		<SettingsRow title="Show list rail in reader" description="Keep a slim message list visible on the side when reading on desktop">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.showReaderListRail}
				onchange={(e) => settings.setShowReaderListRail(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>
{/if}

{#if activeMode.mail.useClassicSplitPanes}
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
{/if}

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

