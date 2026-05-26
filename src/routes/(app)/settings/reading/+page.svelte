<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Text size, threads, privacy, and reply behavior."
>
	<ReadingSection />
</SettingsPanel>
