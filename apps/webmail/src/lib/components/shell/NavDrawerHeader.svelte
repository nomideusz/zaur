<script lang="ts">
	import Settings from '$lib/components/icons/Settings.svelte';
	import { mobileShell } from '$lib/stores/mobile-shell.svelte';
</script>

<div class="z-nav-drawer__header">
	<h1 class="text-sm font-semibold text-fg">Menu</h1>
	<a
		href="/settings"
		class="z-chrome-icon-btn no-underline"
		aria-label="Settings"
		onclick={() => mobileShell.closeNavDrawer()}
	>
		<Settings class="size-[1.125rem]" aria-hidden="true" />
	</a>
</div>
