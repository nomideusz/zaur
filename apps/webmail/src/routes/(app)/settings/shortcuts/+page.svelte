<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ShortcutsSection from '$lib/settings/sections/shortcuts.svelte';

	$effect(() => {
		if (!browser) return;
		if (window.matchMedia('(max-width: 767px)').matches) {
			void goto('/settings/reading', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Shortcuts · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<ShortcutsSection />
</SettingsPanel>
