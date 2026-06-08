<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let importInput = $state<HTMLInputElement | null>(null);
	let clearingCache = $state(false);

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

<SettingsGroup title="Preference Import/Export">
	<SettingsRow title="Export settings">
		<button type="button" class="z-mail-text-nav__link" onclick={() => settings.downloadLocalPreferences()}>
			Export
		</button>
	</SettingsRow>

	<SettingsRow title="Import settings">
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
		<button type="button" class="z-mail-text-nav__link" onclick={() => importInput?.click()}>
			Import
		</button>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Cache & Defaults">
	<SettingsRow title="Clear local cache">
		<button
			type="button"
			class="z-mail-text-nav__link"
			disabled={clearingCache}
			onclick={() => void clearLocalCache()}
		>
			{clearingCache ? 'Clearing…' : 'Clear'}
		</button>
	</SettingsRow>

	<SettingsRow title="Reset preferences">
		<button type="button" class="z-mail-text-nav__link text-fg-subtle" onclick={() => void resetPreferences()}>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
