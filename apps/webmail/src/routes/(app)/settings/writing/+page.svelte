<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import WritingSection from '$lib/settings/sections/writing.svelte';
</script>

<svelte:head>
	<title>Writing · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Writing" description="Compose, reply, and send behavior.">
	<WritingSection />
</SettingsPanel>
