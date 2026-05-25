<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import InboxSection from '$lib/settings/sections/inbox.svelte';
</script>

<svelte:head>
	<title>Inbox · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Inbox"
	description="Choose how your message list looks and behaves — density, previews, and what to show on each row."
>
	<InboxSection />
</SettingsPanel>
