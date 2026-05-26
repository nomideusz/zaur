<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import LayoutSection from '$lib/settings/sections/layout.svelte';
</script>

<svelte:head>
	<title>Layout · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Layout"
	description="Navigation, sidebar, panes, and the top bar."
>
	<LayoutSection />
</SettingsPanel>
