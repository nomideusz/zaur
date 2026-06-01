<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import CalendarSection from '$lib/settings/sections/calendar.svelte';
</script>

<svelte:head>
	<title>Calendar · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<CalendarSection />
</SettingsPanel>
