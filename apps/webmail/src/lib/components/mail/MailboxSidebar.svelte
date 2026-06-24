<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { TreeView, createTreeCollection } from '@ark-ui/svelte/tree-view';
	import CreateFolderDialog from '$lib/components/mail/CreateFolderDialog.svelte';
	import { parseMailContext, mailListHref } from '$lib/mail/routes';
	import { sidebarMailboxGroups } from '$lib/mail/mailboxes';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Mailbox } from '$lib/types/mail';
	import { buildMailboxTree, collectBranchIds, type MailboxNode } from '$lib/utils/mailbox-tree';
	import { cn } from '$lib/utils/cn';
	import X from '$lib/components/icons/X.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import MailboxTreeNode from './MailboxTreeNode.svelte';

	interface Props {
		class?: string;
		variant?: 'sidebar' | 'drawer';
		/** Inside the combined nav drawer — no duplicate close chrome. */
		embedded?: boolean;
		onClose?: () => void;
	}

	let { class: className = '', variant = 'sidebar', embedded = false, onClose }: Props = $props();

	const mailboxGroups = $derived(sidebarMailboxGroups(mail.mailboxes));

	const mailCtx = $derived(parseMailContext($page.url.pathname));
	const currentMailboxRouteId = $derived(mailCtx?.mailboxRouteId ?? null);
	const activeMailbox = $derived(
		currentMailboxRouteId ? mail.mailboxByRouteId(currentMailboxRouteId) : null
	);
	const sidebarMessageSummary = $derived.by(() => {
		const folderTotal = activeMailbox?.total ?? mail.messagesTotal;
		if (folderTotal > mail.messages.length) {
			return `${mail.messages.length} of ${folderTotal} messages`;
		}
		return `${folderTotal} message${folderTotal === 1 ? '' : 's'}`;
	});

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

	let createFolderOpen = $state(false);
	let createFolderParentRouteId = $state<string | null>(null);
	let createFolderSubmitting = $state(false);

	const createFolderTitle = $derived(
		createFolderParentRouteId ? 'New subfolder' : 'New folder'
	);
	const createFolderDescription = $derived(
		createFolderParentRouteId
			? 'Create a folder inside the selected parent.'
			: 'Create a top-level folder for organizing mail.'
	);

	function openCreateFolder(parentRouteId: string | null = null) {
		createFolderParentRouteId = parentRouteId;
		createFolderOpen = true;
	}

	function canRenameFolder(_node: MailboxNode): boolean {
		return true;
	}

	function beforeRenameFolder(details: { label: string }): boolean {
		return details.label.trim().length > 0;
	}

	async function completeRenameFolder(details: { indexPath: number[]; label: string }) {
		const node = customCollection.at(details.indexPath);
		if (!node) return;

		const trimmed = details.label.trim();
		if (!trimmed || trimmed === node.name) return;

		const client = auth.client;
		if (!client) {
			toast.show('Connect to rename folders', 'error');
			return;
		}

		try {
			await mail.renameCustomFolder(client, node.id, trimmed);
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not rename folder', 'error');
		}
	}

	async function deleteFolder(routeId: string) {
		const client = auth.client;
		if (!client) {
			toast.show('Connect to delete folders', 'error');
			return;
		}

		try {
			const deleted = await mail.deleteCustomFolder(client, routeId);
			// Leave the now-gone folder if we were viewing it.
			if (deleted && currentMailboxRouteId === routeId) {
				await goto(mailListHref('inbox'));
			}
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not delete folder', 'error');
		}
	}

	async function submitCreateFolder(name: string) {
		const client = auth.client;
		if (!client) {
			toast.show('Connect to create folders', 'error');
			return;
		}

		createFolderSubmitting = true;
		try {
			const folder = await mail.createCustomFolder(client, name, createFolderParentRouteId);
			createFolderOpen = false;
			await goto(mailListHref(folder.id));
		} catch (error) {
			toast.show(error instanceof Error ? error.message : 'Could not create folder', 'error');
		} finally {
			createFolderSubmitting = false;
		}
	}
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
		variant === 'sidebar' &&
			'z-mail-pane-surface min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border',
		variant === 'drawer' && 'min-h-0 flex-col overflow-hidden',
		className
	)}
	style={variant === 'sidebar' ? 'view-transition-name: mail-sidebar;' : undefined}
	aria-label="Mail navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<h2 class="z-type-label">Mailboxes</h2>
				<p class="mt-1 text-xs text-fg-muted">{sidebarMessageSummary}</p>
			</div>
			{#if onClose && !embedded}
				<button
					type="button"
					class="z-btn-icon -mr-1 shrink-0"
					aria-label="Close mailboxes"
					onclick={onClose}
				>
					<X class="size-5" aria-hidden="true" />
				</button>
			{/if}
		</div>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<nav class="p-2.5">
		<ul class="space-y-0.5">
			{#each mailboxGroups.system as item (item.id)}
				{@render mailboxRow(item)}
			{/each}
		</ul>

		{#if auth.client}
			<div class="mt-4 flex items-center justify-between gap-2 px-3 pb-1">
				<h3 class="z-type-label">Folders</h3>
				<button
					type="button"
					class="z-mail-text-nav__link shrink-0 text-xs"
					onclick={() => openCreateFolder(null)}
				>
					New folder
				</button>
			</div>

			{#if mailboxGroups.custom.length}
				<TreeView.Root
					class="z-folder-tree"
					collection={customCollection}
					selectedValue={currentMailboxRouteId ? [currentMailboxRouteId] : []}
					defaultExpandedValue={expandedBranches}
					expandOnClick={false}
					canRename={canRenameFolder}
					onBeforeRename={beforeRenameFolder}
					onRenameComplete={completeRenameFolder}
				>
					<TreeView.Context>
						{#snippet render(tree)}
							<TreeView.Tree class="z-folder-tree-list">
								{#each customCollection.rootNode.children ?? [] as node, index (node.id)}
									<MailboxTreeNode
										{node}
										indexPath={[index]}
										activeRouteId={currentMailboxRouteId}
										renamable
										startRename={(routeId) => tree().startRenaming(routeId)}
										onCreateSubfolder={(routeId) => openCreateFolder(routeId)}
										onDelete={deleteFolder}
									/>
								{/each}
							</TreeView.Tree>
						{/snippet}
					</TreeView.Context>
				</TreeView.Root>
			{/if}
		{/if}
		</nav>
	</ScrollArea>
</aside>

<CreateFolderDialog
	bind:open={createFolderOpen}
	title={createFolderTitle}
	description={createFolderDescription}
	submitting={createFolderSubmitting}
	onSubmit={submitCreateFolder}
/>
