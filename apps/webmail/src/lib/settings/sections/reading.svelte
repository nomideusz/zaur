<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import {
		settings,
		type DefaultReplyMode,
		type FocusLayoutMode,
		type ReaderTextSize,
		type ReaderWidth
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Reading" description="Core article-like reading settings.">
	<SettingsRow title="Reading width" description="Line length for opened messages">
		<SettingsSelect
			label="Reading width"
			value={settings.readerWidth}
			options={[
				{ value: 'comfortable', label: 'Comfortable' },
				{ value: 'wide', label: 'Wide' }
			]}
			onchange={(v) => settings.setReaderWidth(v as ReaderWidth)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Reading size" description="Text size for the message body">
		<SettingsSelect
			label="Reading size"
			value={settings.readerTextSize}
			options={[
				{ value: 'small', label: 'Small' },
				{ value: 'normal', label: 'Normal' },
				{ value: 'large', label: 'Large' }
			]}
			onchange={(v) => settings.setReaderTextSize(v as ReaderTextSize)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow
		title="Reading layout"
		description="Adaptive keeps one focused pane by default; Classic keeps the traditional split layout"
	>
		<SettingsSelect
			label="Reading layout"
			value={settings.focusLayoutMode}
			options={[
				{ value: 'adaptive', label: 'Adaptive (focused)' },
				{ value: 'classic', label: 'Classic (split panes)' }
			]}
			onchange={(v) => settings.setFocusLayoutMode(v as FocusLayoutMode)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Privacy & safety" description="Protect against tracking pixels and unfamiliar senders.">
	<SettingsRow title="Block external content" description="Block remote images in HTML mail — you can still show them per message">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.blockExternalContent}
			onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Flag external senders"
		description="Show an External chip when mail comes from outside your own domain"
	>
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.warnExternalSenders}
			onchange={(e) => settings.setWarnExternalSenders(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Replies" description="Default reply behavior.">
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
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset reading settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset reading settings to defaults?')) {
					settings.resetReadingSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
