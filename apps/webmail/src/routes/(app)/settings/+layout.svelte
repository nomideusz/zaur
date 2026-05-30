<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ClassicSettingsLayout from '$lib/modes/classic/ClassicSettingsLayout.svelte';
	import SimpleSettingsLayout from '$lib/modes/simple/SimpleSettingsLayout.svelte';
	import { setWebmailModeContext } from '$lib/modes/context';
	import { settingsRedirectForMode, webmailModeDefinition } from '$lib/modes/registry';
	import { settings } from '$lib/stores/settings.svelte';

	let { children } = $props();

	const activeMode = $derived(webmailModeDefinition(settings.mailViewMode));

	setWebmailModeContext(() => webmailModeDefinition(settings.mailViewMode));

	$effect(() => {
		const pathname = $page.url.pathname;
		const mode = settings.mailViewMode;
		const redirect = settingsRedirectForMode(pathname, mode);
		if (redirect && redirect !== pathname) {
			void goto(redirect, { replaceState: true });
		}
	});
</script>

{#if activeMode.settings.useSidebar}
	<ClassicSettingsLayout settingsRootClass={activeMode.settingsRootClass}>
		{@render children()}
	</ClassicSettingsLayout>
{:else}
	<SimpleSettingsLayout settingsRootClass={activeMode.settingsRootClass}>
		{@render children()}
	</SimpleSettingsLayout>
{/if}
