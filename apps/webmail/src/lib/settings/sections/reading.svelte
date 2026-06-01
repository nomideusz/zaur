<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import {
		settings,
		type ReaderTextSize,
		type ReaderWidth,
		type ReadingTypeface,
		type SearchScope
	} from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Alerts">
	<SettingsRow title="App install">
		{#if pwa.isInstalled}
			<span class="text-fg-muted">Installed</span>
		{:else if pwa.canInstall}
			<button type="button" class="z-btn-ghost" onclick={() => pwa.showInstallPromptAgain()}>
				Install
			</button>
		{:else}
			<span class="text-fg-muted">Use browser menu</span>
		{/if}
	</SettingsRow>

	<SettingsRow title="Push notifications">
		<PushNotificationStatus />
	</SettingsRow>

	<SettingsRow title="Unread on app icon">
		<input
			type="checkbox"
			checked={settings.showUnreadAppBadge}
			onchange={(e) => settings.setShowUnreadAppBadge(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Unread in tab title">
		<input
			type="checkbox"
			checked={settings.showUnreadInTitle}
			onchange={(e) => settings.setShowUnreadInTitle(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Inbox & folders">
	<SettingsRow title="Show email in list">
		<input
			type="checkbox"
			checked={settings.showSenderEmailInList}
			onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Colorful Important subjects">
		<input
			type="checkbox"
			checked={settings.showImportantColors}
			onchange={(e) => settings.setShowImportantColors(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Auto-load more">
		<input
			type="checkbox"
			checked={settings.autoLoadMore}
			onchange={(e) => settings.setAutoLoadMore(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Remember last folder">
		<input
			type="checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Search scope">
		<SettingsSelect
			label="Search scope"
			value={settings.searchScope}
			options={[
				{ value: 'all', label: 'All mail' },
				{ value: 'current-folder', label: 'Current folder' }
			]}
			onchange={(v) => settings.setSearchScope(v as SearchScope)}
			class="w-auto"
		/>
	</SettingsRow>

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
</SettingsGroup>

<SettingsGroup title="Message content">
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

	<SettingsRow title="Reading width">
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

	<SettingsRow title="Show avatars">
		<input
			type="checkbox"
			checked={settings.showAvatars}
			onchange={(e) => settings.setShowAvatars(e.currentTarget.checked)}
		/>
	</SettingsRow>

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

	<SettingsRow title="Quick reply">
		<input
			type="checkbox"
			checked={settings.showQuickReply}
			onchange={(e) => settings.setShowQuickReply(e.currentTarget.checked)}
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

<SettingsGroup title="Desktop layout" visibleOn="desktop">
	<SettingsRow title="Focus reading when opened">
		<input
			type="checkbox"
			checked={settings.focusReadingDefault}
			onchange={(e) => settings.setFocusReadingDefault(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Split view">
		<input
			type="checkbox"
			checked={settings.showReaderListRail}
			onchange={(e) => settings.setShowReaderListRail(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Actions">
	<SettingsRow title="Mark as read when opened">
		<input
			type="checkbox"
			checked={settings.markAsReadOnOpen}
			onchange={(e) => settings.setMarkAsReadOnOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends enabled={settings.markAsReadOnOpen}>
		<SettingsRow title="Mark-as-read delay">
			<SettingsSelect
				label="Mark-as-read delay"
				value={String(settings.markAsReadDelay)}
				options={[
					{ value: '0', label: 'Immediate' },
					{ value: '500', label: '0.5 s' },
					{ value: '1000', label: '1 s' },
					{ value: '2000', label: '2 s' }
				]}
				onchange={(v) => {
					const next = Number(v);
					if (next === 0 || next === 500 || next === 1000 || next === 2000) {
						settings.setMarkAsReadDelay(next);
					}
				}}
				class="w-auto"
			/>
		</SettingsRow>
	</SettingsDepends>

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
</SettingsGroup>

<SettingsGroup title="Keyboard shortcuts" visibleOn="desktop">
	<SettingsRow title="Enable shortcuts">
		<input
			type="checkbox"
			checked={settings.enableKeyboardShortcuts}
			onchange={(e) => settings.setEnableKeyboardShortcuts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	{#if settings.enableKeyboardShortcuts}
		<dl class="z-settings-shortcut-grid">
			<div class="z-settings-shortcut-row">
				<dt>Compose</dt>
				<dd>c</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Go to folder</dt>
				<dd>g i · g s · g d · g a · g t · g j</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Next / previous</dt>
				<dd>j · k</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Reply / reply all</dt>
				<dd>r · a</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Archive / unread / delete</dt>
				<dd>e · u · #</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Focus reading / list</dt>
				<dd>z · Esc</dd>
			</div>
			<div class="z-settings-shortcut-row">
				<dt>Send / close compose</dt>
				<dd>Ctrl+Enter · Esc</dd>
			</div>
		</dl>
	{/if}
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset reading settings">
		<button
			type="button"
			class="z-btn-ghost"
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
