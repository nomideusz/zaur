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

<SettingsGroup title="Compose">
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

	<SettingsRow title="Show Cc/Bcc">
		<input
			type="checkbox"
			checked={settings.showCcBccInCompose}
			onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact suggestions">
		<input
			type="checkbox"
			checked={settings.showComposeContactSuggestions}
			onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Collapse quoted text">
		<input
			type="checkbox"
			checked={settings.collapseQuotedInCompose}
			onchange={(e) => settings.setCollapseQuotedInCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide compose hints">
		<input
			type="checkbox"
			checked={settings.hideComposeHints}
			onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Sending">
	<SettingsRow title="Always Bcc me">
		<input
			type="checkbox"
			checked={settings.bccSelf}
			onchange={(e) => settings.setBccSelf(e.currentTarget.checked)}
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

	<SettingsRow title="Confirm before discard">
		<input
			type="checkbox"
			checked={settings.confirmBeforeDiscardCompose}
			onchange={(e) => settings.setConfirmBeforeDiscardCompose(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset writing settings">
		<button
			type="button"
			class="z-btn-ghost"
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
