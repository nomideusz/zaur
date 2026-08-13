import type { FileNode, FileRights, FileShareRole } from '../types/files';
import type { JMAPFileNode, JMAPFileRights } from './file-types';

const FULL_RIGHTS: FileRights = {
	mayRead: true,
	mayAddChildren: true,
	mayRename: true,
	mayDelete: true,
	mayModifyContent: true,
	mayShare: true
};

const NONE_RIGHTS: FileRights = {
	mayRead: false,
	mayAddChildren: false,
	mayRename: false,
	mayDelete: false,
	mayModifyContent: false,
	mayShare: false
};

/** Missing `myRights` (older/owner responses) is treated as full access. */
export function normalizeFileRights(rights?: JMAPFileRights | FileRights | null): FileRights {
	if (!rights) return { ...FULL_RIGHTS };

	return {
		mayRead: rights.mayRead ?? false,
		mayAddChildren: rights.mayAddChildren ?? false,
		mayRename: rights.mayRename ?? false,
		mayDelete: rights.mayDelete ?? false,
		mayModifyContent: rights.mayModifyContent ?? false,
		mayShare: rights.mayShare ?? false
	};
}

export function rightsForFileShareRole(role: FileShareRole): FileRights {
	if (role === 'write') {
		return {
			...NONE_RIGHTS,
			mayRead: true,
			mayAddChildren: true,
			mayRename: true,
			mayModifyContent: true
		};
	}

	return { ...NONE_RIGHTS, mayRead: true };
}

export function fileShareRoleFromRights(rights: FileRights | JMAPFileRights): FileShareRole {
	return rights.mayModifyContent || rights.mayAddChildren ? 'write' : 'read';
}

export function fileAllowsAddChildren(node: Pick<FileNode, 'myRights'>): boolean {
	return node.myRights.mayAddChildren;
}

export function fileAllowsShare(node: Pick<FileNode, 'myRights'>): boolean {
	return node.myRights.mayShare;
}

export function fileAllowsDelete(node: Pick<FileNode, 'myRights'>): boolean {
	return node.myRights.mayDelete;
}

export function fileAllowsRename(node: Pick<FileNode, 'myRights'>): boolean {
	return node.myRights.mayRename;
}

export function isOwnedFileNode(node: Pick<FileNode, 'myRights' | 'role'>): boolean {
	return node.myRights.mayShare || node.myRights.mayDelete || node.role === 'root';
}

export function inferFileNodeType(
	node: Pick<JMAPFileNode, 'nodeType' | 'blobId' | 'target'>
): FileNode['nodeType'] {
	if (node.nodeType === 'file' || node.nodeType === 'directory' || node.nodeType === 'symlink') {
		return node.nodeType;
	}
	if (node.blobId) return 'file';
	if (node.target) return 'symlink';
	return 'directory';
}

export function mapFileNode(node: JMAPFileNode, accountId?: string | null): FileNode {
	const shareWith = node.shareWith
		? Object.fromEntries(
				Object.entries(node.shareWith).map(([id, rights]) => [id, normalizeFileRights(rights)])
			)
		: null;

	return {
		id: node.id,
		parentId: node.parentId ?? null,
		nodeType: inferFileNodeType(node),
		blobId: node.blobId ?? null,
		size: node.size ?? null,
		name: node.name,
		type: node.type ?? null,
		created: node.created ?? null,
		modified: node.modified ?? null,
		role: node.role ?? null,
		myRights: normalizeFileRights(node.myRights),
		shareWith,
		isSubscribed: node.isSubscribed !== false,
		accountId: accountId ?? null
	};
}

export function fileRoleLabel(role: string | null): string | null {
	if (!role) return null;
	const labels: Record<string, string> = {
		root: 'All files',
		home: 'Home',
		temp: 'Temporary',
		trash: 'Trash',
		documents: 'Documents',
		downloads: 'Downloads',
		music: 'Music',
		pictures: 'Pictures',
		videos: 'Videos'
	};
	return labels[role] ?? role;
}

/** JMAP map patch: `null` removes a principal. */
export function patchFileShareWith(
	current: Record<string, FileRights> | null,
	principalId: string,
	rights: FileRights | null
): Record<string, FileRights | null> {
	const next: Record<string, FileRights | null> = { ...(current ?? {}) };
	next[principalId] = rights;
	return next;
}

export function formatFileSize(bytes: number | null | undefined): string {
	if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = value >= 10 || unit === 0 ? 0 : 1;
	return `${value.toFixed(digits)} ${units[unit]}`;
}
