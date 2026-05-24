<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>Mail · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Mail" description="Reading and message behavior.">
	<SettingsRow title="Notify on new mail" description="Toast and browser notification for new Inbox mail">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.notifyOnNewMail}
			onchange={(e) => settings.setNotifyOnNewMail(e.currentTarget.checked)}
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

	{#snippet footer()}
		<h3 class="text-sm font-medium text-fg">Keyboard shortcuts</h3>
		<dl class="mt-3 space-y-2 text-sm">
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Compose</dt>
				<dd class="font-mono text-xs text-fg">c</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Search</dt>
				<dd class="font-mono text-xs text-fg">/</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Send message</dt>
				<dd class="font-mono text-xs text-fg">Ctrl+Enter</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-fg-muted">Close compose</dt>
				<dd class="font-mono text-xs text-fg">Esc</dd>
			</div>
		</dl>
	{/snippet}
</SettingsPanel>
