<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '' }: { class?: string } = $props();

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

		if (allSelected) {
			mail.exitSelectionMode();
			return;
		}

		mail.selectAllMessages();
	}

	$effect(() => {
		if (!input) return;
		input.indeterminate = someSelected && !allSelected;
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
