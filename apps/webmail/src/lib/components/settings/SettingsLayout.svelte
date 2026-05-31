<script lang="ts">
	import { page } from '$app/stores';
	import SettingsTextNav from '$lib/components/settings/SettingsTextNav.svelte';
	import { settingsShellClass } from '$lib/mail/layout';
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
	<div class={cn(settingsShellClass(), 'flex flex-col')}>
		<div class="z-settings-content">
			<SettingsTextNav isIndex={isSettingsIndex} />
			<div class="z-settings-body">
				<h1 class="sr-only">Settings</h1>
				{@render children()}
			</div>
		</div>
	</div>
</div>
