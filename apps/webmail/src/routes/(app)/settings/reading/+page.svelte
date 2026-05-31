<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingCore from '$lib/settings/sections/reading-core.svelte';
	import SimpleReadingLayout from '$lib/modes/simple/settings/reading.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Lists, reader, notifications, and navigation."
>
	<SimpleReadingLayout />
	<ReadingCore />
</SettingsPanel>
