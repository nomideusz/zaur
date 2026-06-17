<script lang="ts">
	import { goto } from '$app/navigation';
	import Forward from '$lib/components/icons/Forward.svelte';
	import Reply from '$lib/components/icons/Reply.svelte';
	import ReplyAll from '$lib/components/icons/ReplyAll.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { replyFromAddress } from '$lib/mail/reader-delivered-to';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import type { MessageDetail } from '$lib/types/mail';

	interface Props {
		/** The specific thread message these actions target. */
		message: MessageDetail;
		thread: MessageDetail[];
		menuId: string;
		placement?: 'top' | 'bottom';
	}

	let { message, thread, menuId, placement = 'bottom' }: Props = $props();

	function reply() {
		compose.startReply(message, replyFromAddress(message, auth.username, auth.identities));
		goto('/mail/compose?mode=reply');
	}

	function replyAll() {
		if (!auth.username) return;
		compose.startReplyAll(
			message,
			thread,
			auth.username,
			replyFromAddress(message, auth.username, auth.identities)
		);
		goto('/mail/compose?mode=reply-all');
	}

	function forward() {
		compose.startForward(message);
		goto('/mail/compose?mode=forward');
	}
</script>

<OverflowMenu label="Reply to this message" {menuId} {placement}>
	<OverflowMenuItem label="Reply" onclick={reply}>
		{#snippet icon()}<Reply class="size-5" aria-hidden="true" />{/snippet}
	</OverflowMenuItem>
	<OverflowMenuItem label="Reply all" onclick={replyAll}>
		{#snippet icon()}<ReplyAll class="size-5" aria-hidden="true" />{/snippet}
	</OverflowMenuItem>
	<OverflowMenuItem label="Forward" onclick={forward}>
		{#snippet icon()}<Forward class="size-5" aria-hidden="true" />{/snippet}
	</OverflowMenuItem>
</OverflowMenu>
