<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import {
		settings,
		type ReaderTextSize,
		type ReadingTypeface
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Format & Sizing">
	<SettingsRow title="Time format">
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
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Text size">
		<SettingsSelect
			label="Text size"
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

	<SettingsRow title="Typeface">
		<SettingsSelect
			label="Typeface"
			value={settings.readingTypeface}
			options={[
				{ value: 'sans', label: 'Sans-serif' },
				{ value: 'serif', label: 'Serif' }
			]}
			onchange={(v) => settings.setReadingTypeface(v as ReadingTypeface)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Inbox & Colors">
	<SettingsRow title="Colorful Important subjects">
		<input
			type="checkbox"
			checked={settings.showImportantColors}
			onchange={(e) => settings.setShowImportantColors(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Remember last folder">
		<input
			type="checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Message Rendering">
	<SettingsRow title="Prefer plain text">
		<input
			type="checkbox"
			checked={settings.preferPlainText}
			onchange={(e) => settings.setPreferPlainText(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Block remote images">
		<input
			type="checkbox"
			checked={settings.blockExternalContent}
			onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Expand all threads">
		<input
			type="checkbox"
			checked={settings.expandAllThreadMessages}
			onchange={(e) => settings.setExpandAllThreadMessages(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Clean reading view">
		<input
			type="checkbox"
			checked={settings.readerCleanView}
			onchange={(e) => settings.setReaderCleanView(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="System & Badges">
	<SettingsRow title="Confirm before delete">
		<input
			type="checkbox"
			checked={settings.confirmBeforeDelete}
			onchange={(e) => settings.setConfirmBeforeDelete(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide action toasts">
		<input
			type="checkbox"
			checked={settings.hideActionToasts}
			onchange={(e) => settings.setHideActionToasts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="New count on app icon">
		<input
			type="checkbox"
			checked={settings.showUnreadAppBadge}
			onchange={(e) => settings.setShowUnreadAppBadge(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="New count in tab title">
		<input
			type="checkbox"
			checked={settings.showUnreadInTitle}
			onchange={(e) => settings.setShowUnreadInTitle(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Enable shortcuts">
		<input
			type="checkbox"
			checked={settings.enableKeyboardShortcuts}
			onchange={(e) => settings.setEnableKeyboardShortcuts(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

{#if settings.enableKeyboardShortcuts}
	<SettingsGroup title="Keyboard Shortcuts Map">
		<div class="z-settings-shortcut-grid">
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Compose</p>
				<p class="z-settings-shortcut-keys">c</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Go to folder</p>
				<p class="z-settings-shortcut-keys">g i · g s · g d · g a · g t · g j</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Next / previous</p>
				<p class="z-settings-shortcut-keys">j · k</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Reply / reply all</p>
				<p class="z-settings-shortcut-keys">r · a</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Next new message</p>
				<p class="z-settings-shortcut-keys">n</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Not important / Important / delete</p>
				<p class="z-settings-shortcut-keys">d · u · #</p>
			</div>
			<div class="z-settings-shortcut-row">
				<p class="z-settings-shortcut-label">Send / close compose</p>
				<p class="z-settings-shortcut-keys">Ctrl+Enter · Esc</p>
			</div>
		</div>
	</SettingsGroup>
{/if}
