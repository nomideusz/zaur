<script lang="ts">
	import { TreeView } from '@ark-ui/svelte/tree-view';
	import RiArrowRightSLine from 'svelte-remixicon/RiArrowRightSLine.svelte';
	import { mailListHref } from '$lib/mail/routes';
	import type { MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import Self from './MailboxTreeNode.svelte';

	interface Props {
		node: MailboxNode;
		indexPath: number[];
		activeRouteId: string | null;
	}

	let { node, indexPath, activeRouteId }: Props = $props();

	const href = $derived(mailListHref(node.id));
	const isActive = $derived(activeRouteId === node.id);
	const badgeCount = $derived(node.role === 'drafts' ? node.total : node.unread);
	const hasChildren = $derived(node.children.length > 0);
</script>

<TreeView.NodeProvider {node} {indexPath}>
	{#if hasChildren}
		<TreeView.Branch class="z-folder-branch">
			<TreeView.BranchControl class="z-folder-row z-folder-row--branch">
				<TreeView.BranchTrigger class="z-folder-chevron" aria-label="Toggle {node.name}">
					<TreeView.BranchIndicator class="z-folder-chevron-icon">
						<RiArrowRightSLine />
					</TreeView.BranchIndicator>
				</TreeView.BranchTrigger>
				<a {href} class={cn('z-folder-branch-link', isActive && 'z-folder-active')} aria-current={isActive ? 'page' : undefined}>
					<span class="z-folder-name truncate">{node.name}</span>
					{#if badgeCount > 0}
						<span class={cn('z-folder-badge', isActive && 'z-folder-badge--active')}>{badgeCount}</span>
					{/if}
				</a>
			</TreeView.BranchControl>
			<TreeView.BranchContent class="z-folder-children">
				{#each node.children as child, i (child.id)}
					<Self node={child} indexPath={[...indexPath, i]} {activeRouteId} />
				{/each}
			</TreeView.BranchContent>
		</TreeView.Branch>
	{:else}
		<TreeView.Item class="z-folder-item">
			{#snippet asChild(itemProps)}
				<a
					{href}
					{...itemProps()}
					class={cn('z-folder-row z-folder-row--leaf', isActive && 'z-folder-active')}
					aria-current={isActive ? 'page' : undefined}
				>
					<span class="z-folder-name truncate">{node.name}</span>
					{#if badgeCount > 0}
						<span class={cn('z-folder-badge', isActive && 'z-folder-badge--active')}>{badgeCount}</span>
					{/if}
				</a>
			{/snippet}
		</TreeView.Item>
	{/if}
</TreeView.NodeProvider>
