<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import {
		settings,
		type ReaderTextSize,
		type ReadingTypeface
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Inbox & Folders">
	<SettingsRow
		kind="toggle"
		title="Marker colors on Highlighted"
		description="Tint subject lines with their marker color in the Highlighted view."
	>
		<Switch
			checked={settings.showImportantColors}
			onchange={(checked) => settings.setShowImportantColors(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Remember last folder"
		description="Reopen the folder you were last viewing instead of the Inbox."
	>
		<Switch
			checked={settings.rememberLastMailbox}
			onchange={(checked) => settings.setRememberLastMailbox(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Show sender email address"
		description="Show each sender's address beneath their name in the message list."
	>
		<Switch
			checked={settings.showSenderEmailInList}
			onchange={(checked) => settings.setShowSenderEmailInList(checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Format & Sizing">
	<SettingsRow kind="menu" title="Time format">
		<SettingsSelect
			label="Time format"
			value={settings.timeFormat}
			options={[
				{ value: 'auto', label: 'System' },
				{ value: '12h', label: '12-hour' },
				{ value: '24h', label: '24-hour' }
			]}
			onchange={(v) => {
				if (v === 'auto' || v === '12h' || v === '24h') {
					settings.setTimeFormat(v);
				}
			}}
		/>
	</SettingsRow>

	<SettingsRow kind="menu" title="Text size">
		<SettingsSelect
			label="Text size"
			value={settings.readerTextSize}
			options={[
				{ value: 'small', label: 'Small' },
				{ value: 'normal', label: 'Normal' },
				{ value: 'large', label: 'Large' }
			]}
			onchange={(v) => settings.setReaderTextSize(v as ReaderTextSize)}
		/>
	</SettingsRow>

	<SettingsRow kind="menu" title="Typeface">
		<SettingsSelect
			label="Typeface"
			value={settings.readingTypeface}
			options={[
				{ value: 'sans', label: 'Sans-serif' },
				{ value: 'serif', label: 'Serif' }
			]}
			onchange={(v) => settings.setReadingTypeface(v as ReadingTypeface)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Message Rendering">
	<SettingsRow
		kind="toggle"
		title="Prefer plain text"
		description="Show the plain-text version of a message when the sender provides one."
	>
		<Switch
			checked={settings.preferPlainText}
			onchange={(checked) => settings.setPreferPlainText(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Block remote images"
		description="Don't load images hosted elsewhere, which can signal when you open a message."
	>
		<Switch
			checked={settings.blockExternalContent}
			onchange={(checked) => settings.setBlockExternalContent(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Expand all threads"
		description="Open every message in a conversation instead of just the latest."
	>
		<Switch
			checked={settings.expandAllThreadMessages}
			onchange={(checked) => settings.setExpandAllThreadMessages(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="toggle"
		title="Mark as seen when opened"
		description="Clear the unseen mark as soon as you open a message. Turn off to mark messages seen yourself."
	>
		<Switch
			checked={settings.markReadOnOpen}
			onchange={(checked) => settings.setMarkReadOnOpen(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Show delivery address"
		description="Show which of your addresses a message was delivered to. Automatic shows it when you have more than one address."
	>
		<SettingsSelect
			label="Show delivery address"
			value={settings.showDeliveredToInReader}
			options={[
				{ value: 'auto', label: 'Automatic' },
				{ value: 'always', label: 'Always' },
				{ value: 'never', label: 'Never' }
			]}
			onchange={(v) => {
				if (v === 'auto' || v === 'always' || v === 'never') {
					settings.setShowDeliveredToInReader(v);
				}
			}}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Actions">
	<SettingsRow
		kind="toggle"
		title="Confirm before delete"
		description="Ask before moving messages to the Trash."
	>
		<Switch
			checked={settings.confirmBeforeDelete}
			onchange={(checked) => settings.setConfirmBeforeDelete(checked)}
		/>
	</SettingsRow>

	<SettingsRow
		kind="menu"
		title="Undo window"
		description="How long an Undo button stays after you send, archive, delete, or move a message. Off acts immediately."
	>
		<SettingsSelect
			label="Undo window"
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

	<SettingsRow
		kind="toggle"
		title="Hide action toasts"
		description="Stop showing the brief confirmations that pop up after actions."
	>
		<Switch
			checked={settings.hideActionToasts}
			onchange={(checked) => settings.setHideActionToasts(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
