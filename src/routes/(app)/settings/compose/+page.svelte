<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ComposeSection from '$lib/settings/sections/compose.svelte';
</script>

<svelte:head>
	<title>Writing · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Writing"
	description="Compose layout, recipient fields, reply content, and toolbar chrome."
>
	<ComposeSection />
</SettingsPanel>
