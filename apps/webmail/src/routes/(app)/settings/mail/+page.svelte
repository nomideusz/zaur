<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>General · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="General"
	description="Notifications, behavior, and keyboard shortcuts."
>
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

		<SettingsRow title="Push notifications" description="Background alerts when new mail arrives">
			<PushNotificationStatus />
		</SettingsRow>

		<SettingsRow title="Notify on new mail" description="Toast and push when new mail arrives in Inbox">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.notifyOnNewMail}
				onchange={(e) => settings.setNotifyOnNewMail(e.currentTarget.checked)}
			/>
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

	<SettingsGroup title="Behavior" description="What happens when you read, send, or delete mail.">
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

		<SettingsRow title="Confirm before discarding compose" description="Ask when closing compose with unsent content">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.confirmBeforeDiscardCompose}
				onchange={(e) => settings.setConfirmBeforeDiscardCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow title="Undo send" description="Brief delay before sending so you can cancel from the toast">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.enableUndoSend}
				onchange={(e) => settings.setEnableUndoSend(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow title="Return to inbox after sending" description="Go back to Inbox instead of Sent after delivery">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.returnToInboxAfterSend}
				onchange={(e) => settings.setReturnToInboxAfterSend(e.currentTarget.checked)}
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
		<SettingsRow title="Enable keyboard shortcuts" description="Press c to compose, j/k to move between messages, and more">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.enableKeyboardShortcuts}
				onchange={(e) => settings.setEnableKeyboardShortcuts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		{#if settings.enableKeyboardShortcuts}
			<SettingsRow title="Compose" description="Start a new message">
				<span class="font-mono text-xs text-fg">c</span>
			</SettingsRow>
			<SettingsRow title="Search" description="Focus sidebar search">
				<span class="font-mono text-xs text-fg">/</span>
			</SettingsRow>
			<SettingsRow title="Next / previous message">
				<span class="font-mono text-xs text-fg">j · k</span>
			</SettingsRow>
			<SettingsRow title="Reply / reply all">
				<span class="font-mono text-xs text-fg">r · a</span>
			</SettingsRow>
			<SettingsRow title="Archive / unread / delete">
				<span class="font-mono text-xs text-fg">e · u · #</span>
			</SettingsRow>
			<SettingsRow title="Focus mode / return to list" description="z toggles focused reading; Esc returns to list in adaptive layout">
				<span class="font-mono text-xs text-fg">z · Esc</span>
			</SettingsRow>
			<SettingsRow title="Send / close compose">
				<span class="font-mono text-xs text-fg">Ctrl+Enter · Esc</span>
			</SettingsRow>
		{/if}
	</SettingsGroup>

	<SettingsGroup title="Defaults">
		<SettingsRow title="Reset general mail settings" description="Restore notifications, behavior, and shortcuts on this page">
			<button
				type="button"
				class="z-btn-ghost text-sm"
				onclick={() => {
					if (confirm('Reset general mail settings to defaults?')) {
						settings.resetMailSettings();
					}
				}}
			>
				Reset
			</button>
		</SettingsRow>
	</SettingsGroup>
</SettingsPanel>
