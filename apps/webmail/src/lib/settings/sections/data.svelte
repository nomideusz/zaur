<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import StorageQuota from '$lib/components/settings/StorageQuota.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { quota } from '$lib/stores/quota.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let emptyingTrash = $state(false);
	let emptyingSpam = $state(false);
	let importInput = $state<HTMLInputElement | null>(null);
	let clearingCache = $state(false);

	const trashMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'trash'));
	const junkMailbox = $derived(mail.mailboxes.find((mb) => mb.role === 'junk'));

	async function emptyMailbox(role: 'trash' | 'junk') {
		const mailbox = role === 'trash' ? trashMailbox : junkMailbox;
		const client = auth.client;
		if (!mailbox?.jmapId || !client) {
			toast.show(`No ${role === 'trash' ? 'Trash' : 'Spam'} folder available on this account`, 'error');
			return;
		}
		const label = role === 'trash' ? 'Trash' : 'Spam';
		if (
			!(await confirm.ask({
				title: `Empty ${label}?`,
				description: `Permanently delete every message in ${label}? This cannot be undone.`,
				confirmLabel: `Empty ${label}`,
				tone: 'danger'
			}))
		) {
			return;
		}

		if (role === 'trash') emptyingTrash = true;
		else emptyingSpam = true;

		try {
			const removed = await client.emptyMailbox(mailbox.jmapId);
			toast.show(
				removed
					? `Deleted ${removed} message${removed === 1 ? '' : 's'} from ${label}`
					: `${label} was already empty`,
				removed ? 'success' : 'info'
			);
			await mail.refreshMailboxes(client);
			void quota.load(client, { force: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : `Could not empty ${label}`;
			toast.show(message, 'error');
		} finally {
			if (role === 'trash') emptyingTrash = false;
			else emptyingSpam = false;
		}
	}

	function importPreferences(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		void file.text().then((text) => {
			const result = settings.importLocalPreferences(text);
			if (result.ok) {
				toast.show('Settings imported', 'success');
			} else {
				toast.show(result.error, 'error');
			}
			input.value = '';
		});
	}

	async function clearLocalCache() {
		if (
			!(await confirm.ask({
				title: 'Clear local cache?',
				description:
					'Clear downloaded mail and sync state from this device? Your messages on the server are not affected.',
				confirmLabel: 'Clear cache',
				tone: 'danger'
			}))
		) {
			return;
		}

		clearingCache = true;
		try {
			await auth.clearLocalCache();
		} finally {
			clearingCache = false;
		}
	}

	async function resetPreferences() {
		if (
			!(await confirm.ask({
				title: 'Reset preferences?',
				description:
					'Reset mail and display preferences to defaults? Your display name and signature are unchanged.',
				confirmLabel: 'Reset',
				tone: 'danger'
			}))
		) {
			return;
		}
		settings.resetAllSettings();
		toast.show('Preferences reset', 'success');
	}
</script>

<StorageQuota />

<SettingsGroup
	title="Backup & sync"
	description="Your preferences sync automatically across your devices. Export to keep an offline copy."
>
	<SettingsRow
		kind="action"
		title="Sync now"
		description="Force an immediate sync with your account instead of waiting for the automatic one."
	>
		<button type="button" class="z-mail-text-nav__link" onclick={() => void settings.syncToAccount()}>
			Sync
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Export settings"
		description="Download your preferences as a JSON file."
	>
		<button type="button" class="z-mail-text-nav__link" onclick={() => settings.downloadLocalPreferences()}>
			Export
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Import settings"
		description="Load preferences from a previously exported file."
	>
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
		<button type="button" class="z-mail-text-nav__link" onclick={() => importInput?.click()}>
			Import
		</button>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="Storage & reset"
	description="Free up space or start fresh. These actions can't be undone."
>
	{#if trashMailbox}
		<SettingsRow
			kind="action"
			title="Empty Trash"
			description="Permanently delete every message in the Trash folder."
		>
			<button
				type="button"
				class="z-mail-text-nav__link z-mail-text-nav__link--danger"
				disabled={emptyingTrash || !auth.client}
				onclick={() => void emptyMailbox('trash')}
			>
				{emptyingTrash ? 'Emptying…' : 'Empty'}
			</button>
		</SettingsRow>
	{/if}

	{#if junkMailbox}
		<SettingsRow
			kind="action"
			title="Empty Spam"
			description="Permanently delete every message in the Spam folder."
		>
			<button
				type="button"
				class="z-mail-text-nav__link z-mail-text-nav__link--danger"
				disabled={emptyingSpam || !auth.client}
				onclick={() => void emptyMailbox('junk')}
			>
				{emptyingSpam ? 'Emptying…' : 'Empty'}
			</button>
		</SettingsRow>
	{/if}

	<SettingsRow
		kind="action"
		title="Clear local cache"
		description="Remove downloaded mail and sync state from this device. Your mail on the server is untouched."
	>
		<button
			type="button"
			class="z-mail-text-nav__link"
			disabled={clearingCache}
			onclick={() => void clearLocalCache()}
		>
			{clearingCache ? 'Clearing…' : 'Clear'}
		</button>
	</SettingsRow>

	<SettingsRow
		kind="action"
		title="Reset preferences"
		description="Restore all settings to their defaults. Your display name and signature are kept."
	>
		<button
			type="button"
			class="z-mail-text-nav__link z-mail-text-nav__link--danger"
			onclick={() => void resetPreferences()}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
