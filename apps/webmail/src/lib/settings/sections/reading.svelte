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

<SettingsGroup
	title="Alerts"
	description="Notifications and unread counts on this device."
>
	<SettingsRow
		title="App install"
		description={pwa.isInstalled
			? 'Running as an installed app on this device'
			: 'Install for home-screen access and reliable push delivery'}
	>
		{#if pwa.isInstalled}
			<span class="text-xs font-medium text-green-700 dark:text-green-300">Installed</span>
		{:else if pwa.canInstall}
			<button type="button" class="z-btn-ghost text-sm" onclick={() => pwa.showInstallPromptAgain()}>
				Install
			</button>
		{:else}
			<span class="text-xs text-fg-muted">Use browser menu to install</span>
		{/if}
	</SettingsRow>

	<SettingsRow title="Push notifications" description="Toast and push when new mail arrives in Inbox">
		<PushNotificationStatus />
	</SettingsRow>

	<SettingsRow title="Unread count on app icon" description="Badge on the installed app icon (Chrome and Edge)">
		<input
			type="checkbox"
			checked={settings.showUnreadAppBadge}
			onchange={(e) => settings.setShowUnreadAppBadge(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Unread count in tab title" description="Prefix the browser tab with your Inbox unread count">
		<input
			type="checkbox"
			checked={settings.showUnreadInTitle}
			onchange={(e) => settings.setShowUnreadInTitle(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="Inbox & folders"
	description="How your message list looks and where you land when opening mail."
>
	<SettingsRow title="Show avatars" description="Sender photos in the message list">
		<input
			type="checkbox"
			checked={settings.showAvatars}
			onchange={(e) => settings.setShowAvatars(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show full email in list"
		description="Display the sender's address instead of just their name"
	>
		<input
			type="checkbox"
			checked={settings.showSenderEmailInList}
			onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Auto-load more messages" description="Load older messages when you reach the bottom of a list">
		<input
			type="checkbox"
			checked={settings.autoLoadMore}
			onchange={(e) => settings.setAutoLoadMore(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Remember last mailbox" description="Open your last folder instead of Inbox when signing in">
		<input
			type="checkbox"
			checked={settings.rememberLastMailbox}
			onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Default search scope"
		description="Search everywhere by default, or start in the folder you're viewing"
	>
		<SettingsSelect
			label="Default search scope"
			value={settings.searchScope}
			options={[
				{ value: 'all', label: 'All mail' },
				{ value: 'current-folder', label: 'Current folder' }
			]}
			onchange={(v) => settings.setSearchScope(v as SearchScope)}
			class="w-auto"
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="Message content"
	description="Typography and how message bodies are shown on every screen size."
>
	<SettingsRow title="Reading text size" description="Font size for the message body">
		<SettingsSelect
			label="Reading text size"
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

	<SettingsRow title="Reading typeface" description="Sans-serif or serif font for message bodies">
		<SettingsSelect
			label="Reading typeface"
			value={settings.readingTypeface}
			options={[
				{ value: 'sans', label: 'Sans-serif' },
				{ value: 'serif', label: 'Serif' }
			]}
			onchange={(v) => settings.setReadingTypeface(v as ReadingTypeface)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Prefer plain text" description="Show plain text when a message includes both HTML and plain text">
		<input
			type="checkbox"
			checked={settings.preferPlainText}
			onchange={(e) => settings.setPreferPlainText(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Block remote images" description="Block images in HTML mail until you choose to show them">
		<input
			type="checkbox"
			checked={settings.blockExternalContent}
			onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Expand all thread messages" description="Open every message in a conversation, not just the latest">
		<input
			type="checkbox"
			checked={settings.expandAllThreadMessages}
			onchange={(e) => settings.setExpandAllThreadMessages(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Quick reply" description="Inline reply field at the bottom of the reader">
		<input
			type="checkbox"
			checked={settings.showQuickReply}
			onchange={(e) => settings.setShowQuickReply(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Time format" description="12-hour, 24-hour, or match your operating system">
		<SettingsSelect
			label="Time format"
			value={settings.timeFormat}
			options={[
				{ value: 'auto', label: 'Match system' },
				{ value: '12h', label: '12-hour (1:30 PM)' },
				{ value: '24h', label: '24-hour (13:30)' }
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

<SettingsGroup
	title="Desktop layout"
	description="On desktop, opening a message focuses the reader. On phone, it fills the screen."
	visibleOn="desktop"
>
	<SettingsRow
		title="Keep list visible while reading"
		description="Show a slim message list beside the reader instead of hiding it"
	>
		<input
			type="checkbox"
			checked={settings.showReaderListRail}
			onchange={(e) => settings.setShowReaderListRail(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Reading width" description="How wide the message body column is">
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
</SettingsGroup>

<SettingsGroup title="Actions" description="What happens when you read or delete mail.">
	<SettingsRow title="Mark as read when opened" description="Automatically mark conversations read when you open them">
		<input
			type="checkbox"
			checked={settings.markAsReadOnOpen}
			onchange={(e) => settings.setMarkAsReadOnOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends enabled={settings.markAsReadOnOpen}>
		<SettingsRow
			title="Mark-as-read delay"
			description="Wait briefly before marking read — useful when skimming"
		>
			<SettingsSelect
				label="Mark-as-read delay"
				value={String(settings.markAsReadDelay)}
				options={[
					{ value: '0', label: 'Immediate' },
					{ value: '500', label: '0.5 seconds' },
					{ value: '1000', label: '1 second' },
					{ value: '2000', label: '2 seconds' }
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

	<SettingsRow title="Confirm before delete" description="Ask before moving messages to trash">
		<input
			type="checkbox"
			checked={settings.confirmBeforeDelete}
			onchange={(e) => settings.setConfirmBeforeDelete(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide action toasts" description="Suppress success and info notifications — errors still appear">
		<input
			type="checkbox"
			checked={settings.hideActionToasts}
			onchange={(e) => settings.setHideActionToasts(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="Keyboard shortcuts"
	description="Navigation and actions when using a keyboard."
	visibleOn="desktop"
>
	<SettingsRow title="Enable keyboard shortcuts" description="Press c to compose, j/k to move between messages, and more">
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
				<dt>Next / previous message</dt>
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
				<dt>Focus reading / return to list</dt>
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
