<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>Mail · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Mail" description="Reading and message behavior.">
	<SettingsGroup title="Behavior">
		<SettingsRow
			title="Notify on new mail"
			description="Toast and browser notification when new mail arrives in Inbox"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.notifyOnNewMail}
				onchange={(e) => settings.setNotifyOnNewMail(e.currentTarget.checked)}
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
			title="Hide keyboard shortcuts help"
			description="Remove the shortcut reference section at the bottom of Mail settings"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideMailShortcutsHelp}
				onchange={(e) => settings.setHideMailShortcutsHelp(e.currentTarget.checked)}
			/>
		</SettingsRow>

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
	</SettingsGroup>

	<SettingsGroup title="Reset">
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

	{#if !settings.hideMailShortcutsHelp}
	<SettingsGroup title="Keyboard shortcuts">
		<SettingsRow title="Compose" description="Start a new message from the mail view">
			<span class="font-mono text-xs text-fg">c</span>
		</SettingsRow>
		<SettingsRow title="Search" description="Focus the search field from anywhere in mail">
			<span class="font-mono text-xs text-fg">/</span>
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
