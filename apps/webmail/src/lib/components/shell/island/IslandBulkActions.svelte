<script lang="ts">
	import BulkActionsRow from '$lib/components/mail/BulkActionsRow.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import X from '$lib/components/icons/X.svelte';
	import { ActionBarValue } from '$lib/components/ui/action-bar';
	import { mail } from '$lib/stores/mail.svelte';
	import { shellHeader } from '$lib/stores/shell-header.svelte';
	import { cn } from '$lib/utils/cn';

	const ctx = $derived(shellHeader.mail);
	const mailboxRouteId = $derived(ctx?.mailboxRouteId);
	const disabled = $derived(!ctx || ctx.loading || !!ctx.error || ctx.messageCount === 0);
	const selectedCount = $derived(mail.selectedMessageIds.size);

	/* Island width is fixed by the viewport; reserve the count + close chrome. */
	let toolbarWidth = $state(0);
	const ISLAND_CHROME_PX = 150;
	const actionsAvailableWidth = $derived(Math.max(0, toolbarWidth - ISLAND_CHROME_PX));
</script>

{#if mailboxRouteId}
	<div
		class={cn('z-mobile-island__bulk', disabled && 'pointer-events-none opacity-60')}
		role="toolbar"
		aria-label="Actions for selected messages"
		bind:clientWidth={toolbarWidth}
	>
		<span class="flex shrink-0 items-center gap-0.5">
			<ActionBarValue count={selectedCount} />
			<MessageListSelectMenu placement="top" {disabled} />
		</span>

		<div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
			<BulkActionsRow
				{mailboxRouteId}
				onBulkAction={ctx?.onBulkAction}
				menuSide="top"
				menuId="island-bulk-actions-menu"
				availableWidth={actionsAvailableWidth}
			/>
		</div>

		<button
			type="button"
			class="z-mobile-island__icon-btn"
			aria-label="Clear selection"
			onclick={() => mail.clearSelection()}
		>
			<X class="size-4" aria-hidden="true" />
		</button>
	</div>
{/if}
