<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '' }: { class?: string } = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const allSelected = $derived(
		mail.selectionMode &&
			mail.messages.length > 0 &&
			mail.messages.every((message) => selectedIds.includes(message.id))
	);
	const someSelected = $derived(mail.selectionMode && selectedIds.length > 0 && !allSelected);
	const checkboxState = $derived(allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked');

	function onClick(event: MouseEvent) {
		event.preventDefault();

		if (allSelected) {
			mail.exitSelectionMode();
			return;
		}

		mail.selectAllMessages();
	}
</script>

<input
	type="checkbox"
	class={cn('z-checkbox cursor-pointer', className)}
	data-state={checkboxState}
	checked={allSelected}
	aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
	disabled={!mail.messages.length || mail.messagesLoading}
	aria-label={mail.selectionMode ? 'Select all messages in this list' : 'Select messages'}
	onclick={onClick}
/>
