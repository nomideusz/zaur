<script lang="ts">
	import { goto } from '$app/navigation';
	import PenSquare from '$lib/components/icons/PenSquare.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import type { MessageListReadFilter } from '$lib/components/mail/message-list-props';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
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

	const filterPillClass =
		'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors md:px-3 md:py-1.5 md:text-sm';

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
		'z-mail-list-toolbar flex w-full min-w-0 items-center gap-2',
		disabled && 'pointer-events-none opacity-60',
		className
	)}
	aria-label="Message list"
>
	<div class="flex min-w-0 items-center gap-1" aria-label="Filter messages">
		{#each listFilters as option (option.id)}
			<button
				type="button"
				class={cn(
					filterPillClass,
					readFilter === option.id
						? 'bg-accent/10 text-accent'
						: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
				)}
				aria-pressed={readFilter === option.id}
				onclick={() => onReadFilterChange(option.id)}
			>
				{option.label}
			</button>
		{/each}
	</div>

	<div class="min-w-0 flex-1" aria-hidden="true"></div>

	{#if surface === 'shell'}
		<button
			type="button"
			class="z-mail-list-toolbar__compose shrink-0"
			aria-label="New message"
			title="New message"
			onclick={() => goto('/mail/compose')}
		>
			<PenSquare class="size-5" aria-hidden="true" />
		</button>
	{:else}
		<Button href="/mail/compose" class="hidden shrink-0 sm:inline-flex">
			<PenSquare class="size-4" aria-hidden="true" />
			New message
		</Button>
		<IconButton label="New message" class="shrink-0 sm:hidden" onclick={() => goto('/mail/compose')}>
			<PenSquare class="size-4" aria-hidden="true" />
		</IconButton>
	{/if}

	<OverflowMenu
		label="More mail actions"
		menuId="mail-list-toolbar-menu-{surface}"
		placement="bottom"
		class="shrink-0"
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
</nav>
