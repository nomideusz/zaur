<script lang="ts">
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import SettingsNavList from '$lib/components/settings/SettingsNavList.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks, SETTINGS_SECTIONS, WEBMAIL_MODE } from '$lib/modes/registry';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const links = $derived(settingsNavLinks());
	const sections = SETTINGS_SECTIONS;
</script>

<aside
	class={cn(
		'z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col md:flex',
		!settings.hidePaneBorders && 'border-r border-border'
	)}
	aria-label="Settings"
>
	<div
		class={cn(
			'relative z-20 shrink-0',
			'px-3 pt-3 pb-4',
			!settings.hidePaneBorders && 'border-b border-border/80'
		)}
	>
		<h1 class="z-settings-sidebar-title">Settings</h1>
		<p class="mt-1 px-2 text-xs text-fg-subtle">
			{WEBMAIL_MODE.label}
		</p>
		<div class="mb-1 mt-3">
			<SettingsSearch />
		</div>
	</div>

	<nav
		class={cn(
			'z-pane-scroll min-h-0 flex-1 overflow-y-auto px-2',
			'py-2.5'
		)}
		aria-label="Settings sections"
	>
		<SettingsNavList {links} {sections} />
	</nav>

	<AppSidebarShortcuts inSettings />
</aside>
