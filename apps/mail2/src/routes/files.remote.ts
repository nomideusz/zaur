/**
 * Files: the account's file storage over JMAP FileNode, the same tree Stalwart
 * serves over WebDAV. One folder at a time; the bytes go up through
 * /api/upload and come down through /api/download, like attachments.
 *
 * What others share with you lives in their accounts. Every other account the
 * session offers with FileNode is looked into, and whatever in it has no
 * parent you can see sits at the top level beside your own — 1.0's rule. A
 * node's `accountId` is set only when it is someone else's, and every call
 * about it takes that `account` back (`null` for your own).
 */
import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import {
	fileShareRoleFromRights,
	isJmapMethodError,
	mapFileNode,
	orphanFileRoots,
	rightsForFileShareRole,
	type FileNode,
	type FileRights,
	type FileShareRole,
	type JMAPClient
} from '@zaur/mail-core';
import { connect, refuse, requireAccount } from '#lib/server/account';
import { treeOrder } from '#lib/mail/folders';
import { pickPrincipal } from '#lib/share';

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
	/** Whether you may add to this folder (upload, new folder). */
	canAdd: boolean;
	/** The biggest file the server takes in one upload, in bytes. */
	maxUpload: number;
	/** Whose each shared account is, by account id: the name to show. */
	owners: Record<string, string>;
	/** From the top down to the folder itself; empty at the top level. */
	path: { id: string; name: string }[];
	/** Your own first, then (at the top level) what is shared with you. */
	items: FileNode[];
}

export type FileFolder = Pick<FileNode, 'id' | 'name' | 'parentId'> & { depth: number };

export interface SharePerson {
	principalId: string;
	name: string;
	email: string;
	role: FileShareRole;
}

const byName = (a: FileNode, b: FileNode) =>
	Number(b.nodeType === 'directory') - Number(a.nodeType === 'directory') ||
	a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Your own storage (`null`), or a shared account the session really offers. */
function fileAccount(client: JMAPClient, account: unknown): string | null {
	if (!account || account === client.getFileNodeAccountId()) return null;
	const id = String(account);
	if (!client.getFileNodeAccountIds().includes(id)) error(404, 'No such account');
	return id;
}

function owners(client: JMAPClient): Record<string, string> {
	const own = client.getFileNodeAccountId();
	const accounts = client.getSession()?.accounts ?? {};
	return Object.fromEntries(
		client
			.getFileNodeAccountIds()
			.filter((id) => id !== own)
			.map((id) => [id, accounts[id]?.name || id])
	);
}

/** The top of what each other account shares with you: nodes whose parent you cannot see. */
async function sharedRoots(client: JMAPClient): Promise<FileNode[]> {
	const own = client.getFileNodeAccountId();
	const lists = await Promise.all(
		client
			.getFileNodeAccountIds()
			.filter((id) => id !== own)
			.map((accountId) =>
				client
					// ponytail: 500 nodes an account, as 1.0; page through when someone shares more.
					.queryFileNodes({}, { limit: 500, accountId })
					.then((nodes) => orphanFileRoots(nodes.map((node) => mapFileNode(node, accountId))))
					// One account that will not answer should not hide your own files.
					.catch(() => [])
			)
	);
	return lists.flat().sort(byName);
}

/** A folder's contents, folders first. `id: null` is the top level. */
export const folder = query(
	schema<{ id: string | null; account: string | null }>(),
	async ({ id, account }): Promise<FolderView> => {
		const client = await connect();
		if (!client.hasFileNode()) return { supported: false, canAdd: false, maxUpload: 0, owners: {}, path: [], items: [] };
		const accountId = id ? fileAccount(client, account) : null;
		const [children, chain, shared] = await Promise.all([
			client.queryFileNodes(id ? { parentId: id } : { isTopLevel: true }, { accountId }),
			id ? client.getFileNodes([id], true, accountId) : Promise.resolve([]),
			id ? Promise.resolve([]) : sharedRoots(client)
		]);
		const byId = new Map(chain.map((node) => [node.id, node]));
		const here = id ? byId.get(id) : undefined;
		if (id && !here) error(404, 'No such folder');
		const path: FolderView['path'] = [];
		for (let node = here; node && path.length < 64; ) {
			path.unshift({ id: node.id, name: node.name });
			node = node.parentId ? byId.get(node.parentId) : undefined;
		}
		const core = client.getSession()?.capabilities?.['urn:ietf:params:jmap:core'] as { maxSizeUpload?: number } | undefined;
		return {
			supported: true,
			canAdd: here
				? mapFileNode(here).myRights.mayAddChildren
				: client.getFileNodeCapability()?.mayCreateTopLevelFileNode !== false,
			maxUpload: core?.maxSizeUpload ?? 50_000_000,
			owners: owners(client),
			path,
			items: [...children.map((node) => mapFileNode(node, accountId)).sort(byName), ...shared]
		};
	}
);

