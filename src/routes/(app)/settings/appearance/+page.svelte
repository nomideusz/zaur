<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const simplificationCount = $derived(settings.simplificationCount());
</script>

<svelte:head>
	<title>Look & feel · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Look & feel"
	description="Theme, motion, and loading behavior.{simplificationCount > 0
		? ` ${simplificationCount} simplification${simplificationCount === 1 ? '' : 's'} active elsewhere.`
		: ''}"
>
	<AppearanceSection />
</SettingsPanel>
