<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import WorkspaceNavSection from '$lib/settings/sections/workspace_nav.svelte';
</script>

<svelte:head>
	<title>Sidebar · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel title="Sidebar" description="Folders, search, and where the app opens.">
	<WorkspaceNavSection />
</SettingsPanel>
