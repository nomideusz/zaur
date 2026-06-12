<script lang="ts">
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import MessageThreadActions from '$lib/components/mail/MessageThreadActions.svelte';
	import { mobileIsland } from '$lib/stores/mobile-island.svelte';

	const ctx = $derived(mobileIsland.reader);
</script>

{#if ctx}
	<div class="z-mobile-island__reader" role="toolbar" aria-label="Message actions">
		<a href={ctx.listHref} class="z-mobile-island__icon-btn no-underline" aria-label="Back to list">
			<ArrowLeft class="size-5" aria-hidden="true" />
		</a>
		<div class="flex min-w-0 flex-1 items-center justify-end">
			<MessageThreadActions
				thread={ctx.thread}
				mailboxRouteId={ctx.mailboxRouteId}
				onMoved={ctx.onMoved}
				onBackToList={ctx.onBackToList}
				menuPlacement="top"
				menuId="island-reader-actions-menu"
			/>
		</div>
	</div>
{/if}
