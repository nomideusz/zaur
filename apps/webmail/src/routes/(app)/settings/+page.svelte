<script lang="ts">
	import { goto } from '$app/navigation';
	import SettingsMobileIndex from '$lib/components/settings/SettingsMobileIndex.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';

	// Render nothing until the viewport is known — avoids flashing the mobile
	// index on desktop before the redirect lands.
	let showIndex = $state(false);

	$effect(() => {
		if (window.matchMedia('(min-width: 768px)').matches) {
			void goto('/settings/account', { replaceState: true });
		} else {
			showIndex = true;
		}
	});
</script>

<svelte:head>
	<title>Settings · ZAUR Webmail</title>
</svelte:head>

{#if showIndex}
	<SettingsPanel>
		<SettingsMobileIndex />
	</SettingsPanel>
{/if}
