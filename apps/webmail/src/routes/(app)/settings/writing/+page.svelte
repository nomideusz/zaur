<script lang="ts">
	import { getWebmailModeContext } from '$lib/modes/context';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import WritingSection from '$lib/settings/sections/writing.svelte';

	const editorial = $derived(getWebmailModeContext().settings.editorial);
</script>

<svelte:head>
	<title>Writing · ZAUR Webmail</title>
</svelte:head>

{#if editorial}
	<WritingSection />
{:else}
	<SettingsPanel title="Writing" description="Compose, reply, and send behavior.">
		<WritingSection />
	</SettingsPanel>
{/if}