/** Every folder in one account, in tree order — the choices when moving something. */
export const fileFolders = query(schema<{ account: string | null }>(), async ({ account }): Promise<FileFolder[]> => {
	const client = await connect();
	const nodes = await client.queryFileNodes({ nodeType: 'directory' }, { limit: 1000, accountId: fileAccount(client, account) });
	return treeOrder(
		nodes
			.map((node) => mapFileNode(node))
			.filter((node) => node.nodeType === 'directory')
			.sort(byName)
			.map(({ id, name, parentId }) => ({ id, name, parentId }))
	);
});

/** Files and folders with `text` in their name, yours and shared, 50 an account. */
export const searchFiles = query(schema<{ text: string }>(), async ({ text }): Promise<FileNode[]> => {
	const needle = String(text ?? '').trim();
	if (!needle) return [];
	const client = await connect();
	if (!client.hasFileNode()) return [];
	const own = client.getFileNodeAccountId();
	const lists = await Promise.all(
		client.getFileNodeAccountIds().map((accountId) =>
			client.queryFileNodes({ text: needle }, { limit: 50, accountId }).then(
				(nodes) => nodes.map((node) => mapFileNode(node, accountId === own ? null : accountId)),
				// Your own search failing is an error; someone else's account just has nothing to add.
				(cause) => (accountId === own ? Promise.reject(cause) : [])
			)
		)
	);
	return lists.flat().sort(byName);
});

function fileName(raw: unknown): string {
	const name = String(raw ?? '').trim();
	if (!name) error(400, 'Give it a name');
	if (name.length > 255) error(400, 'That name is too long');
	if (/[/\\]/.test(name) || name === '.' || name === '..') error(400, 'A name cannot contain / or \\');
	return name;
}

const parent = (raw: unknown) => (raw ? String(raw) : null);

async function node(client: JMAPClient, id: unknown, accountId: string | null): Promise<FileNode> {
	const [found] = await client.getFileNodes([String(id)], false, accountId);
	if (!found) error(404, 'It is not there any more');
	return mapFileNode(found, accountId);
}

/** A change inside `parentId` shows there, and at the top level when it is a shared root. */
const refreshAround = (parentId: string | null, accountId: string | null) =>
	Promise.all([
		folder({ id: parentId, account: parentId ? accountId : null }).refresh(),
		accountId && parentId && folder({ id: null, account: null }).refresh()
	]);

export const createFileFolder = command(
	schema<{ parentId: string | null; account: string | null; name: string }>(),
	async ({ parentId, account, name }): Promise<{ id: string }> => {
		const client = await connect();
		const accountId = fileAccount(client, account);
		const id = await client
			.createFileNode({ parentId: parent(parentId), name: fileName(name), nodeType: 'directory', accountId })
			.catch(refuse);
		await Promise.all([refreshAround(parent(parentId), accountId), fileFolders({ account: accountId }).refresh()]);
		return { id };
	}
);

/**
 * File an uploaded blob (see /api/upload) into a folder. The blob is always
 * uploaded to your own account, also for a folder someone shared: 1.0 did the
 * same, and Stalwart checks the blob against who you are, not where it lands.
 */
export const addFile = command(
	schema<{ parentId: string | null; account: string | null; blobId: string; name: string; type: string }>(),
	async ({ parentId, account, blobId, name, type }): Promise<{ id: string }> => {
		const client = await connect();
		const accountId = fileAccount(client, account);
		const id = await client
			.createFileNode({
				parentId: parent(parentId),
				name: fileName(name),
				nodeType: 'file',
				blobId: String(blobId),
				type: String(type || 'application/octet-stream'),
				accountId
			})
			.catch(refuse);
		await refreshAround(parent(parentId), accountId);
		return { id };
	}
);

/** Rename and/or move (`parentId: null` for the top level), within its own account. */
export const updateFile = command(
	schema<{ id: string; account: string | null; name: string; parentId: string | null }>(),
	async ({ id, account, name, parentId }): Promise<void> => {
		const client = await connect();
		const accountId = fileAccount(client, account);
		const before = await node(client, id, accountId);
		const to = parent(parentId);
		if (to === before.id) error(400, 'A folder cannot go inside itself');
		await client
			.updateFileNode(before.id, { name: fileName(name), ...(to !== before.parentId && { parentId: to }), accountId })
			.catch(refuse);
		await Promise.all([
			refreshAround(before.parentId, accountId),
			to !== before.parentId && refreshAround(to, accountId),
			before.nodeType === 'directory' && fileFolders({ account: accountId }).refresh()
		]);
	}
);

