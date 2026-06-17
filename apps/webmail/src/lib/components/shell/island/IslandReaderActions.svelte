<script lang="ts">
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Menu from '$lib/components/icons/Menu.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const ctx = $derived(mobileIsland.reader);
</script>

{#if ctx}
	<div class="z-mobile-island__tabs" role="toolbar" aria-label="Message actions">
		<button
			type="button"
			class="z-mobile-island__icon-btn"
			aria-label="Apps and folders"
			aria-expanded={mobileIsland.navDrawerOpen}
			onclick={() => mobileIsland.openNavDrawer()}
		>
			<Menu class="size-[1.125rem]" aria-hidden="true" />
		</button>

		<a
			href={ctx.listHref}
			class="z-mobile-island__icon-btn no-underline"
			aria-label="Back to list"
		>
			<ArrowLeft class="size-[1.125rem]" aria-hidden="true" />
		</a>

		<MessageThreadActions
			thread={ctx.thread}
			mailboxRouteId={ctx.mailboxRouteId}
			onMoved={ctx.onMoved}
			onBackToList={ctx.onBackToList}
			menuPlacement="top"
			menuId="island-reader-actions-menu"
			variant="island"
		/>
	</div>
{/if}
