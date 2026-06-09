<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AccountSection from '$lib/settings/sections/account.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
</script>

<svelte:head>
	<title>Account · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<AppearanceSection />
	<AccountSection />
</SettingsPanel>
