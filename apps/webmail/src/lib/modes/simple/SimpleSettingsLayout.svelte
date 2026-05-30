<script lang="ts">
	import { page } from '$app/stores';
	import SimpleSettingsHubNav from '$lib/modes/simple/SimpleSettingsHubNav.svelte';
	import SimpleSettingsTextNav from '$lib/modes/simple/SimpleSettingsTextNav.svelte';
	import { simpleContentPagePadClass } from '$lib/modes/simple/simple-content-layout';
	import { settings } from '$lib/stores/settings.svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		settingsRootClass
	}: {
		children: Snippet;
		settingsRootClass: string;
	} = $props();

	const isSettingsIndex = $derived($page.url.pathname === '/settings');
</script>

<div class="z-settings-page {settingsRootClass}">
	<div
		class="z-settings-content z-settings-content--simple {simpleContentPagePadClass(
			settings.compactSettingsLayout
		)}"
	>
		<SimpleSettingsTextNav isIndex={isSettingsIndex} />
		{@render children()}
		{#if isSettingsIndex}
			<SimpleSettingsHubNav />
		{/if}
	</div>
</div>
