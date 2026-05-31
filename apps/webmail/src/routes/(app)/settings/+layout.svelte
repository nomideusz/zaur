<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SimpleSettingsLayout from '$lib/modes/simple/SimpleSettingsLayout.svelte';
	import { setWebmailModeContext } from '$lib/modes/context';
	import { settingsRedirectForMode, WEBMAIL_MODE } from '$lib/modes/registry';

	let { children } = $props();

	setWebmailModeContext();

	$effect(() => {
		const pathname = $page.url.pathname;
		const redirect = settingsRedirectForMode(pathname);
		if (redirect && redirect !== pathname) {
			void goto(redirect, { replaceState: true });
		}
	});
</script>

<SimpleSettingsLayout settingsRootClass={WEBMAIL_MODE.settingsRootClass}>
	{@render children()}
</SimpleSettingsLayout>
