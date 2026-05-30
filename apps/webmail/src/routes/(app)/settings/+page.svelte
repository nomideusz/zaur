<script lang="ts">
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import SettingsNavList from '$lib/components/settings/SettingsNavList.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks, SETTINGS_SECTIONS } from '$lib/settings/nav';

	const links = $derived(settingsNavLinks());
	const sections = SETTINGS_SECTIONS;
</script>

<svelte:head>
	<title>Settings · ZAUR Webmail</title>
</svelte:head>

<!-- Mobile settings index (desktop redirects to account via layout) -->
<div class="flex min-h-full flex-col md:hidden">
	<header class="z-settings-index-header sticky top-0 z-10">
		<h1 class="z-settings-index-title">Settings</h1>
		<div class="mt-3">
			<SettingsSearch />
		</div>
	</header>

	<nav aria-label="Settings sections" class="min-h-0 flex-1 px-4 pt-4">
		<SettingsNavList {links} {sections} variant="mobile" />
	</nav>

	<div class="mt-6 border-t border-border px-4 pt-3">
		<AppSidebarShortcuts inSettings />
	</div>
</div>
