<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type DefaultReplyMode, type ReaderTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Display" description="Text and threads.">
	<SettingsRow title="Reading size" description="Text size for the message body">
		<select
			class="z-input w-auto"
			value={settings.readerTextSize}
			onchange={(e) => settings.setReaderTextSize(e.currentTarget.value as ReaderTextSize)}
		>
			<option value="small">Small</option>
			<option value="normal">Normal</option>
			<option value="large">Large</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Prefer plain text" description="Show plain text when available instead of HTML">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.preferPlainText}
			onchange={(e) => settings.setPreferPlainText(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Expand all thread messages" description="Show every message in a conversation expanded by default">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.expandAllThreadMessages}
			onchange={(e) => settings.setExpandAllThreadMessages(e.currentTarget.checked)}
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

	<SettingsDepends
		enabled={settings.blockExternalContent}
		inactiveReason={settings.blockExternalContent
			? undefined
			: 'Only applies when external images are blocked'}
	>
		<SettingsRow title="Hide blocked-images banner" description="Do not show the external-content notice in the reader">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.hideExternalContentBanner}
				onchange={(e) => settings.setHideExternalContentBanner(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

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

<SettingsGroup title="Replies" description="Reply behavior and the quick reply box.">
	<SettingsRow title="Default reply action" description="Primary reply button — r replies, a reply all">
		<select
			class="z-input w-auto"
			value={settings.defaultReplyMode}
			onchange={(e) => settings.setDefaultReplyMode(e.currentTarget.value as DefaultReplyMode)}
		>
			<option value="reply">Reply</option>
			<option value="reply-all">Reply all</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Quick reply" description="Reply box at the bottom of an open message">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showQuickReply}
			onchange={(e) => settings.setShowQuickReply(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Contact actions" description="Save contact and copy email in the message header">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showReaderContactActions}
			onchange={(e) => settings.setShowReaderContactActions(e.currentTarget.checked)}
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
