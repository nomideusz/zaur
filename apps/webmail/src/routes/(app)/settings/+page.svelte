<script lang="ts">
	import { getWebmailModeContext } from '$lib/modes/context';
	import ExperienceSection from '$lib/settings/sections/experience.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';

	const editorial = $derived(getWebmailModeContext().settings.editorial);
</script>

<svelte:head>
	<title>Experience · ZAUR Webmail</title>
</svelte:head>

{#if editorial}
	<ExperienceSection />
{:else}
	<SettingsPanel
		title="Experience"
		description="Choose how ZAUR Webmail looks and behaves. Everything — mail, settings, and navigation — follows your mode."
	>
		<ExperienceSection />
	</SettingsPanel>
{/if}
