<script lang="ts">
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
	import SettingsNavList from '$lib/components/settings/SettingsNavList.svelte';
	import SettingsSearch from '$lib/components/settings/SettingsSearch.svelte';
	import { settingsNavLinks } from '$lib/settings/nav';

	const links = $derived(settingsNavLinks());

	const sections = [
		{ id: 'personal', label: 'Account' },
		{ id: 'mail', label: 'Mail' },
		{ id: 'customize', label: 'Interface' },
		{ id: 'advanced', label: 'More' }
	] as const;
</script>

<svelte:head>
	<title>Settings · ZAUR Webmail</title>
</svelte:head>

<!-- Mobile settings index (desktop redirects to account via layout) -->
<div class="flex min-h-full flex-col md:hidden">
	<h1 class="text-xl font-semibold text-fg">Settings</h1>

	<div class="mb-6 mt-4">
		<SettingsSearch />
	</div>

	<nav aria-label="Settings sections" class="min-h-0 flex-1">
		<SettingsNavList {links} {sections} />
	</nav>

	<AppSidebarShortcuts inSettings />
</div>
