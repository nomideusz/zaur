<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import InboxSection from '$lib/settings/sections/inbox.svelte';
</script>

<svelte:head>
	<title>Inbox · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Inbox"
	description="Density and what each row shows in the message list."
>
	<InboxSection />
</SettingsPanel>
