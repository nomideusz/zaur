<script lang="ts">
	import SettingsLayout from '$lib/components/settings/SettingsLayout.svelte';
	import { MAIL_LAYOUT } from '$lib/mail/config';

	let { children } = $props();
</script>

<SettingsLayout settingsRootClass={MAIL_LAYOUT.settingsRootClass}>
	{@render children()}
</SettingsLayout>
