<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import InboxSection from '$lib/settings/sections/inbox.svelte';
</script>

<svelte:head>
	<title>Inbox · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Inbox"
	description="Row size and content, list header, bulk selection, and empty or search list states."
>
	<InboxSection />
</SettingsPanel>
