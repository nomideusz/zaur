<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let input = $state<HTMLInputElement | null>(null);

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const allSelected = $derived(
		mail.selectableMessageList.length > 0 &&
			mail.selectableMessageList.every((message) => selectedIds.includes(message.id))
	);
	const someSelected = $derived(selectedIds.length > 0 && !allSelected);

	$effect(() => {
		if (!input) return;
		input.checked = allSelected;
		input.indeterminate = someSelected;
	});

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

<input
	bind:this={input}
	type="checkbox"
	class={className}
	aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
	disabled={!mail.selectableMessageList.length || mail.messagesLoading}
	aria-label={allSelected || someSelected ? 'Deselect all messages' : 'Select all messages'}
	onclick={handleClick}
/>
