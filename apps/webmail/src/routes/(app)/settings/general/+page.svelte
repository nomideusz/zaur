<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
	import DataSection from '$lib/settings/sections/data.svelte';
</script>

<svelte:head>
	<title>General · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<AppearanceSection />
	<DataSection />
</SettingsPanel>
