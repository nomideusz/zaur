<script lang="ts">
	// Dev-only fixture mirroring MailboxSidebar's custom-folder tree wiring, with mock
	// nested mailboxes and no store/auth dependency.
	import { TreeView, createTreeCollection } from '@ark-ui/svelte/tree-view';
	import MailboxTreeNode from '$lib/components/mail/MailboxTreeNode.svelte';
	import { buildMailboxTree, collectBranchIds, type MailboxNode } from '$lib/utils/mailbox-tree';
	import type { Mailbox } from '$lib/types/mail';

	// id === jmapId here so parentId links resolve; Work > Projects > Q1, plus Personal.
	const mailboxes: Mailbox[] = [
		{ id: 'work', jmapId: 'work', name: 'Work', unread: 3, total: 10 },
		{ id: 'work-projects', jmapId: 'work-projects', name: 'Projects', unread: 1, total: 5, parentId: 'work' },
		{ id: 'work-projects-q1', jmapId: 'work-projects-q1', name: 'Q1', unread: 0, total: 2, parentId: 'work-projects' },
		{ id: 'personal', jmapId: 'personal', name: 'Personal', unread: 0, total: 8 }
	];

	const activeRouteId = 'work-projects';

	const tree = buildMailboxTree(mailboxes);
	const collection = createTreeCollection<MailboxNode>({
		nodeToValue: (node) => node.id,
		nodeToString: (node) => node.name,
		rootNode: { id: 'ROOT', name: '', unread: 0, total: 0, children: tree }
	});
	const expanded = collectBranchIds(tree);
</script>

<div class="z-mail-view" style="max-width: 18rem; margin: 4rem auto; font-family: sans-serif;">
	<h1>folder-tree-lab</h1>
	<TreeView.Root
		class="z-folder-tree"
		{collection}
		selectedValue={[activeRouteId]}
		defaultExpandedValue={expanded}
		expandOnClick={false}
	>
		<TreeView.Tree class="z-folder-tree-list">
			{#each collection.rootNode.children ?? [] as node, index (node.id)}
				<MailboxTreeNode {node} indexPath={[index]} {activeRouteId} />
			{/each}
		</TreeView.Tree>
	</TreeView.Root>
</div>
