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

<SettingsGroup title="Backup" description="Export or import your preferences.">
		<SettingsRow
			title="Export settings"
			description="Download your display, mail, and theme preferences from this browser"
		>
			<button type="button" class="z-btn-ghost text-sm" onclick={() => settings.downloadLocalPreferences()}>
				Export
			</button>
		</SettingsRow>

		<SettingsRow
			title="Import settings"
			description="Restore preferences from a previously exported JSON file"
		>
			<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
			<button type="button" class="z-btn-ghost text-sm" onclick={() => importInput?.click()}>
				Import
			</button>
		</SettingsRow>

</SettingsGroup>
