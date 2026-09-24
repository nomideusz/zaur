/**
 * Files: the account's file storage over JMAP FileNode, the same tree Stalwart
 * serves over WebDAV. One folder at a time; the bytes go up through
 * /api/upload and come down through /api/download, like attachments.
 *
 * ponytail: your own account only — folders others share with you live in
 * their accounts (webmail 1.0 lists them); add when someone shares one.
 */
import { error } from '@sveltejs/kit';
import { command, query } from '$app/server';
import { mapFileNode, type FileNode, type JMAPClient } from '@zaur/mail-core';
import { connect, refuse } from '#lib/server/account';
import { treeOrder } from '#lib/mail/folders';

function schema<T>() {
	return {
		'~standard': {
			version: 1,
			vendor: 'zaur',
			validate(value: unknown) {
				return { value: value as T };
			}
		}
	} as any;
}

export interface FolderView {
	/** False when the server does not advertise `urn:ietf:params:jmap:filenode`. */
	supported: boolean;
	/** From the top down to the folder itself; empty at the top level. */
	path: { id: string; name: string }[];
	items: FileNode[];
}

export type FileFolder = Pick<FileNode, 'id' | 'name' | 'parentId'> & { depth: number };

const byName = (a: FileNode, b: FileNode) =>
	Number(b.nodeType === 'directory') - Number(a.nodeType === 'directory') ||
	a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** A folder's contents, folders first. `id: null` is the top level. */
export const folder = query(schema<{ id: string | null }>(), async ({ id }): Promise<FolderView> => {
	const client = await connect();
	if (!client.hasFileNode()) return { supported: false, path: [], items: [] };
	const [children, chain] = await Promise.all([
		client.queryFileNodes(id ? { parentId: id } : { isTopLevel: true }),
		id ? client.getFileNodes([id], true) : Promise.resolve([])
	]);
	const byId = new Map(chain.map((node) => [node.id, node]));
	if (id && !byId.has(id)) error(404, 'No such folder');
	const path: FolderView['path'] = [];
	for (let node = id ? byId.get(id) : undefined; node && path.length < 64; ) {
		path.unshift({ id: node.id, name: node.name });
		node = node.parentId ? byId.get(node.parentId) : undefined;
	}
	return { supported: true, path, items: children.map((node) => mapFileNode(node)).sort(byName) };
});

/** Every folder, in tree order — the choices when moving something. */
export const fileFolders = query(async (): Promise<FileFolder[]> => {
	const client = await connect();
	const nodes = await client.queryFileNodes({ nodeType: 'directory' }, { limit: 1000 });
	return treeOrder(
		nodes
			.map((node) => mapFileNode(node))
			.filter((node) => node.nodeType === 'directory')
			.sort(byName)
			.map(({ id, name, parentId }) => ({ id, name, parentId }))
	);
});

function fileName(raw: unknown): string {
	const name = String(raw ?? '').trim();
	if (!name) error(400, 'Give it a name');
	if (name.length > 255) error(400, 'That name is too long');
	if (/[/\\]/.test(name) || name === '.' || name === '..') error(400, 'A name cannot contain / or \\');
	return name;
}

const parent = (raw: unknown) => (raw ? String(raw) : null);

async function node(client: JMAPClient, id: unknown): Promise<FileNode> {
	const [found] = await client.getFileNodes([String(id)]);
	if (!found) error(404, 'It is not there any more');
	return mapFileNode(found);
}

export const createFileFolder = command(
	schema<{ parentId: string | null; name: string }>(),
	async ({ parentId, name }): Promise<{ id: string }> => {
		const client = await connect();
		const id = await client
			.createFileNode({ parentId: parent(parentId), name: fileName(name), nodeType: 'directory' })
			.catch(refuse);
		await Promise.all([folder({ id: parent(parentId) }).refresh(), fileFolders().refresh()]);
		return { id };
	}
);

/** File an uploaded blob (see /api/upload) into a folder. */
export const addFile = command(
	schema<{ parentId: string | null; blobId: string; name: string; type: string }>(),
	async ({ parentId, blobId, name, type }): Promise<{ id: string }> => {
		const client = await connect();
		const id = await client
			.createFileNode({
				parentId: parent(parentId),
				name: fileName(name),
				nodeType: 'file',
				blobId: String(blobId),
				type: String(type || 'application/octet-stream')
			})
			.catch(refuse);
		await folder({ id: parent(parentId) }).refresh();
		return { id };
	}
);

/** Rename and/or move (`parentId: null` for the top level). */
export const updateFile = command(
	schema<{ id: string; name: string; parentId: string | null }>(),
	async ({ id, name, parentId }): Promise<void> => {
		const client = await connect();
		const before = await node(client, id);
		const to = parent(parentId);
		if (to === before.id) error(400, 'A folder cannot go inside itself');
		await client
			.updateFileNode(before.id, { name: fileName(name), ...(to !== before.parentId && { parentId: to }) })
			.catch(refuse);
		await Promise.all([
			folder({ id: before.parentId }).refresh(),
			to !== before.parentId && folder({ id: to }).refresh(),
			before.nodeType === 'directory' && fileFolders().refresh()
		]);
	}
);

/** Delete a file, or a folder with everything in it. */
export const deleteFile = command(schema<{ id: string }>(), async ({ id }): Promise<void> => {
	const client = await connect();
	const target = await node(client, id);
	const isFolder = target.nodeType === 'directory';
	await client.destroyFileNodes([target.id], isFolder).catch(refuse);
	await Promise.all([folder({ id: target.parentId }).refresh(), isFolder && fileFolders().refresh()]);
});
