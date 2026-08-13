<script lang="ts">
	import { TreeView } from '@ark-ui/svelte/tree-view';
	import RiArrowRightSLine from 'svelte-remixicon/RiArrowRightSLine.svelte';
	import { fileRoleLabel } from '$lib/jmap/file-rights';
	import type { FileTreeNode } from '@zaur/mail-core/files/folder-tree';
	import { cn } from '$lib/utils/cn';
	import Self from './FilesTreeNode.svelte';

	interface Props {
		node: FileTreeNode;
		indexPath: number[];
		activeId: string | null;
		onOpen: (id: string) => void;
	}

	let { node, indexPath, activeId, onOpen }: Props = $props();

	const label = $derived(fileRoleLabel(node.role) ?? node.name);
	const isActive = $derived(activeId === node.id);
	const hasChildren = $derived(node.children.length > 0);
</script>

{#snippet folderButton(linkClass: string, extraProps?: () => object)}
	{@const extra = extraProps?.() ?? {}}
	{@const { onclick, onClick, ...rest } = extra as {
		onclick?: (event: MouseEvent) => void;
		onClick?: (event: MouseEvent) => void;
		[key: string]: unknown;
	}}
	<button
		type="button"
		{...rest}
		class={linkClass}
		aria-current={isActive ? 'true' : undefined}
		onclick={(event) => {
			onclick?.(event);
			onClick?.(event);
			onOpen(node.id);
		}}
	>
		<span class="z-folder-name truncate">{label}</span>
	</button>
{/snippet}

<TreeView.NodeProvider {node} {indexPath}>
	<TreeView.NodeContext>
		{#snippet render()}
			{#if hasChildren}
				<TreeView.Branch class="z-folder-branch">
					<TreeView.BranchControl class="z-folder-row z-folder-row--branch">
						<TreeView.BranchTrigger class="z-folder-chevron" aria-label="Toggle {label}">
							<TreeView.BranchIndicator class="z-folder-chevron-icon">
								<RiArrowRightSLine />
							</TreeView.BranchIndicator>
						</TreeView.BranchTrigger>
						{@render folderButton(cn('z-folder-branch-link', isActive && 'z-folder-active'))}
					</TreeView.BranchControl>
					<TreeView.BranchContent class="z-folder-children">
						{#each node.children as child, i (child.id)}
							<Self node={child} indexPath={[...indexPath, i]} {activeId} {onOpen} />
						{/each}
					</TreeView.BranchContent>
				</TreeView.Branch>
			{:else}
				<TreeView.Item class="z-folder-item">
					{#snippet asChild(itemProps)}
						{@render folderButton(
							cn('z-folder-row z-folder-row--leaf', isActive && 'z-folder-active'),
							itemProps
						)}
					{/snippet}
				</TreeView.Item>
			{/if}
		{/snippet}
	</TreeView.NodeContext>
</TreeView.NodeProvider>
