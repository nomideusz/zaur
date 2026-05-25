<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		class: className = '',
		activeMessageId = null
	}: { class?: string; activeMessageId?: string | null } = $props();

	let input = $state<HTMLInputElement | null>(null);

	const selectedCount = $derived([...mail.selectedMessageIds].length);
	const allSelected = $derived(
		mail.selectionMode &&
			mail.messages.length > 0 &&
			selectedCount === mail.messages.length
	);
	const someSelected = $derived(
		mail.selectionMode &&
			selectedCount > 0 &&
			selectedCount < mail.messages.length
	);

	function onClick(event: MouseEvent) {
		event.preventDefault();

		if (!mail.selectionMode) {
			mail.enterSelectionMode(activeMessageId);
			return;
		}

		if (allSelected) {
			mail.exitSelectionMode();
		} else {
			mail.selectAllMessages();
		}
	}

	$effect(() => {
		if (!input) return;
		input.indeterminate = someSelected;
	});
</script>

<input
	bind:this={input}
	type="checkbox"
	class={cn('z-checkbox cursor-pointer', className)}
	checked={allSelected}
	disabled={!mail.messages.length || mail.messagesLoading}
	aria-label={mail.selectionMode ? 'Select all messages in this list' : 'Select messages'}
	onclick={onClick}
/>
