<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SecuritySettings from '$lib/settings/sections/security.svelte';
</script>

<svelte:head>
	<title>Security · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<SecuritySettings />
</SettingsPanel>
