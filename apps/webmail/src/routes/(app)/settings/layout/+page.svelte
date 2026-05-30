<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import LayoutSection from '$lib/settings/sections/layout.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { webmailModeDefinition } from '$lib/modes/registry';

	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));
	const title = $derived(activeMode.settingsViewLabel);
</script>

<svelte:head>
	<title>{title} · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	{title}
	description="Mode-specific navigation and layout options."
>
	<LayoutSection />
</SettingsPanel>
