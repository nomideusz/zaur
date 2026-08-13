export type FileNodeType = 'file' | 'directory' | 'symlink';

export type FileShareRole = 'read' | 'write';

export interface FileRights {
	mayRead: boolean;
	mayAddChildren: boolean;
	mayRename: boolean;
	mayDelete: boolean;
	mayModifyContent: boolean;
	mayShare: boolean;
}

export interface FileNode {
	id: string;
	parentId: string | null;
	nodeType: FileNodeType;
	blobId: string | null;
	size: number | null;
	name: string;
	type: string | null;
	created: string | null;
	modified: string | null;
	role: string | null;
	myRights: FileRights;
	shareWith: Record<string, FileRights> | null;
	isSubscribed: boolean;
}
