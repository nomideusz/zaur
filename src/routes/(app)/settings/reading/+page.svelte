<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Message content, reply actions, threads, attachments, and empty or error states in the reading pane."
>
	<ReadingSection />
</SettingsPanel>
