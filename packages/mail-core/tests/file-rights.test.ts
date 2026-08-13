import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	fileAllowsAddChildren,
	fileAllowsShare,
	fileRoleLabel,
	fileShareRoleFromRights,
	formatFileSize,
	inferFileNodeType,
	isOwnedFileNode,
	mapFileNode,
	normalizeFileRights,
	patchFileShareWith,
	rightsForFileShareRole
} from '../src/jmap/file-rights.ts';

test('missing myRights is treated as full owner access', () => {
	const rights = normalizeFileRights(null);
	assert.equal(rights.mayShare, true);
	assert.equal(rights.mayDelete, true);
	assert.equal(rights.mayAddChildren, true);
});

test('partial myRights does not grant owner actions', () => {
	const rights = normalizeFileRights({ mayRead: true });
	assert.equal(rights.mayShare, false);
	assert.equal(rights.mayDelete, false);
	assert.equal(fileAllowsAddChildren({ myRights: rights }), false);
	assert.equal(fileAllowsShare({ myRights: rights }), false);
	assert.equal(isOwnedFileNode({ myRights: rights, role: null }), false);
});

test('share roles map to FileNode rights', () => {
	const read = rightsForFileShareRole('read');
	const write = rightsForFileShareRole('write');
	assert.equal(fileShareRoleFromRights(read), 'read');
	assert.equal(fileShareRoleFromRights(write), 'write');
	assert.equal(write.mayModifyContent, true);
	assert.equal(write.mayShare, false);
});

test('shareWith patches add, update, and remove principals', () => {
	const read = rightsForFileShareRole('read');
	const write = rightsForFileShareRole('write');

	const added = patchFileShareWith(null, 'p1', read);
	assert.deepEqual(added.p1, read);

	const updated = patchFileShareWith({ p1: read }, 'p1', write);
	assert.deepEqual(updated.p1, write);

	const removed = patchFileShareWith({ p1: write }, 'p1', null);
	assert.equal(removed.p1, null);
});

test('infers node type from blobId when nodeType is omitted', () => {
	assert.equal(inferFileNodeType({ blobId: 'b1' }), 'file');
	assert.equal(inferFileNodeType({}), 'directory');
	assert.equal(inferFileNodeType({ nodeType: 'symlink', target: ['x'] }), 'symlink');
});

test('mapFileNode fills defaults', () => {
	const mapped = mapFileNode({ id: 'n1', name: 'Notes.pdf', blobId: 'b1', size: 1200 }, 'acct-1');
	assert.equal(mapped.nodeType, 'file');
	assert.equal(mapped.parentId, null);
	assert.equal(mapped.myRights.mayRead, true);
	assert.equal(mapped.isSubscribed, true);
	assert.equal(mapped.accountId, 'acct-1');
});

test('role labels cover Stalwart special folders', () => {
	assert.equal(fileRoleLabel('documents'), 'Documents');
	assert.equal(fileRoleLabel('trash'), 'Trash');
	assert.equal(fileRoleLabel(null), null);
});

test('formatFileSize uses compact units', () => {
	assert.equal(formatFileSize(null), '');
	assert.equal(formatFileSize(400), '400 B');
	assert.equal(formatFileSize(2048), '2 KB');
	assert.equal(formatFileSize(1_572_864), '1.5 MB');
});
