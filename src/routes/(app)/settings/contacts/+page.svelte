<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ContactsSection from '$lib/settings/sections/contacts.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<svelte:head>
	<title>Contacts · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Contacts"
	description="Fine-tune the Contacts page — list density, empty states, and header actions."
>
	{#if settings.settingsDetailLevel === 'advanced'}
		<ContactsSection />
	{:else}
		<p class="rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm text-fg-muted">
			These options are in <strong class="font-medium text-fg">All options</strong> mode. Use the toggle
			above to show contact-page tweaks.
		</p>
	{/if}
</SettingsPanel>
