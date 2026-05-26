<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';
</script>

<svelte:head>
	<title>Mail · Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Message content, replies, threads, and privacy in the reading pane."
>
	<ReadingSection />
</SettingsPanel>
