<script lang="ts">
	import MessageListFilterPicker from '$lib/components/mail/MessageListFilterPicker.svelte';
	import MessageListMasterCheckbox from '$lib/components/mail/MessageListMasterCheckbox.svelte';
	import MessageListSelectMenu from '$lib/components/mail/MessageListSelectMenu.svelte';
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
		{ id: 'important', label: LABEL_MARK_IMPORTANT }
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
		<div class="z-mail-list-toolbar__selectors">
			<div class="z-mail-list-checkbox-col">
				<MessageListMasterCheckbox class="z-mail-list-bulk-bar__checkbox" />
			</div>
			<MessageListSelectMenu {disabled} />
		</div>
		<div class="z-segmented shrink-0" role="group" aria-label="Filter messages">
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
		<div class="z-header-action-zone">
			<a href="/mail/compose" class="z-mail-text-nav__action">New message</a>
		</div>
	{/if}
</nav>
