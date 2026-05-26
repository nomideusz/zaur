<script lang="ts">
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import CalendarSection from '$lib/settings/sections/calendar.svelte';
</script>

<svelte:head>
	<title>Calendar · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Calendar"
	description="Week start, events per day, and event display."
>
	<CalendarSection />
</SettingsPanel>
