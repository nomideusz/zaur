<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import SettingsMobileIndex from '$lib/components/settings/SettingsMobileIndex.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';

	$effect(() => {
		if (!browser) return;
		if (window.matchMedia('(min-width: 768px)').matches) {
			void goto('/settings/account', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Settings · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<SettingsMobileIndex />
</SettingsPanel>
