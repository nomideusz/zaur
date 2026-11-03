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
	'@type'?: string | null;
	blobId?: string | null;
	target?: string[] | null;
	size?: number | null;
	name: string;
	type?: string | null;
	mediaType?: string | null;
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
	supportedNodeTypes?: string[];
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

/**
 * Stalwart 1.0 implements a later FileNode draft: `nodeType` became `@type`
 * (File, Directory, SymLink) and `type` became `mediaType`. Only the query
 * filter and sort keep the name `nodeType`. The rest of the code speaks the
 * older names, and these translate at the edge of the client. A server on the
 * later draft is the one that advertises `supportedNodeTypes`.
 */
export function usesAtType(capability: JMAPFileNodeCapability | null | undefined): boolean {
	return Array.isArray(capability?.supportedNodeTypes);
}

const AT_TYPE: Record<string, string> = { file: 'File', directory: 'Directory', symlink: 'SymLink' };

export function fileNodeProperties(atType: boolean): string[] {
	if (!atType) return [...FILE_NODE_PROPERTIES];
	return FILE_NODE_PROPERTIES.map((property) =>
		property === 'nodeType' ? '@type' : property === 'type' ? 'mediaType' : property
	);
}

export function fileNodeFromServer(node: JMAPFileNode): JMAPFileNode {
	const { '@type': atType, mediaType, ...rest } = node;
	return {
		...rest,
		nodeType: node.nodeType ?? atType?.toLowerCase() ?? null,
		type: node.type ?? mediaType ?? null
	};
}

/** A FileNode/set create or update body, in the names this server reads. */
export function fileNodeToServer(
	data: Record<string, unknown>,
	atType: boolean
): Record<string, unknown> {
	if (!atType) return data;
	const { nodeType, type, ...rest } = data;
	if (nodeType !== undefined) rest['@type'] = AT_TYPE[String(nodeType)] ?? nodeType;
	if (type !== undefined) rest.mediaType = type;
	return rest;
}

export function fileNodeFilterToServer(
	filter: Record<string, unknown>,
	atType: boolean
): Record<string, unknown> {
	if (!atType || filter.nodeType === undefined) return filter;
	return { ...filter, nodeType: AT_TYPE[String(filter.nodeType)] ?? filter.nodeType };
}
