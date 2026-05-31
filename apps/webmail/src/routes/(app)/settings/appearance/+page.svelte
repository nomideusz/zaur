<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
</script>

<svelte:head>
	<title>Appearance · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Appearance"
	description="Theme, motion, and visual style."
>
	<AppearanceSection />
</SettingsPanel>
