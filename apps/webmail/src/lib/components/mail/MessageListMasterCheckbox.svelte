<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { mail } from '$lib/stores/mail.svelte';

	let { class: className = '' }: { class?: string } = $props();

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const allSelected = $derived(
		mail.selectableMessageList.length > 0 &&
			mail.selectableMessageList.every((message) => selectedIds.includes(message.id))
	);
	const someSelected = $derived(selectedIds.length > 0 && !allSelected);
	const checkedState = $derived(allSelected ? true : someSelected ? 'indeterminate' : false);

	function handleClick(event: MouseEvent) {
		event.stopPropagation();
		event.preventDefault();
		const list = mail.selectableMessageList;
		if (!list.length) return;

		if (mail.selectedMessageIds.size > 0) {
			mail.clearSelection();
			return;
		}

		mail.selectMessagesByFilter('all');
	}
</script>

<Checkbox
	checked={checkedState}
	class={className}
	disabled={!mail.selectableMessageList.length || mail.messagesLoading}
	label={allSelected || someSelected ? 'Deselect all messages' : 'Select all messages'}
	onclick={handleClick}
/>
