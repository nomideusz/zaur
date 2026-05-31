<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingCore from '$lib/settings/sections/reading-core.svelte';
	import ReadingLayout from '$lib/settings/sections/reading-layout.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Lists, reader, notifications, and navigation."
>
	<ReadingLayout />
	<ReadingCore />
</SettingsPanel>
