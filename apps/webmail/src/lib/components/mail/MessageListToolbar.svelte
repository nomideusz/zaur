<script lang="ts">
	import MessageListFilterPicker from '$lib/components/mail/MessageListFilterPicker.svelte';
	import type { MessageListReadFilter } from '$lib/components/mail/message-list-props';
	import { LABEL_MARK_IMPORTANT, LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { cn } from '$lib/utils/cn';

	interface Props {
		readFilter: MessageListReadFilter;
		onReadFilterChange: (filter: MessageListReadFilter) => void;
		disabled?: boolean;
		/** Shell header on mobile vs list pane on desktop. */
		surface?: 'shell' | 'pane';
		class?: string;
	}

	let {
		readFilter,
		onReadFilterChange,
		disabled = false,
		surface = 'pane',
		class: className = ''
	}: Props = $props();

	const listFilters: { id: MessageListReadFilter; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'unread', label: LABEL_UNSEEN },
		{ id: 'important', label: LABEL_MARK_IMPORTANT },
		{ id: 'new', label: 'New' }
	];
</script>

<nav
	class={cn(
		'z-mail-list-toolbar flex w-full min-w-0 items-center',
		surface === 'shell' && 'justify-center',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Message list filters"
>
	{#if surface === 'shell'}
		<MessageListFilterPicker
			value={readFilter}
			onchange={onReadFilterChange}
			{disabled}
		/>
	{:else}
		<div class="z-segmented min-w-0" role="group" aria-label="Filter messages">
			{#each listFilters as option (option.id)}
				<button
					type="button"
					class={cn('z-segmented__item', readFilter === option.id && 'z-segmented__item--active')}
					aria-pressed={readFilter === option.id}
					onclick={() => onReadFilterChange(option.id)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</nav>
