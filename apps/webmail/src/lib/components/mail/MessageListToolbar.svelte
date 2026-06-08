<script lang="ts">
	import { goto } from '$app/navigation';
	import Search from '$lib/components/icons/Search.svelte';
	import type { MessageListReadFilter } from '$lib/components/mail/message-list-props';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import OverflowMenuItem from '$lib/components/ui/OverflowMenuItem.svelte';
	import { LABEL_MARK_IMPORTANT, LABEL_UNSEEN } from '$lib/mail/new-mail';
	import { mailListHref } from '$lib/mail/routes';
	import { mail } from '$lib/stores/mail.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		readFilter: MessageListReadFilter;
		onReadFilterChange: (filter: MessageListReadFilter) => void;
		disabled?: boolean;
		/** Shell header on mobile vs list pane on desktop. */
		surface?: 'shell' | 'pane';
		class?: string;
	}

	let {
		mailboxRouteId,
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

	const primaryOrder = new Map([
		['inbox', 0],
		['drafts', 1],
		['sent', 2],
		['archive', 3],
		['junk', 4],
		['trash', 5]
	]);

	const mailboxMenuItems = $derived(
		[...mail.mailboxes]
			.filter((mb) => primaryOrder.has(mb.role ?? ''))
			.sort((a, b) => {
				const aRank = primaryOrder.get(a.role ?? '') ?? 99;
				const bRank = primaryOrder.get(b.role ?? '') ?? 99;
				return aRank - bRank || a.name.localeCompare(b.name);
			})
			.map((mb) => ({
				id: mb.id,
				label: mb.name + (mb.unread > 0 ? ` (${mb.unread})` : '')
			}))
	);

	function selectMessages(filter: 'all' | 'normal' | 'new' | 'none') {
		mail.selectMessagesByFilter(filter);
	}
</script>

<nav
	class={cn(
		'z-mail-list-toolbar flex w-full min-w-0 items-center gap-3',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Message list"
>
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

	<div class="min-w-0 flex-1" aria-hidden="true"></div>

	<div class="flex shrink-0 items-center gap-4 max-md:hidden">
		{#if surface === 'pane'}
			<a href="/mail/compose" class="z-mail-text-nav__action">New message</a>
		{/if}

		<OverflowMenu
			label="More mail actions"
			menuId="mail-list-toolbar-menu-{surface}"
			placement="bottom"
			textTrigger
			triggerText="More"
			triggerClass="z-mail-text-nav__link"
		>
		{#if surface === 'shell'}
			<p class="z-type-label px-3 py-1.5 text-[10px] uppercase tracking-wider text-fg-muted">
				Mailbox
			</p>
			{#each mailboxMenuItems as item (item.id)}
				<OverflowMenuItem
					label={item.label}
					onclick={() => {
						if (item.id !== mailboxRouteId) void goto(mailListHref(item.id));
					}}
				/>
			{/each}
			<div class="my-1 border-t border-border/80" role="separator"></div>
			<OverflowMenuItem label="Search mail" onclick={() => goto('/mail/search?focus=1')}>
				{#snippet icon()}<Search class="size-4" aria-hidden="true" />{/snippet}
			</OverflowMenuItem>
			<div class="my-1 border-t border-border/80" role="separator"></div>
		{/if}

		<p class="z-type-label px-3 py-1.5 text-[10px] uppercase tracking-wider text-fg-muted">
			Select
		</p>
		<OverflowMenuItem label="Select all" onclick={() => selectMessages('all')} />
		<OverflowMenuItem label="Select normal" onclick={() => selectMessages('normal')} />
		<OverflowMenuItem label={`Select ${LABEL_UNSEEN.toLowerCase()}`} onclick={() => selectMessages('new')} />
		<OverflowMenuItem label="Clear selection" onclick={() => selectMessages('none')} />

		{#if surface === 'pane'}
			<div class="my-1 border-t border-border/80" role="separator"></div>
			<OverflowMenuItem label="Show seen only" onclick={() => onReadFilterChange('read')} />
		{/if}
		</OverflowMenu>
	</div>
</nav>
