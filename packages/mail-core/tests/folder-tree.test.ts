import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFileTree, collectFileBranchIds, orphanFileRoots } from '../src/files/folder-tree.ts';
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
		accountId: null,
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

test('buildFileTree keeps same-id folders from different accounts apart', () => {
	const tree = buildFileTree([
		dir({ id: 'docs', name: 'Alice docs', accountId: 'alice' }),
		dir({ id: 'docs', name: 'Bob docs', accountId: 'bob' }),
		dir({ id: 'q1', name: 'Q1', parentId: 'docs', accountId: 'bob' })
	]);

	assert.deepEqual(
		tree.map((node) => node.name),
		['Alice docs', 'Bob docs']
	);
	assert.equal(tree[0]?.children.length, 0);
	assert.equal(tree[1]?.children[0]?.name, 'Q1');
});

test('orphanFileRoots does not treat another account as parent', () => {
	const nodes = [
		dir({ id: 'docs', name: 'Mine', accountId: 'me' }),
		dir({ id: 'shared', name: 'Shared', parentId: 'docs', accountId: 'other' })
	];
	assert.deepEqual(
		orphanFileRoots(nodes).map((node) => node.name),
		['Mine', 'Shared']
	);
});

test('orphans with a missing parent become roots', () => {
	const tree = buildFileTree([dir({ id: 'x', name: 'Shared', parentId: 'gone' })]);
	assert.equal(tree.length, 1);
	assert.equal(tree[0]?.id, 'x');
});

test('orphanFileRoots treats missing parents as roots', () => {
	const nodes = [
		dir({ id: 'own', name: 'Docs' }),
		dir({ id: 'shared', name: 'Contracts', parentId: 'alice-docs' }),
		dir({ id: 'nested', name: 'Q1', parentId: 'shared' })
	];
	assert.deepEqual(
		orphanFileRoots(nodes).map((node) => node.id),
		['own', 'shared']
	);
});
