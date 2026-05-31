<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let input = $state<HTMLInputElement | null>(null);

	const selectedIds = $derived([...mail.selectedMessageIds]);
	const allSelected = $derived(
		mail.messages.length > 0 &&
			mail.messages.every((message) => selectedIds.includes(message.id))
	);
	const someSelected = $derived(selectedIds.length > 0 && !allSelected);

	$effect(() => {
		if (input) input.indeterminate = someSelected;
	});

	function onChange() {
		if (allSelected || someSelected) {
			mail.clearSelection();
			input?.blur();
			return;
		}

		mail.selectAllMessages();
	}
</script>

<input
	bind:this={input}
	type="checkbox"
	class={className}
	checked={allSelected}
	aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
	disabled={!mail.messages.length || mail.messagesLoading}
	aria-label={allSelected ? 'Deselect all messages' : 'Select all messages'}
	onchange={onChange}
/>
