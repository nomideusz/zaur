<script lang="ts">
	import { Menu } from '@ark-ui/svelte/menu';
	import { TreeView } from '@ark-ui/svelte/tree-view';
	import RiArrowRightSLine from 'svelte-remixicon/RiArrowRightSLine.svelte';
	import MenuContent from '$lib/components/ui/menu/MenuContent.svelte';
	import MenuItem from '$lib/components/ui/menu/MenuItem.svelte';
	import { hasFileNodeDrag, fileNodeDragId } from '$lib/files/drag';
	import { fileAllowsAddChildren, fileAllowsDelete, fileAllowsRename, fileRoleLabel } from '$lib/jmap/file-rights';
	import { fileNodeTreeId, type FileTreeNode } from '@zaur/mail-core/files/folder-tree';
	import { auth } from '$lib/stores/auth.svelte';
	import { confirm } from '$lib/stores/confirm.svelte';
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
	const canAdd = $derived(fileAllowsAddChildren(node));
	const canRename = $derived(fileAllowsRename(node));
	const canDelete = $derived(fileAllowsDelete(node));
	const showFolderMenu = $derived(canAdd || canRename || canDelete);

	const menuPositioning = { placement: 'bottom-start' as const, gutter: 4, overflowPadding: 12 };

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

	function requestSubfolder() {
		files.requestCreateFolder(node.id);
	}

	function requestRename() {
		files.requestRename(node.id);
	}

	async function requestDelete() {
		const client = auth.client;
		if (!client) return;
		if (
			!(await confirm.ask({
				title: 'Delete folder?',
				description: `Delete “${node.name}” and everything inside it?`,
				confirmLabel: 'Delete',
				tone: 'danger'
			}))
		) {
			return;
		}
		await files.destroy(client, node);
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

{#snippet folderMenu()}
	{#if showFolderMenu}
		<MenuContent class="w-44 min-w-44">
			{#if canAdd}
				<MenuItem label="New subfolder" onSelect={requestSubfolder} />
			{/if}
			{#if canRename}
				<MenuItem label="Rename" onSelect={requestRename} />
			{/if}
			{#if canDelete}
				<MenuItem label="Delete folder" variant="destructive" onSelect={requestDelete} />
			{/if}
		</MenuContent>
	{/if}
{/snippet}

{#snippet menuButton(linkClass: string, extraProps?: () => object)}
	<Menu.Root positioning={menuPositioning} lazyMount unmountOnExit>
		<Menu.ContextTrigger>
			{#snippet asChild(triggerProps)}
				{@render folderButton(linkClass, () => ({ ...(extraProps?.() ?? {}), ...triggerProps() }))}
			{/snippet}
		</Menu.ContextTrigger>
		{@render folderMenu()}
	</Menu.Root>
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
						{#if showFolderMenu}
							{@render menuButton(
								cn(
									'z-folder-branch-link',
									isActive && 'z-folder-active',
									isDropTarget && 'z-folder-drop'
								)
							)}
						{:else}
							{@render folderButton(
								cn(
									'z-folder-branch-link',
									isActive && 'z-folder-active',
									isDropTarget && 'z-folder-drop'
								)
							)}
						{/if}
					</TreeView.BranchControl>
					<TreeView.BranchContent class="z-folder-children">
						{#each node.children as child, i (fileNodeTreeId(child))}
							<Self node={child} indexPath={[...indexPath, i]} {activeId} {onOpen} />
						{/each}
					</TreeView.BranchContent>
				</TreeView.Branch>
			{:else if showFolderMenu}
				<Menu.Root positioning={menuPositioning} lazyMount unmountOnExit>
					<TreeView.Item class="z-folder-item">
						{#snippet asChild(itemProps)}
							<Menu.ContextTrigger>
								{#snippet asChild(triggerProps)}
									{@render folderButton(
										cn(
											'z-folder-row z-folder-row--leaf',
											isActive && 'z-folder-active',
											isDropTarget && 'z-folder-drop'
										),
										() => ({ ...itemProps(), ...triggerProps() })
									)}
								{/snippet}
							</Menu.ContextTrigger>
						{/snippet}
					</TreeView.Item>
					{@render folderMenu()}
				</Menu.Root>
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
