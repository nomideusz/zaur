<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import LayoutSection from '$lib/settings/sections/layout.svelte';
</script>

<svelte:head>
	<title>Mail View · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Mail View"
	description="Choose how you view and navigate your mail."
>
	<LayoutSection />
</SettingsPanel>
