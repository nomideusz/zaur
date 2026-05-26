<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import DataBackupSection from '$lib/settings/sections/data_backup.svelte';
	import DataResetSection from '$lib/settings/sections/data_reset.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const simplificationCount = $derived(settings.simplificationCount());
</script>

<svelte:head>
	<title>Backup & reset · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Backup & reset"
	description={`Export your settings, restore defaults, or apply simple mode for a minimal layout.${
		simplificationCount > 0
			? ` ${simplificationCount} simplification${simplificationCount === 1 ? '' : 's'} currently active.`
			: ''
	}`}
>
	<DataResetSection />
	<DataBackupSection />
</SettingsPanel>
