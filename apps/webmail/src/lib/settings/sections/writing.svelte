<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import {
		settings,
		type DefaultReplyMode,
		type ComposeFormat
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Compose" description="Fields and defaults in the message editor.">
	<SettingsRow title="Default format" description="Plain text or HTML when sending — compose box stays plain either way">
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

	<SettingsRow title="Show Cc/Bcc" description="Cc and Bcc rows in compose — reply-all still shows Cc when needed">
		<input
			type="checkbox"
			checked={settings.showCcBccInCompose}
			onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact suggestions" description="Autocomplete contacts while typing recipients">
		<input
			type="checkbox"
			checked={settings.showComposeContactSuggestions}
			onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Collapse quoted text" description="Keep quoted reply content folded when composing">
		<input
			type="checkbox"
			checked={settings.collapseQuotedInCompose}
			onchange={(e) => settings.setCollapseQuotedInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide compose hints" description="Remove tips like “Set display name”, “Add a signature”, and shortcut nudges">
		<input
			type="checkbox"
			checked={settings.hideComposeHints}
			onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Sending" description="What happens when you send mail.">
	<SettingsRow title="Always Bcc me" description="Add your own address to Bcc on every outgoing message">
		<input
			type="checkbox"
			checked={settings.bccSelf}
			onchange={(e) => settings.setBccSelf(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Auto-archive after reply" description="Move the source conversation to Archive once a reply is sent">
		<input
			type="checkbox"
			checked={settings.autoArchiveOnReply}
			onchange={(e) => settings.setAutoArchiveOnReply(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Default reply action" description="Primary reply button — r replies, a reply all">
		<SettingsSelect
			label="Default reply action"
			value={settings.defaultReplyMode}
			options={[
				{ value: 'reply', label: 'Reply' },
				{ value: 'reply-all', label: 'Reply all' }
			]}
			onchange={(v) => settings.setDefaultReplyMode(v as DefaultReplyMode)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Undo send" description="Delay before sending so you can cancel from the toast">
		<SettingsSelect
			label="Undo send delay"
			value={String(settings.undoSendDelay)}
			options={[
				{ value: '0', label: 'Immediate (no delay)' },
				{ value: '5000', label: '5 seconds' },
				{ value: '10000', label: '10 seconds' },
				{ value: '20000', label: '20 seconds' }
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

	<SettingsRow title="Return to inbox after sending" description="Go back to Inbox instead of Sent after delivery">
		<input
			type="checkbox"
			checked={settings.returnToInboxAfterSend}
			onchange={(e) => settings.setReturnToInboxAfterSend(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Confirm before discarding compose" description="Ask when closing compose with unsent content">
		<input
			type="checkbox"
			checked={settings.confirmBeforeDiscardCompose}
			onchange={(e) => settings.setConfirmBeforeDiscardCompose(e.currentTarget.checked)}
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
					settings.resetWritingSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
