<script lang="ts">
	import { TreeView } from '@ark-ui/svelte/tree-view';
	import RiArrowRightSLine from 'svelte-remixicon/RiArrowRightSLine.svelte';
	import { hasFileNodeDrag, fileNodeDragId } from '$lib/files/drag';
	import { fileRoleLabel } from '$lib/jmap/file-rights';
	import type { FileTreeNode } from '@zaur/mail-core/files/folder-tree';
	import { auth } from '$lib/stores/auth.svelte';
	import { files } from '$lib/stores/files.svelte';
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
	const isDropTarget = $derived(files.dropTargetId === node.id);
	const hasChildren = $derived(node.children.length > 0);

	function onDragOver(event: DragEvent) {
		if (!hasFileNodeDrag(event.dataTransfer)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		files.dropTargetId = node.id;
	}

	function onDragLeave(event: DragEvent) {
		if (event.currentTarget instanceof HTMLElement && event.relatedTarget instanceof Node) {
			if (event.currentTarget.contains(event.relatedTarget)) return;
		}
		if (files.dropTargetId === node.id) files.dropTargetId = null;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		files.dropTargetId = null;
		const id = fileNodeDragId(event.dataTransfer);
		const client = auth.client;
		if (id && client) void files.move(client, id, node.id);
	}
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
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
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
						{@render folderButton(
							cn(
								'z-folder-branch-link',
								isActive && 'z-folder-active',
								isDropTarget && 'z-folder-drop'
							)
						)}
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
							cn(
								'z-folder-row z-folder-row--leaf',
								isActive && 'z-folder-active',
								isDropTarget && 'z-folder-drop'
							),
							itemProps
						)}
					{/snippet}
				</TreeView.Item>
			{/if}
		{/snippet}
	</TreeView.NodeContext>
</TreeView.NodeProvider>
