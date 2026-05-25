<script lang="ts">
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '' }: { class?: string } = $props();

	let input = $state<HTMLInputElement | null>(null);

	function onChange() {
		if (!mail.selectionMode) {
			mail.enterSelectionMode();
			return;
		}

		if (mail.selectedCount === mail.messages.length) {
			mail.selectedMessageIds = new Set();
		} else {
			mail.selectAllMessages();
		}
	}

	$effect(() => {
		if (!input) return;
		input.indeterminate =
			mail.selectionMode &&
			mail.selectedCount > 0 &&
			mail.selectedCount < mail.messages.length;
	});
</script>

<input
	bind:this={input}
	type="checkbox"
	class={cn('size-4 shrink-0 accent-accent', className)}
	checked={mail.selectionMode && mail.messages.length > 0 && mail.selectedCount === mail.messages.length}
	disabled={!mail.messages.length || mail.messagesLoading}
	aria-label={mail.selectionMode ? 'Select all messages in this list' : 'Select messages'}
	onchange={onChange}
/>
