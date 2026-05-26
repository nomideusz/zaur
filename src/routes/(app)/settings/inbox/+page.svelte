<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import InboxSection from '$lib/settings/sections/inbox.svelte';
</script>

<svelte:head>
	<title>Inbox · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Inbox"
	description="Message list rows, bulk selection, and empty states."
>
	<InboxSection />
</SettingsPanel>
