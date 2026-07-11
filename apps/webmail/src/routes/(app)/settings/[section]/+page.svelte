<script lang="ts">
	import type { Component } from 'svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import AccountSection from '$lib/settings/sections/account.svelte';
	import AppearanceSection from '$lib/settings/sections/appearance.svelte';
	import CalendarSection from '$lib/settings/sections/calendar.svelte';
	import WritingSection from '$lib/settings/sections/writing.svelte';
	import DataSection from '$lib/settings/sections/data.svelte';
	import ReadingSection from '$lib/settings/sections/reading.svelte';

	let { data } = $props();

	const sections: Record<string, Component> = {
		account: AccountSection,
		appearance: AppearanceSection,
		calendar: CalendarSection,
		compose: WritingSection,
		data: DataSection,
		reading: ReadingSection
	};

	const Section = $derived(sections[data.section]!);
</script>

<svelte:head>
	<title>{data.title} · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel>
	<Section />
</SettingsPanel>
