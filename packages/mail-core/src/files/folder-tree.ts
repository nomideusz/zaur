import type { FileNode } from '../types/files';

export interface FileTreeNode extends FileNode {
	children: FileTreeNode[];
}

export function buildFileTree(nodes: FileNode[]): FileTreeNode[] {
	const mapped: FileTreeNode[] = nodes.map((node) => ({ ...node, children: [] }));
	const byId = new Map(mapped.map((node) => [node.id, node]));
	const roots: FileTreeNode[] = [];

	for (const node of mapped) {
		const parent = node.parentId ? byId.get(node.parentId) : undefined;
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
				ids.push(node.id);
				walk(node.children);
			}
		}
	};
	walk(nodes);
	return ids;
}

/** Nodes whose parent is missing from the set — top-level, or shared folders whose parent is not visible. */
export function orphanFileRoots(nodes: FileNode[]): FileNode[] {
	const ids = new Set(nodes.map((node) => node.id));
	return nodes.filter((node) => !node.parentId || !ids.has(node.parentId));
}
