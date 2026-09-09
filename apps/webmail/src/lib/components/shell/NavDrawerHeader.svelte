<script lang="ts">
	import Settings from '$lib/components/icons/Settings.svelte';
	import AccountRail from '$lib/components/shell/AccountRail.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mobileShell } from '$lib/stores/mobile-shell.svelte';

	/* Drawer header: the same account rail as the top bar (tap an avatar to
	   switch) + Settings. Search lives in the top bar. */
</script>

<div class="z-nav-drawer__header">
	<span class="flex min-w-0 items-center gap-1">
		{#if auth.accounts.length > 0}
			<AccountRail max={5} />
		{/if}
	</span>
	<a
		href="/settings"
		class="z-chrome-icon-btn no-underline"
		aria-label="Settings"
		onclick={() => mobileShell.closeNavDrawer()}
	>
		<Settings class="size-[1.125rem]" aria-hidden="true" />
	</a>
</div>
