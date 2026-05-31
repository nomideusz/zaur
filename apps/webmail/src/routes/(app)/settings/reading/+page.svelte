<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import Reading from '$lib/settings/sections/reading.svelte';
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Reading"
	description="Lists, message content, alerts, and how mail behaves when you read it."
>
	<Reading />
</SettingsPanel>
