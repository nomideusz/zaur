<script lang="ts">
	import { page } from '$app/stores';
	import SimpleSettingsTextNav from '$lib/modes/simple/SimpleSettingsTextNav.svelte';
	import { simpleSettingsShellClass } from '$lib/modes/simple/simple-content-layout';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';
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
	<div class={cn(simpleSettingsShellClass(settings.compactSettingsLayout), 'flex flex-col')}>
		<SimpleSettingsTextNav isIndex={isSettingsIndex} />
		<div class="z-settings-content z-settings-content--simple">
			<h1 class="sr-only">Settings</h1>
			{@render children()}
		</div>
	</div>
</div>
