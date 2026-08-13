import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFileTree, collectFileBranchIds } from '../src/files/folder-tree.ts';
import type { FileNode } from '../src/types/files.ts';

function dir(partial: Pick<FileNode, 'id' | 'name'> & Partial<FileNode>): FileNode {
	return {
		parentId: null,
		nodeType: 'directory',
		blobId: null,
		size: null,
		type: null,
		created: null,
		modified: null,
		role: null,
		myRights: {
			mayRead: true,
			mayAddChildren: true,
			mayRename: true,
			mayDelete: true,
			mayModifyContent: true,
			mayShare: true
		},
		shareWith: null,
		isSubscribed: true,
		...partial
	};
}

test('buildFileTree nests by parentId and sorts by name', () => {
	const tree = buildFileTree([
		dir({ id: 'b', name: 'Work' }),
		dir({ id: 'c', name: 'Projects', parentId: 'b' }),
		dir({ id: 'a', name: 'Archive' }),
		dir({ id: 'd', name: 'Q1', parentId: 'c' })
	]);

	assert.deepEqual(
		tree.map((node) => node.name),
		['Archive', 'Work']
	);
	assert.equal(tree[1]?.children[0]?.name, 'Projects');
	assert.equal(tree[1]?.children[0]?.children[0]?.name, 'Q1');
	assert.deepEqual(collectFileBranchIds(tree).sort(), ['b', 'c']);
});

test('orphans with a missing parent become roots', () => {
	const tree = buildFileTree([dir({ id: 'x', name: 'Shared', parentId: 'gone' })]);
	assert.equal(tree.length, 1);
	assert.equal(tree[0]?.id, 'x');
});
