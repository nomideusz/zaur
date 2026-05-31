<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings, type ReaderTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Notifications" description="Alerts and unread counts.">
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
			class="z-checkbox"
			checked={settings.showUnreadAppBadge}
			onchange={(e) => settings.setShowUnreadAppBadge(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Unread count in tab title" description="Prefix the browser tab with your Inbox unread count">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showUnreadInTitle}
			onchange={(e) => settings.setShowUnreadInTitle(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Inbox & reading" description="How open messages look.">
	<SettingsRow title="Reading text size" description="Font size for the message body when reading">
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

	<SettingsRow title="Block external content" description="Block remote images in HTML mail — you can still show them per message">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.blockExternalContent}
			onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Behavior" description="What happens when you read or delete mail.">
	<SettingsRow title="Mark as read when opened" description="Automatically mark conversations read when you open them">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.markAsReadOnOpen}
			onchange={(e) => settings.setMarkAsReadOnOpen(e.currentTarget.checked)}
		/>
	</SettingsRow>

	{#if settings.markAsReadOnOpen}
		<SettingsRow
			title="Mark-as-read delay"
			description="Wait briefly before marking a conversation read — useful when skimming"
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
	{/if}

	<SettingsRow title="Confirm before delete" description="Ask before moving messages to trash">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.confirmBeforeDelete}
			onchange={(e) => settings.setConfirmBeforeDelete(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Auto-load more messages" description="Load older messages when you scroll to the bottom of the list">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.autoLoadMore}
			onchange={(e) => settings.setAutoLoadMore(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Hide action toasts" description="Suppress success and info notifications — errors still appear">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.hideActionToasts}
			onchange={(e) => settings.setHideActionToasts(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Dates & times" description="How timestamps appear in lists and the reader.">
	<SettingsRow title="Time format" description="Pick 12-hour, 24-hour, or follow your operating system">
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

<SettingsGroup title="Shortcuts" description="Keyboard navigation.">
	<SettingsRow title="Enable keyboard shortcuts" description="Press c to compose, j/k to move between messages, n for next unread, and more">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.enableKeyboardShortcuts}
			onchange={(e) => settings.setEnableKeyboardShortcuts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	{#if settings.enableKeyboardShortcuts}
		<SettingsRow title="Compose" description="Start a new message">
			<span class="font-sans text-xs text-fg">c</span>
		</SettingsRow>
		<SettingsRow title="Go to folder" description="Press g then: i Inbox, s Sent, d Drafts, a Archive, t Trash, j Junk">
			<span class="font-sans text-xs text-fg">g i · g s · g d · g a · g t · g j</span>
		</SettingsRow>
		<SettingsRow title="Next / previous message">
			<span class="font-sans text-xs text-fg">j · k</span>
		</SettingsRow>
		<SettingsRow title="Reply / reply all">
			<span class="font-sans text-xs text-fg">r · a</span>
		</SettingsRow>
		<SettingsRow title="Archive / unread / delete">
			<span class="font-sans text-xs text-fg">e · u · #</span>
		</SettingsRow>
		<SettingsRow title="Focus mode / return to list" description="z toggles focused reading; Esc returns to list">
			<span class="font-sans text-xs text-fg">z · Esc</span>
		</SettingsRow>
		<SettingsRow title="Send / close compose">
			<span class="font-sans text-xs text-fg">Ctrl+Enter · Esc</span>
		</SettingsRow>
	{/if}
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset reading settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset reading settings to defaults?')) {
					settings.resetMailSettings();
					settings.resetLayoutSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
