import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	fileNodeFilterToServer,
	fileNodeFromServer,
	fileNodeProperties,
	fileNodeToServer,
	usesAtType
} from '../src/jmap/file-types.ts';

test('the later draft is the one advertising its node types', () => {
	assert.equal(usesAtType({ supportedNodeTypes: ['Directory', 'File', 'SymLink'] }), true);
	assert.equal(usesAtType({ maxFileNodeDepth: 64 }), false);
	assert.equal(usesAtType(null), false);
});

test('properties use the names each server knows', () => {
	const later = fileNodeProperties(true);
	assert.ok(later.includes('@type') && later.includes('mediaType'));
	assert.ok(!later.includes('nodeType') && !later.includes('type'));
	const earlier = fileNodeProperties(false);
	assert.ok(earlier.includes('nodeType') && earlier.includes('type'));
	assert.ok(!earlier.includes('@type'));
});

test('a node from the later draft reads like an earlier one', () => {
	const node = fileNodeFromServer({ id: 'a', name: 'n.txt', '@type': 'SymLink', mediaType: 'text/plain' });
	assert.equal(node.nodeType, 'symlink');
	assert.equal(node.type, 'text/plain');
	assert.ok(!('@type' in node) && !('mediaType' in node));
});

test('a node from an earlier server passes through', () => {
	const node = fileNodeFromServer({ id: 'a', name: 'd', nodeType: 'directory', type: null });
	assert.equal(node.nodeType, 'directory');
	assert.equal(node.type, null);
});

test('a create body is renamed only for the later draft', () => {
	const body = { name: 'n', nodeType: 'file', type: 'text/plain', parentId: null };
	assert.deepEqual(fileNodeToServer(body, false), body);
	assert.deepEqual(fileNodeToServer(body, true), {
		name: 'n',
		parentId: null,
		'@type': 'File',
		mediaType: 'text/plain'
	});
});

test('an update without either renamed field stays as it is', () => {
	assert.deepEqual(fileNodeToServer({ name: 'n' }, true), { name: 'n' });
});

test('the query filter keeps its name and takes the new value', () => {
	assert.deepEqual(fileNodeFilterToServer({ nodeType: 'directory' }, true), { nodeType: 'Directory' });
	assert.deepEqual(fileNodeFilterToServer({ nodeType: 'directory' }, false), { nodeType: 'directory' });
	assert.deepEqual(fileNodeFilterToServer({ isTopLevel: true }, true), { isTopLevel: true });
});
