<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ContactsSection from '$lib/settings/sections/contacts.svelte';
</script>

<svelte:head>
	<title>Contacts · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Contacts"
	description="Adjust list density, what each row shows, and how the Contacts page behaves when empty."
>
	<ContactsSection />
</SettingsPanel>
