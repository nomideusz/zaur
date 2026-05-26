<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
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
		<select
			class="z-input w-auto"
			value={settings.defaultComposeFormat}
			onchange={(e) => settings.setDefaultComposeFormat(e.currentTarget.value as ComposeFormat)}
		>
			<option value="plain">Plain text</option>
			<option value="html">HTML</option>
		</select>
	</SettingsRow>

	<SettingsRow
		title="Compose layout"
		description="Drawer slides in from the right; pane fills the reader column with the sidebar still visible"
	>
		<select
			class="z-input w-auto"
			value={settings.composeLayout}
			onchange={(e) => settings.setComposeLayout(e.currentTarget.value as ComposeLayout)}
		>
			<option value="drawer">Drawer</option>
			<option value="pane">Pane</option>
		</select>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.composeLayout === 'drawer'}
		inactiveReason={settings.composeLayout === 'drawer'
			? undefined
			: 'Only applies when the compose layout is set to drawer'}
	>
		<SettingsRow title="Drawer width" description="How wide the compose drawer is on desktop">
			<select
				class="z-input w-auto"
				value={settings.composeDrawerWidth}
				onchange={(e) =>
					settings.setComposeDrawerWidth(e.currentTarget.value as ComposeDrawerWidth)}
			>
				<option value="narrow">Narrow</option>
				<option value="default">Default</option>
				<option value="wide">Wide</option>
			</select>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Fields" description="Recipient rows and autocomplete.">
	<SettingsRow title="Show Cc/Bcc" description="Cc and Bcc rows in compose — reply-all still shows Cc when needed">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showCcBccInCompose}
			onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact suggestions" description="Autocomplete contacts while typing recipients">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showComposeContactSuggestions}
			onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Reply content" description="Hints and quoted text when replying or forwarding.">
	<SettingsRow title="Hide compose hints" description="Remove tips like “Set display name”, “Add a signature”, and shortcut nudges">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideComposeHints}
			onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Collapse quoted text" description="Keep quoted reply content folded when composing">
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
