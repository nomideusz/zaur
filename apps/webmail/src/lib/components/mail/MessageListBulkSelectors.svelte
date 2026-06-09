<script lang="ts">
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		disabled?: boolean;
		surface?: 'pane' | 'shell';
		class?: string;
	}

	let { disabled = false, surface = 'pane', class: className = '' }: Props = $props();
</script>

<div
	class={cn(
		'z-mail-list-bulk-bar__selectors',
		surface === 'shell' && 'z-mail-list-bulk-selectors--shell',
		className
	)}
>
	<div class="z-mail-list-checkbox-col">
		<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
	</div>
	<MessageListSelectMenu {disabled} />
</div>
