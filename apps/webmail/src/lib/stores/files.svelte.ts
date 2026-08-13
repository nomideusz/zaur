import { errorMessage } from '@zaur/mail-core/utils/errors';
import { isJmapMethodError } from '@zaur/mail-core/jmap/errors';
import type { JMAPClient } from '$lib/jmap/client';
import {
	fileRoleLabel,
	isOwnedFileNode,
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

class FilesStore {
	nodes = $state<FileNode[]>([]);
	ancestors = $state<FileNode[]>([]);
	roleFolders = $state<FileNode[]>([]);
	currentParentId = $state<string | null>(null);
	selectedId = $state<string | null>(null);
	searchResults = $state<FileNode[]>([]);
	searchQuery = $state('');

	loading = $state(false);
	searching = $state(false);
	uploading = $state(false);
	error = $state<string | null>(null);
	supported = $state<boolean | null>(null);
	mayCreateTopLevel = $state(false);
	createFolderOpen = $state(false);

	selected = $derived(this.nodes.find((node) => node.id === this.selectedId) ?? null);
	currentFolder = $derived(
		this.currentParentId
			? this.ancestors.find((node) => node.id === this.currentParentId) ??
				this.roleFolders.find((node) => node.id === this.currentParentId) ??
				null
			: null
	);
	breadcrumb = $derived(this.ancestors);
	ownedFolders = $derived(this.roleFolders.filter(isOwnedFileNode));
	sharedFolders = $derived(this.roleFolders.filter((node) => !isOwnedFileNode(node)));

	canAddHere = $derived.by(() => {
		if (this.currentFolder) return this.currentFolder.myRights.mayAddChildren;
		return this.mayCreateTopLevel;
	});

	folderTitle = $derived.by(() => {
		if (this.currentFolder) {
			return fileRoleLabel(this.currentFolder.role) ?? this.currentFolder.name;
		}
		return 'Files';
	});

	async ensure(client: JMAPClient): Promise<void> {
		if (!client.hasFileNode()) {
			this.supported = false;
			this.nodes = [];
			this.roleFolders = [];
			return;
		}

		this.supported = true;
		this.mayCreateTopLevel = client.getFileNodeCapability()?.mayCreateTopLevelFileNode !== false;
		await this.loadRoleFolders(client);
		if (this.currentParentId === null && !this.nodes.length) {
			const documents = this.roleFolders.find((node) => node.role === 'documents');
			const home = this.roleFolders.find((node) => node.role === 'home');
			await this.openFolder(client, documents?.id ?? home?.id ?? null);
		} else {
			await this.openFolder(client, this.currentParentId);
		}
	}

	async loadRoleFolders(client: JMAPClient): Promise<void> {
		try {
			const [roles, top] = await Promise.all([
				client.queryFileNodes({ hasAnyRole: true }),
				client.queryFileNodes({ isTopLevel: true })
			]);
			const mapped = new Map<string, FileNode>();
			for (const raw of [...roles, ...top]) {
				const node = mapFileNode(raw);
				if (node.nodeType !== 'directory') continue;
				mapped.set(node.id, node);
			}
			this.roleFolders = sortNodes([...mapped.values()]);
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
			const [children, parents] = await Promise.all([
				client.queryFileNodes(parentId ? { parentId } : { isTopLevel: true }),
				parentId ? client.getFileNodes([parentId], true) : Promise.resolve([])
			]);

			this.nodes = sortNodes(children.map(mapFileNode));
			this.ancestors = this.buildAncestors(parents.map(mapFileNode), parentId);
		} catch (error) {
			this.error = errorMessage(error, 'Failed to load files');
			this.nodes = [];
		} finally {
			this.loading = false;
		}
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

	async search(client: JMAPClient, query: string): Promise<void> {
		const trimmed = query.trim();
		this.searchQuery = trimmed;
		if (!trimmed) {
			this.searchResults = [];
			return;
		}
		this.searching = true;
		try {
			const list = await client.queryFileNodes({ text: trimmed }, { limit: 50 });
			this.searchResults = sortNodes(list.map(mapFileNode));
		} catch (error) {
			this.searchResults = [];
			this.error = errorMessage(error, 'Search failed');
		} finally {
			this.searching = false;
		}
	}

	async createFolder(client: JMAPClient, name: string): Promise<void> {
		if (!this.canAddHere) {
			toast.show('You don’t have permission to add items here', 'error');
			return;
		}
		try {
			await client.createFileNode({
				parentId: this.currentParentId,
				name,
				nodeType: 'directory'
			});
			toast.show(`Created “${name.trim()}”`, 'success');
			await this.openFolder(client, this.currentParentId);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not create folder'), 'error');
			throw error;
		}
	}

	async upload(client: JMAPClient, fileList: File[]): Promise<void> {
		if (!fileList.length) return;
		if (!this.canAddHere) {
			toast.show('You don’t have permission to add items here', 'error');
			return;
		}

		this.uploading = true;
		let uploaded = 0;
		try {
			for (const file of fileList) {
				const blob = await client.uploadBlob(file, file.type || 'application/octet-stream');
				await client.createFileNode({
					parentId: this.currentParentId,
					name: file.name,
					nodeType: 'file',
					blobId: blob.blobId,
					type: blob.type || file.type || 'application/octet-stream'
				});
				uploaded += 1;
			}
			toast.show(uploaded === 1 ? `Uploaded “${fileList[0].name}”` : `Uploaded ${uploaded} files`, 'success');
			await this.openFolder(client, this.currentParentId);
		} catch (error) {
			toast.show(errorMessage(error, 'Upload failed'), 'error');
		} finally {
			this.uploading = false;
		}
	}

	async rename(client: JMAPClient, id: string, name: string): Promise<void> {
		try {
			await client.updateFileNode(id, { name });
			await this.openFolder(client, this.currentParentId);
			this.selectedId = id;
		} catch (error) {
			toast.show(errorMessage(error, 'Could not rename'), 'error');
			throw error;
		}
	}

	async destroy(client: JMAPClient, node: FileNode): Promise<void> {
		try {
			await client.destroyFileNodes([node.id], node.nodeType === 'directory');
			if (this.selectedId === node.id) this.selectedId = null;
			toast.show(`Deleted “${node.name}”`, 'success');
			await this.openFolder(client, this.currentParentId);
			await this.loadRoleFolders(client);
		} catch (error) {
			toast.show(errorMessage(error, 'Could not delete'), 'error');
			throw error;
		}
	}

	async share(client: JMAPClient, nodeId: string, principalId: string, role: FileShareRole): Promise<void> {
		const existing =
			this.nodes.find((node) => node.id === nodeId) ??
			this.roleFolders.find((node) => node.id === nodeId);
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
			await client.updateFileNode(nodeId, { shareWith: patched });
		} catch (error) {
			this.replaceNode({ ...existing, shareWith: previous });
			throw error;
		}
	}

	async unshare(client: JMAPClient, nodeId: string, principalId: string): Promise<void> {
		const existing =
			this.nodes.find((node) => node.id === nodeId) ??
			this.roleFolders.find((node) => node.id === nodeId);
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
			await client.updateFileNode(nodeId, { shareWith: patched });
		} catch (error) {
			this.replaceNode({ ...existing, shareWith: previous });
			throw error;
		}
	}

	nodeById(id: string): FileNode | undefined {
		return (
			this.nodes.find((node) => node.id === id) ??
			this.roleFolders.find((node) => node.id === id) ??
			this.searchResults.find((node) => node.id === id)
		);
	}

	private replaceNode(next: FileNode): void {
		this.nodes = this.nodes.map((node) => (node.id === next.id ? next : node));
		this.roleFolders = this.roleFolders.map((node) => (node.id === next.id ? next : node));
		if (this.selectedId === next.id) {
			/* selected is derived from nodes */
		}
	}
}

export const files = new FilesStore();
