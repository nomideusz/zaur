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
	<SettingsRow kind="toggle" title="Marker highlights on Important">
		<Switch
			checked={settings.showImportantColors}
			onchange={(checked) => settings.setShowImportantColors(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Remember last folder">
		<Switch
			checked={settings.rememberLastMailbox}
			onchange={(checked) => settings.setRememberLastMailbox(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Show sender email address">
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
	<SettingsRow kind="toggle" title="Prefer plain text">
		<Switch
			checked={settings.preferPlainText}
			onchange={(checked) => settings.setPreferPlainText(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Block remote images">
		<Switch
			checked={settings.blockExternalContent}
			onchange={(checked) => settings.setBlockExternalContent(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Expand all threads">
		<Switch
			checked={settings.expandAllThreadMessages}
			onchange={(checked) => settings.setExpandAllThreadMessages(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Clean reading view">
		<Switch
			checked={settings.readerCleanView}
			onchange={(checked) => settings.setReaderCleanView(checked)}
		/>
	</SettingsRow>

	<SettingsRow kind="toggle" title="Show delivery address">
		<Switch
			checked={settings.showDeliveredToInReader}
			onchange={(checked) => settings.setShowDeliveredToInReader(checked)}
		/>
	</SettingsRow>
</SettingsGroup>
