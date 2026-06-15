<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import {
		settings,
		type DefaultReplyMode,
		type ComposeFormat
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Format & Send Delay">
	<SettingsRow
		kind="menu"
		title="Default format"
		description="The format new messages start in. HTML allows styling; plain text is simpler and lighter."
	>
		<SettingsSelect
			label="Default format"
			value={settings.defaultComposeFormat}
			options={[
				{ value: 'plain', label: 'Plain text' },
				{ value: 'html', label: 'HTML' }
			]}
			onchange={(v) => settings.setDefaultComposeFormat(v as ComposeFormat)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Default reply"
		description="Whether the reply button answers just the sender or everyone on the message."
	>
		<SettingsSelect
			label="Default reply"
			value={settings.defaultReplyMode}
			options={[
				{ value: 'reply', label: 'Reply' },
				{ value: 'reply-all', label: 'Reply all' }
			]}
			onchange={(v) => settings.setDefaultReplyMode(v as DefaultReplyMode)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Undo send"
		description="Briefly hold sent messages so you can recall them before they leave."
	>
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
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Writing Behavior">
	<SettingsRow
		kind="toggle"
		title="Show Cc/Bcc"
		description="Always show the Cc and Bcc fields when composing, instead of on demand."
	>
		<Switch
			checked={settings.showCcBccInCompose}
			onchange={(checked) => settings.setShowCcBccInCompose(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Contact suggestions"
		description="Suggest matching addresses from your contacts as you type recipients."
	>
		<Switch
			checked={settings.showComposeContactSuggestions}
			onchange={(checked) => settings.setShowComposeContactSuggestions(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Collapse quoted text"
		description="Start replies with the quoted original folded out of the way."
	>
		<Switch
			checked={settings.collapseQuotedInCompose}
			onchange={(checked) => settings.setCollapseQuotedInCompose(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Hide compose hints"
		description="Hide the inline tips shown while composing, such as why a message can't be sent yet."
	>
		<Switch
			checked={settings.hideComposeHints}
			onchange={(checked) => settings.setHideComposeHints(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Always Bcc me"
		description="Send yourself a blind copy of every message you send."
	>
		<Switch
			checked={settings.bccSelf}
			onchange={(checked) => settings.setBccSelf(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Confirm before discard"
		description="Ask before throwing away a draft that has unsaved changes."
	>
		<Switch
			checked={settings.confirmBeforeDiscardCompose}
			onchange={(checked) => settings.setConfirmBeforeDiscardCompose(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
