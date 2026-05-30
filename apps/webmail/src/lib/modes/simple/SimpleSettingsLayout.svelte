<script lang="ts">
	import { page } from '$app/stores';
	import SimpleSettingsHubNav from '$lib/modes/simple/SimpleSettingsHubNav.svelte';
	import SimpleSettingsTextNav from '$lib/modes/simple/SimpleSettingsTextNav.svelte';
	import { cn } from '$lib/utils/cn';
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

<div class="flex min-h-0 flex-1 flex-col overflow-hidden {settingsRootClass}">
	<div class="z-pane-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
		<div
			class={cn(
				'z-settings-content z-settings-content--simple w-full min-w-0',
				settings.compactSettingsLayout
					? 'px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]'
					: 'px-4 py-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-8'
			)}
		>
			<SimpleSettingsTextNav isIndex={isSettingsIndex} />
			{@render children()}
			{#if isSettingsIndex}
				<SimpleSettingsHubNav />
			{/if}
		</div>
	</div>
</div>
