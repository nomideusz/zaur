<script lang="ts">
	import { getWebmailModeContext } from '$lib/modes/context';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ReadingCore from '$lib/settings/sections/reading-core.svelte';
	import SimpleReadingLayout from '$lib/modes/simple/settings/reading.svelte';
	import ClassicReadingLayout from '$lib/modes/classic/settings/reading.svelte';

	const mode = $derived(getWebmailModeContext());
	const editorial = $derived(mode.settings.editorial);
</script>

<svelte:head>
	<title>Reading · ZAUR Webmail</title>
</svelte:head>

{#if editorial}
	{#if mode.id === 'simple'}
		<SimpleReadingLayout />
	{:else}
		<ClassicReadingLayout />
	{/if}
	<ReadingCore />
{:else}
	<SettingsPanel
		title="Reading"
		description={mode.id === 'simple'
			? 'Lists, reader, notifications, and navigation in Simple mode.'
			: 'Lists, reader, workspace layout, and navigation in Classic mode.'}
	>
		{#if mode.id === 'simple'}
			<SimpleReadingLayout />
		{:else}
			<ClassicReadingLayout />
		{/if}
		<ReadingCore />
	</SettingsPanel>
{/if}
