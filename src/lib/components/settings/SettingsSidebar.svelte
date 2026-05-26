<script lang="ts">
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import SettingsNavList from '$lib/components/settings/SettingsNavList.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks } from '$lib/settings/nav';
	import { cn } from '$lib/utils/cn';
	import { settings } from '$lib/stores/settings.svelte';

	const sections = [
		{ id: 'personal', label: 'Account' },
		{ id: 'mail', label: 'Mail' },
		{ id: 'customize', label: 'Interface' },
		{ id: 'advanced', label: 'More' }
	] as const;

	const links = $derived(settingsNavLinks());
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
			settings.compactFolderSidebarHeader ? 'px-3 pt-2 pb-3' : 'px-3 pt-3 pb-4',
			!settings.hidePaneBorders && 'border-b border-border/80'
		)}
	>
		<h1 class="px-2 text-base font-semibold text-fg">Settings</h1>
		<div class={cn('mt-3', settings.compactFolderSidebarHeader ? 'mb-0' : 'mb-1')}>
			<SettingsSearch />
		</div>
	</div>

	<nav
		class={cn(
			'z-pane-scroll min-h-0 flex-1 overflow-y-auto px-2',
			settings.compactFolderSidebar ? 'py-1.5' : 'py-2.5'
		)}
		aria-label="Settings sections"
	>
		<SettingsNavList {links} {sections} />
	</nav>

	<AppSidebarShortcuts inSettings />
</aside>
