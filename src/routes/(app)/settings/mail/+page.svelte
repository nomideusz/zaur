<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import PushNotificationStatus from '$lib/components/settings/PushNotificationStatus.svelte';
	import { pwa } from '$lib/stores/pwa.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>Behavior · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Behavior" description="Notifications, shortcuts, and what happens when you read or send mail.">
	<SettingsGroup title="App & notifications" description="Install the app and manage background mail alerts.">
		<SettingsRow
			title="App install"
			description={pwa.isInstalled
				? 'Running as an installed app on this device'
				: 'Install for home-screen access, offline use, and reliable push delivery'}
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

		<SettingsRow
			title="Push notification status"
			description="Background alerts when new mail arrives — separate from in-app toasts"
		>
			<PushNotificationStatus />
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="While using mail" description="Everyday behavior in your inbox.">
		<SettingsRow
			title="Notify on new mail"
			description="Toast and push notification when new mail arrives in Inbox, including when the app is closed"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.notifyOnNewMail}
				onchange={(e) => settings.setNotifyOnNewMail(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show unread count on app icon"
			description="Badge on the installed app icon with your Inbox unread count — Chrome and Edge on desktop and Android"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showUnreadAppBadge}
				onchange={(e) => settings.setShowUnreadAppBadge(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show unread count in tab title"
			description="Prefix the browser tab with the number of unread Inbox messages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showUnreadInTitle}
				onchange={(e) => settings.setShowUnreadInTitle(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Mark as read when opened"
			description="Automatically mark conversations read when you open them"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.markAsReadOnOpen}
				onchange={(e) => settings.setMarkAsReadOnOpen(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Keyboard shortcuts"
			description="Press c to compose and / to focus search while in mail"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.enableKeyboardShortcuts}
				onchange={(e) => settings.setEnableKeyboardShortcuts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Confirm before delete"
			description="Ask before moving messages to trash — permanent delete in Trash always asks"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.confirmBeforeDelete}
				onchange={(e) => settings.setConfirmBeforeDelete(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Confirm before discarding compose"
			description="Ask when closing compose with unsent content"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.confirmBeforeDiscardCompose}
				onchange={(e) => settings.setConfirmBeforeDiscardCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Return to inbox after sending"
			description="Go back to Inbox instead of Sent after a message is delivered"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.returnToInboxAfterSend}
				onchange={(e) => settings.setReturnToInboxAfterSend(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Auto-load more messages"
			description="Load older messages automatically when you scroll to the bottom of the list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.autoLoadMore}
				onchange={(e) => settings.setAutoLoadMore(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsDepends
			enabled={settings.autoLoadMore}
			inactiveReason={settings.autoLoadMore
				? 'Load-more area appearance'
				: 'Only applies when auto-load is enabled — use Load more button otherwise'}
		>
			<SettingsRow
				title="Compact load more"
				description="Tighter spacing for the load-more area at the bottom of the message list"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactLoadMore}
					onchange={(e) => settings.setCompactLoadMore(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

		<SettingsDepends
			enabled={settings.enableKeyboardShortcuts}
			inactiveReason={settings.enableKeyboardShortcuts
				? 'Shortcut help'
				: 'Turn on keyboard shortcuts above to show help and references'}
		>
			<SettingsRow
				title="Hide keyboard shortcuts help"
				description="Remove the shortcut reference section at the bottom of Behavior settings"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.hideMailShortcutsHelp}
					onchange={(e) => settings.setHideMailShortcutsHelp(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>

		<SettingsRow
			title="Hide action toasts"
			description="Suppress success and info notifications — errors still appear"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideActionToasts}
				onchange={(e) => settings.setHideActionToasts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsDepends
			enabled={!settings.hideActionToasts}
			inactiveReason={settings.hideActionToasts
				? 'Success and info toasts are hidden — errors still show'
				: 'Toast appearance'}
		>
			<SettingsRow
				title="Compact toasts"
				description="Smaller notification popups in the bottom-right corner"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.compactToasts}
					onchange={(e) => settings.setCompactToasts(e.currentTarget.checked)}
				/>
			</SettingsRow>

			<SettingsRow
				title="Hide toast icons"
				description="Text-only notification popups — no success, error, or info icons"
			>
				<input
					type="checkbox"
					class="size-4 accent-accent"
					checked={settings.hideToastIcons}
					onchange={(e) => settings.setHideToastIcons(e.currentTarget.checked)}
				/>
			</SettingsRow>
		</SettingsDepends>
	</SettingsGroup>

	<SettingsGroup title="Defaults">
		<SettingsRow
			title="Restore mail defaults"
			description="Reset notifications, shortcuts, and confirmation options on this page"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
				onclick={() => {
					if (confirm('Reset all mail behavior settings to defaults?')) {
						settings.resetMailSettings();
					}
				}}
			>
				Reset
			</button>
		</SettingsRow>
	</SettingsGroup>

	{#if settings.enableKeyboardShortcuts && !settings.hideMailShortcutsHelp}
	<SettingsGroup title="Keyboard shortcuts" description="Quick keys while viewing mail.">
		<SettingsRow title="Compose" description="Start a new message from the mail view">
			<span class="font-mono text-xs text-fg">c</span>
		</SettingsRow>
		<SettingsRow title="Search" description="Focus the search field from anywhere in mail">
			<span class="font-mono text-xs text-fg">/</span>
		</SettingsRow>
		<SettingsRow title="Next message" description="Move to the next message in the list">
			<span class="font-mono text-xs text-fg">j</span>
		</SettingsRow>
		<SettingsRow title="Previous message" description="Move to the previous message in the list">
			<span class="font-mono text-xs text-fg">k</span>
		</SettingsRow>
		<SettingsRow title="Reply" description="Reply to the open message">
			<span class="font-mono text-xs text-fg">r</span>
		</SettingsRow>
		<SettingsRow title="Reply all" description="Reply all on the open thread">
			<span class="font-mono text-xs text-fg">a</span>
		</SettingsRow>
		<SettingsRow title="Archive" description="Archive the open message">
			<span class="font-mono text-xs text-fg">e</span>
		</SettingsRow>
		<SettingsRow title="Mark unread" description="Toggle read/unread on the open message">
			<span class="font-mono text-xs text-fg">u</span>
		</SettingsRow>
		<SettingsRow title="Delete" description="Move the open message to trash — undo appears in the toast">
			<span class="font-mono text-xs text-fg">#</span>
		</SettingsRow>
		<SettingsRow title="Send message" description="While writing in compose or quick reply">
			<span class="font-mono text-xs text-fg">Ctrl+Enter</span>
		</SettingsRow>
		<SettingsRow title="Close compose" description="Dismiss the compose panel">
			<span class="font-mono text-xs text-fg">Esc</span>
		</SettingsRow>
	</SettingsGroup>
	{/if}
</SettingsPanel>
