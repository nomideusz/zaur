<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import IOSToggle from '$lib/components/ui/IOSToggle.svelte';
	import {
		settings,
		type DefaultReplyMode,
		type ComposeFormat
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Format & Send Delay">
	<SettingsRow title="Default format">
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

	<SettingsRow title="Default reply">
		<SettingsSelect
			label="Default reply"
			value={settings.defaultReplyMode}
			options={[
				{ value: 'reply', label: 'Reply' },
				{ value: 'reply-all', label: 'Reply all' }
			]}
			onchange={(v) => settings.setDefaultReplyMode(v as DefaultReplyMode)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Undo send">
		<SettingsSelect
			label="Undo send"
			value={String(settings.undoSendDelay)}
			options={[
				{ value: '0', label: 'Off' },
				{ value: '5000', label: '5 s' },
				{ value: '10000', label: '10 s' },
				{ value: '20000', label: '20 s' }
			]}
			onchange={(v) => {
				const next = Number(v);
				if (next === 0 || next === 5000 || next === 10000 || next === 20000) {
					settings.setUndoSendDelay(next);
				}
			}}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Compose Behavior">
	<SettingsRow title="Show Cc/Bcc">
		<IOSToggle
			checked={settings.showCcBccInCompose}
			onchange={(checked) => settings.setShowCcBccInCompose(checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact suggestions">
		<IOSToggle
			checked={settings.showComposeContactSuggestions}
			onchange={(checked) => settings.setShowComposeContactSuggestions(checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Collapse quoted text">
		<IOSToggle
			checked={settings.collapseQuotedInCompose}
			onchange={(checked) => settings.setCollapseQuotedInCompose(checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide compose hints">
		<IOSToggle
			checked={settings.hideComposeHints}
			onchange={(checked) => settings.setHideComposeHints(checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Always Bcc me">
		<IOSToggle
			checked={settings.bccSelf}
			onchange={(checked) => settings.setBccSelf(checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Confirm before discard">
		<IOSToggle
			checked={settings.confirmBeforeDiscardCompose}
			onchange={(checked) => settings.setConfirmBeforeDiscardCompose(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
