<script lang="ts">
	import { TreeView, createTreeCollection } from '@ark-ui/svelte/tree-view';
	import { collectFileBranchIds, type FileTreeNode } from '@zaur/mail-core/files/folder-tree';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import FilesTreeNode from '$lib/components/files/FilesTreeNode.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { files } from '$lib/stores/files.svelte';
	import { cn } from '$lib/utils/cn';

	let { class: className = '' }: { class?: string } = $props();

	const ownedCollection = $derived(fileTreeCollection(files.ownedTree));
	const sharedCollection = $derived(fileTreeCollection(files.sharedTree));
	const ownedExpanded = $derived(collectFileBranchIds(files.ownedTree));
	const sharedExpanded = $derived(collectFileBranchIds(files.sharedTree));
	const selectedValue = $derived(files.currentParentId ? [files.currentParentId] : []);

	function fileTreeCollection(nodes: FileTreeNode[]) {
		return createTreeCollection<FileTreeNode>({
			nodeToValue: (node) => node.id,
			nodeToString: (node) => node.name,
			rootNode: { id: 'ROOT', name: '', children: nodes } as FileTreeNode
		});
	}

	function openFolder(id: string | null) {
		const client = auth.client;
		if (client) void files.openFolder(client, id);
	}
</script>

<aside
	class={cn(
		'z-mail-pane-surface flex min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border',
		className
	)}
	style="view-transition-name: files-sidebar;"
	aria-label="Files navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Files</h2>
		<p class="mt-1 text-xs text-fg-muted">Stalwart document storage</p>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<nav class="p-2.5">
			<ul class="flex flex-col gap-0.5">
				<li>
					<button
						type="button"
						class={cn(
							'flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
							files.currentParentId === null
								? 'z-surface-active font-medium'
								: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
						)}
						onclick={() => openFolder(null)}
					>
						<Folder class="size-4 shrink-0 opacity-75" aria-hidden="true" />
						<span class="truncate">All files</span>
					</button>
				</li>
			</ul>

			{#if files.ownedTree.length}
				<TreeView.Root
					class="z-folder-tree mt-1"
					collection={ownedCollection}
					{selectedValue}
					defaultExpandedValue={ownedExpanded}
					expandOnClick={false}
				>
					<TreeView.Context>
						{#snippet render()}
							<TreeView.Tree class="z-folder-tree-list">
								{#each ownedCollection.rootNode.children ?? [] as node, index (node.id)}
									<FilesTreeNode
										{node}
										indexPath={[index]}
										activeId={files.currentParentId}
										onOpen={openFolder}
									/>
								{/each}
							</TreeView.Tree>
						{/snippet}
					</TreeView.Context>
				</TreeView.Root>
			{/if}

			{#if files.sharedTree.length}
				<p class="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">
					Shared with me
				</p>
				<TreeView.Root
					class="z-folder-tree mt-1"
					collection={sharedCollection}
					{selectedValue}
					defaultExpandedValue={sharedExpanded}
					expandOnClick={false}
				>
					<TreeView.Context>
						{#snippet render()}
							<TreeView.Tree class="z-folder-tree-list">
								{#each sharedCollection.rootNode.children ?? [] as node, index (node.id)}
									<FilesTreeNode
										{node}
										indexPath={[index]}
										activeId={files.currentParentId}
										onOpen={openFolder}
									/>
								{/each}
							</TreeView.Tree>
						{/snippet}
					</TreeView.Context>
				</TreeView.Root>
			{/if}
		</nav>
	</ScrollArea>

	<div class="shrink-0 border-t border-border/80 p-2">
		<Button
			variant="ghost"
			class="w-full justify-start px-3 py-2"
			onclick={() => (files.createFolderOpen = true)}
			disabled={!files.canAddHere}
		>
			<Plus class="size-4 shrink-0" aria-hidden="true" />
			New folder
		</Button>
	</div>
</aside>