/** Delete a file, or a folder with everything in it. */
export const deleteFile = command(
	schema<{ id: string; account: string | null }>(),
	async ({ id, account }): Promise<void> => {
		const client = await connect();
		const accountId = fileAccount(client, account);
		const target = await node(client, id, accountId);
		const isFolder = target.nodeType === 'directory';
		await client.destroyFileNodes([target.id], isFolder, accountId).catch(refuse);
		await Promise.all([refreshAround(target.parentId, accountId), isFolder && fileFolders({ account: accountId }).refresh()]);
	}
);

/** Who a file or folder of yours is shared with, named where the directory knows them. */
export const fileSharing = query(
	schema<{ id: string; account: string | null }>(),
	async ({ id, account }): Promise<SharePerson[]> => {
		const client = await connect();
		const target = await node(client, id, fileAccount(client, account));
		const shared = Object.entries(target.shareWith ?? {});
		// A directory closed to lookups leaves people as their ids.
		const people = await client.getPrincipals(shared.map(([principalId]) => principalId)).catch(() => []);
		const byId = new Map(people.map((person) => [person.id, person]));
		return shared.map(([principalId, rights]) => ({
			principalId,
			name: byId.get(principalId)?.name ?? '',
			email: byId.get(principalId)?.email ?? '',
			role: fileShareRoleFromRights(rights)
		}));
	}
);

/**
 * Share with someone typed as an address, or change what someone already on
 * the list may do (`principalId`). The address is looked up in the server's
 * directory by 1.0's rule: an exact address wins, otherwise the search has to
 * have found exactly one other person. Someone new is told by mail, as 1.0
 * did; `notified` is false when that mail could not be sent.
 */
export const shareFile = command(
	schema<{ id: string; account: string | null; role: FileShareRole; email?: string; principalId?: string }>(),
	async ({ id, account, role, email, principalId }): Promise<{ name: string; notified: boolean }> => {
		const me = requireAccount();
		const client = await connect(me);
		const accountId = fileAccount(client, account);
		const target = await node(client, id, accountId);
		if (!target.myRights.mayShare) error(403, 'You cannot share this');
		const current = target.shareWith ?? {};

		let person: { id: string; name: string; email: string } | undefined;
		if (principalId) {
			if (!current[principalId]) error(404, 'They are not on the list any more');
			person = { id: principalId, name: '', email: '' };
		} else {
			if (!client.hasPrincipals()) error(400, 'This server does not offer sharing.');
			const typed = String(email ?? '').trim();
			if (!typed) error(400, 'Type their address');
			const matches = await client.queryPrincipals(typed).catch((cause) => {
				if (isJmapMethodError(cause, 'forbidden')) error(400, 'This server does not let you look people up. Ask your admin to open the directory.');
				throw cause;
			});
			const pick = pickPrincipal(matches, typed, client.getCurrentUserPrincipalId());
			if ('error' in pick) error(400, pick.error);
			person = { id: pick.person.id, name: pick.person.name ?? '', email: pick.person.email ?? '' };
		}

		const access = role === 'write' ? 'write' : 'read';
		const shareWith: Record<string, FileRights> = { ...current, [person.id]: rightsForFileShareRole(access) };
		await client.updateFileNode(target.id, { shareWith, accountId }).catch(refuse);

		let notified = true;
		if (!current[person.id] && person.email) {
			const sharer = me.displayName || me.username;
			const kind = target.nodeType === 'directory' ? 'folder' : 'file';
			const body = [
				`${sharer} shared the ${kind} “${target.name}” with you (${access === 'write' ? 'edit' : 'view'} access).`,
				'',
				`Open it in Files: ${getRequestEvent().url.origin}/files`
			].join('\n');
			await client
				.sendEmail([person.email], `${sharer} shared “${target.name}” with you`, body, { format: 'plain' })
				.catch(() => (notified = false));
		}
		await Promise.all([fileSharing({ id: target.id, account: accountId }).refresh(), refreshAround(target.parentId, accountId)]);
		return { name: person.name || person.email, notified };
	}
);

/** Take someone off a file's or folder's list. */
export const unshareFile = command(
	schema<{ id: string; account: string | null; principalId: string }>(),
	async ({ id, account, principalId }): Promise<void> => {
		const client = await connect();
		const accountId = fileAccount(client, account);
		const target = await node(client, id, accountId);
		if (!target.myRights.mayShare) error(403, 'You cannot share this');
		// The whole map without them: a null inside a replaced object is not JMAP.
		const shareWith = Object.fromEntries(Object.entries(target.shareWith ?? {}).filter(([key]) => key !== String(principalId)));
		await client.updateFileNode(target.id, { shareWith, accountId }).catch(refuse);
		await Promise.all([fileSharing({ id: target.id, account: accountId }).refresh(), refreshAround(target.parentId, accountId)]);
	}
);
