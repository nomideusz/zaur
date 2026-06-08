<script lang="ts">
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import type { MessageListReadFilter } from '$lib/components/mail/message-list-props';
	import { LABEL_MARK_IMPORTANT, LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { cn } from '$lib/utils/cn';

	interface Props {
		value: MessageListReadFilter;
		onchange: (filter: MessageListReadFilter) => void;
		disabled?: boolean;
		class?: string;
	}

	let { value, onchange, disabled = false, class: className = '' }: Props = $props();

	const options: { value: MessageListReadFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'unread', label: LABEL_UNSEEN },
		{ value: 'important', label: LABEL_MARK_IMPORTANT },
		{ value: 'new', label: 'New' }
	];
</script>

<div class={cn(disabled && 'pointer-events-none opacity-60', className)}>
	<MobilePicker
		label="Filter messages"
		value={value}
		{options}
		onchange={(next) => onchange(next as MessageListReadFilter)}
		variant="compact"
		class="z-mail-list-pane-header__filter min-w-0 max-w-[9.5rem]"
	/>
</div>
