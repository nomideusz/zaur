export interface JMAPFileRights {
	mayRead?: boolean;
	mayAddChildren?: boolean;
	mayRename?: boolean;
	mayDelete?: boolean;
	mayModifyContent?: boolean;
	mayShare?: boolean;
}

export type JMAPFileNodeType = 'file' | 'directory' | 'symlink' | string;

export interface JMAPFileNode {
	id: string;
	parentId?: string | null;
	nodeType?: JMAPFileNodeType | null;
	blobId?: string | null;
	target?: string[] | null;
	size?: number | null;
	name: string;
	type?: string | null;
	created?: string | null;
	modified?: string | null;
	accessed?: string | null;
	changed?: string | null;
	executable?: boolean;
	isSubscribed?: boolean;
	myRights?: JMAPFileRights | null;
	shareWith?: Record<string, JMAPFileRights> | null;
	role?: string | null;
}

export interface JMAPFileNodeCapability {
	maxFileNodeDepth?: number | null;
	maxSizeFileNodeName?: number;
	mayCreateTopLevelFileNode?: boolean;
	forbiddenNameChars?: string | null;
	forbiddenNodeNames?: string[] | null;
}

export const FILE_NODE_PROPERTIES = [
	'id',
	'parentId',
	'nodeType',
	'blobId',
	'size',
	'name',
	'type',
	'created',
	'modified',
	'role',
	'myRights',
	'shareWith',
	'isSubscribed'
] as const;
