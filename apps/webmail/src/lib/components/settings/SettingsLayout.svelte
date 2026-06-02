<script lang="ts">
	import SettingsTextNav from '$lib/components/settings/SettingsTextNav.svelte';
	import { settingsShellClass } from '$lib/mail/layout';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	let {
		children,
		settingsRootClass
	}: {
		children: Snippet;
		settingsRootClass: string;
	} = $props();
</script>

<div class="z-settings-page {settingsRootClass}">
	<div class={cn(settingsShellClass(), 'flex flex-col')}>
		<div class="z-settings-content">
			<SettingsTextNav />
			<div class="z-settings-body">
				{@render children()}
			</div>
		</div>
	</div>
</div>
