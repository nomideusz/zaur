<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import WorkspaceLayoutSection from '$lib/settings/sections/workspace_layout.svelte';
	import WorkspaceNavSection from '$lib/settings/sections/workspace_nav.svelte';
</script>

<svelte:head>
	<title>Workspace · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Workspace"
	description="Home screen, navigation, folder sidebar, and how panes are laid out."
>
	<WorkspaceNavSection />
	<WorkspaceLayoutSection />
</SettingsPanel>
