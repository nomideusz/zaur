<script lang="ts">
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const ctx = $derived(mobileIsland.reader);
</script>

<!-- Hamburger and back live in the top bar on inner screens; the island is
     a pure message-actions dock. -->
{#if ctx}
	<div class="z-mobile-island__tabs" role="toolbar" aria-label="Message actions">
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
