<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import DataBackupSection from '$lib/settings/sections/data_backup.svelte';
	import DataResetSection from '$lib/settings/sections/data_reset.svelte';
</script>

<svelte:head>
	<title>Backup & reset · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Backup & reset"
	description="Export your settings or restore display defaults."
>
	<DataResetSection />
	<DataBackupSection />
</SettingsPanel>
