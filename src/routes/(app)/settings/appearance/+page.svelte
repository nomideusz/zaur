<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
</script>

<svelte:head>
	<title>Theme · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Theme" description="Color mode, accent, and motion.">
	<AppearanceSection />
</SettingsPanel>
