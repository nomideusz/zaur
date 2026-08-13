import { errorMessage } from '@zaur/mail-core/utils/errors';
import { isJmapMethodError } from '@zaur/mail-core/jmap/errors';
import { buildFileTree, orphanFileRoots } from '@zaur/mail-core/files/folder-tree';
import type { JMAPClient } from '$lib/jmap/client';
import {
	fileRoleLabel,
	mapFileNode,
	patchFileShareWith,
	rightsForFileShareRole
} from '$lib/jmap/file-rights';
import type { FileNode, FileShareRole } from '$lib/types/files';
import { toast } from '$lib/stores/toast.svelte';

function sortNodes(nodes: FileNode[]): FileNode[] {
	return [...nodes].sort((a, b) => {
		if (a.nodeType !== b.nodeType) {
			if (a.nodeType === 'directory') return -1;
			if (b.nodeType === 'directory') return 1;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
	});
}

const OWNER_RIGHTS = {
	mayRead: true,
	mayAddChildren: true,
	mayRename: true,
	mayDelete: true,
	mayModifyContent: true,
	mayShare: true
} as const;

class FilesStore {
	nodes = $state<FileNode[]>([]);
	ancestors = $state<FileNode[]>([]);
	roleFolders = $state<FileNode[]>([]);
	currentParentId = $state<string | null>(null);
	selectedId = $state<string | null>(null);
	searchResults = $state<FileNode[]>([]);
	searchQuery = $state('');
	fileAccountId = $state<string | null>(null);

	loading = $state(false);
	searching = $state(false);
	uploading = $state(false);
	error = $state<string | null>(null);
	supported = $state<boolean | null>(null);
	mayCreateTopLevel = $state(false);
	createFolderOpen = $state(false);
	/** Parent for the next “New folder” submit; `null` is All files. */
	createFolderParentId = $state<string | null | undefined>(undefined);
	renameRequestId = $state<string | null>(null);
	dropTargetId = $state<string | null>(null);

	selected = $derived(this.nodes.find((node) => node.id === this.selectedId) ?? null);
	currentFolder = $derived(
		this.currentParentId
			? this.ancestors.find((node) => node.id === this.currentParentId) ??
				this.roleFolders.find((node) => node.id === this.currentParentId) ??
				null
			: null
	);
	breadcrumb = $derived(this.ancestors);
	ownedFolders = $derived(
		this.roleFolders.filter((node) => !this.isFromSharedAccount(node))
	);
	sharedFolders = $derived(
		this.roleFolders.filter((node) => this.isFromSharedAccount(node))
	);
	ownedTree = $derived(buildFileTree(this.ownedFolders));
	sharedTree = $derived(buildFileTree(this.sharedFolders));

	canAddHere = $derived.by(() => {
		if (this.currentFolder) return this.currentFolder.myRights.mayAddChildren;
		return this.mayCreateTopLevel;
	});

	folderTitle = $derived.by(() => {
		if (this.currentFolder) {
			return fileRoleLabel(this.currentFolder.role) ?? this.currentFolder.name;
		}
		return 'All files';
	});

	isFromSharedAccount(node: Pick<FileNode, 'accountId'>): boolean {
		if (!node.accountId || !this.fileAccountId) return false;
		return node.accountId !== this.fileAccountId;
	}

	async ensure(client: JMAPClient): Promise<void> {
		if (!client.hasFileNode()) {
			this.supported = false;
			this.nodes = [];
			this.roleFolders = [];
			return;
		}

		this.supported = true;
		this.fileAccountId = client.getFileNodeAccountId();
		this.mayCreateTopLevel = client.getFileNodeCapability()?.mayCreateTopLevelFileNode !== false;
		await this.loadRoleFolders(client);
		await this.openFolder(client, this.currentParentId);
	}

	async loadRoleFolders(client: JMAPClient): Promise<void> {
		try {
			this.fileAccountId = client.getFileNodeAccountId();
			const lists = await Promise.all(
				client.getFileNodeAccountIds().map(async (accountId) => {
					try {
						const raw = await client.queryFileNodes(
							{ nodeType: 'directory' },
							{ limit: 500, accountId }
						);
						return raw
							.map((node) => mapFileNode(node, accountId))
							.filter((node) => node.nodeType === 'directory');
					} catch {
						return [];
					}
				})
			);
			this.roleFolders = sortNodes(lists.flat());
		} catch (error) {
			if (isJmapMethodError(error, 'unknownMethod') || isJmapMethodError(error, 'unknownCapability')) {
				this.supported = false;
				return;
			}
			this.roleFolders = [];
		}
	}

	async openFolder(client: JMAPClient, parentId: string | null): Promise<void> {
		this.loading = true;
		this.error = null;
		this.currentParentId = parentId;
		this.selectedId = null;

		try {
			if (!client.hasFileNode()) {
				this.supported = false;
				this.nodes = [];
				return;
			}

			this.supported = true;
			this.fileAccountId = client.getFileNodeAccountId();
			const ownId = this.fileAccountId;

			if (!parentId) {
				const otherIds = client.getFileNodeAccountIds().filter((id) => id !== ownId);
				const [ownTop, sharedRoots] = await Promise.all([
					client.queryFileNodes({ isTopLevel: true }, { accountId: ownId }),
					this.loadSharedRoots(client, otherIds)
				]);
				this.nodes = sortNodes([
					...ownTop.map((node) => mapFileNode(node, ownId)),
					...sharedRoots
				]);
				this.ancestors = [];
				return;
			}

			const folder =
				this.roleFolders.find((node) => node.id === parentId) ??
				this.nodes.find((node) => node.id === parentId) ??
				this.ancestors.find((node) => node.id === parentId);
			const accountId = folder?.accountId ?? ownId;
			const [children, parents] = await Promise.all([
				client.queryFileNodes({ parentId }, { accountId }),
				client.getFileNodes([parentId], true, accountId)
			]);

			this.nodes = sortNodes(children.map((node) => mapFileNode(node, accountId)));
			this.ancestors = this.buildAncestors(
				parents.map((node) => mapFileNode(node, accountId)),
				parentId
			);
		} catch (error) {
			this.error = errorMessage(error, 'Failed to load files');
			this.nodes = [];
		} finally {
			this.loading = false;
		}
	}

	private async loadSharedRoots(client: JMAPClient, accountIds: string[]): Promise<FileNode[]> {
		if (!accountIds.length) return [];
		const lists = await Promise.all(
			accountIds.map(async (accountId) => {
				try {
					const raw = await client.queryFileNodes({}, { limit: 500, accountId });
					return orphanFileRoots(raw.map((node) => mapFileNode(node, accountId)));
				} catch {
					return [];
				}
			})
		);
		return lists.flat();
	}

	private buildAncestors(nodes: FileNode[], leafId: string | null): FileNode[] {
		if (!leafId) return [];
		const byId = new Map(nodes.map((node) => [node.id, node]));
		const chain: FileNode[] = [];
		let current = byId.get(leafId) ?? null;
		const seen = new Set<string>();
		while (current && !seen.has(current.id)) {
			seen.add(current.id);
			chain.unshift(current);
			current = current.parentId ? (byId.get(current.parentId) ?? null) : null;
		}
		return chain;
	}

	select(id: string | null): void {
		this.selectedId = id;
	}

	requestCreateFolder(parentId: string | null = this.currentParentId): void {
		this.createFolderParentId = parentId;
		this.createFolderOpen = true;
	}

	requestRename(id: string): void {
		this.renameRequestId = id;
	}

	async search(client: JMAPClient, query: string): Promise<void> {
		const trimmed = query.trim();
		this.searchQuery = trimmed;
		if (!trimmed) {
			this.searchResults = [];
			return;
		}
		this.searching = true;
		try {
			const lists = await Promise.all(
				client.getFileNodeAccountIds().map(async (accountId) => {
					try {
						const list = await client.queryFileNodes({ text: trimmed }, { limit: 50, accountId });
						return list.map((node) => mapFileNode(node, accountId));
					} catch {
						return [];
					}
				})
			);
			this.searchResults = sortNodes(lists.flat());
		} catch (error) {
			this.searchResults = [];
			this.error = errorMessage(error, 'Search failed');
		} finally {
			this.searching = false;
		}
	}

	async createFolder(client: JMAPClient, name: string, parentId?: string | null): Promise<void> {
		const targetParent =
			parentId !== undefined
				? parentId
				: this.createFolderParentId !== undefined
					? this.createFolderParentId
					: this.currentParentId;
		const dest = targetParent ? this.folderById(targetParent) : null;
		const canAdd = dest ? dest.myRights.mayAddChildren : this.mayCreateTopLevel;
		if (!canAdd) {
			toast.show('You don’t have permission to add items here', 'error');
			return;
		}
		const accountId = dest?.accountId ?? this.fileAccountId;
		const trimmed = name.trim();
		try {
			const id = await client.createFileNode({
				parentId: targetParent,
				name: trimmed,
				nodeType: 'directory',
				accountId
			});
			this.upsertNode({
				id,
				parentId: targetParent,
				nodeType: 'directory',
				blobId: null,
				size: null,
				name: trimmed,
				type: null,
				created: null,
				modified: null,
				role: null,
				myRights: { ...OWNER_RIGHTS },
				shareWith: null,
				isSubscribed: true,
				accountId: accountId ?? null
			});
			this.createFolderParentId = undefined;
			toast.show(`Created “${trimmed}”`, 'success');
			await Promise.all([
				this.openFolder(client, this.currentParentId),
				this.loadRoleFolders(client)
			]);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not create folder'), 'error');
			throw error;
		}
	}

	async upload(
		client: JMAPClient,
		fileList: File[],
		parentId: string | null = this.currentParentId
	): Promise<void> {
		if (!fileList.length) return;
		const dest = parentId ? this.folderById(parentId) : this.currentFolder;
		const canAdd = dest ? dest.myRights.mayAddChildren : this.mayCreateTopLevel;
		if (!canAdd) {
			toast.show('You don’t have permission to add items here', 'error');
			return;
		}

		this.uploading = true;
		let uploaded = 0;
		try {
			const accountId = dest?.accountId ?? this.fileAccountId;
			for (const file of fileList) {
				const blob = await client.uploadBlob(file, file.type || 'application/octet-stream');
				await client.createFileNode({
					parentId,
					name: file.name,
					nodeType: 'file',
					blobId: blob.blobId,
					type: blob.type || file.type || 'application/octet-stream',
					accountId
				});
				uploaded += 1;
			}
			toast.show(uploaded === 1 ? `Uploaded “${fileList[0].name}”` : `Uploaded ${uploaded} files`, 'success');
			if (parentId === this.currentParentId) {
				await this.openFolder(client, this.currentParentId);
			}
		} catch (error) {
			toast.show(errorMessage(error, 'Upload failed'), 'error');
		} finally {
			this.uploading = false;
		}
	}

	async move(client: JMAPClient, nodeId: string, parentId: string | null): Promise<void> {
		const node = this.nodeById(nodeId);
		if (!node || node.id === parentId || node.parentId === parentId) return;

		const dest = parentId ? this.folderById(parentId) : null;
		if (parentId && dest?.nodeType !== 'directory') return;
		if (dest?.accountId && node.accountId && dest.accountId !== node.accountId) {
			toast.show('Can’t move items between accounts', 'error');
			return;
		}
		const canAdd = dest ? dest.myRights.mayAddChildren : this.mayCreateTopLevel;
		if (!canAdd) {
			toast.show('You don’t have permission to add items here', 'error');
			return;
		}

		try {
			await client.updateFileNode(nodeId, { parentId, accountId: node.accountId });
			toast.show(`Moved “${node.name}”`, 'success');
			await Promise.all([
				this.openFolder(client, this.currentParentId),
				this.loadRoleFolders(client)
			]);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not move'), 'error');
		}
	}

	async rename(client: JMAPClient, id: string, name: string): Promise<void> {
		const existing = this.nodeById(id);
		try {
			await client.updateFileNode(id, { name, accountId: existing?.accountId });
			await this.openFolder(client, this.currentParentId);
			this.selectedId = id;
			await this.loadRoleFolders(client);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not rename'), 'error');
			throw error;
		}
	}

	async destroy(client: JMAPClient, node: FileNode): Promise<void> {
		try {
			const viewingDeleted =
				this.currentParentId === node.id || this.ancestors.some((item) => item.id === node.id);
			const nextParent = viewingDeleted ? node.parentId : this.currentParentId;
			await client.destroyFileNodes([node.id], node.nodeType === 'directory', node.accountId);
			if (this.selectedId === node.id) this.selectedId = null;
			this.roleFolders = this.roleFolders.filter((item) => item.id !== node.id);
			this.nodes = this.nodes.filter((item) => item.id !== node.id);
			toast.show(`Deleted “${node.name}”`, 'success');
			await Promise.all([this.openFolder(client, nextParent), this.loadRoleFolders(client)]);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not delete'), 'error');
			throw error;
		}
	}

	async share(client: JMAPClient, nodeId: string, principalId: string, role: FileShareRole): Promise<void> {
		const existing = this.nodeById(nodeId);
		if (!existing) return;

		const patched = patchFileShareWith(
			existing.shareWith,
			principalId,
			rightsForFileShareRole(role)
		);
		const previous = existing.shareWith;
		this.replaceNode({
			...existing,
			shareWith: Object.fromEntries(
				Object.entries(patched).filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] != null)
			)
		});
		try {
			await client.updateFileNode(nodeId, { shareWith: patched, accountId: existing.accountId });
		} catch (error) {
			this.replaceNode({ ...existing, shareWith: previous });
			throw error;
		}
	}

	async unshare(client: JMAPClient, nodeId: string, principalId: string): Promise<void> {
		const existing = this.nodeById(nodeId);
		if (!existing) return;

		const patched = patchFileShareWith(existing.shareWith, principalId, null);
		const previous = existing.shareWith;
		const nextShareWith = { ...(existing.shareWith ?? {}) };
		delete nextShareWith[principalId];
		this.replaceNode({
			...existing,
			shareWith: Object.keys(nextShareWith).length ? nextShareWith : null
		});
		try {
			await client.updateFileNode(nodeId, { shareWith: patched, accountId: existing.accountId });
		} catch (error) {
			this.replaceNode({ ...existing, shareWith: previous });
			throw error;
		}
	}

	nodeById(id: string): FileNode | undefined {
		return (
			this.nodes.find((node) => node.id === id) ??
			this.roleFolders.find((node) => node.id === id) ??
			this.ancestors.find((node) => node.id === id) ??
			this.searchResults.find((node) => node.id === id)
		);
	}

	folderById(id: string): FileNode | undefined {
		const node = this.nodeById(id);
		return node?.nodeType === 'directory' ? node : undefined;
	}

	private upsertNode(next: FileNode): void {
		const merge = (list: FileNode[]) => sortNodes([next, ...list.filter((node) => node.id !== next.id)]);
		if (this.currentParentId === next.parentId) this.nodes = merge(this.nodes);
		if (next.nodeType === 'directory') this.roleFolders = merge(this.roleFolders);
	}

	private replaceNode(next: FileNode): void {
		this.nodes = this.nodes.map((node) => (node.id === next.id ? next : node));
		this.roleFolders = this.roleFolders.map((node) => (node.id === next.id ? next : node));
	}
}

export const files = new FilesStore();
