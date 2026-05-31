<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SettingsLayout from '$lib/components/settings/SettingsLayout.svelte';
	import { settingsRedirect, MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();

	$effect(() => {
		const pathname = $page.url.pathname;
		const redirect = settingsRedirect(pathname);
		if (redirect && redirect !== pathname) {
			void goto(redirect, { replaceState: true });
		}
	});
</script>

<SettingsLayout settingsRootClass={MAIL_LAYOUT.settingsRootClass}>
	{@render children()}
</SettingsLayout>
