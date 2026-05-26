<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import WorkspaceLayoutSection from '$lib/settings/sections/workspace_layout.svelte';
</script>

<svelte:head>
	<title>Layout · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Layout" description="How mail panes and the top bar use space.">
	<WorkspaceLayoutSection />
</SettingsPanel>
