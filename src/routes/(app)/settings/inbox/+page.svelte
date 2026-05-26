<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import InboxSection from '$lib/settings/sections/inbox.svelte';
</script>

<svelte:head>
	<title>Mail · Inbox list · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Inbox list"
	description="How messages appear in the list and bulk selection."
>
	<InboxSection />
</SettingsPanel>
