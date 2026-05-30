<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import {
		settings,
		type ComposeDrawerWidth,
		type ComposeFormat,
		type ComposeLayout
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Format & layout" description="How compose opens and how messages are sent.">
	<SettingsRow
		title="Default format"
		description="Plain text or HTML when sending — the compose box stays plain text either way"
	>
		<SettingsSelect
			label="Default format"
			value={settings.defaultComposeFormat}
			options={[
				{ value: 'plain', label: 'Plain text' },
				{ value: 'html', label: 'HTML' }
			]}
			onchange={(v) => settings.setDefaultComposeFormat(v as ComposeFormat)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow
		title="Compose layout"
		description="Drawer slides in from the right; pane fills the reader column with the sidebar still visible"
	>
		<SettingsSelect
			label="Compose layout"
			value={settings.composeLayout}
			options={[
				{ value: 'drawer', label: 'Drawer' },
				{ value: 'pane', label: 'Pane' }
			]}
			onchange={(v) => settings.setComposeLayout(v as ComposeLayout)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.composeLayout === 'drawer'}
		inactiveReason={settings.composeLayout === 'drawer'
			? undefined
			: 'Only applies when the compose layout is set to drawer'}
	>
		<SettingsRow title="Drawer width" description="How wide the compose drawer is on desktop">
			<SettingsSelect
				label="Drawer width"
				value={settings.composeDrawerWidth}
				options={[
					{ value: 'narrow', label: 'Narrow' },
					{ value: 'default', label: 'Default' },
					{ value: 'wide', label: 'Wide' }
				]}
				onchange={(v) => settings.setComposeDrawerWidth(v as ComposeDrawerWidth)}
				class="w-auto"
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Fields" description="Recipient rows and autocomplete.">
	<SettingsRow title="Show Cc/Bcc" description="Cc and Bcc rows in compose — reply-all still shows Cc when needed">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showCcBccInCompose}
			onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact suggestions" description="Autocomplete contacts while typing recipients">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showComposeContactSuggestions}
			onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Sending" description="What happens when you press Send.">
	<SettingsRow
		title="Always Bcc me"
		description="Add your own address to Bcc on every outgoing message — useful as a personal archive"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.bccSelf}
			onchange={(e) => settings.setBccSelf(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Auto-archive after reply"
		description="Move the source conversation to Archive once a reply is sent successfully"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.autoArchiveOnReply}
			onchange={(e) => settings.setAutoArchiveOnReply(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Reply content" description="Hints and quoted text when replying or forwarding.">
	<SettingsRow title="Hide compose hints" description="Remove tips like “Set display name”, “Add a signature”, and shortcut nudges">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.hideComposeHints}
			onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Collapse quoted text" description="Keep quoted reply content folded when composing">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.collapseQuotedInCompose}
			onchange={(e) => settings.setCollapseQuotedInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset writing settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset writing settings to defaults?')) {
					settings.resetComposeSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
