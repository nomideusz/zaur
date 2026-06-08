<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';
	import WritingSection from '$lib/settings/sections/writing.svelte';
</script>

<svelte:head>
	<title>Mail · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<ReadingSection />
	<WritingSection />
</SettingsPanel>
