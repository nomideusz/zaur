<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Control text size, privacy, threads, and the reading pane when you open a message."
>
	<ReadingSection />
</SettingsPanel>
