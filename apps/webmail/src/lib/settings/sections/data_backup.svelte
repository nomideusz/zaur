<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let importInput = $state<HTMLInputElement | null>(null);

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
</script>

<SettingsGroup title="Backup">
	<SettingsRow title="Export settings">
		<button type="button" class="z-btn-ghost" onclick={() => settings.downloadLocalPreferences()}>
			Export
		</button>
	</SettingsRow>

	<SettingsRow title="Import settings">
		<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
		<button type="button" class="z-btn-ghost" onclick={() => importInput?.click()}>
			Import
		</button>
	</SettingsRow>
</SettingsGroup>
