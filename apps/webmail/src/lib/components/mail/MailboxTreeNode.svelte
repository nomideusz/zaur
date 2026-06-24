<script lang="ts">
	import { goto } from '$app/navigation';
	import { Menu } from '@ark-ui/svelte/menu';
	import { TreeView } from '@ark-ui/svelte/tree-view';
	import RiArrowRightSLine from 'svelte-remixicon/RiArrowRightSLine.svelte';
	import MenuContent from '$lib/components/ui/menu/MenuContent.svelte';
	import MenuItem from '$lib/components/ui/menu/MenuItem.svelte';
	import { mailListHref } from '$lib/mail/routes';
	import type { MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import Self from './MailboxTreeNode.svelte';

	interface Props {
		node: MailboxNode;
		indexPath: number[];
		activeRouteId: string | null;
		renamable?: boolean;
		startRename?: (routeId: string) => void;
		onCreateSubfolder?: (routeId: string) => void;
		onDelete?: (routeId: string) => void;
	}

	let {
		node,
		indexPath,
		activeRouteId,
		renamable = false,
		startRename,
		onCreateSubfolder,
		onDelete
	}: Props = $props();

	const href = $derived(mailListHref(node.id));
	const isActive = $derived(activeRouteId === node.id);
	const badgeCount = $derived(node.role === 'drafts' ? node.total : node.unread);
	const hasChildren = $derived(node.children.length > 0);
	const showFolderMenu = $derived(
		renamable && (!!startRename || !!onCreateSubfolder || !!onDelete)
	);

	const menuPositioning = { placement: 'bottom-start' as const, gutter: 4, overflowPadding: 12 };

	function folderLinkClick(
		event: MouseEvent,
		targetHref: string,
		...extraHandlers: Array<((event: MouseEvent) => void) | undefined>
	) {
		for (const handler of extraHandlers) handler?.(event);
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
		event.preventDefault();
		void goto(targetHref);
	}

	function requestRename() {
		startRename?.(node.id);
	}

	function requestSubfolder() {
		onCreateSubfolder?.(node.id);
	}

	function requestDelete() {
		onDelete?.(node.id);
	}
</script>

{#snippet folderBadge()}
	{#if badgeCount > 0}
		<span class={cn('z-folder-badge', isActive && 'z-folder-badge--active')}>{badgeCount}</span>
	{/if}
{/snippet}

{#snippet folderMenu()}
	{#if showFolderMenu}
		<MenuContent class="w-44 min-w-44">
			{#if onCreateSubfolder}
				<MenuItem label="New subfolder" onSelect={requestSubfolder} />
			{/if}
			{#if startRename}
				<MenuItem label="Rename" onSelect={requestRename} />
			{/if}
			{#if onDelete}
				<MenuItem label="Delete folder" variant="destructive" onSelect={requestDelete} />
			{/if}
		</MenuContent>
	{/if}
{/snippet}

{#snippet folderLink(linkClass: string, extraProps?: () => object)}
	{@const extra = extraProps?.() ?? {}}
	{@const { onclick, onClick, ...rest } = extra as {
		onclick?: (event: MouseEvent) => void;
		onClick?: (event: MouseEvent) => void;
		[key: string]: unknown;
	}}
	<a
		{href}
		{...rest}
		class={linkClass}
		aria-current={isActive ? 'page' : undefined}
		onclick={(event) => folderLinkClick(event, href, onclick, onClick)}
	>
		<span class="z-folder-name truncate">{node.name}</span>
		{@render folderBadge()}
	</a>
{/snippet}

{#snippet renamableLink(linkClass: string, extraProps?: () => object)}
	<Menu.Root positioning={menuPositioning} lazyMount unmountOnExit>
		<Menu.ContextTrigger>
			{#snippet asChild(triggerProps)}
				{@render folderLink(linkClass, () => ({ ...(extraProps?.() ?? {}), ...triggerProps() }))}
			{/snippet}
		</Menu.ContextTrigger>
		{@render folderMenu()}
	</Menu.Root>
{/snippet}

<TreeView.NodeProvider {node} {indexPath}>
	<TreeView.NodeContext>
		{#snippet render(nodeState)}
			{#if hasChildren}
				<TreeView.Branch class="z-folder-branch">
					<TreeView.BranchControl class="z-folder-row z-folder-row--branch">
						<TreeView.BranchTrigger class="z-folder-chevron" aria-label="Toggle {node.name}">
							<TreeView.BranchIndicator class="z-folder-chevron-icon">
								<RiArrowRightSLine />
							</TreeView.BranchIndicator>
						</TreeView.BranchTrigger>
						{#if nodeState().renaming}
							<TreeView.NodeRenameInput class="z-folder-rename-input" />
						{:else if showFolderMenu}
							{@render renamableLink(cn('z-folder-branch-link', isActive && 'z-folder-active'))}
						{:else}
							{@render folderLink(cn('z-folder-branch-link', isActive && 'z-folder-active'))}
						{/if}
					</TreeView.BranchControl>
					<TreeView.BranchContent class="z-folder-children">
						{#each node.children as child, i (child.id)}
							<Self
								node={child}
								indexPath={[...indexPath, i]}
								{activeRouteId}
								{renamable}
								{startRename}
								{onCreateSubfolder}
								{onDelete}
							/>
						{/each}
					</TreeView.BranchContent>
				</TreeView.Branch>
			{:else if nodeState().renaming}
				<TreeView.Item class="z-folder-item z-folder-row z-folder-row--leaf">
					<TreeView.NodeRenameInput class="z-folder-rename-input" />
				</TreeView.Item>
			{:else if showFolderMenu}
				<Menu.Root positioning={menuPositioning} lazyMount unmountOnExit>
					<TreeView.Item class="z-folder-item">
						{#snippet asChild(itemProps)}
							<Menu.ContextTrigger>
								{#snippet asChild(triggerProps)}
									{@render folderLink(
										cn('z-folder-row z-folder-row--leaf', isActive && 'z-folder-active'),
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
						{@render folderLink(
							cn('z-folder-row z-folder-row--leaf', isActive && 'z-folder-active'),
							itemProps
						)}
					{/snippet}
				</TreeView.Item>
			{/if}
		{/snippet}
	</TreeView.NodeContext>
</TreeView.NodeProvider>
