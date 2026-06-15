<script lang="ts">
	import { page } from '$app/stores';
	import { TreeView, createTreeCollection } from '@ark-ui/svelte/tree-view';
	import { parseMailContext, mailListHref } from '$lib/mail/routes';
	import { sidebarMailboxGroups } from '$lib/mail/mailboxes';
	import { mail } from '$lib/stores/mail.svelte';
	import type { Mailbox } from '$lib/types/mail';
	import { buildMailboxTree, collectBranchIds, type MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import MailboxTreeNode from './MailboxTreeNode.svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const mailboxGroups = $derived(sidebarMailboxGroups(mail.mailboxes));

	const mailCtx = $derived(parseMailContext($page.url.pathname));
	const currentMailboxRouteId = $derived(mailCtx?.mailboxRouteId ?? null);

	// Custom (non-role) folders can nest via parentId; render them as a collapsible tree.
	const customTree = $derived(buildMailboxTree([...mailboxGroups.custom]));
	const customCollection = $derived(
		createTreeCollection<MailboxNode>({
			nodeToValue: (node) => node.id,
			nodeToString: (node) => node.name,
			rootNode: { id: 'ROOT', name: '', unread: 0, total: 0, children: customTree }
		})
	);
	const expandedBranches = $derived(collectBranchIds(customTree));
</script>

{#snippet mailboxRow(item: Mailbox)}
	{@const href = mailListHref(item.id)}
	{@const isActive = currentMailboxRouteId === item.id}
	{@const badgeCount = item.role === 'drafts' ? item.total : item.unread}
	<li>
		<a
			{href}
			class={cn(
				'flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors',
				isActive
					? 'z-surface-active font-semibold'
					: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
			)}
			aria-current={isActive ? 'page' : undefined}
		>
			<span class="truncate">{item.name}</span>
			{#if badgeCount > 0}
				<span class={cn('text-xs tabular-nums text-fg-subtle', isActive && 'text-accent font-semibold')}>
					{badgeCount}
				</span>
			{/if}
		</a>
	</li>
{/snippet}

<aside
	class={cn(
		'z-mail-pane-surface min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border',
		className
	)}
	style="view-transition-name: mail-sidebar;"
	aria-label="Mail navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Mailboxes</h2>
		<p class="mt-1 text-xs text-fg-muted">{mail.messagesTotal} messages</p>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
		<ul class="space-y-0.5">
			{#each mailboxGroups.system as item (item.id)}
				{@render mailboxRow(item)}
			{/each}
		</ul>

		{#if mailboxGroups.custom.length}
			<h3 class="z-type-label mt-4 px-3 pb-1">Folders</h3>
			<TreeView.Root
				class="z-folder-tree"
				collection={customCollection}
				selectedValue={currentMailboxRouteId ? [currentMailboxRouteId] : []}
				defaultExpandedValue={expandedBranches}
				expandOnClick={false}
			>
				<TreeView.Tree class="z-folder-tree-list">
					{#each customCollection.rootNode.children ?? [] as node, index (node.id)}
						<MailboxTreeNode {node} indexPath={[index]} activeRouteId={currentMailboxRouteId} />
					{/each}
				</TreeView.Tree>
			</TreeView.Root>
		{/if}
	</nav>
</aside>
