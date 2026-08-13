import type { FileNode } from '../types/files';

export interface FileTreeNode extends FileNode {
	children: FileTreeNode[];
}

/** Tree-view value / map key — ids are only unique within a JMAP account. */
export function fileNodeTreeId(node: Pick<FileNode, 'id' | 'accountId'>): string {
	return node.accountId ? `${node.accountId}:${node.id}` : node.id;
}

function parentTreeId(node: Pick<FileNode, 'parentId' | 'accountId'>): string | null {
	if (!node.parentId) return null;
	return node.accountId ? `${node.accountId}:${node.parentId}` : node.parentId;
}

export function buildFileTree(nodes: FileNode[]): FileTreeNode[] {
	const mapped: FileTreeNode[] = nodes.map((node) => ({ ...node, children: [] }));
	const byId = new Map(mapped.map((node) => [fileNodeTreeId(node), node]));
	const roots: FileTreeNode[] = [];

	for (const node of mapped) {
		const parentKey = parentTreeId(node);
		const parent = parentKey ? byId.get(parentKey) : undefined;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}

	sortTree(roots);
	return roots;
}

function sortTree(nodes: FileTreeNode[]): void {
	nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	for (const node of nodes) sortTree(node.children);
}

/** Ids of every node that has children — useful as a tree-view's default-expanded set. */
export function collectFileBranchIds(nodes: FileTreeNode[]): string[] {
	const ids: string[] = [];
	const walk = (list: FileTreeNode[]) => {
		for (const node of list) {
			if (node.children.length > 0) {
				ids.push(fileNodeTreeId(node));
				walk(node.children);
			}
		}
	};
	walk(nodes);
	return ids;
}

/** Nodes whose parent is missing from the set — top-level, or shared folders whose parent is not visible. */
export function orphanFileRoots(nodes: FileNode[]): FileNode[] {
	const ids = new Set(nodes.map(fileNodeTreeId));
	return nodes.filter((node) => {
		const parentKey = parentTreeId(node);
		return !parentKey || !ids.has(parentKey);
	});
}
